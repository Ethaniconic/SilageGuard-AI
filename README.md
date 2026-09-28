# 🌾 SILAGEGUARD AI (SIH26111) — Integrated Full-Stack & Edge AI Platform

**SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System for Dairy Farmers**  
*Ministry of Fisheries, Animal Husbandry & Dairying • Department of Animal Husbandry & Dairying • Smart India Hackathon 2026*  
**Team**: The Bro-grammers  
**Design Philosophy**: 100% Real Vision Data • Offline-First Edge AI • Multimodal Fusion • Full-Stack Cooperative Cloud Sync • Scientifically Transparent

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Mobile: Expo React Native](https://img.shields.io/badge/Frontend-Expo_React_Native-blue.svg)](frontend/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_Python-009688.svg)](backend/)
[![Embedded: ESP32-S3](https://img.shields.io/badge/Hardware-ESP32--S3_DevKit-orange.svg)](hardware/wokwi/)
[![AI: Pure On-Device](https://img.shields.io/badge/AI-100%25_On--Device_Offline-green.svg)](frontend/ai/)
[![Vision Data: 100% Real](https://img.shields.io/badge/Vision_Data-100%25_Real_Photographs-success.svg)](datasets/metadata/VISION_DATA_CARD.md)
[![Verification: Automated](https://img.shields.io/badge/Validation-100%25_Pass-brightgreen.svg)](scripts/verify_all.ps1)

---

## 1. Problem Statement Context (SIH26111)

In rural India, over 70% of dairy cattle nutrition depends on conserved forage and silage during dry summer months. However, poor anaerobic compaction, delayed pit sealing, and oxygen intrusion trigger clostridial putrefaction, aerobic heating, and toxic mold proliferation.

Dairy farmers face severe challenges:
* **No Field Testing Tools**: Traditional wet-chemistry feed analysis takes 5–10 days and costs ₹1,500–₹3,000 per sample, requiring transport to regional agricultural universities.
* **Invisible Spoilage**: Silage can appear normal on top while harboring dangerous clostridial degradation or runaway heating deeper inside the pit.
* **Zero Connectivity**: Bunker pits and trenches are located in rural fields with zero cellular connectivity, rendering cloud-dependent AI applications unusable.
* **Economic Losses**: Feeding degraded silage leads to acidosis, severe milk yield drops (15–30%), reproductive failures, and animal mortality.

---

## 2. Integrated Solution Overview

**SILAGEGUARD AI** is an **offline-first, multimodal rapid screening system** combining:
1. **Low-Cost ESP32-S3 Core Probe**: Measures core hydronium ion activity (pH), capacitive moisture, digital core temperature (DS18B20), and ambient temperature, streaming at 1 Hz via BLE 5.0.
2. **On-Device Edge AI (Frontend)**: Runs two independent edge AI models on the smartphone (11-Feature Random Forest on Hermes JS in < 2 ms, and INT8 MobileNetV3-Small in ~15 ms).
3. **Multimodal Silage Safety Index (MSSI)**: 0–100 continuous score with 55% sensor / 45% vision weighting.
4. **Decoupled Agronomic Safety Rules**: Enforces deterministic overrides based on peer-reviewed animal science literature (Kung et al. 2018, Borreani et al. 2018).
5. **Multilingual Voice Advisories**: Actionable audio guidance in 5 Indian languages (English, Hindi, Marathi, Kannada, Telugu).
6. **FastAPI Cloud Sync Backend**: Enterprise-ready backend for dairy federations, district animal husbandry officers, and bulk buyers with idempotent de-duplication, batch analytics, device provisioning, and QR token verification.

> ⚠️ **Scientific Classification**: SILAGEGUARD AI is an **on-farm rapid triage screening tool**, NOT a laboratory wet-chemistry replacement.

---

## 3. Workspace Layout

```
silageguard-ai/
├── frontend/          ← Expo Router React Native App (SDK 57, 100% offline edge AI)
│   ├── services/      ← Cloud sync bridge, apiClient, device auth, model registry
│   ├── app/           ← 12 Production screens (Home, Camera, Processing, Results, etc.)
│   ├── ai/            ← On-device inference engines (Sensor RF + MobileNetV3)
│   ├── features/      ← BLE GATT, Multimodal Fusion Engine, Safety Rule Engine
│   ├── sqlite/        ← Offline relational persistence (7 tables in WAL mode)
│   └── assets/models/ ← Bundled ONNX, TorchScript, and JSON models
├── backend/           ← FastAPI Cloud Service (Auth, Sync, QR, Analytics, Workers)
│   ├── app/routers/   ← sync, models, auth, device_auth, analytics, qr, health
│   ├── app/models/    ← SQLAlchemy relational models (Batch, User, Cooperative, SyncLog)
│   ├── app/services/  ← sync_service, analytics_service, qr_service, auth_service
│   └── tests/         ← Backend test suite (sync, qr, auth, analytics)
├── models/            ← Production Machine Learning Artefacts & Pipelines
│   ├── vision/        ← MobileNetV3 training, export, ONNX weights, eval metrics
│   ├── sensor/        ← 11-Feature Random Forest pipeline, JSON trees, metrics
│   └── docs/          ← MODEL_CARD.md
├── hardware/          ← ESP32-S3 Firmware & Wokwi IoT Circuit Simulation (V3.1)
│   ├── wokwi/         ← diagram.json, sketch.ino, libraries.txt (56/56 checks pass)
│   └── docs/          ← Pinout, wiring, power architecture, calibration guides
├── shared/contracts/  ← Shared API contracts, TypeScript DTOs, and Python Pydantic schemas
├── scripts/           ← Automated setup, verification, model test, and launch scripts
│   ├── setup.ps1            ← Complete automated environment setup (idempotent)
│   ├── start_backend.ps1     ← Launches FastAPI backend server
│   ├── start_frontend.ps1    ← Launches Expo frontend (Web/Android/iOS)
│   ├── verify_all.ps1        ← Runs all 4 test suites (95+ assertions)
│   ├── verify_integration.py ← Verifies frontend client calls match backend routes
│   ├── verify_models.py      ← Verifies live model execution (ONNX & JSON trees)
│   ├── smoke_test.py         ← In-process end-to-end API test with de-duplication
│   └── sync_model_assets.py  ← Syncs model metadata into frontend assets
├── datasets/          ← 100% Real photographic datasets & sensor benchmarks
└── validation/        ← Rigorous scientific integrity and hardware test suites
```

---

## 4. Quick Start & Execution

Full installation instructions are in **[INSTALL.md](./INSTALL.md)**.

### One-Time Automated Setup
```powershell
.\scripts\setup.ps1
```
This script automatically sets up the Python virtual environment, installs backend requirements, installs ONNX runtimes, generates RSA JWT keys, installs frontend npm packages, syncs model assets, and runs verification checks.

### Running the Services

#### Terminal 1 — FastAPI Backend:
```powershell
.\scripts\start_backend.ps1
# Or:
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
* **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
* **Model Registry**: [http://localhost:8000/api/v1/models/registry](http://localhost:8000/api/v1/models/registry)

#### Terminal 2 — Mobile / Web Frontend:
```powershell
.\scripts\start_frontend.ps1 -Platform web
# Or:
cd frontend
npm run web
```
* Access the interactive web interface at [http://localhost:8081](http://localhost:8081).
* Press `a` in the terminal for Android emulator, or `i` for iOS simulator.

---

## 5. End-to-End Verification

To verify that the frontend, backend, models, and hardware simulation are fully integrated and passing:

```powershell
.\scripts\verify_all.ps1
```

This runs four comprehensive verification suites:
1. `verify_integration.py`: Validates that all components are present, backend imports cleanly, and **every single frontend API call matches an active backend route** (46 assertions).
2. `verify_models.py`: Loads the ONNX vision model, executes an actual forward pass with `onnxruntime`, and walks the JSON Random Forest trees predicting SAFE/UNSAFE (23 assertions).
3. `smoke_test.py`: Boots the FastAPI app in-process and tests health, model registry, device auth, batch upload, and **idempotent replay de-duplication** (26 assertions).
4. `tsc --noEmit`: Confirms **zero TypeScript compilation errors** across the frontend codebase.

---

## 6. How the Frontend & Backend Communicate

The architecture is **100% offline-first**: the backend is never in the critical path of a farm screening.

1. **On-Device Scoring**: When a farmer captures photos and reads the probe, dual edge AI models score the silage directly on the phone, evaluate safety rules, and write the batch atomically to local SQLite (`silageguard_v3.db`).
2. **Background Sync Bridge**: `frontend/services/syncBridge.ts` maps local SQLite records into the backend's `SyncBatchRequest` wire format and POSTs them to `/api/v1/sync/batches` in a non-blocking background queue.
3. **Idempotent De-duplication**: The backend tracks `client_batch_id`. Re-sending an already-synced batch is safe—the backend returns `inserted: 0, skipped: 1`.
4. **Soft Degradation**: If the phone has no internet in the field, the batch remains stored locally and will be synchronized when network connectivity is restored.
5. **Device Authentication**: Devices authenticate via `POST /api/v1/auth/device` using a provisioned secret, allowing seamless synchronization without requiring a complex login screen for farmers.

---

## 7. Model Execution & Registry Architecture

* **Inference Remains On-Device**: To guarantee instant feedback in rural areas with zero cellular connectivity, all ML models run strictly on-device on the smartphone.
* **Backend Model Registry**: The backend exposes endpoints (`/api/v1/models/registry`, `/api/v1/models/registry/vision`, `/api/v1/models/registry/sensor/metrics`, `/api/v1/models/registry/{family}/ready`) so that regulatory bodies, cooperative auditors, and the mobile app can inspect deployed model versions and performance metrics.
* **Vision Model**: MobileNetV3-Small fine-tuned exclusively on 100% real photographs (90.91% test accuracy, 92.50% macro recall, INT8 quantized).
* **Sensor Model**: 11-Feature Random Forest classifier exported as a pure JSON tree schema evaluated in < 2 ms on the Hermes JavaScript engine.

---

## 8. Embedded Hardware Subsystem (ESP32-S3 Probe)

* **Microcontroller**: ESP32-S3 DevKitC-1 (240 MHz Dual-Core, BLE 5.0).
* **Sensors**:
  * Analog glass pH probe on GPIO 1 (0–3.3V safe voltage design).
  * Capacitive soil/forage moisture sensor v1.2 on GPIO 2.
  * DS18B20 digital temperature probe on GPIO 4 (1-Wire bus with 4.7kΩ pull-up).
  * 0.96" SSD1306 OLED display on GPIO 8 (SDA) and GPIO 9 (SCL).
* **BLE Contract**:
  * Device Name: `SilageGuard-Probe`
  * Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  * Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  * Rate: 1 Hz JSON telemetry stream.
* **Wokwi Simulator**: Fully verified circuit diagram and firmware in `hardware/wokwi/` (**56/56 checks pass**).

---

## 9. Comprehensive SIH26111 Report

For full technical specifications, mathematical formulations, literature citations (Kung et al. 2018, Borreani et al. 2018), SQLite DDL schemas, and economic analyses, refer to the complete submission document:
📄 **[SIH26111_PROJECT_REPORT.md](./SIH26111_PROJECT_REPORT.md)**

---

*SilageGuard AI — Smart India Hackathon 2026 — Ministry of Fisheries, Animal Husbandry & Dairying*  
*Team: The Bro-grammers*
