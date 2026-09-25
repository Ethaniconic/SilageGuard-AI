"""
SILAGEGUARD AI — Sensor AI Training Pipeline
SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System

Trains Random Forest, Gradient Boosting, and evaluates cross-validation,
feature importances, confusion matrix, and exports the final model to
compact on-device JSON for the React Native mobile app.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sensor_pipeline import engineer_sensor_features, FEATURE_COLUMNS, LABEL_MAPPING, REVERSE_LABEL_MAPPING
from export_rf_json import export_random_forest_to_json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "datasets", "sensor", "combined_silage_dataset.csv")
EXPORT_JSON_DIR = os.path.join(BASE_DIR, "..", "mobile", "assets", "models")
LOCAL_EXPORT_PATH = os.path.join(BASE_DIR, "sensor_rf_model.json")
MOBILE_EXPORT_PATH = os.path.join(EXPORT_JSON_DIR, "sensor_rf_model.json")

def load_and_clean_data(csv_path: str):
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Initial shape: {df.shape}")
    
    # 1. Missing Value Check & Imputation
    if df.isnull().sum().sum() > 0:
        print("Handling missing values...")
        df["ph"] = df["ph"].fillna(df["ph"].median())
        df["moisture"] = df["moisture"].fillna(df["moisture"].median())
        df["temperature"] = df["temperature"].fillna(df["temperature"].median())
        df["ambient"] = df["ambient"].fillna(df["ambient"].median())
        df = df.dropna(subset=["label"])
        
    # 2. Agronomic Domain Outlier Filtering
    clean_mask = (
        (df["ph"] >= 3.0) & (df["ph"] <= 8.5) &
        (df["moisture"] >= 35.0) & (df["moisture"] <= 90.0) &
        (df["temperature"] >= 10.0) & (df["temperature"] <= 65.0) &
        (df["ambient"] >= 10.0) & (df["ambient"] <= 50.0)
    )
    df = df[clean_mask].copy()
    print(f"Shape after agronomic sanity filter: {df.shape}")
    
    # 3. Feature Engineering
    X = engineer_sensor_features(df)
    y = df["label"].map(LABEL_MAPPING).values
    
    return X, y, df

def train_and_evaluate():
    X, y, df = load_and_clean_data(DATA_PATH)
    
    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print("\n--- 1. BENCHMARKING MODELS ---")
    
    # Model 1: Random Forest (Primary on-device candidate: 25 trees, max_depth 8 for instant mobile traversal)
    rf = RandomForestClassifier(
        n_estimators=25,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )
    
    # Model 2: Gradient Boosting Baseline
    gb = GradientBoostingClassifier(
        n_estimators=40,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    
    # Model 3: Fast Hist Gradient Boosting (XGBoost alternative)
    hgb = HistGradientBoostingClassifier(
        max_iter=40,
        max_depth=6,
        random_state=42
    )
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for name, model in [("Random Forest (Target)", rf), ("Gradient Boosting", gb), ("HistGradientBoosting", hgb)]:
        scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_macro")
        print(f"  {name} 5-Fold Macro F1: {scores.mean():.4f} (+/- {scores.std():.4f})")
        
    # Fit Primary Model
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="macro")
    print(f"\n--- 2. FINAL RANDOM FOREST TEST METRICS ---")
    print(f"Test Accuracy: {acc * 100:.2f}%")
    print(f"Test Macro F1: {f1 * 100:.2f}%")
    
    target_names = [REVERSE_LABEL_MAPPING[i] for i in range(len(LABEL_MAPPING))]
    report = classification_report(y_test, y_pred, target_names=target_names)
    print("\nDetailed Classification Report:")
    print(report)
    
    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(cm)
    
    # Feature Importances
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("\n--- 3. AGRONOMIC FEATURE IMPORTANCE ---")
    importance_dict = {}
    for idx in sorted_idx:
        feat = FEATURE_COLUMNS[idx]
        imp = float(importances[idx])
        importance_dict[feat] = round(imp, 4)
        print(f"  {feat:<20}: {imp:.4f}")
        
    # Export model to JSON for React Native
    os.makedirs(EXPORT_JSON_DIR, exist_ok=True)
    export_random_forest_to_json(rf, FEATURE_COLUMNS, target_names, LOCAL_EXPORT_PATH)
    export_random_forest_to_json(rf, FEATURE_COLUMNS, target_names, MOBILE_EXPORT_PATH)
    
    # Save training report & metadata
    metadata = {
        "model_name": "SilageGuard-Sensor-RF",
        "version": "1.0.0",
        "accuracy": round(float(acc), 4),
        "f1_macro": round(float(f1), 4),
        "feature_importances": importance_dict,
        "classes": target_names,
        "confusion_matrix": cm.tolist()
    }
    with open(os.path.join(BASE_DIR, "sensor_model_metrics.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    print("Saved training metadata to sensor_model_metrics.json")

if __name__ == "__main__":
    train_and_evaluate()
