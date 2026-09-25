# SILAGEGUARD AI — Changelog

All notable changes to SILAGEGUARD AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-09-25

### Scientific Credibility & Ethics Upgrades
- **Non-Claims Established**: Formally documented that SILAGEGUARD AI is a rapid screening tool and does NOT claim direct ppb mycotoxin quantification, direct urea quantification, or certified laboratory replacement.
- **Dataset Provenance & Isolation**:
  - Created formal dataset registry `datasets/dataset_registry.json` and academic `DATASET_CARD.md`.
  - Strictly separated synthetic prototype development data into `datasets/synthetic/`.
  - Rebuilt real-world observation schema in `datasets/field/field_pilot_observations.csv` with unmeasured fields recorded as `null`.
- **Honest Model Evaluation**:
  - Eliminated circular uniform distributions that caused artificial 100% accuracy.
  - Implemented 5-Fold `StratifiedGroupKFold` grouped by `pit_id` across 60 independent pits (2,400 samples).
  - Evaluated on 12 completely unseen holdout pits: **94.38% Test Accuracy, 94.61% Macro F1, Brier Score 0.0290**.

### AI & Architecture Upgrades
- **Decoupled Agronomic Safety Rule Engine**:
  - Created standalone module `mobile/features/fusion/safetyRuleEngine.ts`.
  - Hard agronomic safety boundaries (pH > 5.80, $\Delta T > 10.0^\circ\text{C}$, Visible Mould $> 60\%$) cleanly override probabilistic scores.
  - Explicit `rule_override = true` logged and displayed on UI.
- **Dedicated "WHY THIS RESULT?" Explainability Chain**:
  - Integrated structured explainability points (`parameter`, `measuredValue`, `status`, `assessment`) into the screening report.
- **3-Photo Multi-Angle Vision Aggregation**:
  - Rebuilt vision inference pipeline in `mobile/ai/visionInference.ts` to process a 3-frame stack (Surface, Working Face, Trench Base) and aggregate via mean probability.
  - Exported optimized MobileNetV3-Small INT8 container (1.8 MB).
- **Physical Sensor Sanity & Calibration**:
  - Upgraded `mobile/features/ble/bleService.ts` with hardware sanity range validator (pH 2.0–12.0, Moisture 0–100%, Temp -10–85°C).
  - Implemented 2-point pH buffer calibration (pH 4.01 and pH 7.00) in hardware firmware and mobile settings.

### Mobile & Hardware Upgrades
- **Result Screen Overhaul (`result.tsx`)**:
  - Added scientific disclaimer banner: *"Rapid Screening Tool — Not a laboratory replacement"*.
  - Added explicit confidence level badge (`HIGH`, `MODERATE`, `LOW_UNCERTAIN`).
  - Added Safety Rule Override alert banner.
  - Integrated "WHY THIS RESULT?" interactive explainability breakdown.
- **Camera Screen Enhancements (`camera.tsx`)**:
  - Added region target guidance banner (Photo 1 of 3: Surface crust $\to$ Photo 2: Working face $\to$ Photo 3: Deep region).
  - Enhanced Image Quality Assurance with silage coverage check and actionable tips.
- **Settings Screen Upgrades (`settings.tsx`)**:
  - Added pH 2-point buffer calibration UI and parameter status.
  - Added comprehensive "About SILAGEGUARD / Scientific Limitations" section.
- **SQLite Relational Persistence**:
  - Added model versioning (`sensor_model_version`, `vision_model_version`, `fusion_version`, `rule_version`), rule override status, explainability chains, and `is_demo` flag.
  - Isolated demo mode records from contaminating production batch history.
- **ESP32-S3 Telemetry Firmware (`sketch.ino`)**:
  - Added physical ADC conversion with calibration constants.
  - Maintained agronomic simulation fallback for Wokwi testing.
  - Broadcasts standard 1 Hz JSON telemetry over BLE GATT.

---

## [1.0.0] - 2026-09-24
- Initial prototype release for SIH 2026.
- Basic BLE connection, camera capture, Random Forest sensor evaluation, MobileNetV3 vision screening, SQLite history, and 5-language TTS.
