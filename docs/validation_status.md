# 📊 SCIENTIFIC & TECHNICAL VALIDATION STATUS

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Maintainers: The Bro-grammers (SIH 2026)**  
**Version: V2.2 (Real-Data Vision Model & Screening-Round Hardening)**  
**Audit Date: September 25, 2026**

---

## 1. Capability Verification Matrix

This matrix documents the actual, evidence-backed status of each system component. Items marked `Verified` have passing automated test suites, traceable real data, or reproducible code in this repository. Items marked `Pending` or `In Progress` reflect honest scientific boundaries where physical hardware deployment, multi-season farm trials, or certified wet-chemistry laboratory correlation are ongoing.

| Capability / Subsystem | Status | Verification Evidence / Repository Artifact |
|---|---|---|
| **Production Vision Model (Real Data)** | **Verified (100% Real Data)** | MobileNetV3-Small trained strictly on 99 real agricultural & mycological photographs in `vision_model/train_mobilenetv3.py`. Zero synthetic images. |
| **Held-Out Vision Evaluation** | **Verified** | Evaluated on 29 independent real photographs across 4 disjoint sample groups: **93.10% Accuracy, 0.9237 Macro F1, 90.00% Mould Recall, Brier score 0.0624**. |
| **Vision Generalization Test** | **Verified** | Cross-source evaluation across bunker clamps (92.9%), baled forage (100%), and fungal isolates (90.0%) documented in `docs/vision_external_generalization.md`. |
| **Grad-CAM Explainability** | **Verified** | Heatmaps verify activations localize on surface fungal mycelium and forage textures in `vision_model/gradcam_outputs/`. |
| **Synthetic Vision Archival** | **Verified** | 100% of legacy 160 procedural PIL images isolated to `datasets/archive/synthetic_v1/`. Zero synthetic images in production manifests. |
| **Sensor Model Prototype** | **Verified (Benchmark)** | Random Forest model trained on research-informed synthetic benchmark (`silage_sensor_v2.csv`). |
| **Synthetic Sensor Benchmark** | **Verified** | Group-aware benchmark achieves 94.38% Accuracy and 94.61% Macro F1. Explicitly documented as a software benchmark, not field accuracy. |
| **Real Field Sensor Validation** | **Pending** | Protocol and schema established in `datasets/field/`; initial 5 pilot observations recorded. Full statistical trials pending. |
| **Wokwi Firmware Telemetry** | **Verified (Simulation)** | ESP32-S3 firmware in `firmware/simulation/` generates valid 1 Hz JSON telemetry over BLE GATT. |
| **Physical pH Probe Calibration** | **In Progress** | 2-point Nernst buffer calibration (pH 4.01 & 7.00) implemented in firmware; physical bench immersion pending. |
| **Physical Moisture Calibration** | **In Progress** | Capacitive inverse linear ADC calibration implemented; gravimetric oven-drying correlation pending. |
| **Decoupled Safety Rules** | **Verified** | Decoupled rule engine in `safetyRuleEngine.ts` enforces critical overrides (pH > 6.0, $\Delta T > 10$°C, visible mould > 70%). |
| **Missing Modality Handling** | **Verified** | Handles Case 1 (Both), Case 2 (Sensor only), Case 3 (Vision only), and Case 4 (Neither $\to$ Insufficient Data). |
| **Offline Pipeline Integrity** | **Verified** | Zero external HTTP requests; end-to-end execution verified in `validation/offline/verify_offline_flow.py`. |
| **Mobile Inference Parity** | **Verified** | 100% prediction agreement between PyTorch model and mobile runtime container verified in `vision_model/mobile_parity_report.json`. |
| **Laboratory Wet-Chemistry Correlation** | **Pending** | HPLC volatile fatty acids and Kjeldahl ammonia-N laboratory correlation trials planned for Post-Hackathon Phase. |

---

## 2. Evidence Traceability Summary

1. **Real-Data Vision Model**:
   * Evaluated on 29 independent real test samples across 4 unseen groups.
   * Accuracy: **93.10%**, Macro F1: **0.9237**, Mould Recall: **90.00%**, Brier Score: **0.0624**, ECE: **0.0773**.
   * Provenance: `datasets/metadata/vision_manifest.csv`, `datasets/metadata/vision_dataset_registry.json`.
   * Artifacts: `vision_model/mobilenetv3_silage.pth`, `mobile/assets/models/mobilenetv3_silage_int8.tflite`.

2. **Research-Informed Synthetic Sensor Benchmark**:
   * Evaluated on 480 holdout samples across 12 unseen simulated pits.
   * Accuracy: 94.38%, Macro F1: 94.61%, Brier Score: 0.0526.
   * Provenance: `datasets/metadata/silage_sensor_v2.json`.

3. **Software & Parity Integrity**:
   * Vision model parity verified with 100.00% agreement in `vision_model/mobile_parity_report.json`.
   * Full offline lifecycle validated by `validation/offline/verify_offline_flow.py`.

4. **Claims Audit**:
   * `validation/claims/validate_claims.py` enforces Rule 1 and scientific boundary constraints. Current Status: **PASS (0 violations)**.
