# SILAGEGUARD AI (SIH26111) — MEGA SPRINT AUDIT

## 1. Executive Summary
This document establishes the ground-truth technical audit of the entire SilageGuard AI repository prior to execution of the Mega Sprint. It identifies all active components, contract discrepancies, dead code, test failures, and required enhancements across the frontend, backend, ML pipelines, and hardware integration.

---

## 2. Component Inventory & Runtime Truth

| Subsystem | Location | Authoritative Runtime | Notes |
|:---|:---|:---|:---|
| **Frontend Shell** | `frontend/App.js` | Expo SDK 57 (React Native / Hermes JS) | Standalone Expo app; zero Expo Router dependencies. |
| **Frontend Navigation**| `frontend/navigation/AppNavigator.jsx` | State-driven Stack + Tab Navigator | Tabs: HOME, RECORDS, PROFILE. Modals: CHECK, RESULT, RECORD_DETAIL. |
| **Frontend Screens** | `frontend/screens/` | 7 JSX Production Screens | CheckScreen, HomeScreen, OnboardingScreen, ProfileScreen, RecordDetailScreen, RecordsScreen, ResultScreen. |
| **Frontend DB** | `frontend/services/db/localDb.js` | `expo-sqlite` (Mobile) + `localStorage` (Web) | Tables: batches, observations, sync_queue. |
| **Frontend AI Engine** | `frontend/services/ai/edgeInference.js` | Native JS 25-tree Random Forest | Evaluates 11 features on-device in < 2 ms. |
| **Frontend BLE** | `frontend/services/ble/` | Web Bluetooth GATT + HTTP Probe Bridge | Connects to ESP32 GATT server; 1 Hz JSON telemetry stream. |
| **Frontend API Client**| `frontend/services/api.js` | Dynamic candidate URL resolver | Probes localhost, Expo host, emulator IP with failover. |
| **Backend Core** | `backend/app/main.py` | FastAPI + Uvicorn (ASGI) | Lifespan schema verification, CORS, error handling. |
| **Backend Routers** | `backend/app/routers/` | 9 Routers | inference, sync, models, auth, device_auth, analytics, qr, health, contracts. |
| **Backend DB** | `backend/app/database.py` | SQLAlchemy (Async SQLite / Postgres) | Models: User, Cooperative, Batch, Observation, CalibrationRecord, SyncLog. |
| **Vision Model** | `models/vision/mobilenetv3_silage.onnx` | MobileNetV3-Small INT8 ONNX (5-class) | Classes: Abnormal_appearance, Foreign_object, Healthy, Mould, Spoilage. |
| **Sensor Model** | `models/sensor/sensor_rf_model.json` | 25-tree Random Forest (3-class) | Classes: SAFE, CAUTION, UNSAFE. 11 features. |
| **Explainable AI** | `backend/app/routers/inference.py` | PyTorch Grad-CAM on MobileNetV3 | Returns JET overlay base64 + activation bounding box. |
| **Hardware Probe** | `hardware/esp32_sensor_probe/` | ESP32 DevKit v1 / ESP32-S3 Arduino C++ | Moisture (GPIO 34 ADC1), DS18B20 Temp (GPIO 4), pH (GPIO 35). |

---

## 3. Discrepancy & Issue Matrix

