"""
SILAGEGUARD AI — Vision Model Evaluator & Heatmap / CAM Placeholder
Evaluates single images or test folders using trained weights.
"""

import os
import sys
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from torchvision import models

CLASS_NAMES = ["Safe", "Caution", "Unsafe"]

def load_inference_model(weights_path):
    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[3] = torch.nn.Sequential(
        torch.nn.Dropout(p=0.2),
        torch.nn.Linear(in_features, 3)
    )
    if os.path.exists(weights_path):
        model.load_state_dict(torch.load(weights_path, map_location="cpu", weights_only=True))
    model.eval()
    return model

def predict_silage_image(image_path, model):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(img_rgb, (224, 224))
    
    # Normalize
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    norm = ((resized / 255.0) - mean) / std
    tensor = torch.tensor(norm.transpose(2, 0, 1), dtype=torch.float32).unsqueeze(0)
    
    with torch.no_grad():
        logits = model(tensor)
        probs = F.softmax(logits, dim=1).squeeze().numpy()
        
    pred_idx = int(np.argmax(probs))
    return {
        "prediction": CLASS_NAMES[pred_idx],
        "confidence": float(probs[pred_idx]),
        "probabilities": {
            CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))
        },
        "heatmap_ready": True
    }

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "mobilenetv3_silage.pth")
    test_img = os.path.join(base_dir, "..", "datasets", "vision", "unsafe", "unsafe_000.jpg")
    
    if os.path.exists(test_img):
        m = load_inference_model(model_path)
        res = predict_silage_image(test_img, m)
        print("Inference on sample unsafe image:")
        print(res)
    else:
        print("Sample test image not found.")
