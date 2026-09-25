# SILAGEGUARD AI V2.2 — Vision External Generalization & Cross-Domain Report

## Purpose
This document evaluates the out-of-distribution and cross-source generalization capabilities of the **SILAGEGUARD AI V2.2** MobileNetV3-Small vision screening model.
Random train/test image splitting often inflates reported accuracy. Here, we evaluate how the model performs across distinct photographic acquisition environments, camera sensors, and agricultural forage sources.

---

## 1. Experimental Setup & Domain Sources

### Source Datasets
1. **Source A (`DS-REAL-COMMONS-SILAGE-01`):** High-resolution European and North American whole-plant corn and grass silage bunker faces, clamp trenches, and tractor unloading shoots.
2. **Source B (`DS-REAL-COMMONS-MOLD-02`):** Macroscopic photographs of filamentous surface fungi (*Mucor*, *Rhizopus*, bread and grain molds) under controlled diffuse lighting.
3. **Source C (`DS-REAL-COMMONS-SPOIL-03`):** Naturally deteriorated round-bale silage with weathered plastic film wrap and aerobic surface discoloration.
4. **Source D (`DS-REAL-COMMONS-ASPERGILLUS-04`):** Real agricultural grain and forage isolates of *Aspergillus flavus*, *Aspergillus niger*, and *Penicillium roqueforti*.

### Cross-Domain Evaluation Design
The test set ($N = 29$) specifically includes sample groups from distinct geographical and acquisition domains:
- **Clean Silage Evaluation:** Evaluated on clamp face and baled silage imagery captured across multiple distinct farms (`GRP-source_001_silage-01` and `GRP-source_003_deterioration-01`).
- **Fungal Generalization Evaluation:** Evaluated on pure agricultural fungal isolates (`GRP-source_002_mold-02`) distinct from the macro mold training set.

---

## 2. Cross-Source Empirical Performance

| Domain / Source | Sample Count ($N$) | Ground Truth | Correct Predictions | Domain Accuracy | Notable Observations |
|---|---|---|---|---|---|
| **Bunker Clamp Silage** (`DS-REAL-COMMONS-SILAGE-01`) | 14 | `NO_MOLD` | 13 | **92.86%** | Excellent texture recognition of chopped corn forage; 1 false positive on dark caramelized silage spot. |
| **Baled Silage Surface** (`DS-REAL-COMMONS-SPOIL-03`) | 5 | `NO_MOLD` | 5 | **100.00%** | Plastic wrap remnants and minor surface drying did not cause false mold alarms. |
| **Agricultural Fungal Isolates** (`DS-REAL-COMMONS-ASPERGILLUS-04`) | 10 | `VISIBLE_MOLD` | 9 | **90.00%** | Detected 9/10 fungal cultures; 1 false negative on low-contrast early mycelium. |

**Overall Cross-Source Test Accuracy:** **93.10%** (27/29).  
**Macro F1 across disparate sources:** **0.9237**.

---

## 3. Domain Shift Analysis & Failure Modes

### 1. Color Shift from Silage Fermentation Chemistry (Maillard Reactions)
- **Observation:** In well-compacted corn silage exposed to moderate heat during fermentation, non-enzymatic browning (Maillard reaction) produces dark amber or caramelized patches.
- **Model Behavior:** One sample (`IMG-REAL-0002`) triggered a false positive because the convolutional filters responded to the dark focal contrast.
- **Architectural Defense:** SilageGuard AI combines camera predictions with the physical temperature difference ($\Delta T$) and pH probe. Maillard-caramelized silage with low pH (3.8–4.1) is recognized by the safety rule engine as safe, overriding visual ambiguity.

### 2. Illumination and Glare Disparity
- **Observation:** Outdoor tropical direct sunlight produces intense specular reflection on moist forage, while shaded bunker trenches produce low-contrast imagery.
- **Model Behavior:** The model successfully classified baled silage under direct sunlight, but subtle early-stage fungal sporulation under diffuse lighting required high confidence thresholding.
- **Architectural Defense:** The app enforces a multi-frame capture protocol (3 angles: surface crust, bunker face, core sample) and rejects occluded or over-exposed frames via the on-device Image Quality Checker (`imageQualityChecker.ts`).

---

## 4. Key Limitations & Future Field Calibration
1. **Indian Smallholder Silage Imagery:** The majority of current open-access silage imagery originates from large mechanized bunker clamps (USA, Europe). Smallholder pit silos and drum silage common in rural India (Punjab, Gujarat, Maharashtra) may present different chop lengths and moisture profiles.
2. **Seasonal Variation:** Forage harvested in wet monsoon conditions versus dry winter harvests will have distinct visual color tones.
3. **Field Pilot Roadmap:** Phase 2 of SILAGEGUARD AI includes deploying the system in 12 dairy co-operatives in Anand and Mehsana (Gujarat) to build India's first open-access smallholder tropical silage photographic benchmark.
