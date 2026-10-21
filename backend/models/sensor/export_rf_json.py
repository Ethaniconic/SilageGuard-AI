"""
SILAGEGUARD AI — Random Forest to JSON Exporter
Serializes scikit-learn RandomForestClassifier into a lightweight JSON structure
that can be evaluated on-device in pure TypeScript/JavaScript with zero native dependencies.
"""

import json
from sklearn.ensemble import RandomForestClassifier

def export_random_forest_to_json(rf_model: RandomForestClassifier, feature_names: list, class_names: list, output_path: str):
    """
    Extracts tree structures, split thresholds, feature indices, and leaf probabilities
    from scikit-learn's tree_ Cython structures into portable JSON.
    """
    forest_dict = {
        "model_type": "RandomForestClassifier",
        "version": "1.0.0",
        "n_estimators": len(rf_model.estimators_),
        "n_classes": len(class_names),
        "classes": class_names,
        "feature_names": feature_names,
        "trees": []
    }
    
    for estimator in rf_model.estimators_:
        tree = estimator.tree_
        # In sklearn tree:
        # children_left[i]: left child node or -1
        # children_right[i]: right child node or -1
        # feature[i]: index of feature used for split, or -2 for leaf
        # threshold[i]: split threshold
        # value[i]: class counts/weights array of shape (1, n_classes)
        
        children_left = tree.children_left.tolist()
        children_right = tree.children_right.tolist()
        feature = tree.feature.tolist()
        threshold = [round(float(t), 5) for t in tree.threshold]
        
        # Normalize leaf values to probabilities
        values_raw = tree.value.squeeze(axis=1) # shape: (n_nodes, n_classes)
        normalized_values = []
        for row in values_raw:
            s = row.sum()
            if s > 0:
                normalized_values.append([round(float(v / s), 5) for v in row])
            else:
                normalized_values.append([round(float(1.0 / len(class_names)), 5) for _ in row])
                
        tree_dict = {
            "node_count": int(tree.node_count),
            "children_left": children_left,
            "children_right": children_right,
            "feature": feature,
            "threshold": threshold,
            "value": normalized_values
        }
        forest_dict["trees"].append(tree_dict)
        
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(forest_dict, f, separators=(',', ':'))
        
    print(f"Successfully exported Random Forest ({len(rf_model.estimators_)} trees) to: {output_path}")
    return forest_dict
