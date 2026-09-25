# 🌾 SILAGEGUARD AI V2.2

**SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System for Dairy Farmers**  
*Ministry of Fisheries, Animal Husbandry & Dairying • Department of Animal Husbandry & Dairying • Smart India Hackathon 2026*  
**Team**: The Bro-grammers  
**Design Philosophy**: 100% Real Vision Data • Offline-First • Edge AI • Multimodal • Farmer-Friendly • Scientifically Transparent

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Mobile: Expo React Native](https://img.shields.io/badge/Mobile-Expo_React_Native-blue.svg)](mobile/)
[![Embedded: ESP32-S3](https://img.shields.io/badge/Hardware-ESP32--S3_DevKit-orange.svg)](hardware/wokwi/)
[![AI: Pure On-Device](https://img.shields.io/badge/AI-100%25_On--Device_Offline-green.svg)](mobile/ai/)
[![Vision Data: 100% Real](https://img.shields.io/badge/Vision_Data-100%25_Real_Photographs-success.svg)](datasets/metadata/VISION_DATA_CARD.md)
[![Scientific Integrity: Audited V2.2](https://img.shields.io/badge/Scientific_Status-Audited_V2.2-gold.svg)](docs/validation_status.md)

---

## 1. Problem

In rural India, over 70% of dairy cattle nutrition depends on conserved forage and silage during dry summer months. However, poor anaerobic compaction, delayed pit sealing, and oxygen intrusion trigger clostridial spoilage, aerobic heating, and toxic mold proliferation.

Dairy farmers face severe challenges:
* **No Field Testing Tools**: Traditional wet-chemistry feed analysis takes 5–10 days and costs ₹1,500–₹3,000 per sample, requiring transport to regional agricultural universities.
* **Invisible Spoilage**: Silage can appear normal on top while harboring dangerous clostridial degradation or runaway heating deeper inside the pit.
* **Zero Connectivity**: Bunker pits and trenches are located in rural fields with zero cellular connectivity, rendering cloud-dependent AI applications unusable.
* **Economic Losses**: Feeding degraded silage leads to acidosis, severe milk yield drops (15–30%), reproductive failures, and animal mortality.

---

## 2. Solution

**SILAGEGUARD AI V2.2** is an **offline-first, multimodal rapid screening system** combining a low-cost ESP32-S3 multi-sensor core probe with smartphone edge computer vision trained on **100% real agricultural photographs**.

Within 60 seconds of probe insertion and a 3-photo camera capture, the smartphone runs two independent on-device AI models, fuses the telemetry, checks agronomic safety rules, and delivers:
1. **Multimodal Silage Safety Index (MSSI)**: Continuous 0–100 quality score.
2. **Traffic-Light Triage**: Clear result (`LOW SCREENING RISK`, `FEED WITH CAUTION`, `UNSAFE / DO NOT FEED`).
3. **Data-Driven Explainability**: Direct breakdown of measured pH, core heat rise ($\Delta T$), estimated moisture, and visual mold signals.
4. **Multilingual Actionable Advisory**: Instant voice playback in Marathi, Hindi, and English.
5. **Offline Record & QR Verification**: Stored in local SQLite and encoded into a scannable batch report QR.

> ⚠️ **Scientific Classification**: SILAGEGUARD AI is an **on-farm rapid triage screening tool**, NOT a laboratory replacement.

---

## 3. Architecture

```text
ESP32-S3 Core Probe (GPIO 1, 2, 4)
      │
      │ BLE 5.0 GATT (1 Hz JSON Telemetry)
      ▼
React Native Mobile App (100% Offline)
      │
      ├── Sensor AI (On-Device Random Forest, pure TypeScript JSON traversal)
      ├── Vision AI (On-Device MobileNetV3-Small, quantized TFLite & TorchScript)
      ├── Multimodal Fusion Engine (MSSI Continuous Score 0–100)
      ├── Decoupled Safety Rule Engine (Hard Agronomic Override Thresholds)
      ├── Explainability Chain ("WHY THIS RESULT?" Data-Driven Traceability)
      ├── Multilingual Advisory Engine (Marathi / Hindi / English TTS)
      └── Local Persistence (Offline SQLite DB & QR Code Generator)
```

The app architecture strictly separates:
* **Evidence Generation**: Sensor AI and Vision AI produce independent probability vectors.
* **Fusion Score**: Continuous MSSI calculation with transparent prototype weights (55% sensor / 45% vision).
* **Safety Rules**: Decoupled agronomic checks that override statistical probabilities during critical spoilage.
* **Triage Presentation**: Clear screening recommendations with verified limitations.

---

## 4. Hardware

The hardware probe is engineered for rugged farm conditions with standard, low-cost off-the-shelf components:

| Component | Interface | Measurement | Agronomic Role |
|---|---|---|---|
| **ESP32-S3 DevKitC-1** | 240 MHz Dual-Core, BLE 5.0 | Microcontroller & BLE Server | Telemetry transmission & sequence tracking |
| **Industrial Glass pH Probe** | Analog BNC to ADC1 Ch1 (GPIO 2) | Hydronium ion activity ($2.0–12.0$ pH) | Fermentation acidity & clostridial warning |
| **Capacitive Moisture v1.2** | Analog ADC1 Ch0 (GPIO 1) | Relative dielectric permittivity ($0–100\%$) | Compaction & effluent leaching risk |
| **DS18B20 Digital Probe** | 1-Wire Digital Bus (GPIO 4) | Core temperature ($-10^\circ\text{C to } 75^\circ\text{C}$) | Aerobic yeast/mold runaway heating |
| **Ambient Air Temp Sensor** | 1-Wire handle sensor | Ambient baseline temp | Reference for thermal differential ($\Delta T$) |

### Hardware Honesty & Simulation Mode Separation
* Firmware (`hardware/wokwi/sketch.ino`) automatically detects physical sensor attachment.
* Telemetry JSON includes explicit mode flag: `"mode": "REAL_SENSOR"` vs `"mode": "WOKWI_SIMULATION"`.
* The mobile app visibly displays whether live data originates from a physical probe or a simulated telemetry stream.

---

## 5. AI Pipeline

### A. Sensor AI: On-Device Random Forest
* **Architecture**: Random Forest (25 estimators, max depth 8, balanced class weights).
* **Inputs**: Measured pH, estimated moisture, core temperature, ambient temperature, and derived thermal differential ($\Delta T = \text{core} - \text{ambient}$).
* **Execution**: Exported to pure JSON tree schema (`sensor_rf_model.json`, 18 KB) and executed natively in TypeScript on Hermes in **< 2 milliseconds**.
* **Status**: Software benchmark trained on research-informed synthetic dataset.

### B. Vision AI: MobileNetV3-Small (100% Real Data)
* **Architecture**: MobileNetV3-Small backbone fine-tuned exclusively on 100% real photographs.
* **Training Data**: 99 authentic photographs across 4 verified open-access sources (Creative Commons & Public Domain).
* **Zero Synthetic Images**: Rule 1 verified programmatically (0 procedural or AI-generated images).
* **Target Task**: Binary visual anomaly screening (`NO_MOLD` vs `VISIBLE_MOLD`).
* **Performance (Held-Out Test Set)**: **93.10% Accuracy, 0.9237 Macro F1, 90.00% Mould Recall, Brier Score 0.0624**.
* **Quantization**: INT8 quantized TFLite container (~1.7 MB), 14.8 ms latency.

### C. Missing Modality Handling
The system handles all four operational states without fabricating data:
* **Case 1 (Both Available)**: Full multimodal fusion (0.55 sensor / 0.45 vision prototype weighting).
* **Case 2 (Sensor Only)**: Sensor-only triage; vision explicitly flagged as unassessed.
* **Case 3 (Vision Only)**: Surface visual anomaly screening; sensor core chemistry flagged unmeasured.
* **Case 4 (Neither Available)**: Returns `INSUFFICIENT DATA` with zero score and prompts the user.

---

## 6. Dataset Provenance & Clean Architecture

In adherence to scientific integrity principles, all project data is cataloged in `datasets/metadata/` with strict archival of legacy prototypes:

```
datasets/
├── raw/
│   └── vision/                     # Unmodified real photographs from open-access repositories
│       ├── source_001_silage/
│       ├── source_002_mold/
│       ├── source_003_deterioration/
│       └── source_004_field_pilot/
├── processed/
│   ├── silage_sensor_v2.csv        # Research-informed synthetic sensor benchmark (2,400 rows)
│   └── vision/                     # Standardized 224x224 RGB real images (train, val, test)
├── splits/
│   └── vision/                     # Group-aware train, val, and test manifest splits
├── field/
│   └── field_pilot_observations.csv# Real on-farm observations schema & preliminary records
├── archive/
│   └── synthetic_v1/               # ISOLATED: Legacy 160 procedural PIL images (non-production)
└── metadata/
    ├── vision_dataset_registry.json# Provenance, DOIs, URLs, and licenses for real image data
    ├── vision_manifest.csv         # Full 99-image manifest with SHA-256 hashes
    ├── label_mapping.json          # Standardized label definitions and screening mappings
    └── silage_sensor_v2.json       # Machine-readable provenance for sensor dataset
```

---

## 7. Evaluation

The evaluation of SILAGEGUARD AI strictly separates four distinct scientific tiers:

### Tier 1: Real Photographic Vision Evaluation (Held-Out Test Set)
* **Dataset**: 29 independent real photographs across 4 unseen sample groups (`group_id`).
* **Test Performance**:
  * Accuracy: **93.10%** (27/29)
  * Macro F1-Score: **0.9237**
  * Mould Recall: **90.00%** (9/10 true mold samples detected)
  * Clean Silage Specificity: **94.74%** (18/19 clean samples detected)
  * Calibration Brier Score: **0.0624**

### Tier 2: Research-Informed Synthetic Sensor Benchmark
* **Dataset**: 2,400 synthetic rows grouped into 60 pits and 10 farms.
* **Validation Method**: 5-Fold `StratifiedGroupKFold` on `pit_id` (leakage-safe split).
* **Holdout Test Set**: 480 samples across 12 unseen pits (20% holdout).
* **Benchmark Metrics**: Accuracy: **94.38%**, Macro F1: **94.61%**, Brier Score: **0.0526**.

### Tier 3: Real Field Pilot Trials
* **Location**: Vidarbha Dairy Belt (Nagpur, Amravati, Wardha districts, Maharashtra).
* **Observations**: Preliminary 5-pit cohort testing probe physical insertion depth (15–80 cm), stabilization duration (60 seconds), and mobile UI flow.
* **Statistical Status**: Small-cohort pilot validation. Full multi-season field trials (50+ farms) are planned.

### Tier 4: Certified Laboratory Validation
* **Status**: **Pending**. Wet-chemistry HPLC (lactic/acetic/butyric acids) and Kjeldahl (ammonia-N % total N) correlation trials represent our post-hackathon scaling roadmap.

---

## 8. Validation Status Summary

Detailed in [docs/validation_status.md](docs/validation_status.md):

| Subsystem | Scientific Status | Evidence |
|---|---|---|
| **Production Vision Model (Real Data)** | **Verified (100% Real Data)** | MobileNetV3-Small trained strictly on 99 real agricultural & mycological photographs in `vision_model/` |
| **Held-Out Vision Evaluation** | **Verified** | 93.10% Accuracy, 0.9237 Macro F1, 90.00% Mould Recall on 29 independent real samples |
| **Synthetic Vision Archival** | **Verified** | Legacy 160 procedural images isolated to `datasets/archive/synthetic_v1/`; 0 in production |
| **Sensor Model Prototype** | **Verified (Benchmark)** | Random Forest model trained on research-informed synthetic benchmark (`silage_sensor_v2.csv`) |
| **Real Field Sensor Validation** | **Pending / In Progress** | Protocol & schema established in `datasets/field/` |
| **Physical pH Calibration** | **In Progress** | 2-point buffer calibration implemented; physical probe immersion ongoing |
| **Physical Moisture Calibration** | **In Progress** | Capacitive air/water ADC calibration implemented; gravimetric oven drying pending |
| **Offline Pipeline** | **Verified** | Zero network calls; verified in `validation/offline/` |
| **Mobile Inference Parity** | **Verified** | 100% prediction agreement verified in `vision_model/mobile_parity_report.json` |
| Mobile Parity | **Verified** | 8/8 test cases pass with 0.00% difference in `validation/parity/` |
| Laboratory Correlation | **Pending** | Formal wet-chemistry correlation planned |

---

## 9. Offline Capability

SILAGEGUARD AI requires **zero internet connection** for scanning, inference, rule evaluation, advisory generation, and record saving:

```text
Airplane Mode ON (Wi-Fi OFF, Cellular Data OFF)
      ↓
App Launches Instantly
      ↓
Connects to Probe via BLE GATT (Local Radio)
      ↓
Streams Real-Time Telemetry (1 Hz)
      ↓
Captures 3 Silage Photos (Local Camera)
      ↓
Runs Sensor RF Inference (< 2 ms on Hermes JS)
      ↓
Runs Vision Inference (On-Device TFLite)
      ↓
Evaluates Multimodal Fusion & Agronomic Rules
      ↓
Plays Marathi / Hindi Audio Advisory (Local TTS)
      ↓
Saves Scan to Offline SQLite Database
      ↓
Generates Silage Verification QR Code
```

Automated verification script `validation/offline/verify_offline_flow.py` validates that no network requests occur during the core pipeline.

---

## 10. Explainability

Every result is accompanied by a transparent **"WHY THIS RESULT?"** evidence chain grounded in actual physical measurements:

```text
LOW SCREENING RISK (Based on available screening evidence)
Screening Score: 88/100 • Confidence: High (94%)

WHY THIS RESULT?
* Silage pH: 3.98 pH (NORMAL) — Within optimal lactic preservation band (3.8–4.2).
* Core Heat Rise (ΔT): +1.2°C (NORMAL) — Core temperature in stable equilibrium with ambient air.
* Estimated Moisture: 64.2% (NORMAL) — Ideal moisture band for anaerobic pit packing (60–68%).
* Visual Mould Pattern: 4% signal (NORMAL) — No abnormal mycelial or fungal colonies observed.

Important:
This is a screening result, not laboratory confirmation.
```

---

## 11. Limitations

1. **Screening vs. Diagnostic Boundary**: SILAGEGUARD AI is an on-farm rapid triage screening tool. It does not replace official analytical wet-chemistry laboratories.
2. **No Direct Mycotoxin Quantification**: Standard RGB cameras detect visual surface discoloration and mold-like patterns; they cannot quantify aflatoxin or mycotoxin concentrations in parts-per-billion (ppb).
3. **No Direct Urea Quantification**: Analog pH electrodes measure hydronium ion activity ($-\log[H^+]$), not urea or ammonium molecules directly.
4. **Moisture Is An Estimate**: Capacitive sensors measure dielectric permittivity, which varies with packing density and chop length; readings represent estimated moisture.
5. **Single-Point Insertion**: A single probe insertion evaluates one localized core region; multiple depth insertions (surface, core, edge) are recommended for large bunker pits.

---

## 12. Setup & Installation

### Prerequisites
* Node.js v18+ and npm
* Python 3.10+
* Expo CLI (`npm install -g expo-cli`)

### Mobile App Setup
```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start local Expo development server
npx expo start
```

### Python AI Pipeline Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run sensor model training & group-aware evaluation
python sensor_model/train_sensor_model.py

# Verify Python-to-Mobile inference parity
python validation/parity/test_model_parity.py

# Run automated claim & scientific integrity validator
python validation/claims/validate_claims.py

# Run complete offline workflow verification
python validation/offline/verify_offline_flow.py
```

---

## 13. Demo Guide

For hackathon jury evaluations:
1. **Launch App**: Open the SILAGEGUARD AI mobile app.
2. **Connect Probe (`/ble`)**: Click **"PAIR & CONNECT ESP32-S3"**.
   * Toggle between **SAFE**, **CAUTION**, and **UNSAFE** demo presets.
   * Observe live 1 Hz telemetry updates and the **"WOKWI SIMULATION MODE"** badge.
3. **Capture Photos (`/camera`)**: Take 3 photos (or load demo images) representing top surface, middle face, and lower trench.
4. **Review Screening Result (`/result`)**:
   * View the Traffic Light Card (`LOW SCREENING RISK`, `FEED WITH CAUTION`, `UNSAFE`).
   * Inspect the MSSI continuous gauge and Confidence Level badge.
   * Review the **"WHY THIS RESULT?"** explainability chain.
   * Listen to multilingual voice advice in Marathi or Hindi.
   * Scan the generated Silage Verification QR code.
5. **Offline Demonstration**: Turn off Wi-Fi and Mobile Data, and repeat the scan to demonstrate zero cloud dependency.

---

## 14. Future Work

* **Physical Multi-Season Farm Trials**: Expand the preliminary pilot in the Vidarbha dairy belt to 50+ commercial dairy farms across winter and summer ensiling seasons.
* **Laboratory HPLC & Kjeldahl Correlation**: Partner with regional agricultural university laboratories to correlate probe telemetry against gold-standard volatile fatty acid chromatography and crude protein assays.
* **Custom Probe Mechanical Hardening**: Fabricate a stainless steel (SS316) food-grade lance enclosure with protective filtration membranes for the pH glass bulb.
* **Expanded Regional Languages**: Add voice advisory support for Gujarati, Punjabi, Kannada, and Telugu.
