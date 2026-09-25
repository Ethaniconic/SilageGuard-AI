# 🔬 SILAGEGUARD AI V2.1 — SCIENTIFIC VERIFICATION & AUDIT REPORT

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Auditor: Antigravity AI (Independent Verification & Hardening Pass)**  
**Date: September 25, 2026**  
**Repository Version: V2.1**  

---

## 1. Executive Summary

This verification pass was conducted under the strict mandate:
> **"Verify what is actually true, correct what is overstated, and only then improve the implementation."**

The SILAGEGUARD AI V2 implementation made substantial engineering advances over V1 (modular architecture, decoupled rule engine, Wokwi physical ADC emulation, on-device Random Forest parser, offline-first pipeline). However, an uncompromising scientific audit reveals that **several core claims in the V2 report overstate real-world readiness**:

1. **The 2,400 Sample Sensor Dataset is 100% Synthetic**: While generated with realistic agronomic boundaries (Kung et al., 2018), it was created algorithmically by Python distributions. It is NOT physically measured core probe data from 60 real farms.
2. **The 94.38% Accuracy is a Synthetic Benchmark**: Because the ground-truth labels in the generator were assigned using mathematical threshold rules on the generated features, the model learned a partially circular synthetic rule system. It must be called a **Group-Aware Research-Informed Synthetic Benchmark**, NOT a real-world field validation.
3. **The 100% Vision Model Metrics Reflect Synthetic Prototype Textures**: The 160 images were procedurally generated using PIL geometric drawings (fiber lines and hyphae dots). MobileNetV3 achieved 100% accuracy on this toy set; this cannot be represented as field accuracy.
4. **Wokwi Firmware is a Simulation**: Firmware logic functions correctly and has 12-bit ADC reading code, but firmware running in Wokwi is a digital simulation. Physical hardware validation remains **PENDING**.
5. **Screening vs. Diagnostic Boundary**: SILAGEGUARD AI is an **offline rapid screening tool**, not a wet-chemistry laboratory replacement. It does not measure aflatoxin ppb, ammonia-N %, or crude protein.

---

## 2. Claim Classification Matrix

Every major project claim is classified into one of seven standardized categories:
* `VERIFIED`: Proven by direct code execution, reproducible tests, or physical evidence.
* `PARTIALLY VERIFIED`: Core mechanism exists and works, but claims are slightly broader than current code demonstrates.
* `UNVERIFIED`: Claimed capability exists in design/documentation but lacks test verification.
* `INCORRECT`: Statement is factually inaccurate.
* `SYNTHETIC`: Generated mathematically or procedurally; valid for software benchmarking but not real-world evidence.
* `PLACEHOLDER`: Mock data, stub endpoint, or temporary scaffold.
* `REQUIRES FIELD VALIDATION`: Requires multi-farm physical field trials to prove agronomic efficacy.

| Category / Component | Claimed Feature / Metric | Audit Classification | Evidence & Findings |
|---|---|---|---|
| **Sensor Dataset** | 2,400 physical core probe samples | **SYNTHETIC** | Generated entirely by `datasets/generate_realistic_silage_data.py`. 0 rows physically measured. |
| **Sensor ML Accuracy** | 94.38% Accuracy, 94.61% Macro F1 | **SYNTHETIC** | Validated on synthetic test split (480 synthetic samples across 12 synthetic pits). Not field accuracy. |
| **GroupKFold Split** | Pit-grouped leakage-safe validation | **VERIFIED** | Code in `sensor_model/train_sensor_model.py` correctly uses `StratifiedGroupKFold(groups=pit_id)`. |
| **Vision Dataset** | 160 agricultural field images | **SYNTHETIC** | Procedurally generated using Python PIL (`PIL.ImageDraw`). Not real farm photos. |
| **Vision Accuracy** | 100% Validation Accuracy, 100% Recall | **SYNTHETIC** | Perfect separation on synthetic procedural shapes. Does not reflect real outdoor agricultural imaging. |
| **Biochemical Detection** | Direct mycotoxin / aflatoxin ppb detection | **INCORRECT** | RGB camera cannot measure chemical toxin concentration in ppb. Visual model detects surface anomalies only. |
| **Nitrogen Adulteration** | Direct urea measurement | **INCORRECT** | Analog pH probe measures hydronium ion activity ($-\log[H^+]$), not urea or ammonium molecules directly. |
| **Mobile Inference** | 100% Offline-First on-device inference | **VERIFIED** | Random Forest runs in pure TypeScript JSON traversal; zero network requests in scan flow. |
| **Cross-Platform Parity**| 0.00% difference between Python & TS | **VERIFIED** | `validation/parity/model_parity_report.json` passes 8/8 test cases with identical argmax predictions. |
| **Hardware Firmware** | ESP32-S3 BLE GATT Telemetry | **VERIFIED** | Wokwi firmware compiles and publishes JSON telemetry at 1 Hz with sequence tracking. |
| **Hardware Testing** | Physical sensor probe validated | **REQUIRES FIELD VALIDATION** | Tested only in Wokwi simulator. Physical sensor validation is pending bench assembly. |
| **pH Calibration** | 2-Point Buffer Calibration (pH 4 & 7) | **PARTIALLY VERIFIED** | Firmware and mobile UI implement 2-point linear math, but physical probe calibration in buffer is pending. |
| **Capacitive Moisture** | Direct laboratory moisture % | **PARTIALLY VERIFIED** | Measures relative capacitance (dielectric permittivity proxy). True moisture requires gravimetric oven drying. |
| **Safety Rule Engine** | Decoupled agronomic rule override | **VERIFIED** | `safetyRuleEngine.ts` enforces hard overrides for critical pH (>6.0) and thermal runaway (>10°C). |
| **Fusion Weights** | 55% Sensor / 45% Vision weighting | **PROTOTYPE_HEURISTIC** | Engineering design weighting chosen for prototype triage; not learned from paired field trials. |
| **External Datasets** | Downloadable Harvard Dataverse CSVs | **PLACEHOLDER** | `datasets/download_datasets.py` contained placeholder URLs. Literature tables are research papers, not sensor CSVs. |

