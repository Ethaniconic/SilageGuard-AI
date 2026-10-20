# Model Card — Silage Surface Vision AI (MobileNetV3-Large 5-Class)

## Model Overview
- **Model Identifier**: `MobileNetV3-5Class`
- **Model Version**: `4.2.0`
- **Architecture**: `MobileNetV3-Large` (Quantized INT8 ONNX + PyTorch `.pth`)
- **Task**: 5-Class Agronomic Silage Surface Spoilage & Mycotoxin Screening
- **Framework**: PyTorch 2.4.0 + CUDA, exported via ONNX Runtime

---

## Technical Specifications

### Input
- **Input Tensor**: `input` `[1, 3, 224, 224]`
- **Color Format**: RGB
- **Normalization**: ImageNet Mean `[0.485, 0.456, 0.406]`, Std `[0.229, 0.224, 0.225]`

### Output
- **Output Tensor**: `probabilities` `[1, 5]` (Softmax normalized probabilities)
- **Classes**:
  1. `Abnormal_appearance` (Index 0)
  2. `Foreign_object` (Index 1)
  3. `Healthy` (Index 2)
  4. `Mould` (Index 3)
  5. `Spoilage` (Index 4)

---

## Training Data & Provenance
- **Dataset**: Partitioned train/test split across the 5 verified agronomic classes (`datasets/train` and `datasets/test`).
- **Data Augmentation**: Albumentations ColorJitter, RandomResizedCrop, HorizontalFlip, GaussianBlur.
- **Optimization**: CrossEntropyLoss with AdamW ($\text{lr} = 10^{-4}$), CosineAnnealingLR scheduling.

---

## Performance & Evaluation Metrics
- **Accuracy**: `73.33%`
- **Macro F1 Score**: `0.7364`
- **Macro ROC AUC**: `0.9250`
- **Mould Specific Precision**: `96.15%` (0.9615)
- **Mould Specific Specificity**: `99.17%` (0.9917)
- **Expected Calibration Error (ECE)**: `0.08`
- **Brier Score**: `0.3882`

---

## Explainability (Grad-CAM)
- **Target Layer**: `features[-1]`
- Highlights visual attention regions influencing the predicted class.
- Generates localized hotspot bounding boxes for fungal mycelium clusters.
- **Scientific Caveat**: Grad-CAM visualizes model activations; it is not analytical chemical proof of mycotoxin concentration.
