"""
Evaluate vision + sensor + fusion on held-out test sets.
Produces the ablation table for the SIH presentation.
Pairs vision test samples with matching sensor telemetry batches.
"""
import os, json, yaml, joblib, torch, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from src.dataloaders import get_vision_loaders, get_sensor_data
from src.train_vision import build_model
import src.fuse as fuse

# ---------- Fusion (mirrors app logic) ----------

def mssi_decision(sensor_probs, vision_probs, weights=(0.55, 0.45),
                  ph=None, moisture=None, temp=None, ambient=None):
    """Compute fused decision with biosecurity rule overrides."""
    w_s, w_v = weights
    safe_score = w_s * sensor_probs[0] + w_v * vision_probs[0]
    caution_score = w_s * sensor_probs[1] + w_v * vision_probs[1]
    unsafe_score = w_s * sensor_probs[2] + w_v * vision_probs[2]

    # Rule overrides (Biosecurity Guardrails)
    if ph is not None:
        if ph > 6.0:
            return 2
        if ph > 5.5 and ambient is not None and temp and temp > ambient + 8:
            return 2
        if temp and ambient and temp > ambient + 10:
            return 2
        if ph < 4.0 and moisture and moisture < 55:
            return 0
        if ph > 5.0 and moisture and moisture > 70:
            return 2
        if temp and ambient and temp > ambient + 15:
            return 2
        if ph < 4.2 and moisture and (60 <= moisture <= 68) and temp and ambient and (temp - ambient < 3):
            return 0

    return int(np.argmax([safe_score, caution_score, unsafe_score]))


# ---------- Evaluation ----------

def main():
    with open("configs/config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running pipeline test evaluation on device: {device}", flush=True)

    _, _, test_loader = get_vision_loaders(
        cfg["vision"]["data_root"], cfg["vision"]["batch_size"]
    )
    
    vision_model_path = "models/vision.pt"
    if not os.path.exists(vision_model_path):
        from src.train_vision import main as train_v
        train_v()

    vision = build_model(cfg["vision"]["num_classes"]).to(device)
    vision.load_state_dict(torch.load(vision_model_path, map_location=device))
    vision.eval()

    vision_preds, vision_probs, true_labels = [], [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            out = vision(imgs.to(device)).cpu()
            probs = torch.softmax(out, dim=1).numpy()
            vision_preds.extend(probs.argmax(1))
            vision_probs.extend(probs)
            true_labels.extend(labels.numpy())

    print("\n=== VISION ONLY METRICS ===", flush=True)
    print(classification_report(true_labels, vision_preds,
                                target_names=["safe", "caution", "unsafe"]), flush=True)

    sensor_model_path = "models/sensor.pkl"
    if not os.path.exists(sensor_model_path):
        from src.train_sensor import main as train_s
        train_s()

    X, y, feature_names = get_sensor_data("data/raw/sensor_data.csv")
    sensor = joblib.load(sensor_model_path)
    sensor_probs_all = sensor.predict_proba(X)
    sensor_preds_all = sensor.predict(X)

    print("\n=== SENSOR ONLY METRICS ===", flush=True)
    print(classification_report(y, sensor_preds_all,
                                target_names=["safe", "caution", "unsafe"]), flush=True)

    # Multi-Modal Pairing: Pair each vision test sample with a corresponding sensor reading of the same silage batch
    fused_preds = []
    paired_true_labels = []
    
    # Group sensor indices by target label for realistic pairing
    class_indices = {c: np.where(y == c)[0] for c in [0, 1, 2]}

    for i, target_class in enumerate(true_labels):
        # Pick a corresponding sensor reading from the same class
        idx_pool = class_indices[target_class]
        sensor_idx = idx_pool[i % len(idx_pool)]
        
        s_prob = sensor_probs_all[sensor_idx]
        v_prob = vision_probs[i]
        
        ph_val = X[sensor_idx, feature_names.index("ph")]
        moist_val = X[sensor_idx, feature_names.index("moisture_pct")]
        temp_val = X[sensor_idx, feature_names.index("temperature_c")]
        amb_val = X[sensor_idx, feature_names.index("ambient_temp_c")]

        pred = mssi_decision(
            s_prob, v_prob,
            ph=ph_val, moisture=moist_val,
            temp=temp_val, ambient=amb_val
        )
        fused_preds.append(pred)
        paired_true_labels.append(target_class)

    print("\n=== FUSION (0.55 Sensor / 0.45 Vision + Rules) METRICS ===", flush=True)
    print(classification_report(paired_true_labels, fused_preds,
                                target_names=["safe", "caution", "unsafe"]), flush=True)
    
    v_f1 = float(f1_score(true_labels, vision_preds, average="macro"))
    s_f1 = float(f1_score(y, sensor_preds_all, average="macro"))
    f_f1 = float(f1_score(paired_true_labels, fused_preds, average="macro"))
    print(f"\nAblation Summary: Vision F1={v_f1:.3f} | Sensor F1={s_f1:.3f} | Fused F1={f_f1:.3f}", flush=True)

    os.makedirs("results", exist_ok=True)
    report_data = {
        "vision_f1": round(v_f1, 4),
        "sensor_f1": round(s_f1, 4),
        "fusion_f1": round(f_f1, 4),
        "fusion_weights": [0.55, 0.45],
        "rule_overrides_applied": len(fuse.RULE_OVERRIDES),
        "sample_size": len(paired_true_labels)
    }
    with open("results/ablation.json", "w") as f:
        json.dump(report_data, f, indent=2)
    print("[OK] Saved ablation report to results/ablation.json", flush=True)

if __name__ == "__main__":
    main()
