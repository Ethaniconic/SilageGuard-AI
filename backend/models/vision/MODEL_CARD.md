# MODEL CARD — SilageGuard MobileNetV3-Small Vision Screening Model (V2.2)

## Model Details
- **Model Name:** SilageGuard-MobileNetV3-Small-RealData
- **Model Version:** `mobilenetv3_silage_v2.2_real`
- **Model Architecture:** MobileNetV3-Small (pre-trained on ImageNet-1K, fine-tuned on real silage and mycological photography)
- **Parameters:** ~1.52 Million
- **Model Formats:** PyTorch (`.pth`), ONNX (`.onnx`), TorchScript Mobile (`.ptl`), TFLite INT8 (`.tflite`)
- **Model Size:** 1.72 MB (TFLite quantized) / 5.81 MB (ONNX)
- **Inference Runtime:** On-device mobile inference (TensorFlow Lite / TorchScript Mobile)
- **Target Latency:** 14.8 ms on ARM Cortex-A55 mobile CPU
- **Power Efficiency:** 0.038 W average power draw during inference
- **Release Date:** September 2026

---

## Intended Use
- **Primary Task:** Rapid visual screening of silage surface appearance and visible mould-like anomalies.
- **Intended Users:** Dairy farmers, agricultural extension workers, silage contractors, livestock farm managers.
- **Operating Environment:** Offline field triage on entry-level Android/iOS smartphones without internet connectivity.
- **Output:** Continuous mould probability ($P(\text{VISIBLE\_MOLD}) \in [0.0, 1.0]$) and qualitative screening indicator (`LOW`, `MODERATE`, `HIGH`).

---

## Out-of-Scope / Not Intended For
This model is explicitly **NOT intended for, nor capable of**:
1. Direct biochemical quantification of mycotoxins in parts per billion (ppb) or ppm (including Aflatoxin $B_1$, Deoxynivalenol, Zearalenone, Ochratoxin A, T-2 toxin).
2. Direct nutritional analysis (Crude Protein %, Dry Matter %, NDF %, ADF %, TDN).
3. Chemical adulteration quantification (Urea %, Nitrates, heavy metals).
4. Direct fermentation acid quantification (lactic acid %, acetic acid %, butyric acid %).
5. Certification of absolute microbiological safety.

---

## Training Data & Provenance
Trained **strictly on 100% real photographs** with verified open licenses (Creative Commons / Public Domain). **Zero synthetic or diffusion images were used.**

- **Total Training Images:** 55 real photographs (8 disjoint sample groups)
- **Validation Images:** 15 real photographs (3 disjoint sample groups)
- **Primary Sources:**
  - `DS-REAL-COMMONS-SILAGE-01`: Bunker clamp, trench, and baled silage imagery.
  - `DS-REAL-COMMONS-MOLD-02`: Real macroscopic fungal mold photographs.
  - `DS-REAL-COMMONS-SPOIL-03`: Weathered baled forage deterioration imagery.
  - `DS-REAL-COMMONS-ASPERGILLUS-04`: Agricultural *Aspergillus* and *Penicillium* isolates.

---

## Evaluation Data & Performance (Independent Held-Out Test Set)
Evaluated on **29 independent real photographs** (4 disjoint sample groups) never seen during training or hyperparameter tuning:

- **Accuracy:** **93.10%** (27 / 29)
- **Macro Precision:** **0.9237**
- **Macro Recall:** **0.9237**
- **Macro F1-Score:** **0.9237**
- **Mould Recall (Safety Target):** **90.00%** (9 / 10 true fungal samples identified)
- **Clean Silage Specificity:** **94.74%** (18 / 19 clean forage samples identified)
- **Brier Calibration Score:** **0.0624** (low probability error)
- **Expected Calibration Error (ECE):** **0.0773** (< 8% calibration error)
- **Confusion Matrix:** True Negative: 18, False Positive: 1, False Negative: 1, True Positive: 9

---

## Explainability (Grad-CAM)
The model incorporates Grad-CAM explainability hooks on the final convolutional feature extractor (`features[-1]`). In real testing:
- **Positive Mold Detections:** Saliency maps tightly localize on fungal hyphae and sporulating surface mycelium.
- **Clean Silage Detections:** Diffuse low-level activations across chopped forage fiber textures without focal peaks.
- **Artifact Verification:** Confirmed that activations do not localize on image borders, watermarks, or background equipment.

---

## Ethical Considerations & Limitations
1. **Visual vs Chemical Dissociation:** Published literature confirms that visible mold presence does not always correlate linearly with measured chemical mycotoxin concentration. Non-mouldy silage can occasionally contain mycotoxins, and visible mold may be non-toxigenic. Hence, visual screening must always be integrated with sensor telemetry (pH, $\Delta T$).
2. **Geographical Representation:** Training imagery represents temperate and subtropical whole-crop maize and grass silage. Tropical silage varieties (pearl millet, sorghum, hybrid napier) are currently under-represented.
3. **Lighting & Camera Quality:** Harsh shadows, lens smudges, or camera flash glare can affect classification. SilageGuard AI includes an on-device Image Quality Checker to reject degraded frames before inference.
