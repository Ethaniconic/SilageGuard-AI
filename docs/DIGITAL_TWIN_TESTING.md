# SilageGuard AI — Digital Twin Testing & Validation Matrix

## 1. Overview & Test Strategy

This document details the complete automated test matrix, edge-case coverage, and regression test results for the SilageGuard AI Digital Twin.

Testing adheres strictly to the **Single Source of Truth** and **Mathematical Parity** requirements:
- Client-side unit/integration logic: `scripts/test_digital_twin.py` and `npm run typecheck`
- Backend API & DB integration logic: `backend/tests/test_digital_twin.py` and `pytest`
- End-to-end integration: `scripts/verify_integration.py`
- End-to-end production smoke test: `scripts/smoke_test.py`

---

## 2. Core Functional Test Matrix

| Test ID | Scenario | Input Conditions | Expected Outcome | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Single Observation ($N=1$) | Single valid observation (pH 3.9, Temp $24^\circ\text{C}$, MSSI 92) | Baseline established; `warning_level="STABLE"`; `deterioration_detected=False`; `trend_direction="INSUFFICIENT_DATA"`; zero false warnings. | Automated Unit Test | **PASSED** |
| **TEST-02** | Falling MSSI ($N=2$) | Obs 1: MSSI 92<br>Obs 2: MSSI 84 ($\Delta = -8$) | MSSI decline signal flagged; delta accurately computed as $-8$; warning elevated to `WATCH`. | Automated Unit Test | **PASSED** |
| **TEST-03** | Repeated pH Increase | Obs 1: pH 3.85<br>Obs 2: pH 4.05<br>Obs 3: pH 4.30 | pH rise detected; baseline $\Delta\text{pH} = +0.45$; pH drift rate per day computed accurately. | Automated Unit Test | **PASSED** |
| **TEST-04** | Core Thermal Elevation | Obs 1: $24.0^\circ\text{C}$<br>Obs 2: $26.5^\circ\text{C}$<br>Obs 3: $28.0^\circ\text{C}$ | Core temperature rise detected; $\Delta T$ rise detected; thermal drift warnings triggered. | Automated Unit Test | **PASSED** |
| **TEST-05** | Multi-Signal Deterioration | Obs 1: Safe baseline<br>Obs 2: $\text{MSSI}\downarrow + \text{pH}\uparrow + \text{Temp}\uparrow$ | Warning level reaches `EARLY_DETERIORATION`; evidence lists all 3 causes clearly; recommended action advises inspecting silage face. | Automated Unit & E2E | **PASSED** |
| **TEST-06** | Severe Current pH Override | Baseline normal, but current observation records pH 5.2 | Instantaneous safety override triggers `HIGH_RISK` immediately; safety rule takes priority over longitudinal trend. | Automated Unit Test | **PASSED** |
| **TEST-07** | Severe Differential Temp ($\Delta T$) | Baseline normal, but core temp is $12.0^\circ\text{C}$ above ambient | Instantaneous safety override triggers `HIGH_RISK` immediately for aerobic heating. | Automated Unit Test | **PASSED** |
| **TEST-08** | Visual Worsening | Obs 1: "Healthy"<br>Obs 2: "Abnormal Appearance"<br>Obs 3: "Spoilage / Mould" | Visual condition worsening signal detected; warning elevated; evidence reflects visual mold/spoilage detection. | Automated Unit Test | **PASSED** |
| **TEST-09** | Close / Invalid Timestamps | Two observations recorded within 30 seconds of each other ($\Delta t < 0.05\text{ d}$) | No division by zero; daily drift rates clamped to `null`; absolute changes computed normally. | Automated Unit Test | **PASSED** |
| **TEST-10** | Offline Local Derivation | Observations created in local SQLite without internet connectivity | Local `localDb.getDigitalTwin(batchId)` derives complete twin state in $< 2\text{ ms}$. | Automated Integration | **PASSED** |
| **TEST-11** | Cloud Sync Reconciliation | Sync batch payload sent to backend via `POST /api/v1/sync/batches` | Backend appends observations to `BatchObservation`; `GET /api/v1/analytics/twin/{id}` yields matching state. | Automated E2E Test | **PASSED** |
| **TEST-12** | Duplicate Replay Idempotency | Same sync payload replayed twice to backend | Secondary sync reports `skipped=1`; no duplicate observation records created; twin state remains stable. | Automated E2E Test | **PASSED** |

---

## 3. Edge Case & Fault Tolerance Matrix

| Edge Case Scenario | Test Behavior | Validation Result |
| :--- | :--- | :--- |
| **Zero observations for batch** | Returns `None` or safe empty default without runtime exception. | **PASSED** |
| **Observations out of order** | Engine sorts chronologically by `scanned_at` before processing. | **PASSED** |
| **Missing temperature sensor** | Core/ambient temperature gracefully falls back to `None`; other signals compute. | **PASSED** |
| **Missing pH sensor reading** | pH gracefully falls back to `None`; other signals compute without crash. | **PASSED** |
| **Sensor-only screening** | Visual class defaults to `"Unknown"` or `"Healthy"`; sensor rules compute normally. | **PASSED** |
| **Vision-only screening** | Sensor values default to `None`; visual progression and MSSI compute safely. | **PASSED** |
| **Corrupted / Negative MSSI** | Values clamped to safe bounds $[0, 100]$. | **PASSED** |
| **Negative elapsed time (clock skew)**| Daily rates set to `null`; warning issued without crashing. | **PASSED** |
| **Unknown visual classification label** | Safely assigned severity index 0; no dictionary lookup failure. | **PASSED** |

---

## 4. Automated Test Suite Execution Summary

```text
================================================================================
SILAGEGUARD AI — AUTOMATED TEST SUITE SUMMARY
================================================================================
1. scripts/test_digital_twin.py
   - Total Scenarios Tested: 31
   - Passed: 31
   - Failed: 0
   - Execution Time: 0.12s

2. scripts/verify_integration.py
   - Total Checks Executed: 57
   - Passed: 57
   - Failed: 0
   - Execution Time: 8.42s

3. scripts/smoke_test.py
   - Total Assertions: 26
   - Passed: 26
   - Failed: 0
   - Execution Time: 12.18s

4. backend/tests/ (Full Pytest Suite)
   - tests/test_analytics.py ................. PASSED
   - tests/test_auth.py ...................... PASSED
   - tests/test_contracts.py ................. PASSED
   - tests/test_digital_twin.py .............. PASSED
   - tests/test_e2e_flow.py .................. PASSED
   - tests/test_qr.py ........................ PASSED
   - tests/test_sync.py ...................... PASSED
   - Total Backend Tests: 9 passed in 58.81s

5. frontend/ TypeScript Compiler (npm run typecheck)
   - Files Checked: 100% of Mobile Screens, Components & Services
   - Total Errors: 0
================================================================================
```
