# SilageGuard AI — Machine Learning Model Contracts

This document specifies the canonical schemas, input shapes, feature engineering pipelines, class labels, and mathematical parity constraints for both the Vision and Sensor models.

---

## 1. Vision Model Contract (MobileNetV3-Large INT8 ONNX & PyTorch)

- **Model Identifier**: `MobileNetV3-5Class`
- **Model Version**: `4.2.0`
- **Architecture**: `MobileNetV3-Large`
- **ONNX File**: `models/vision/mobilenetv3_silage.onnx`
- **PyTorch File**: `models/vision/mobilenetv3_silage.pth`
- **Task**: 5-Class Agronomic Silage Surface Spoilage & Mycotoxin Screening

### Input Specification
| Property | Value | Notes |
|---|---|---|
| **Input Node Name** | `input` | Defined in ONNX computation graph |
| **Data Type** | `tensor(float)` / `float32` | Standard normalized float32 |
| **Tensor Dimensions** | `[batch_size, 3, 224, 224]` | Batch size dynamic; channels first (NCHW) |
| **Channel Order** | RGB | Must be RGB (PIL format), NOT BGR |
| **Normalization Mean** | `[0.485, 0.456, 0.406]` | ImageNet standard mean |
| **Normalization Std** | `[0.229, 0.224, 0.225]` | ImageNet standard standard deviation |

### Output Specification
| Property | Value | Notes |
|---|---|---|
| **Output Node Name** | `probabilities` | Softmax normalized probabilities |
| **Data Type** | `tensor(float)` / `float32` | Sum of output row equals 1.0 |
| **Tensor Dimensions** | `[batch_size, 5]` | 5 class probability distribution |

### Canonical Class Mapping (Strict Alphabetical Indexing)
| Index | Class Name | Verdict Mapping | Mould Risk Factor | Agronomic Risk Tier |
|---|---|---|---|---|
| **0** | `Abnormal_appearance` | `CAUTION` | 0.35 | Moderate risk: uneven compaction or early aerobic respiration |
| **1** | `Foreign_object` | `UNSAFE` | 0.65 | Physical hazard: rocks, silo plastic, soil contamination |
| **2** | `Healthy` | `SAFE` | 0.00 | Optimal preservation: olive-gold lactic acid fermentation |
| **3** | `Mould` | `UNSAFE` | 1.00 | High biological hazard: filamentous mycotoxins (Aspergillus/Penicillium) |
| **4** | `Spoilage` | `UNSAFE` | 0.90 | High hazard: aerobic breakdown, slimy putrefaction, yeast bloom |

### Explainability (Grad-CAM)
- **Target Convolutional Layer**: `model.features[-1]` (output of the final inverted residual block before pooling).
- **Output**: 2D activation heatmap normalized [0, 1] overlaid with OpenCV `COLORMAP_JET` as base64 JPEG.
- **Hotspot Bounding Box**: Bounding box coordinates $[x, y, w, h]$ around max activation cluster ($> 0.6$ threshold).

---

## 2. Sensor Model Contract (25-Tree Random Forest)

- **Model Identifier**: `Sensor-RF-11Feature`
- **Model Version**: `1.0.0`
- **Format**: JSON decision trees (`models/sensor/sensor_rf_model.json`)
- **Estimators**: 25 decision trees
- **Classes**: `["SAFE", "CAUTION", "UNSAFE"]`

### Canonical Feature Schema
The model evaluates an 11-dimensional feature vector in exact index order:

| Index | Feature Name | Data Type | Physical Unit | Source | Expected Range | Description & Preprocessing |
|---|---|---|---|---|---|---|
| **0** | `ph` | `float` | pH units | Probe ADC | 3.0 – 8.5 | Raw probe pH. If null, model cannot run sensor path |
| **1** | `moisture_adc` | `float` | ADC (mV) | Probe ADC | 1100.0 – 3300.0 | $\max(1100.0, \min(3300.0, 3200.0 - (\text{moisture} / 100) \times 2000))$ |
| **2** | `temperature` | `float` | °C | DS18B20 | 0.0 – 65.0 | Sub-surface internal bunker temperature |
| **3** | `ambient` | `float` | °C | Sensor/Ref | 0.0 – 45.0 | Atmospheric reference temperature |
| **4** | `delta_temp` | `float` | °C | Derived | -10.0 – 35.0 | $T_{\text{core}} - T_{\text{ambient}}$ (Aerobic heat generation) |
| **5** | `ph_dev` | `float` | pH units | Derived | 0.0 – 4.5 | $\|pH - 4.0\|$ (Divergence from ideal fermentation) |
| **6** | `moisture_dev`| `float` | % | Derived | 0.0 – 40.0 | $\|\text{moisture} - 64.0\|$ (Divergence from target packing) |
| **7** | `heat_rise` | `float` | °C | Derived | 0.0 – 35.0 | $\max(0.0, \Delta T)$ (One-sided aerobic heating) |
| **8** | `storage_type`| `float` | Categorical | Metadata | 0.0 – 3.0 | 0=Bunker/Pit, 1=Bale, 2=Silage Bag, 3=Tower |
| **9** | `crop_type` | `float` | Categorical | Metadata | 0.0 – 3.0 | 0=Corn, 1=Alfalfa, 2=Grass, 3=Sorghum |
| **10**| `depth_bucket`| `float` | Categorical | Metadata | 0.0 – 3.0 | 0=20cm, 1=40cm, 2=60cm, 3=80cm |

---

## 3. Mathematical Parity (Backend Python vs Edge JavaScript)

The client-side engine (`frontend/services/ai/edgeInference.js`) and backend router (`backend/app/routers/inference.py`) implement the exact same tree traversal logic:

```javascript
for (const tree of trees) {
  let node = 0;
  while (tree.children_left[node] !== -1) {
    const featIdx = tree.feature[node];
    if (featVec[featIdx] <= tree.threshold[node]) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }
  // Aggregate leaf value probabilities
}
```

Both engines produce identical class probabilities and confidence scores to 4 decimal places.
