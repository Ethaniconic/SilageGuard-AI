# 📋 MODEL CARD — SILAGE SENSOR AI (RANDOM FOREST)

## Model Overview
* **Model Name**: SilageGuard On-Device Sensor Random Forest
* **Version**: `sensor_rf_v2.1`
* **Purpose**: Rapid on-farm classification of silage fermentation quality into triage categories (`Safe`, `Caution`, `Unsafe`) based on physical probe telemetry.
* **Architecture**: Random Forest Classifier (25 estimators, max depth 8, min samples split 6, min samples leaf 3, balanced class weighting).

---

## Technical Specifications

### Inputs
* `ph`: Acidity reading from analog electrode (float, valid range 2.0–12.0 pH).
* `moisture`: Estimated moisture percentage from capacitive probe (float, range 0–100%).
* `temperature`: Core pit probe temperature in °C from digital DS18B20 (float, -10 to 75°C).
* `ambient`: Ambient air temperature in °C from probe handle sensor (float, -10 to 60°C).
* `temp_rise` (engineered): Calculated as `temperature - ambient` (thermal differential $\Delta T$).

### Outputs
* **Primary Label**: One of `Safe`, `Caution`, `Unsafe`.
* **Class Probabilities**: Softmax-normalized probability vector $[P(\text{Safe}), P(\text{Caution}), P(\text{Unsafe})]$.
* **Confidence Metric**: $\max(P)$ expressed as a percentage.

---

## Training Data & Provenance

* **Training Data**: `datasets/processed/silage_sensor_v2.csv` (1,920 train samples across 48 simulated pits).
* **Real / Synthetic Composition**: **100% Synthetic Benchmark Data**. 0% physical field probe samples.
* **Data Sources**: Parametric distributions constrained by agronomic boundaries published in Kung et al. (2018) and Borreani et al. (2018).
* **Split Strategy**: `StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)` grouped by `pit_id` to prevent intra-pit sample leakage. Independent 20% pit holdout test set (12 pits, 480 samples).
* **Data Circularity Disclosure**:
  * Ground truth labels were computed by multi-factor threshold rules on `ph`, `moisture`, and $\Delta T$.
  * The Random Forest learns to approximate this synthetic rule boundary.
  * **High model accuracy on this benchmark represents algorithmic consistency, NOT real-world field efficacy.**

---

## Evaluation & Metrics

* **Evaluation Dataset**: 480 holdout samples from 12 unseen simulated pits.
* **Synthetic Benchmark Accuracy**: **94.38%**
* **Macro Precision**: **94.43%**
* **Macro Recall**: **94.82%**
* **Macro F1 Score**: **94.61%**
* **Per-Class Metrics**:
  * *Safe*: F1 = 95.72%, Recall = 96.20%, Precision = 95.24%
  * *Caution*: F1 = 93.28%, Recall = 92.50%, Precision = 94.08%
  * *Unsafe*: F1 = 94.84%, Recall = 95.77%, Precision = 93.97%
* **Calibration Metric**: Average Brier Score Loss = **0.0526** (reflects well-calibrated class probabilities).
* **Field Validation Status**: **PENDING** (On-farm pilot validation in progress).

---

## Feature Importances
1. `ph`: 38.42% (Primary chemical stabilization driver).
2. `temp_rise` ($\Delta T$): 28.15% (Aerobic yeast/mold respiration indicator).
3. `moisture`: 21.84% (Packing compaction and clostridial effluent driver).
4. `temperature`: 7.12% (Absolute core temperature).
5. `ambient`: 4.47% (Ambient baseline).

---

## Known Failure Modes & Limitations
1. **Uncalibrated Sensor Drift**: If the pH electrode drifts without 2-point buffer calibration, acidic silage may be classified as Caution/Unsafe.
2. **Soil / Ash Contamination**: Silage scooped from dirt floors may have alkaline ash that distorts the pH reading without representing microbial proteolysis.
3. **Moisture Permittivity Variations**: Capacitive sensors measure dielectric permittivity, which is affected by salt and mineral content; without oven-dry calibration, moisture is an estimate.
4. **No Direct Urea Quantification**: The sensor does not chemically identify urea molecules; it only detects hydronium ion activity.
5. **No Laboratory Replacement**: The model is an edge screening triage tool. Suspect silage must be sent for official wet-chemistry testing.

---

## Deployment & Edge Runtime
* **Deployment Format**: Serialized JSON Decision Tree ensemble (`sensor_rf_model.json`).
* **Runtime Engine**: Native TypeScript traversal engine (`mobile/ai/sensorInference.ts`) running on Hermes without Python or C++ dependencies.
* **Model Size**: ~18 KB (JSON file).
* **Inference Latency**: **< 2 milliseconds** per inference on mobile device.
* **Network Requirement**: **Zero (100% Offline)**.
