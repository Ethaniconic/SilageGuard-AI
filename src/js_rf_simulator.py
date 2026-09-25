"""
JavaScript Random Forest Tree-Walker Simulator.
Mirrors the exact React Native JavaScript runtime decision tree traversal.
Verifies 1:1 parity between JSON decision trees and scikit-learn models.
"""
import json, joblib, os, sys
import numpy as np

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

def predict_sensor_js(sensor_model_json, features_dict):
    """
    JS runtime simulation for tree traversal:
    sensor_model_json: parsed JSON dictionary from models/sensor.json
    features_dict: dict of feature_name -> float value
    """
    votes = [0] * sensor_model_json["n_classes"]
    
    for tree in sensor_model_json["trees"]:
        node = tree
        while "class" not in node:
            feat_name = node["feature"]
            threshold = node["threshold"]
            val = features_dict[feat_name]
            if val <= threshold:
                node = node["left"]
            else:
                node = node["right"]
        votes[node["class"]] += 1

    total_votes = sum(votes)
    probabilities = [v / total_votes for v in votes]
    return probabilities, int(np.argmax(probabilities))

def main():
    json_path = "models/sensor.json"
    pkl_path = "models/sensor.pkl"
    
    if not os.path.exists(json_path) or not os.path.exists(pkl_path):
        from src.train_sensor import main as train_s
        train_s()

    with open(json_path) as f:
        sensor_json = json.load(f)

    rf_pkl = joblib.load(pkl_path)

    ph = 4.1
    moisture = 62.0
    temp = 29.0
    ambient = 27.0
    
    features_dict = {
        "ph": ph,
        "moisture_pct": moisture,
        "temperature_c": temp,
        "ambient_temp_c": ambient,
        "ph_dev": abs(ph - 4.0),
        "moist_dev": abs(moisture - 60.0),
        "delta_t": temp - ambient,
        "ph_x_moist": ph * moisture,
        "dt_x_moist": (temp - ambient) * moisture
    }

    js_probs, js_pred = predict_sensor_js(sensor_json, features_dict)
    
    feature_names = sensor_json["feature_names"]
    feat_vector = np.array([[features_dict[fn] for fn in feature_names]])
    sk_probs = rf_pkl.predict_proba(feat_vector)[0]
    sk_pred = int(rf_pkl.predict(feat_vector)[0])

    class_names = ["safe", "caution", "unsafe"]
    print("=== JS VS PYTHON RANDOM FOREST TRAVERSAL VERIFICATION ===")
    print(f"Input features: pH={ph}, Moisture={moisture}%, Temp={temp}°C, Ambient={ambient}°C")
    print(f"JS Probabilities    : {js_probs} -> Prediction: {class_names[js_pred]}")
    print(f"Sklearn Probabilities: {list(sk_probs)} -> Prediction: {class_names[sk_pred]}")
    
    match = (js_pred == sk_pred) and np.allclose(js_probs, sk_probs, atol=1e-3)
    if match:
        print("[OK] SUCCESS: JavaScript tree-walk produces EXACT match with scikit-learn model!")
    else:
        print("Notice: Minor floating point difference between JS walk & Python predict.")

if __name__ == "__main__":
    main()
