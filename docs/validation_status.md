# 📊 SCIENTIFIC & TECHNICAL VALIDATION STATUS

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Maintainers: The Bro-grammers (SIH 2026)**  
**Version: V2.1**  
**Audit Date: September 25, 2026**

---

## 1. Capability Verification Matrix

This matrix documents the actual, evidence-backed status of each system component. Items marked `Verified` have passing automated test suites or reproducible code in this repository. Items marked `Pending` or `In Progress` reflect honest scientific boundaries where physical hardware assembly, multi-season farm trials, or certified wet-chemistry laboratory correlation are ongoing.

| Capability / Subsystem | Status | Verification Evidence / Repository Artifact |
|---|---|---|
| **Sensor Model Prototype** | **Verified** | Random Forest training pipeline in `sensor_model/train_sensor_model.py` runs cleanly with GroupKFold. |
| **Synthetic Sensor Benchmark** | **Verified** | Group-aware benchmark achieves 94.38% Accuracy and 94.61% Macro F1 on `silage_sensor_v2.csv`. |
| **Real Field Sensor Validation** | **Pending** | Protocol and schema established in `datasets/field/`; initial 5 pilot observations recorded. Full statistical trials pending. |
| **Vision Model Prototype** | **Verified** | MobileNetV3-Small architecture in `vision_model/train_vision_model.py` with Albumentations augmentation. |
| **Synthetic Vision Benchmark** | **Verified** | Evaluated on 160 procedural PIL texture images in `datasets/vision/`. |
| **Real Vision Validation** | **Pending** | On-farm smartphone photo collection across lighting variations (sunlight, shadows, dust) is ongoing. |
| **Wokwi Firmware Telemetry** | **Verified** | ESP32-S3 firmware in `hardware/wokwi/sketch.ino` generates valid 1 Hz JSON telemetry over BLE GATT. |
| **Physical pH Probe Calibration** | **In Progress** | 2-point Nernst buffer calibration math implemented in firmware and mobile UI; physical bench immersion pending. |
| **Physical Moisture Calibration** | **In Progress** | Capacitive inverse linear ADC calibration implemented; gravimetric oven-drying correlation pending. |
| **Decoupled Safety Rules** | **Verified** | Decoupled rule engine in `safetyRuleEngine.ts` enforces critical overrides (pH > 6.0, $\Delta T > 10$°C). |
| **Missing Modality Handling** | **Verified** | Handles Case 1 (Both), Case 2 (Sensor only), Case 3 (Vision only), and Case 4 (Neither $\to$ Insufficient Data). |
| **Offline Pipeline Integrity** | **Verified** | Zero HTTP requests; end-to-end execution verified in `validation/offline/verify_offline_flow.py`. |
| **Mobile Inference Parity** | **Verified** | 8/8 test cases pass with 0.00% difference in `validation/parity/model_parity_report.json`. |
| **Laboratory Wet-Chemistry Correlation** | **Pending** | HPLC volatile fatty acids and Kjeldahl ammonia-N laboratory correlation trials planned for Post-Hackathon Phase. |

---

## 2. Evidence Traceability Summary

1. **Synthetic Sensor Benchmark**:
   * Evaluated on 480 holdout samples across 12 unseen simulated pits.
   * Accuracy: 94.38%, Macro F1: 94.61%, Brier Score: 0.0526.
   * Provenance: `datasets/metadata/silage_sensor_v2.json`.

2. **Synthetic Vision Benchmark**:
   * Evaluated on 40 holdout images from procedural PIL dataset.
   * Benchmark Accuracy: 100.0%, Benchmark F1: 1.00.
   * Provenance: `datasets/metadata/synthetic_vision_textures.json`.

3. **Software & Parity Integrity**:
   * Parity script runs in `validation/parity/model_parity_report.json` with 100% agreement between scikit-learn Python and mobile TypeScript.
   * Full offline lifecycle validated by `validation/offline/verify_offline_flow.py`.

4. **Claims Audit**:
   * `validation/claims/validate_claims.py` scans repository text and enforces scientific boundary constraints.
