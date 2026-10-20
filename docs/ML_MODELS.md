# SILAGEGUARD AI — MACHINE LEARNING MODELS & FUSION CONTRACT
## Technical Specification of Vision, Sensor, and Decision Fusion Pipelines

> **STATUS**: Code Implemented, Validated with Benchmarks — Field Validation Ongoing.
> **Verification Script**: `scripts/verify_models.py` (23/23 tests pass).

---

## 1. Vision Model: MobileNetV3-Large Classifier

The vision model performs optical surface screening of silage bunk faces, wrapped bales, and core samples to detect visible fungal mycelium, clostridial spoilage, and foreign matter.

### Model Architecture & Runtime
- **Base Architecture**: MobileNetV3-Large (`torchvision.models.mobilenet_v3_large`)
- **Input Dimensions**: `[Batch, 3, 224, 224]` (Channels: RGB, Normalized)
- **Export Format**: ONNX Runtime (`models/vision/mobilenetv3_silage_classifier.onnx`) & PyTorch (`models/vision/best_mobilenetv3.pth`)
- **Runtime Engines**:
  - **Server (FastAPI)**: PyTorch & ONNX Runtime with CUDA/CPU fallback.
  - **Explainability**: PyTorch Grad-CAM on `features[-1]` bottleneck layer (produces 224x224 Jet-colormap heatmaps and bounding box hotspot isolation).
  - **Edge (Mobile/Web)**: Client-side image validation (IQA) + fallback ONNX runtime / FastAPI proxy.

### Input Normalization & Preprocessing
Input tensors are processed with standard ImageNet scaling:
$$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$
Pixel values scaled to $[0.0, 1.0]$ before normalization.

### 5-Class Taxonomy & Class Mapping
The model maps directly to 5 mutually exclusive condition classes:

| Index | Class Name | Agronomic Interpretation | Risk Tier |
|---|---|---|---|
| `0` | `Healthy` | Uniform olive-green/golden, firm lactic fermentation | SAFE |
| `1` | `Abnormal_Appearance` | Darkening, moisture discoloration, early oxidation | CAUTION |
| `2` | `Mould` | Filamentous fungal mycelia (white, green, blue-grey) | HIGH RISK |
| `3` | `Spoilage` | Slimy, dark brown/black putrefaction, clostridial breakdown | HIGH RISK |
| `4` | `Foreign_Object` | Soil clumps, plastic wrap fragments, gravel, metal | HIGH RISK |

### Engineering Benchmark vs. Field Reality
- **Validation Benchmark Accuracy**: 97.92% on curated held-out test split (192 balanced silage images).
- **Inference Latency**: 18ms – 35ms on CPU / 8ms on GPU.
- **Important Positioning**: High benchmark test accuracy does **not** guarantee 100% field generalization across all ambient sunlight variations, rain, or dirty lenses. The built-in Image Quality Assessment (IQA) filters out blurry, dark, or covered camera frames before inference.

---

## 2. Sensor Model: 25-Tree Random Forest

The sensor pipeline interprets anaerobic biochemical fermentation metrics gathered from the physical probe inserted into the silage core.

### Model Architecture & Runtime
- **Architecture**: Balanced Random Forest Classifier (25 decision trees, max depth = 6)
- **Artifacts**:
  - `models/sensor/sensor_random_forest.json`: Complete serialized tree structure with split thresholds, feature indices, and leaf class distributions (evaluates offline without scikit-learn).
  - `models/sensor/sensor_model_metrics.json`: Accuracy, precision, recall, and F1-score evaluation metrics.
- **Runtime Engines**:
  - **Backend (Python)**: Traversed natively via `SensorRFClassifier` service or scikit-learn.
  - **Client (JavaScript)**: Traversed natively via `frontend/services/ai/edgeInference.js` (`runSensorRF`) for 100% offline, zero-internet prediction.

### Authoritative 11-Feature Vector Contract
The model expects exactly 11 features in the following strict order:

| Index | Feature Name | Unit | Agronomic Description | Safe Reference Range |
|---|---|---|---|---|
| `0` | `ph` | pH | Silage core acidity (primary fermentation marker) | 3.8 – 4.2 |
| `1` | `moisture` | % | Moisture content | 60.0% – 68.0% |
| `2` | `temperature` | °C | Deep core probe temperature | ≤ 30.0°C |
| `3` | `ambient_temp` | °C | Reference ambient air temperature | Baseline |
| `4` | `delta_temp` | °C | $T_{\text{core}} - T_{\text{ambient}}$ (heat rise) | ≤ 3.0°C |
| `5` | `volatile_organic_acids` | % DM | Lactic / acetic acid fermentation total | 3.0% – 6.0% |
| `6` | `ammonia_nitrogen` | % Total N | Proteolysis marker | < 10.0% |
| `7` | `dry_matter` | % | $100 - \text{moisture}$ | 32.0% – 40.0% |
| `8` | `storage_days` | days | Days ensiled since closing | ≥ 21 days |
| `9` | `packing_density` | kg/m³ | Bunker compaction density | ≥ 220 kg/m³ |
| `10` | `probe_depth` | cm | Probe insertion penetration depth | ≥ 30 cm |

*Note: For field operation when biochemical laboratory parameters (e.g., volatile organic acids, ammonia nitrogen) are not wired to physical probe sensors, robust agronomic defaults based on standard silage silage maturity and depth are applied.*

### Sensor Output Classes
- `SAFE` (Optimal lactic acid fermentation, cool core, pH ≤ 4.2)
- `CAUTION` (Elevated temperature rise or pH between 4.3 and 4.8)
- `UNSAFE` (Aerobic deterioration, heating $\Delta T > 6^\circ\text{C}$, or pH $\ge 5.0$)

---

## 3. Multimodal Safety Fusion (MSSI) & Safety Rules

### Fusion Weights
When both sensor telemetry and camera images are present:
$$\text{MSSI} = 0.55 \times \text{SensorScore} + 0.45 \times \text{VisionScore}$$

- **Sensor-Only Mode**: $\text{MSSI} = \text{SensorScore}$ (Probe connected, camera skipped)
- **Vision-Only Mode**: $\text{MSSI} = \text{VisionScore}$ (Probe omitted, optical surface screening)

### Deterministic Safety Rules Engine
Machine learning model probabilities never override critical microbiological safety thresholds. The deterministic rule engine (`backend/app/services/safety_rules.py` and `frontend/services/ai/safetyRules.js`) acts as an immutable safety guardrail:

```text
EVALUATE SAFETY RULES:
  RULE 1: pH >= 5.0                → TRIGGERED: HIGH RISK ("Severe fermentation failure. Clostridial risk.")
  RULE 2: delta_temp >= 8.0°C      → TRIGGERED: HIGH RISK ("Intense aerobic heating in core.")
  RULE 3: Visual Spoilage/Mould    → TRIGGERED: HIGH RISK ("Visible fungal mycelium or decomposition.")
  RULE 4: Moisture > 72.0%         → TRIGGERED: CAUTION   ("High moisture: butyric acid fermentation risk.")
  RULE 5: pH between 4.6 and 4.9   → TRIGGERED: CAUTION   ("Inadequate acidification. Monitor bunker.")
```

If any safety rule triggers, the **final verdict** is locked to `HIGH RISK` or `CAUTION`, regardless of raw model confidence.
