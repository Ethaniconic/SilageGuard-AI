"""
SilageGuard AI — Sensor Model Training (src/train_sensor.py)
SIH26111 | Phase 3

Trains BOTH Random Forest and XGBoost on sensor data.
Selects the best performer by F1-macro on the hold-out test split.
Exports the winner as:
  models/sensor_<rf|xgb>.pkl   — Python/scikit-learn artifact
  models/sensor.json            — Flattened decision-tree JSON for React Native

IMPORTANT: Dataset verification runs first. Training halts if any dataset
is missing or malformed.

Run:
    python src/train_sensor.py
"""

import os
import sys
import json
import joblib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix, f1_score

# ── Step 0: Verify datasets ───────────────────────────────────────────────────
from src.verify_datasets import verify

print("=" * 62)
print("  SILAGEGUARD AI — SENSOR MODEL TRAINING (Phase 3)")
print("=" * 62)
print("\n[Step 0] Verifying datasets ...")
report = verify(halt_on_fail=False)

sensor_ok = next(
    (d["status"] == "OK" for d in report["datasets"] if d["name"] == "SensorCSV"),
    False,
)
if not sensor_ok:
    print(
        "\n[HALT] SensorCSV dataset is missing or invalid.\n"
        "       Run: python src/fetch_data.py   to generate it.\n"
        "       Then re-run this script.",
        file=sys.stderr,
    )
    sys.exit(1)

print("[OK]   Sensor dataset verified.\n")

# ── Imports that require verified data ────────────────────────────────────────
from src.dataloaders import get_sensor_data

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("[WARN] xgboost not installed — will only train Random Forest.")
    print("       pip install xgboost\n")


# ── Helper: export RF to JSON ─────────────────────────────────────────────────

def export_rf_to_json(model, feature_names: list, path: str):
    """
    Flatten a RandomForestClassifier into a JSON structure that React Native
    can evaluate natively without any ML runtime.

    Schema:
      { "n_classes": 3,
        "feature_names": [...],
        "label_map": {"0": "safe", "1": "caution", "2": "unsafe"},
        "trees": [ <tree_node>, ... ] }

    Each tree_node is either:
      leaf : { "class": <int> }
      split: { "feature": <str>, "threshold": <float>,
               "left": <node>, "right": <node> }
    """
    def _tree_to_dict(tree, node_id: int = 0) -> dict:
        left  = tree.children_left[node_id]
        right = tree.children_right[node_id]
        if left == -1 and right == -1:
            counts = tree.value[node_id][0]
            return {"class": int(np.argmax(counts))}
        return {
            "feature":   feature_names[tree.feature[node_id]],
            "threshold": float(tree.threshold[node_id]),
            "left":      _tree_to_dict(tree, left),
            "right":     _tree_to_dict(tree, right),
        }

    payload = {
        "model_type":    "random_forest",
        "n_classes":     int(model.n_classes_),
        "feature_names": feature_names,
        "label_map":     {"0": "safe", "1": "caution", "2": "unsafe"},
        "trees": [_tree_to_dict(est.tree_) for est in model.estimators_],
    }
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    print(f"[OK] Exported {len(model.estimators_)} trees → {path}")


# ── Model factories ────────────────────────────────────────────────────────────

def build_rf() -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )


def build_xgb():
    return XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
        verbosity=0,
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    csv_path = "data/raw/sensor_data.csv"
    if not os.path.exists(csv_path):
        print("[INFO] sensor_data.csv missing — generating synthetic dataset ...")
        from src.fetch_data import generate_synthetic_sensor_csv
        generate_synthetic_sensor_csv(csv_path)

    X, y, feature_names = get_sensor_data(csv_path)
    print(f"[Data] {len(X)} samples | {X.shape[1]} features")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )

    results = {}

    # ── Random Forest ─────────────────────────────────────────────────────────
    print("\n=== Training Random Forest ===")
    rf = build_rf()
    # n_jobs=1 avoids a gmpy2/sympy crash in joblib worker processes on Windows/Anaconda
    rf_cv = cross_val_score(rf, X_train, y_train, cv=5, scoring="f1_macro", n_jobs=1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_f1   = f1_score(y_test, rf_pred, average="macro")

    print(f"  5-fold CV F1-macro : {rf_cv.mean():.3f} ± {rf_cv.std():.3f}")
    print(f"  Test    F1-macro   : {rf_f1:.3f}")
    results["rf"] = {"model": rf, "f1": rf_f1, "pred": rf_pred}

    # ── XGBoost ───────────────────────────────────────────────────────────────
    if XGBOOST_AVAILABLE:
        print("\n=== Training XGBoost ===")
        xgb = build_xgb()
        xgb.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )
        xgb_pred = xgb.predict(X_test)
        xgb_f1   = f1_score(y_test, xgb_pred, average="macro")
        print(f"  Test F1-macro : {xgb_f1:.3f}")
        results["xgb"] = {"model": xgb, "f1": xgb_f1, "pred": xgb_pred}

    # ── Select best ───────────────────────────────────────────────────────────
    best_name = max(results, key=lambda k: results[k]["f1"])
    best      = results[best_name]
    print(f"\n[Selected] {best_name.upper()} (Test F1={best['f1']:.3f})")

    # ── Save artifacts ────────────────────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    pkl_path = f"models/sensor_{best_name}.pkl"
    joblib.dump(best["model"], pkl_path)
    print(f"[OK] Saved {pkl_path}")

    # Always export the RF JSON for React Native (even if XGBoost won,
    # we export the RF for the lightweight on-device fallback)
    rf_json_path = "models/sensor.json"
    export_rf_to_json(rf, feature_names, rf_json_path)

    # If RF was not the best, also save XGBoost-derived feature importances
    if best_name == "xgb" and XGBOOST_AVAILABLE:
        fi = dict(zip(feature_names, best["model"].feature_importances_.tolist()))
        with open("models/xgb_feature_importance.json", "w") as fh:
            json.dump(fi, fh, indent=2)
        print("[OK] Saved models/xgb_feature_importance.json")

    # ── Full classification report ────────────────────────────────────────────
    print("\n=== Classification Report — Best Model ===")
    print(classification_report(
        y_test, best["pred"],
        target_names=["safe", "caution", "unsafe"]
    ))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, best["pred"]))

    # ── Feature importance summary (always from RF) ────────────────────────────
    fi_rf = sorted(
        zip(feature_names, rf.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    print("\nRandom Forest Feature Importance (top features):")
    for feat, imp in fi_rf:
        bar = "█" * int(imp * 50)
        print(f"  {feat:<20} {imp:.4f}  {bar}")

    print("\n[DONE] Sensor model training complete.")
    print(f"       Best model  : {pkl_path}")
    print(f"       RF JSON tree: {rf_json_path}")


if __name__ == "__main__":
    main()
