"""
SILAGEGUARD AI V2 — Sensor Model Training & Leakage-Safe Evaluation
Implements GroupKFold / StratifiedGroupKFold validation across distinct bunker pits.
Evaluates RandomForestClassifier vs LogisticRegression and HistGradientBoosting.
Calculates unrounded metrics, Brier calibration score, and exports on-device JSON schema.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss
)
from sensor_pipeline import engineer_sensor_features, FEATURE_COLUMNS, LABEL_MAPPING, REVERSE_LABEL_MAPPING
from export_rf_json import export_random_forest_to_json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "datasets", "processed", "silage_sensor_v2.csv")
EXPORT_JSON_DIR = os.path.join(BASE_DIR, "..", "mobile", "assets", "models")
LOCAL_EXPORT_PATH = os.path.join(BASE_DIR, "sensor_rf_model.json")
MOBILE_EXPORT_PATH = os.path.join(EXPORT_JSON_DIR, "sensor_rf_model.json")

def train_and_validate_sensor_model():
    print(f"Loading research-grounded sensor dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {df.shape}, Unique Pits: {df['pit_id'].nunique()}, Unique Farms: {df['farm_id'].nunique()}")
    
    # Feature Engineering
    X = engineer_sensor_features(df)
    y = df["label"].map(LABEL_MAPPING).values
    groups = df["pit_id"].values
    
    # 1. Leakage-Safe 5-Fold Stratified Group Cross-Validation
    print("\n--- 1. LEAKAGE-SAFE STRATIFIED GROUP EVALUATION (GroupKFold by pit_id) ---")
    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    
    rf_scores = []
    lr_scores = []
    hgb_scores = []
    
    for fold, (train_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
        X_tr, y_tr = X.iloc[train_idx], y[train_idx]
        X_va, y_va = X.iloc[val_idx], y[val_idx]
        
        # Candidate 1: Random Forest (Primary on-device candidate)
        rf_fold = RandomForestClassifier(
            n_estimators=25,
            max_depth=8,
            min_samples_split=6,
            min_samples_leaf=3,
            random_state=42,
            class_weight="balanced"
        )
        rf_fold.fit(X_tr, y_tr)
        rf_pred = rf_fold.predict(X_va)
        rf_scores.append(f1_score(y_va, rf_pred, average="macro"))
        
        # Candidate 2: Logistic Regression (Linear baseline)
        lr_fold = LogisticRegression(max_iter=500, random_state=42)
        lr_fold.fit(X_tr, y_tr)
        lr_pred = lr_fold.predict(X_va)
        lr_scores.append(f1_score(y_va, lr_pred, average="macro"))
        
        # Candidate 3: HistGradientBoosting
        hgb_fold = HistGradientBoostingClassifier(max_iter=40, max_depth=6, random_state=42)
        hgb_fold.fit(X_tr, y_tr)
        hgb_pred = hgb_fold.predict(X_va)
        hgb_scores.append(f1_score(y_va, hgb_pred, average="macro"))
        
    print(f"Random Forest Macro F1:         {np.mean(rf_scores):.4f} (+/- {np.std(rf_scores):.4f})")
    print(f"HistGradientBoosting Macro F1:  {np.mean(hgb_scores):.4f} (+/- {np.std(hgb_scores):.4f})")
    print(f"Logistic Regression Macro F1:   {np.mean(lr_scores):.4f} (+/- {np.std(lr_scores):.4f})")
    
    # 2. Fit Final Benchmark Train / Independent Group Test Split
    unique_pits = df["pit_id"].unique()
    np.random.seed(42)
    np.random.shuffle(unique_pits)
    
    test_pit_count = int(len(unique_pits) * 0.20)
    test_pits = set(unique_pits[:test_pit_count])
    train_pits = set(unique_pits[test_pit_count:])
    
    train_mask = df["pit_id"].isin(train_pits)
    test_mask = df["pit_id"].isin(test_pits)
    
    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[test_mask], y[test_mask]
    
    print(f"\nFinal Independent Pit Split: Train={len(X_train)} samples ({len(train_pits)} pits) | Test={len(X_test)} samples ({len(test_pits)} pits)")
    
    final_rf = RandomForestClassifier(
        n_estimators=25,
        max_depth=8,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=42,
        class_weight="balanced"
    )
    final_rf.fit(X_train, y_train)
    y_pred = final_rf.predict(X_test)
    y_probs = final_rf.predict_proba(X_test)
    
    # Unrounded Honest Metrics Calculation
    acc = float(accuracy_score(y_test, y_pred))
    macro_prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    
    target_names = [REVERSE_LABEL_MAPPING[i] for i in range(len(LABEL_MAPPING))]
    per_class_f1 = f1_score(y_test, y_pred, average=None, zero_division=0).tolist()
    per_class_rec = recall_score(y_test, y_pred, average=None, zero_division=0).tolist()
    per_class_prec = precision_score(y_test, y_pred, average=None, zero_division=0).tolist()
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    # Multi-class Brier score proxy (one-vs-rest average)
    y_test_oh = np.eye(len(target_names))[y_test]
    brier_scores = [float(brier_score_loss(y_test_oh[:, c], y_probs[:, c])) for c in range(len(target_names))]
    avg_brier = float(np.mean(brier_scores))
    
    print("\n--- 2. INDEPENDENT TEST SET EVALUATION ---")
    print(f"Accuracy:        {acc * 100:.2f}%")
    print(f"Macro F1 Score:  {macro_f1 * 100:.2f}%")
    print(f"Macro Recall:    {macro_rec * 100:.2f}%")
    print(f"Avg Brier Score: {avg_brier:.4f} (lower is better, 0.0 is perfect)")
    
    rep_text = classification_report(y_test, y_pred, target_names=target_names)
    print("\nClassification Report:\n", rep_text)
    
    # Save classification_report.txt
    with open(os.path.join(BASE_DIR, "classification_report.txt"), "w") as f:
        f.write(rep_text)
        
    # Feature Importance
    importances = {FEATURE_COLUMNS[i]: round(float(final_rf.feature_importances_[i]), 4) for i in range(len(FEATURE_COLUMNS))}
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))
    with open(os.path.join(BASE_DIR, "sensor_feature_importance.json"), "w") as f:
        json.dump(sorted_importances, f, indent=2)
        
    # Metrics JSON
    metrics_summary = {
        "model_version": "sensor_rf_v2.0",
        "training_date": "2026-09-25",
        "split_method": "StratifiedGroupKFold on pit_id (Leakage-Safe)",
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "train_pits": int(len(train_pits)),
        "test_pits": int(len(test_pits)),
        "accuracy": round(acc, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class_f1": {target_names[i]: round(per_class_f1[i], 4) for i in range(len(target_names))},
        "per_class_recall": {target_names[i]: round(per_class_rec[i], 4) for i in range(len(target_names))},
        "per_class_precision": {target_names[i]: round(per_class_prec[i], 4) for i in range(len(target_names))},
        "brier_score": round(avg_brier, 4),
        "confusion_matrix": cm,
        "classes": target_names,
        "feature_importances": sorted_importances,
        "dataset_limitations": [
            "Trained on grouped synthetic-agronomic distributions; physical farm pilot data will calibrate feature coefficients",
            "Screening model is designed for risk triage and does not replace official lab VFA chromatography"
        ]
    }
    with open(os.path.join(BASE_DIR, "sensor_model_metrics.json"), "w") as f:
        json.dump(metrics_summary, f, indent=2)
        
    # Dataset Report
    dataset_report = {
        "dataset_name": "silage_sensor_v2.csv",
        "total_records": len(df),
        "pits_represented": int(df["pit_id"].nunique()),
        "crops": list(df["crop_type"].unique()),
        "class_counts": df["label"].value_counts().to_dict(),
        "feature_ranges": {
            col: {"min": float(df[col].min()), "max": float(df[col].max()), "mean": round(float(df[col].mean()), 2)}
            for col in ["ph", "moisture", "temperature", "ambient"]
        }
    }
    with open(os.path.join(BASE_DIR, "sensor_dataset_report.json"), "w") as f:
        json.dump(dataset_report, f, indent=2)
        
    # 3. Export model trees to JSON for pure mobile TypeScript execution
    os.makedirs(EXPORT_JSON_DIR, exist_ok=True)
    export_random_forest_to_json(final_rf, FEATURE_COLUMNS, target_names, LOCAL_EXPORT_PATH)
    export_random_forest_to_json(final_rf, FEATURE_COLUMNS, target_names, MOBILE_EXPORT_PATH)
    print("\nSuccessfully updated sensor model artifacts in sensor_model/ and mobile/assets/models/")
    return metrics_summary

if __name__ == "__main__":
    train_and_validate_sensor_model()
