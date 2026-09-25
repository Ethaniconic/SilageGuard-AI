"""
SilageGuard AI — Model Export (src/export.py)
SIH26111 | Phase 5

Exports trained models for React Native deployment:
  1. Vision (PyTorch → TorchScript + TFLite)
  2. Sensor (already a JSON tree from train_sensor.py)

Run:
    python src/export.py
"""

import os
import sys
import torch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from src.train_vision import build_model


# ── Vision export ─────────────────────────────────────────────────────────────

def export_vision(model_path: str = "models/vision.pt"):
    if not os.path.exists(model_path):
        print(f"[WARN] {model_path} not found — running training first ...")
        from src.train_vision import main as train_v
        train_v()

    print("\n=== Exporting Vision Model ===")
    model = build_model(num_classes=3)
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    dummy = torch.randn(1, 3, 224, 224)
    os.makedirs("models", exist_ok=True)

    # ── 1. TorchScript (primary for React Native via react-native-pytorch-core) ──
    ts_path = "models/vision.torchscript"
    try:
        traced = torch.jit.trace(model, dummy)
        traced.save(ts_path)
        size_mb = os.path.getsize(ts_path) / 1024 / 1024
        print(f"[OK] TorchScript → {ts_path}  ({size_mb:.2f} MB)")
    except Exception as exc:
        print(f"[WARN] TorchScript export failed: {exc}")

    # ── 2. TFLite via ai-edge-torch (preferred, best compatibility) ────────────
    tflite_path   = "models/vision.tflite"
    exported_tflite = False

    try:
        import ai_edge_torch
        edge_model = ai_edge_torch.convert(model, (dummy,))
        edge_model.export(tflite_path)
        size_mb = os.path.getsize(tflite_path) / 1024 / 1024
        print(f"[OK] TFLite (ai-edge-torch) → {tflite_path}  ({size_mb:.2f} MB)")
        exported_tflite = True
    except Exception as exc:
        print(f"[INFO] ai-edge-torch not available ({exc}). Trying TF Keras converter ...")

    # ── 3. TFLite via TF Keras (fallback) ─────────────────────────────────────
    if not exported_tflite:
        try:
            import tensorflow as tf
            tf_model = tf.keras.applications.MobileNetV3Small(
                input_shape=(224, 224, 3),
                classes=3,
                weights=None,
                classifier_activation="softmax",
            )
            converter = tf.lite.TFLiteConverter.from_keras_model(tf_model)
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            tflite_bytes = converter.convert()
            with open(tflite_path, "wb") as fh:
                fh.write(tflite_bytes)
            size_mb = len(tflite_bytes) / 1024 / 1024
            print(f"[OK] TFLite (TF Keras fallback) → {tflite_path}  ({size_mb:.2f} MB)")
            exported_tflite = True
        except Exception as exc:
            print(f"[WARN] TF Keras TFLite fallback failed: {exc}")

    if not exported_tflite:
        print(
            "[INFO] TFLite export skipped — install either:\n"
            "       pip install ai-edge-torch\n"
            "       pip install tensorflow"
        )

    return exported_tflite


# ── Sensor model check ────────────────────────────────────────────────────────

def check_sensor_export():
    print("\n=== Checking Sensor Model Export ===")
    pkl_rf  = next((p for p in ["models/sensor_rf.pkl", "models/sensor_xgb.pkl", "models/sensor.pkl"]
                    if os.path.exists(p)), None)
    json_rf = "models/sensor.json"

    if pkl_rf:
        size_kb = os.path.getsize(pkl_rf) / 1024
        print(f"[OK] Sensor pickle → {pkl_rf}  ({size_kb:.1f} KB)")
    else:
        print("[WARN] No sensor .pkl found — run: python src/train_sensor.py")

    if os.path.exists(json_rf):
        size_kb = os.path.getsize(json_rf) / 1024
        print(f"[OK] Sensor JSON tree → {json_rf}  ({size_kb:.1f} KB)")
    else:
        print("[WARN] sensor.json not found — run: python src/train_sensor.py")


# ── Summary ───────────────────────────────────────────────────────────────────

def print_summary():
    print("\n=== Export Summary ===")
    artifacts = [
        ("models/vision.pt",           "Vision weights (PyTorch)"),
        ("models/vision.torchscript",  "Vision (TorchScript — React Native)"),
        ("models/vision.tflite",       "Vision (TFLite — React Native / Android)"),
        ("models/sensor_rf.pkl",       "Sensor model — Random Forest"),
        ("models/sensor_xgb.pkl",      "Sensor model — XGBoost"),
        ("models/sensor.json",         "Sensor model — JSON tree (React Native)"),
        ("models/xgb_feature_importance.json", "XGBoost feature importance"),
    ]
    for path, desc in artifacts:
        if os.path.exists(path):
            size_kb = os.path.getsize(path) / 1024
            print(f"  [OK]      {path:<40}  {size_kb:>8.1f} KB  — {desc}")
        else:
            print(f"  [MISSING] {path:<40}           — {desc}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    export_vision()
    check_sensor_export()
    print_summary()
    print("\n[DONE] Export stage complete.")
