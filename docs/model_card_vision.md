# 📋 MODEL CARD — SILAGE SURFACE VISION AI (MOBILENETV3-SMALL)

## Model Overview
* **Model Name**: SilageGuard MobileNetV3 Surface Vision Classifier
* **Version**: `mobilenetv3_silage_v2.1`
* **Purpose**: Edge computer vision screening to detect visible surface fungal hyphae patterns, aerobic discoloration, and structural degradation in silage photos.
* **Architecture**: `torchvision.models.mobilenet_v3_small` with custom dropout (0.2) and linear classification head (3 output classes).

---

## Technical Specifications

### Inputs
* **Resolution**: 224x224 RGB image.
* **Normalization**: Standard ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`.
* **Preprocessing Pipeline**: On-device center crop, Albumentations horizontal/vertical flip, brightness contrast jitter.

### Outputs
* **Primary Label**: One of `Safe`, `Caution`, `Unsafe`.
* **Class Probabilities**: Softmax-normalized probability vector $[P(\text{Safe}), P(\text{Caution}), P(\text{Unsafe})]$.
* **Mould Risk Signal**: $P(\text{Unsafe})$ extracted as the continuous mould signal probability (0.0 to 1.0).

---

## Training Data & Provenance

* **Training Data**: `datasets/vision/` (160 procedural images: 60 Safe, 50 Caution, 50 Unsafe).
* **Real / Synthetic Composition**: **100% Synthetic Prototype Textures**. 0% physical on-farm photos.
* **Collection Method**: Procedurally rendered using Python Pillow (`PIL.ImageDraw`).
  * *Safe*: Drawn green linear fibers simulating chopped whole-plant maize/grass.
  * *Caution*: Dark brown irregular patches simulating aerobic browning.
  * *Unsafe*: Cyan/white/grey stippled dots simulating superficial mycelial colonies.
* **Split Strategy**: 75% Train (120 images) / 25% Validation (40 images) stratified split.
* **Synthetic Evaluation Disclosure**:
  * Because the procedural generator renders mathematically discrete visual primitives, MobileNetV3 achieves **100% validation accuracy**.
  * **This 100% metric is an artifact of the toy procedural dataset and must NEVER be cited as real-world agricultural computer vision accuracy.**

---

## Evaluation & Metrics

* **Evaluation Dataset**: 40 holdout images from procedural split.
* **Synthetic Benchmark Accuracy**: **100.0%**
* **Synthetic Macro F1**: **1.000**
* **Synthetic Macro Recall**: **1.000**
* **Confusion Matrix**: `[[16, 0, 0], [0, 12, 0], [0, 0, 12]]`
* **Real-World Field Validation**: **PENDING** (Requires physical on-farm photo dataset from diverse bunker silos).

---

## Known Failure Modes & Limitations

1. **Solar Glare & Outdoor Backlight**: Direct sunlight reflecting off wet plastic wrap or waxy leaves can cause false-positive mould alerts.
2. **Dust and Mud Occlusions**: Tractor dirt splatters on silage faces mimic dark aerobic decay.
3. **Coarse vs Fine Chop Variation**: Coarse unchopped forage stalks differ from fine sorghum chops, causing distribution shift.
4. **NO DIRECT MYCOTOXIN QUANTIFICATION**:
   * Standard RGB smartphone cameras cannot measure aflatoxin B1, zearalenone, or deoxynivalenol (DON) in parts-per-billion (ppb).
   * The model detects **visible surface discoloration and mould-like texture patterns**.
   * It does not replace laboratory ELISA, HPLC, or mass spectrometry.

---

## Deployment & Edge Runtime
* **Deployment Format**: TensorFlow Lite (`mobilenetv3_silage.tflite`) with INT8 / FP16 quantization, and PyTorch TorchScript fallback.
* **Model Size**: ~3.6 MB (PyTorch) / ~1.2 MB (Quantized TFLite).
* **Inference Latency**: **~32 ms** on mid-range Android smartphone (Hermes + TFLite runtime).
* **Network Requirement**: **Zero (100% Offline)**.