| Area | Current State | Problem | Action | Status |
|:---|:---|:---|:---|:---|
| **Test Suite: verify_integration.py** | Scripts looks for deleted `apiClient.ts` | Fails because frontend is in JavaScript (`api.js`) | Update script to verify `frontend/services/api.js` against backend routes | PLANNED |
| **Test Suite: smoke_test.py** | Expects `status == "ok"` and top-level `"vision"` / `"sensor"` in `/models/registry` | `health.py` returns `status: "ONLINE"` and `/models/registry` nests under `"models"` | Align response schemas so both contracts are 100% satisfied | PLANNED |
| **Test Suite: pytest backend** | Fails with `FileNotFoundError: ./keys/private.pem` when run from root | Key paths are relative (`./keys/private.pem`) and fail if CWD is not `backend/` | Implement resilient `_resolve_key_path` in `jwt.py` | PLANNED |
| **Batch Selection / Creation** | `CheckScreen.jsx` hardcodes `BATCH-${Date.now()}` | Farmer cannot select or create named batches with crop/storage type | Add batch selection/creation step in CheckScreen | PLANNED |
| **Digital Twin & Trend Detector**| `HomeScreen` and `RecordDetailScreen` only show static cards | No simple multi-observation trend detection (pH, temp rise, MSSI decay) | Implement simple, reliable trend detector in `localDb.js` / `DigitalTwin` | PLANNED |
| **Offline Sync Queue** | `sync_queue` table exists in `localDb.js` | Missing background queue flush and sync retry loop | Implement `flushSyncQueue()` in `localDb.js` and call on network restore | PLANNED |
| **Hardcoded Fallbacks** | `RecordDetailScreen.jsx` had `|| 3.95`, `|| 64.2`, `|| 26.5`, `|| 92` | Violates scientific integrity rule against fake production fallbacks | Replace with honest null / `"--"` placeholders | PLANNED |
| **Dead Code** | `frontend/services/store.js` defines unused `MockLocalStore` | Redundant legacy mock file | Remove `store.js` or clean it | PLANNED |
| **Safety Rule Centralization** | Hardcoded checks scattered across `inference.py` and `edgeInference.js` | Rule logic should be isolated in a single authoritative evaluation function | Centralize agronomic safety rules into dedicated module | PLANNED |
| **Documentation** | Outdated references in `README.md` and `docs/` | Mentions TypeScript files that were refactored to JS | Update documentation to accurately describe current codebase | PLANNED |

---

## 4. Execution Roadmap (Phases S1 → S14)
1. **S1 — Contract Reconciliation**: Create/update `docs/BLE_CONTRACT.md`, `docs/API_CONTRACT.md`, `docs/ML_MODELS.md`. Fix schema alignment in `health.py` and `models.py`.
2. **S2 — Core Architecture Cleanup**: Remove dead code (`store.js`), resolve JWT key resolution in `jwt.py`, eliminate fake fallbacks in `RecordDetailScreen.jsx`.
3. **S3 — Hardware & BLE Hardening**: Verify GATT parser, timeout handling, reconnection events, and stabilization window.
4. **S4 — Camera & Image Quality Assessment**: Ensure multi-image and single-image validation gracefully guides retakes for dark/blurry frames.
5. **S5 — Centralized Safety Rules & AI Pipeline**: Create centralized `safetyRules.js` / `safety_rules.py` module; unify MSSI scoring.
6. **S6 — Offline Persistence**: Ensure SQLite and localStorage store batches, observations, and trends reliably across reloads.
7. **S7 — Synchronization Queue**: Add idempotent `flushSyncQueue` with duplicate detection and server confirmation status (`Local`, `Pending sync`, `Syncing`, `Synced`, `Sync failed`).
8. **S8 — Digital Twin & Deterioration Detection**: Implement simple historical trend detector (increasing pH, increasing temperature, decreasing MSSI).
9. **S9 — Farmer UX & Multilingual Guidance**: Polish ResultScreen, error states, and voice guidance in English, Hindi, Marathi, Kannada, Telugu.
10. **S10 — Backend Hardening**: Verify async database operations, device auth, sync idempotency, and health endpoints.
11. **S11 — Test Verification**: Ensure `verify_models.py`, `smoke_test.py`, `verify_integration.py`, and `pytest` all pass with 0 errors.
12. **S12 — Build Verification**: Validate frontend compilation and backend runtime.
13. **S13 — Documentation**: Update `README.md`, `docs/ARCHITECTURE.md`, `docs/OFFLINE_MODE.md`, `docs/HARDWARE_VALIDATION_CHECKLIST.md`.
14. **S14 — Final Verification & Report**: Generate `docs/MEGA_SPRINT_FINAL_REPORT.md`.