---

## 3. In-Depth Audit: The 2,400 Sample Dataset

Inspection of:
* `datasets/generate_realistic_silage_data.py`
* `datasets/processed/silage_sensor_v2.csv`
* `datasets/dataset_registry.json`
* `datasets/DATASET_CARD.md`

### 10 Verification Questions & Factual Answers

1. **Are the 2,400 measurements physically measured?**  
   **NO.** They were synthesized in Python via pseudo-random distributions (`np.random.normal`, `random.uniform`).
2. **Are they copied from public research?**  
   **NO.** No published public dataset contains individual probe recordings matching this table.
3. **Are they transformed from public research?**  
   **NO.** Agronomic parameter ranges (e.g., pH 3.8–4.2 for well-preserved silage) were informed by review papers (Kung et al., 2018), but the data points were synthesized.
4. **Are they generated synthetically?**  
   **YES.** 100% synthetically generated.
5. **Are they a mixture?**  
   **NO.** All 2,400 rows in `silage_sensor_v2.csv` were produced by the generator script.
6. **Where did `pit_id` originate?**  
   From a programmatic loop: `pit_id = f"PIT-{pit_counter:03d}"` running from `PIT-001` to `PIT-060`.
7. **Are the 60 pits real?**  
   **NO.** They are simulated archetypes (45% Safe, 30% Caution, 25% Unsafe).
8. **Are pH, moisture and temperature genuinely measured?**  
   **NO.** They are mathematical random variates with added Gaussian noise.
9. **Is temperature present in the original source datasets?**  
   **NO.** Academic meta-analyses typically tabulate dry matter, pH, and fermentation acids; real-time core temperature $\Delta T$ was synthetically introduced.
10. **Were values mathematically generated around predefined ranges?**  
    **YES.** Base values were sampled from uniform distributions and perturbed along a depth gradient.

---

## 4. Data Circularity Audit

In `datasets/generate_realistic_silage_data.py`, lines 87–102:
```python
score = 0
if ph <= 4.25: score += 2
elif ph <= 4.80: score += 1

if 60.0 <= moisture <= 68.0: score += 2
elif 54.0 <= moisture <= 72.0: score += 1

if delta_t <= 3.0: score += 2
elif delta_t <= 7.0: score += 1

if score >= 5: label = "Safe"
elif score >= 3: label = "Caution"
else: label = "Unsafe"
```

### Scientific Implications
* The ground truth labels were generated by applying an **explicit rule system** to the exact same features (`ph`, `moisture`, `delta_t`).
* A Random Forest or Gradient Boosting model trained on these features is fundamentally learning to approximate this rule system with noise.
* Therefore, **high ML performance (94.38% Accuracy) does NOT equal high field performance**.
* In a real bunker silo, complex biochemical interactions, unchopped grain pockets, packing density variations, and atypical microbial flora occur that are not captured in this synthetic rule generator.
* **Correction Applied**: The benchmark is now strictly designated as a **Group-Aware Research-Informed Synthetic Benchmark**.

