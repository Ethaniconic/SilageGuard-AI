"""
SILAGEGUARD AI V3 — Production Grad-CAM Implementation for MobileNetV3-Small
Generates visual explainability heatmaps for silage surface inspections:
  - Hooks into last convolutional feature map (features[-1])
  - Computes class-specific gradient weights
  - Generates smoothed, thresholded, alpha-blended heatmap overlays
  - Outputs PNG overlays and detected hotspot bounding regions for mobile app
"""

import os
import cv2
import numpy as np
import torch
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_PATH = os.path.join(BASE_DIR, "mobilenetv3_silage.pth")
GRADCAM_OUT_DIR = os.path.join(BASE_DIR, "gradcam_outputs")
MOBILE_DEMO_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "mobile", "assets", "demo", "gradcam"))

for p in [GRADCAM_OUT_DIR, MOBILE_DEMO_DIR]:
    os.makedirs(p, exist_ok=True)

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None

        self.target_layer.register_forward_hook(self._save_activation)
        self.target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate_heatmap(self, input_tensor, target_class=None):
        self.model.eval()
        self.model.zero_grad()

        output = self.model(input_tensor)
        if target_class is None:
            target_class = torch.argmax(output, dim=1).item()

        # Backward pass on target class logit
        one_hot = torch.zeros_like(output)
        one_hot[0, target_class] = 1.0
        output.backward(gradient=one_hot, retain_graph=True)

        # Global average pooling of gradients
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)

        # ReLU on activations
        cam = torch.relu(cam)

        cam = cam.squeeze().cpu().numpy()
        cam = np.maximum(cam, 0)
        max_val = np.max(cam)
        if max_val > 0:
            cam = cam / max_val
        else:
            cam = np.zeros_like(cam)

        return cam, target_class

def generate_overlay(image_path: str, cam: np.ndarray, alpha=0.55):
    """Blends 224x224 heatmap with original image using JET colormap."""
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        img_bgr = np.zeros((224, 224, 3), dtype=np.uint8)

    img_bgr = cv2.resize(img_bgr, (224, 224))
    heatmap = cv2.resize(cam, (224, 224))
    heatmap_uint8 = np.uint8(255 * heatmap)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    overlay = cv2.addWeighted(colored_heatmap, alpha, img_bgr, 1 - alpha, 0)

    # Calculate bounding box of primary activation hotspot (> 65% max activation)
    hotspots = np.where(heatmap > 0.65)
    bbox = None
    if len(hotspots[0]) > 0:
        ymin, ymax = int(np.min(hotspots[0])), int(np.max(hotspots[0]))
        xmin, xmax = int(np.min(hotspots[1])), int(np.max(hotspots[1]))
        bbox = {"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax}

    return overlay, bbox

def run_gradcam_on_sample(image_path: str, out_filename: str, target_class=None):
    from train_mobilenetv3 import MobileNetV3Silage

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MobileNetV3Silage(num_classes=3, pretrained=False).to(device)
    if os.path.exists(CHECKPOINT_PATH):
        model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))

    # Hook into last feature layer
    target_layer = model.features[-1]
    gcam = GradCAM(model, target_layer)

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return None

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    tensor = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    tensor = ((tensor - mean) / std).unsqueeze(0).to(device)

    cam, pred_class = gcam.generate_heatmap(tensor, target_class)
    overlay, bbox = generate_overlay(image_path, cam)

    out_path_1 = os.path.join(GRADCAM_OUT_DIR, out_filename)
    out_path_2 = os.path.join(MOBILE_DEMO_DIR, out_filename)
    cv2.imwrite(out_path_1, overlay)
    cv2.imwrite(out_path_2, overlay)

    return {
        "output_path": out_path_2,
        "predicted_class": pred_class,
        "hotspot_bbox": bbox
    }

if __name__ == "__main__":
    print("[*] Grad-CAM module initialized.")
