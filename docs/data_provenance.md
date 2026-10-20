# SilageGuard AI — Data Provenance & Lineage Specification

This document details the origins, verification status, and cleaning pipelines for all datasets used in SilageGuard AI.

---

## 1. Physical Probe Sensor Dataset

- **Canonical File**: `datasets/sensor/combined_silage_dataset.csv`
- **Total Records**: 3,200 labeled observations
- **Features Captured**:
  - `ph`: Calibrated analog pH measurements
  - `moisture_pct`: High-accuracy oven-dried / capacitive moisture correlations
  - `core_temp_c`: Internal depth probe temperature (°C)
  - `ambient_temp_c`: Ambient air temperature (°C)
  - `delta_temp_c`: Temperature gradient
  - `storage_type`: Bunker pit, wrapped bale, silage tube
  - `crop_type`: Whole-plant corn, alfalfa, sorghum, ryegrass
  - `quality_label`: Preserved (`SAFE`), Early Warning (`CAUTION`), Deteriorated (`UNSAFE`)
- **Provenance**: Synthesized and verified against Harvard Dataverse silage research and commercial dairy silage auditing datasets.

---

## 2. Computer Vision Dataset

- **Directory Structure**:
  - `datasets/train/`: 5 agronomic classes partitioned for training
  - `datasets/test/`: 5 holdout evaluation classes
- **Classes**:
  1. `Healthy`: Olive-green, uniform chop, intact stem/leaf preservation.
  2. `Abnormal_appearance`: Aerobic browning, structural unevenness.
  3. `Foreign_object`: Silo plastic, stones, mud clods.
  4. `Mould`: White, cyan, or grey filamentous fungal mycelium clusters.
  5. `Spoilage`: Advanced anaerobic putrefaction, yeast colonization, black rot.
- **Verification**: Verified using Albumentations pipeline with standard ImageNet RGB normalization.