---

## 5. Vision Dataset & Model Audit

* **Dataset**: 160 files in `datasets/vision/` (60 Safe, 50 Caution, 50 Unsafe).
* **Origin**: Procedurally generated by Pillow in `datasets/generate_synthetic_research_data.py`.
* **Nature**:
  * Safe: Green/khaki line textures representing chopped forage fibers.
  * Caution: Brownish splotches representing mild aerobic browning.
  * Unsafe: High-contrast white/cyan stippling representing fungal colonies.
* **Model Result**: MobileNetV3 achieved 100% accuracy, 100% recall, 1.00 Macro F1.
* **Audit Finding**: Perfect performance is an artifact of the toy procedural generator. Real agricultural imagery features direct sunlight, shadow cast, moisture reflection, dust occlusions, and variable camera sensors.
* **Correction Applied**: The vision metrics are explicitly labeled as **Synthetic Prototype Benchmark**. The model is documented as detecting **surface discoloration and mold-like patterns**, NOT chemical mycotoxins.

---

## 6. Multimodal Fusion & Safety Rules Audit

Inspection of `multimodalFusionEngine.ts` and `safetyRuleEngine.ts`:

### Fusion Weighting
* Config: 55% Sensor / 45% Vision.
* Audit: Designated as a **Prototype Design Parameter**. Real-world weighted coefficients will be fitted once paired on-farm sensor and photographic observations with laboratory HPLC validation are gathered.

### Decoupling
* Sensor AI and Vision AI produce independent probability vectors and confidence scores.
* The Safety Rule Engine operates as an independent post-fusion gatekeeper.
* Critical rules enforce overrides:
  1. `pH > 6.0`: Overrides to `UNSAFE` (Clostridial spoilage indicator). Literature-supported (Kung et al., 2018).
  2. `ΔT > 10.0°C`: Overrides to `UNSAFE` (Severe aerobic runaway heat). Literature-supported (Borreani et al., 2018).
  3. `Mould probability > 60%`: Overrides to `UNSAFE` (Visible fungal anomaly threshold). Prototype heuristic.

### Missing Modality Behavior (Hardening Applied in V2.1)
* Previous behavior: Assumed both inputs were present.
* V2.1 hardened behavior:
  * **Case 1 (Sensor + Vision)**: Full multimodal fusion.
  * **Case 2 (Sensor Only)**: Sensor-only triage mode; vision score marked `NOT_AVAILABLE`.
  * **Case 3 (Vision Only)**: Vision-only triage mode; sensor score marked `NOT_AVAILABLE`.
  * **Case 4 (Neither)**: Returns `INSUFFICIENT_DATA` with zero fabricated scores.

---

## 7. Hardware & Firmware Audit

Inspection of `hardware/wokwi/sketch.ino`:
* **ADC Resolution**: Configured at 12-bit (0–4095).
* **pH Conversion**: Linear conversion using 2-point buffer reference.
* **Moisture Conversion**: Relative inverse linear interpolation from air calibration (3200 ADC) to water saturation (1450 ADC).
* **Mode Flag**: Firmware has been updated to transmit `"mode": "PHYSICAL_PROBE"` when physical sensors are detected and `"mode": "WOKWI_SIMULATION"` when running simulation fallback.
* **Verification Status**:
  * Wokwi Firmware Telemetry: **VERIFIED (PASS)**
  * Physical Hardware Bench Validation: **PENDING (REQUIRES FIELD VALIDATION)**

---

## 8. Summary of Corrections Applied in V2.1

1. **Terminology Standardized**: "Independent real-world holdout validation" replaced everywhere with "Group-aware synthetic benchmark evaluation".
2. **Field Schema Established**: `datasets/field/field_pilot_observations.csv` standardizes the 16-column schema with `null` for unmeasured fields and mandatory `label_source`.
3. **Machine-Readable Metadata**: Added JSON metadata cards for all synthetic, reference, and field datasets.
4. **Telemetry Honesty**: Firmware and mobile telemetry parser explicitly flag `REAL_SENSOR` vs `WOKWI_SIMULATION`.
5. **Missing Modality Handling**: Fusion engine properly handles single-modality and missing-modality inputs without fabricating data.
6. **Automated Claim Validator**: Added `validation/claims/validate_claims.py` to prevent regression into overstated claims.
7. **Judge FAQ & Scientific Status**: Created `docs/judge_faq.md` and `docs/validation_status.md` for defensible hackathon presentation.
