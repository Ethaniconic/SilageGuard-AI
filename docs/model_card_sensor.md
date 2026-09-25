# 📋 MODEL CARD — SILAGEGUARD SENSOR AI (V2.0)

**Model Name**: SilageGuard Sensor Random Forest Classifier  
**Model Version**: `sensor_rf_v2.0`  
**Model Release Date**: September 25, 2026  
**License**: MIT / Open Academic  
**Maintainers**: The Bro-grammers (SIH 2026)

---

## 1. Model Overview & Purpose

### 1.1 Intended Use
The **SilageGuard Sensor AI Model** is an on-device machine learning classifier engineered to provide rapid, edge-based silage fermentation screening for dairy farmers. It evaluates multi-sensor telemetry collected from an inserted probe (acidity, core temperature, moisture) to classify fermentation condition into:
* **Safe** (Optimal anaerobic lactic preservation)
* **Caution** (Early aerobic exposure or moisture deviation; feed within 6 hours)
* **Unsafe** (Elevated pH or severe heat rise; high spoilage risk)

### 1.2 Out-of-Scope & Prohibited Use
* **Not a Laboratory Replacement**: Does not quantify individual volatile fatty acids (lactic, acetic, propionic, butyric) or ammonia-N fractions in g/kg.
* **No Direct Urea Detection**: Cannot quantify urea concentration in feedstuffs without enzymatic reagents.

---

## 2. Input Features & Preprocessing

The model operates on an 8-dimensional feature vector engineered from raw probe telemetry:

| Feature Index | Name | Unit | Type | Definition |
|---|---|---|---|---|
| `0` | `ph` | pH (0–14) | Float | Measured physical silage acidity |
| `1` | `moisture` | % | Float | Measured moisture percentage |
| `2` | `temperature` | °C | Float | Measured core silage temperature |
| `3` | `ambient` | °C | Float | Measured environmental air temperature |
| `4` | `delta_temp` | °C | Float | $\text{temperature} - \text{ambient}$ |
| `5` | `ph_deviation` | pH | Float | $|\text{ph} - 4.00|$ |
| `6` | `moisture_deviation` | % | Float | $|\text{moisture} - 64.00|$ |
| `7` | `temp_rise` | °C | Float | $\max(0, \text{delta_temp})$ |

---

## 3. Training & Validation Methodology

### 3.1 Dataset Provenance & Grouping
* **Dataset**: `datasets/processed/silage_sensor_v2.csv` ($N = 2,400$ records across 60 bunker pits and 10 farms).
* **Grouping Column**: `pit_id` (Ensures all samples from any specific pit reside exclusively in either the training set or test set).
* **Split Strategy**:
  * 5-Fold Cross Validation: `StratifiedGroupKFold(n_splits=5, shuffle=True)`
  * Independent Pit Test Split: 48 training pits ($n = 1,920$) vs. 12 untouched test pits ($n = 480$).

### 3.2 Benchmark Comparison Across Candidates

| Model Architecture | 5-Fold Stratified Group Macro F1 | Test Accuracy | Test Macro F1 | Inference Latency | Model Size |
|---|---|---|---|---|---|
| **Random Forest (Selected)** | **0.9792** ($\pm 0.0084$) | **94.38%** | **94.61%** | **< 1.0 ms** (Pure TS) | **7.2 KB** |
| HistGradientBoosting | 0.9858 ($\pm 0.0081$) | 95.21% | 95.34% | ~8.0 ms (WASM) | 85 KB |
| Logistic Regression | 0.9407 ($\pm 0.0198$) | 90.83% | 91.12% | < 0.5 ms | 1.2 KB |

*Selection Rationale*: Random Forest was selected for deployment because its decision tree graph can be serialized into a zero-dependency portable JSON structure that executes directly in TypeScript on mobile devices in $< 1\text{ ms}$ without needing heavy WASM or Python runtimes.

---

## 4. Quantitative Evaluation & Honest Metrics

*Evaluated on the independent 12-pit test holdout set ($n = 480$ observations):*

### 4.1 Overall Metrics
* **Accuracy**: **94.38%**
* **Macro Precision**: **94.51%**
* **Macro Recall**: **94.81%**
* **Macro F1 Score**: **94.61%**
* **Average Brier Calibration Score**: **0.0290** (High probabilistic calibration; $0.0$ is perfect)

### 4.2 Per-Class Breakdown

| Class | Support ($N$) | Precision | Recall | F1-Score |
|---|---|---|---|---|
| **Safe** | 125 | 0.95 | 0.98 | **0.97** |
| **Caution** | 172 | 0.90 | 0.95 | **0.92** |
| **Unsafe** | 183 | 0.98 | 0.91 | **0.95** |

### 4.3 Feature Importance Ranking (Gini Impurity Reduction)
1. `ph_deviation`: **0.3014**
2. `temp_rise`: **0.2523**
3. `delta_temp`: **0.1691**
4. `ph`: **0.1384**
5. `moisture`: **0.0821**
6. `moisture_deviation`: **0.0412**
7. `temperature`: **0.0155**
8. `ambient`: **0.0000** (Used solely as reference subtraction)

---

## 5. Known Limitations & Edge Cases

1. **Borderline Transitions**:
   Between pH 4.25 and 4.35, when temperature rise is marginal ($+3.2^\circ\text{C}$), the model outputs moderate confidence (~60–75%). The mobile UI must explicitly present this as "Moderate Confidence" rather than absolute certainty.
2. **Sensor Hardware Glitches**:
   Floating ADC pins or broken pH bulbs can supply non-physical values ($>14.0\text{ pH}$). The mobile layer must filter readings through physical bounds prior to inference.
3. **Screening Boundary**:
   The model flags elevated risk; farmers should always follow conservative feeding advice and seek veterinary verification for suspect forage.
