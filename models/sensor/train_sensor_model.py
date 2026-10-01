"""
SILAGEGUARD AI V3 — 11-Feature Sensor Random Forest Model Training
Features:
  1. ph
  2. moisture_adc
  3. temperature
  4. ambient
  5. delta_temp
  6. ph_dev
  7. moisture_dev
  8. heat_rise
  9. storage_type
  10. crop_type
  11. depth_bucket

Exports:
  - sensor_rf_model.json (for 100% offline edge TS execution)
  - sensor_model_metrics.json
  - sensor_feature_importance.json
"""

import os
import sys

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss
)

from sensor_pipeline import engineer_features, FEATURE_COLUMNS, LABEL_MAPPING, REVERSE_LABEL_MAPPING
from export_rf_json import export_random_forest_to_json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_PATH = os.path.join(PROJECT_ROOT, "datasets", "sensor", "combined_silage_dataset.csv")
EXPORT_JSON_DIR = os.path.join(PROJECT_ROOT, "mobile", "assets", "models")
LOCAL_EXPORT_PATH = os.path.join(BASE_DIR, "sensor_rf_model.json")
MOBILE_EXPORT_PATH = os.path.join(EXPORT_JSON_DIR, "sensor_rf_model.json")
METRICS_PATH = os.path.join(BASE_DIR, "sensor_model_metrics.json")
IMPORTANCE_PATH = os.path.join(BASE_DIR, "sensor_feature_importance.json")

os.makedirs(EXPORT_JSON_DIR, exist_ok=True)

def train_and_export():
    print(f"[*] Loading research-grounded sensor dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"[*] Raw dataset shape: {df.shape}")

    # Standardize label
    df["label_str"] = df["label"].astype(str).str.strip().str.title()
    y = df["label_str"].map(LABEL_MAPPING).values

    # Feature Engineering (11 Features)
    X = engineer_features(df)
    print(f"[*] Engineered feature matrix shape: {X.shape}, Columns: {FEATURE_COLUMNS}")

    # 5-Fold Stratified Validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    fold_accuracies = []
    fold_f1s = []
    fold_briers = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, y_train = X.iloc[train_idx], y[train_idx]
        X_val, y_val = X.iloc[val_idx], y[val_idx]

        rf = RandomForestClassifier(
            n_estimators=25,
            max_depth=8,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42 + fold,
            class_weight="balanced"
        )
        rf.fit(X_train, y_train)

        val_preds = rf.predict(X_val)
        val_probs = rf.predict_proba(X_val)

        acc = accuracy_score(y_val, val_preds)
        f1 = f1_score(y_val, val_preds, average="macro")

        one_hot = np.eye(3)[y_val]
        brier = np.mean(np.sum((val_probs - one_hot) ** 2, axis=1))

        fold_accuracies.append(acc)
        fold_f1s.append(f1)
        fold_briers.append(brier)

    mean_acc = float(np.mean(fold_accuracies))
    mean_f1 = float(np.mean(fold_f1s))
    mean_brier = float(np.mean(fold_briers))

    print(f"[+] 5-Fold Stratified Validation Results:")
    print(f"    - Mean Accuracy: {mean_acc * 100:.2f}% (std: {np.std(fold_accuracies):.4f})")
    print(f"    - Mean Macro F1: {mean_f1:.4f} (std: {np.std(fold_f1s):.4f})")
    print(f"    - Mean Brier Score: {mean_brier:.4f}")

    # Final Fit on entire dataset
    final_rf = RandomForestClassifier(
        n_estimators=25,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )
    final_rf.fit(X, y)

    # Feature Importances
    importances = {
        col: round(float(imp), 4)
        for col, imp in zip(FEATURE_COLUMNS, final_rf.feature_importances_)
    }
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    print(f"[+] Feature Importances:")
    for feat, imp in sorted_importances.items():
        print(f"    - {feat:16s}: {imp * 100:.1f}%")

    with open(IMPORTANCE_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_importances, f, indent=2)

    # Export Trees to JSON for mobile TS runtime
    class_names = ["SAFE", "CAUTION", "UNSAFE"]
    export_random_forest_to_json(final_rf, FEATURE_COLUMNS, class_names, LOCAL_EXPORT_PATH)
    export_random_forest_to_json(final_rf, FEATURE_COLUMNS, class_names, MOBILE_EXPORT_PATH)
    print(f"[+] Exported pure TS/JS Random Forest to: {MOBILE_EXPORT_PATH}")

    # Save metrics
    metrics = {
        "model_name": "SILAGEGUARD-AI-Sensor-RF-v3.0",
        "algorithm": "RandomForestClassifier",
        "n_estimators": 25,
        "max_depth": 8,
        "num_features": len(FEATURE_COLUMNS),
        "features": FEATURE_COLUMNS,
        "classes": class_names,
        "metrics": {
            "accuracy": round(mean_acc, 4),
            "macro_f1": round(mean_f1, 4),
            "brier_score": round(mean_brier, 4)
        },
        "feature_importances": sorted_importances
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    with open(os.path.join(EXPORT_JSON_DIR, "sensor_model_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[+] Sensor model metrics saved successfully.")

if __name__ == "__main__":
    train_and_export()
