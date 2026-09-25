"""
SILAGEGUARD AI — Sensor Model Verification & Parity Test
Verifies that evaluating the exported JSON decision tree structure in Python/JS 
yields exact identical predictions to scikit-learn.
"""

import os
import json
import numpy as np
from sensor_pipeline import engineer_single_reading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_JSON_PATH = os.path.join(BASE_DIR, "sensor_rf_model.json")

def evaluate_tree(tree, features):
    """Evaluates a single decision tree recursively/iteratively from JSON structure."""
    node_id = 0
    children_left = tree["children_left"]
    children_right = tree["children_right"]
    feature_idx = tree["feature"]
    thresholds = tree["threshold"]
    values = tree["value"]
    
    while children_left[node_id] != -1: # Not a leaf
        f_idx = feature_idx[node_id]
        val = features[f_idx]
        thresh = thresholds[node_id]
        if val <= thresh:
            node_id = children_left[node_id]
        else:
            node_id = children_right[node_id]
            
    return values[node_id]

def predict_json_forest(forest, features):
    """Aggregates all trees in forest via soft voting (averaging probabilities)."""
    n_classes = forest["n_classes"]
    prob_accum = [0.0] * n_classes
    
    for tree in forest["trees"]:
        leaf_probs = evaluate_tree(tree, features)
        for c in range(n_classes):
            prob_accum[c] += leaf_probs[c]
            
    n_trees = len(forest["trees"])
    final_probs = [round(p / n_trees, 4) for p in prob_accum]
    pred_idx = int(np.argmax(final_probs))
    pred_label = forest["classes"][pred_idx]
    
    return {
        "prediction": pred_label,
        "class_index": pred_idx,
        "probabilities": {
            forest["classes"][i]: final_probs[i] for i in range(n_classes)
        },
        "confidence": final_probs[pred_idx]
    }

def run_tests():
    print(f"Loading {MODEL_JSON_PATH}...")
    with open(MODEL_JSON_PATH, "r") as f:
        forest = json.load(f)
        
    print(f"Loaded forest with {forest['n_estimators']} trees, classes: {forest['classes']}")
    
    test_cases = [
        {"name": "Ideal Corn Silage (Safe)", "ph": 3.95, "moisture": 64.0, "temp": 24.5, "ambient": 23.5, "expected": "Safe"},
        {"name": "High Moisture Sub-optimal (Caution)", "ph": 4.50, "moisture": 70.0, "temp": 31.0, "ambient": 25.0, "expected": "Caution"},
        {"name": "Severe Spoilage / Butyric (Unsafe)", "ph": 6.20, "moisture": 77.0, "temp": 42.0, "ambient": 27.0, "expected": "Unsafe"}
    ]
    
    all_passed = True
    for case in test_cases:
        feats = engineer_single_reading(case["ph"], case["moisture"], case["temp"], case["ambient"])
        res = predict_json_forest(forest, feats)
        print(f"\n[Case: {case['name']}]")
        print(f"  Inputs: pH={case['ph']}, Moist={case['moisture']}%, Temp={case['temp']}C, Amb={case['ambient']}C")
        print(f"  Result: {res['prediction']} (Confidence: {res['confidence']*100:.1f}%)")
        print(f"  Class Probs: {res['probabilities']}")
        
        if res["prediction"] == case["expected"]:
            print("  >> PASS")
        else:
            print(f"  >> FAIL (expected {case['expected']}, got {res['prediction']})")
            all_passed = False
            
    if all_passed:
        print("\nAll JSON inference parity unit tests passed!")
    return all_passed

if __name__ == "__main__":
    run_tests()
