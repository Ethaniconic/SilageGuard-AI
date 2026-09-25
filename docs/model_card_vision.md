# 📋 MODEL CARD — SILAGEGUARD VISION AI (V2.0)

**Model Name**: SilageGuard MobileNetV3-Small Visual Screening Classifier  
**Model Version**: `mobilenetv3_silage_v2.0`  
**Model Release Date**: September 25, 2026  
**License**: MIT / Open Academic  
**Maintainers**: The Bro-grammers (SIH 2026)

---

## 1. Model Overview & Purpose

### 1.1 Intended Use
The **SilageGuard Vision AI Model** is an edge-optimized deep learning convolutional neural network designed to inspect smartphone photographs of silage bunker faces and pits. It performs **qualitative visual anomaly screening** by classifying surface patches into:
* **Safe**: Characteristic golden/olive-green chopped forage strands, uniform packing appearance, absence of fungal mycelium.
* **Caution**: Oxidized dark brown/caramelized patches, dry crust, moderate uncompacted edge browning.
* **Unsafe**: Visible mould-like colonies, filamentous white/cyan/grey fungal hyphae, black necrotic rot.

### 1.2 Explicit Non-Claims & Scientific Boundaries
* ❌ **No Direct Chemical Mycotoxin Quantification**: Standard smartphone RGB sensors cannot measure biochemical aflatoxin, deoxynivalenol (DON), or zearalenone concentrations in parts-per-billion (ppb).
* ❌ **No Urea Detection**: Visual cameras cannot measure nitrogen, urea, or crude protein percentages.
* ❌ **No Clinical Feed Certification**: Visual screening flags visible surface deterioration; absence of visible mold does not guarantee total absence of invisible microbial toxins.

---

## 2. Technical Specifications

* **Architecture**: `MobileNetV3-Small` (Howard et al., 2019) with ImageNet pretrained feature backbone.
* **Classifier Head**: Dropout ($p=0.25$) + Linear classification head ($1,024 \to 3$).
* **Input Resolution**: $224 \times 224 \times 3$ RGB.
* **Normalization**: $\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$.
* **Export Artifacts**:
  * PyTorch checkpoint: `vision_model/mobilenetv3_silage.pth`
  * Edge Container: `mobile/assets/models/mobilenetv3_silage_int8.tflite` (~1.8 MB)
* **Target Inference Runtime**: TensorFlow Lite React Native / On-Device Neural Accelerator.
* **Target Latency**: $\approx 18.4\text{ ms}$ on ARM Cortex-A55 / mobile NPU.

---

## 3. Data Provenance & Mandatory Limitations

> ⚠️ **MANDATORY SCIENTIFIC DISCLAIMER**:  
> **"Real-world validation dataset is currently limited; model performance on synthetic/prototype data should not be interpreted as field accuracy."**

* **Training Set**: 160 synthetic texture images (`datasets/synthetic/vision/`) generated for software pipeline validation, testing Albumentations augmentation behavior, and verifying TFLite quantization.
* **Multi-Image Inference Protocol**:
  To protect against isolated shadows, specular glare, or localized debris, the mobile application enforces a **3-Photo Capture Workflow**:
  1. Image 1: Pit top crust
  2. Image 2: Middle working face
  3. Image 3: Lower trench region
  The on-device engine averages class probabilities across all three images:
  $$P(\text{Class}) = \frac{1}{3} \sum_{i=1}^3 P_i(\text{Class})$$

---

## 4. Diagnostic Case Profiling

The model's evaluation suite includes explicit diagnostic test archetypes:

| Case ID | Archetype | Visual Characteristics | Model Behavior | Actionable Advisory |
|---|---|---|---|---|
| `V-01` | **Clean Forage** | Olive-green chopped corn fibers | Output: `Safe` ($P > 0.90$) | Safe for immediate feeding |
| `V-02` | **Dense Mold** | Confluent white/grey fungal mycelium | Output: `Unsafe` ($P > 0.95$) | Discard affected section immediately |
| `V-03` | **Ambiguous Caramelization** | Dark brown edges with moisture sheen | Output: `Caution` ($P \approx 0.60$) | Re-examine core with temperature probe |
| `V-04` | **Severe Glare / Blur** | Direct solar washout | Rejected by IQA | Farmer instructed to shade phone & retake |

---

## 5. Image Quality Assurance (IQA) Pre-Screening

Before feeding any image into MobileNetV3, the on-device IQA pipeline inspects:
1. **Luminance Check**: Flags frames with mean luminance $< 30$ (Too Dark) or $> 88$ (Solar Glare).
2. **Sharpness Check**: High-frequency gradient variance flags camera motion blur ($< 50$).
3. **Framing & Angle**: Guidance reticle prompts farmer to orient phone perpendicular to the bunker face.
