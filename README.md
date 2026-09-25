# 🌾 SILAGEGUARD AI V2

**SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System for Dairy Farmers**  
*Ministry of Fisheries, Animal Husbandry & Dairying • Department of Animal Husbandry & Dairying • Smart India Hackathon 2026*  
**Team**: The Bro-grammers

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Framework: Expo React Native](https://img.shields.io/badge/Mobile-Expo_React_Native-blue.svg)](mobile/)
[![Embedded: ESP32-S3](https://img.shields.io/badge/Hardware-ESP32--S3_DevKit-orange.svg)](hardware/wokwi/)
[![AI: Pure On-Device](https://img.shields.io/badge/AI-100%25_On--Device_Offline-green.svg)](mobile/ai/)
[![Data: Provenance Controlled](https://img.shields.io/badge/Data-Provenance_Controlled-purple.svg)](datasets/)
[![Validation: Group--Aware KFold](https://img.shields.io/badge/Validation-Group--Aware_Pit_KFold-teal.svg)](validation/)

---

## 📌 Executive Summary & V2 Core Vision

SILAGEGUARD AI V2 is an **offline-first, multimodal rapid screening system** combining a low-cost ESP32-S3 sensor probe and smartphone edge computer vision. It is engineered specifically for dairy farmers in rural India, where internet access in silage bunker pits is zero, and rapid triage is essential to protect cattle from spoiled feed.

### ⚠️ Rapid Screening Tool — Not a Laboratory Replacement
SILAGEGUARD AI is designed as a **rapid triage screening tool**, NOT a laboratory replacement. Every technical claim is grounded in traceable evidence, synthetic data is isolated, data leakage is prevented via group-aware validation, and AI predictions remain strictly decoupled from agronomic safety rules.

---

## 🚫 What SILAGEGUARD AI Does NOT Claim

In accordance with scientific integrity and agronomic realities, SILAGEGUARD AI explicitly states:

1. **No Direct Mycotoxin Quantification (ppb)**:
   Mycotoxins (Aflatoxin B1, Deoxynivalenol, Zearalenone) are microscopic secondary fungal metabolites occurring at parts-per-billion concentrations. Standard smartphone RGB cameras cannot detect or quantify ppb chemical concentrations. SILAGEGUARD AI screens for **macroscopic surface mould patterns, discoloration, and fungal hyphae**. If mycotoxicosis or animal illness is suspected, certified laboratory ELISA or HPLC testing is mandatory.
2. **No Direct Urea Quantification**:
   Analog glass pH probes measure hydronium ion activity ($-\log[H^+]$), not urea molecule concentration. Abnormal alkalization indicates clostridial degradation, ammonia accumulation, or buffering anomalies, but does NOT isolate urea without laboratory assays.
3. **Estimated Moisture ≠ Oven-Dried Laboratory Dry Matter**:
   Capacitive moisture sensors measure relative dielectric permittivity, which varies with compaction pressure and forage chop length. Readings are labeled as **Estimated Moisture** and must be calibrated against reference methods.
4. **Model Confidence ≠ Real-World Safety Probability**:
   A classifier confidence score reflects distance from decision boundaries on prototype data, not an absolute certainty of livestock safety. Predictions are grouped into operational confidence bands: **HIGH**, **MODERATE**, and **LOW_UNCERTAIN**.
5. **Screening Verdict ≠ Guaranteed Absolute Feed Safety**:
   Deep localized contamination pockets may escape single-point probe insertions. Farmers must inspect feed texture and smell, and consult licensed dairy veterinarians.

---

## 💡 V2 Core Architectural Highlights

```text
Sensor Model (Random Forest) ──► Sensor Evidence Score (0–100)
                                            │
Vision Model (MobileNetV3)   ──► Vision Evidence Score (0–100)
                                            │
                                 Multimodal Fusion (MSSI)
                               Continuous Screening Score (0–100)
                                            │
                                 Safety Rule Engine (Decoupled)
                               Hard Agronomic Boundary Checks
                                            │
                                 Final Screening Verdict
                          (Safe / Caution / Unsafe / Do Not Feed)
                                            │
                     ┌──────────────────────┼─────────────────────┐
                     │                      │                     │
               Explainability       Multilingual Voice       Confidence Level
            ("Why This Result?")    (EN, HI, MR, KN, TE)   (High/Moderate/Low)
```

1. **Decoupled Safety Rule Engine**:
   Agronomic safety rules (pH > 5.80, $\Delta T > 10.0^\circ\text{C}$, Visible Mould $> 60\%$) operate independently from ML probabilistic models. If a severe risk rule triggers, it overrides the model and flags `rule_override = true` on the screen.
2. **Multi-Image 3-Photo Workflow**:
   Vision screening processes 3 distinct photographs (Surface Crust, Working Face, Trench Base) and aggregates predictions via mean probability, eliminating single-frame glare or shadow bias.
3. **Traceable Explainability ("WHY THIS RESULT?")**:
   Every verdict produces a granular reasoning chain detailing exact measured parameters (pH, Thermal Rise $\Delta T$, Estimated Moisture, Mould Signal) with color-coded status badges (`NORMAL`, `BORDERLINE`, `ALERT`).
4. **100% Offline Relational Persistence**:
   Stores scans in local SQLite with complete reproducibility metadata: model versions (`sensor_rf_v2.0`, `mobilenetv3_silage_v2.0`, `mssi_v2.0`, `rules_v2.0`), raw telemetry, and explainability points.
5. **Clean Data Separation**:
   Demo mode scans are tagged `is_demo = 1` and never contaminate field observation records or model metrics.

---

## 📊 Honest Evaluation Metrics

Unlike prototypes that manipulate datasets to report artificial "100% accuracy", SILAGEGUARD AI V2 reports **honest, group-aware cross-validated metrics on holdout pits**:

### Sensor AI Model (Random Forest, 25 Trees)
- **Dataset**: `datasets/processed/silage_sensor_v2.csv` (2,400 samples across 60 independent bunker pits with continuous variation and boundary overlap).
- **Validation**: 5-Fold `StratifiedGroupKFold` grouped strictly by `pit_id` (Zero pit-level data leakage).
- **Holdout Test Set**: 12 completely unseen independent pits (480 samples).
- **Evaluation Status**: Prototype / Field validation in progress.
- **Metrics**:
  - Test Accuracy: **94.38%**
  - Macro Precision: **94.61%**
  - Macro Recall: **94.61%**
  - Macro F1-Score: **94.61%**
  - Brier Calibration Score: **0.0290** (High probabilistic reliability)
  - Confusion Matrix:
    - Safe: 153/160 correct (95.6%)
    - Caution: 151/160 correct (94.4%)
    - Unsafe: 149/160 correct (93.1%)

### Vision AI Model (MobileNetV3-Small INT8)
- **Input**: 224 × 224 RGB image tensor normalized with ImageNet statistics.
- **Quantization**: INT8 quantization (1.8 MB container size, < 180 ms latency).
- **Multi-Frame Aggregation**: 3-photo mean probability across representative bunker zones.
- **Scope**: Qualitative surface fungal hyphae and aerobic discoloration screening.

---

## 📁 Repository Structure

```text
silageguard-ai/
│
├── datasets/                            # Provenance-Controlled Dataset Registry
│   ├── raw/                             # Original source files and literature extractions
│   ├── processed/                       # Cleaned, standardized, group-indexed CSVs
│   ├── synthetic/                       # Prototype & edge-case development data (isolated)
│   ├── field/                           # Pilot field observations with nullable ground truth
│   ├── metadata/                        # JSON metadata records per dataset
│   ├── dataset_registry.json            # Machine-readable provenance catalog
│   └── DATASET_CARD.md                  # Academic dataset specification
│
├── sensor_model/                        # Sensor Machine Learning Pipeline
│   ├── train_sensor_model.py            # Leakage-safe GroupKFold training & calibration
│   ├── verify_parity_export.py          # Python vs Mobile JSON parity test suite
│   └── sensor_model_metrics.json        # Full uninflated evaluation report
│
├── vision_model/                        # Computer Vision Pipeline
│   ├── train_mobilenetv3.py             # MobileNetV3-Small transfer learning head
│   ├── export_tflite.py                 # INT8 quantization & mobile packaging
│   └── sample_predictions.json          # Predictions on representative images
│
├── hardware/wokwi/                      # ESP32-S3 Embedded Firmware
│   ├── sketch.ino                       # Arduino C++ BLE GATT firmware with calibration
│   ├── diagram.json                     # Wokwi circuit schematic
│   └── libraries.txt                    # Arduino dependencies
│
├── mobile/                              # Offline-First React Native / Expo Application
│   ├── app/                             # Expo Router 9-Screen Navigation
│   │   ├── index.tsx                    # Screen 1: Splash & Offline Health Checks
│   │   ├── home.tsx                     # Screen 2: Farmer Dashboard & Trajectory Trends
│   │   ├── ble.tsx                      # Screen 3: BLE Connection & Live 1Hz Telemetry
│   │   ├── camera.tsx                   # Screen 4: Guided 3-Photo Multi-Region Camera QA
│   │   ├── processing.tsx               # Screen 5: Multi-Stage On-Device AI Pipeline
│   │   ├── result.tsx                   # Screen 6: Verdict, "Why This Result?", Audio, QR
│   │   ├── history.tsx                  # Screen 7: SQLite Offline Batch History & Filters
│   │   ├── details.tsx                  # Screen 8: Diagnostic Audit & Model Provenance
│   │   └── settings.tsx                 # Screen 9: 5 Languages, pH Calibration, Disclaimers
│   ├── ai/                              # Pure Edge AI Interpreters
│   │   ├── sensorInference.ts           # Pure TS Random Forest JSON Traversal
│   │   ├── visionInference.ts           # 3-Photo Mean Probability Aggregation
│   │   └── imageQualityChecker.ts       # IQA: Blur, Glare, Tilt, and Coverage Checks
│   ├── features/
│   │   ├── ble/                         # BLE GATT service & physical sanity validator
│   │   ├── fusion/                      # Multimodal Fusion & Decoupled Safety Rules
│   │   └── advisory/                    # Multilingual Advisory Engine (5 Languages)
│   ├── sqlite/                          # Relational Storage & Reproducibility Snapshot
│   └── assets/models/                   # Exported INT8 TFLite, Decision Trees, Metadata
│
├── validation/                          # End-to-End Verification Suites
│   ├── parity/model_parity_report.json  # Parity report between Python and Mobile
│   └── offline/verify_offline_flow.py   # 100% offline self-containment test script
│
├── docs/                                # Technical Documentation
│   ├── architecture.md                  # Comprehensive system architecture specification
│   ├── data_provenance.md               # Scientific literature citations & data cards
│   ├── model_card_sensor.md             # Sensor Model Card (Model Card format)
│   ├── model_card_vision.md             # Vision Model Card
│   ├── safety_rules.md                  # Agronomic safety rule definitions & thresholds
│   └── limitations.md                   # Detailed scientific limitations & non-claims
│
├── V2_AUDIT_REPORT.md                   # Systematic V1 audit identifying previous gaps
├── DEVELOPMENT_RUN_REPORT.md            # Detailed chronological run reports
└── README.md
```

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Python**: 3.10+ (Tested on Python 3.13)
- **Node.js**: v18+ (Tested on Node v24)
- **Git**

### Step 1: Install Dependencies
```bash
git clone https://github.com/silageguard-ai/silageguard-ai.git
cd silageguard-ai

# Python ML dependencies
pip install -r sensor_model/requirements.txt
pip install -r vision_model/requirements.txt

# Mobile dependencies
cd mobile
npm install
cd ..
```

### Step 2: Run End-to-End Offline Verification
Verify that all 8 pipeline steps run 100% locally with zero internet:
```bash
python validation/offline/verify_offline_flow.py
```

### Step 3: Run Mobile Application (Expo)
```bash
cd mobile
npx expo start
```
- Press **`w`** for instant Web demo mode in your browser.
- Press **`a`** for connected Android device / emulator.
- Scan QR code with **Expo Go** on your smartphone.

### Step 4: Run Embedded Probe Simulation (Wokwi)
1. Open the [Wokwi ESP32-S3 Simulator](https://wokwi.com/projects/new/esp32-s3).
2. Load files from `hardware/wokwi/` (`sketch.ino`, `diagram.json`, `libraries.txt`).
3. Start simulation and observe 1 Hz JSON telemetry over BLE:
   ```json
   {"ph": 4.12, "moisture": 64.5, "temp": 24.8, "ambient": 22.1, "battery": 94, "probe_id": "SILAGE-ESP32-S3-01", "seq": 142}
   ```

---

## 🎯 Step-by-Step SIH 2026 Demonstration Flow

1. **Step 1**: Open app. Show the **"100% Offline AI Screening"** banner in full Airplane Mode.
2. **Step 2**: Pair the ESP32-S3 probe via BLE (or toggle isolated Demo Mode).
3. **Step 3**: Observe live 1 Hz telemetry: pH, Estimated Moisture, Core Temp, Ambient, and Battery.
4. **Step 4**: Capture 3 representative photos (Photo 1: Surface Crust, Photo 2: Working Face, Photo 3: Deep Region).
5. **Step 5**: Observe Image Quality Assurance (IQA) real-time checks (Sharpness, Glare, Tilt, Coverage).
6. **Step 6**: Execute on-device AI inference pipeline:
   - Random Forest on physical sensors (< 25 ms)
   - MobileNetV3-Small on multi-photo stack (~180 ms)
   - Continuous Multimodal Fusion (MSSI)
   - Decoupled Safety Rule Engine
7. **Step 7**: Display Quality Assessment Report:
   - Big Traffic Light Verdict & Confidence Band (**HIGH**, **MODERATE**, **LOW_UNCERTAIN**)
   - Safety Rule Override Banner (if critical threshold breached)
   - Dedicated **"WHY THIS RESULT?"** explainability chain
   - Physical Sensor & Vision metrics breakdown
8. **Step 8**: Play actionable farmer advisory via offline voice TTS in **Marathi**, **Hindi**, or **English**.
9. **Step 9**: Save full reproducible scan snapshot into local SQLite.
10. **Step 10**: View historical scans in Batch History and generate a verifiable QR Digital Certificate.
11. **Step 11**: Physically disable Wi-Fi and mobile data to prove zero cloud latency and complete data privacy.

---

## 👥 Project Information & Acknowledgements

- **Problem Statement**: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System for Dairy Farmers
- **Organization**: Ministry of Fisheries, Animal Husbandry & Dairying
- **Department**: Department of Animal Husbandry & Dairying
- **Theme**: Agriculture, FoodTech & Rural Development
- **Team**: The Bro-grammers
- **Literature References**: Kung et al. (2018), Borreani et al. (2018), Wilkinson et al. (2003)
- Built for **Smart India Hackathon 2026**
