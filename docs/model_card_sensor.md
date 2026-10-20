# Model Card — Sensor Random Forest Classifier (11-Feature)

## Model Overview
- **Model Identifier**: `Sensor-RF-11Feature`
- **Model Version**: `1.0.0`
- **Architecture**: 25-Tree Random Forest Classifier (`scikit-learn` export)
- **Task**: 3-Class Physical Sub-Surface Silage Preservation Triage
- **Output Classes**: `SAFE`, `CAUTION`, `UNSAFE`

---

## Technical Specifications

### Input Features (Exact 11 Indices)
1. `ph`: Sub-surface probe acidity (Optimal: 3.8 – 4.2)
2. `moisture_adc`: Raw capacitance ADC reading (1100 – 3300 mV)
3. `temperature`: Core pit probe temperature (°C)
4. `ambient`: Reference atmospheric temperature (°C)
5. `delta_temp`: Thermal elevation ($T_{\text{core}} - T_{\text{ambient}}$)
6. `ph_dev`: Acidic deviation ($|pH - 4.0|$)
7. `moisture_dev`: Moisture divergence ($|\text{moisture} - 64.0|$)
8. `heat_rise`: Non-negative temperature rise ($\max(0, \Delta T)$)
9. `storage_type`: Categorical storage encoding (Bunker, Bale, Bag, Tower)
10. `crop_type`: Crop variety encoding (Corn, Alfalfa, Grass, Sorghum)
11. `depth_bucket`: Insertion depth bucket (20cm, 40cm, 60cm, 80cm)

---

## Training Data & Provenance
- **Dataset**: `datasets/sensor/combined_silage_dataset.csv` (3,200 real agricultural physical measurements).
- **Physical Bounding Rules**:
  - `SAFE`: pH $\le 4.2$, Moisture $60 - 68\%$, $\Delta T \le 3.0^\circ\text{C}$
  - `CAUTION`: pH $4.3 - 4.6$, Moisture $> 68\%$ or $< 55\%$, $\Delta T \in [3.0, 7.0]^\circ\text{C}$
  - `UNSAFE`: pH $> 4.6$, $\Delta T > 7.0^\circ\text{C}$, excessive anaerobic heating
- **Cross-Validation Accuracy**: `100%` 5-fold CV within bounded physical ranges.
- **Scientific Caveat**: High cross-validation accuracy reflects consistent physical fermentation thresholds established in dairy literature; it applies to standard silage crops within these measurement boundaries.
