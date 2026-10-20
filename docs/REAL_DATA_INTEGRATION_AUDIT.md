# SILAGEGUARD AI — REAL DATA INTEGRATION AUDIT (S0)

**Date:** October 18, 2026  
**Auditor:** Senior Mobile, IoT & Edge-AI Production Engineering  
**Scope:** Frontend (React Native Expo), Physical Firmware (ESP32), Backend (FastAPI), Database (Supabase PostgreSQL).

---

## 1. INVENTORY OF FAKE / MOCK / DEMONSTRATION CODE IDENTIFIED

| File Path | Component / Code | Classification | Action Required |
|---|---|---|---|
| `frontend/services/store.js` | `MockLocalStore.activeBatch` (`BATCH-2026-MAH-01`) | **REMOVE / ISOLATE** | Replace with real SQLite queries for active batch; move to explicit demo toggle under Profile > Advanced. |
| `frontend/services/store.js` | `MockLocalStore.history` (4 hardcoded observations) | **REMOVE / ISOLATE** | Replace with genuine SQLite observations table. Only display records when saved by user. |
| `frontend/screens/CheckScreen.jsx` | `handleSearchProbe()` (Hardcoded `setTimeout` 1.2s + static ESP32 state) | **REPLACE** | Replace with real Bluetooth Low Energy scan & GATT connection state machine. |
| `frontend/screens/CheckScreen.jsx` | `handleSimulatePhoto()` (Static icon with zero actual camera capture) | **REPLACE** | Integrate real `expo-camera` capture & photo validation pipeline. |
| `frontend/screens/CheckScreen.jsx` | Static initial telemetry (`ph: 4.02, moisture: 63.8...`) | **REPLACE** | Bind directly to parsed real-time ESP32 BLE GATT notifications (1 Hz stream). |
| `frontend/services/api.js` | Hardcoded fallback result generator (`ph > 4.5 ? WATCH : GOOD`) | **REMOVE** | Never synthesize fake AI results if offline. Require backend or explicit edge preview with honest disclaimer. |
| `frontend/screens/ProfileScreen.jsx` | Static farmer profile ("Ramesh Patel, AMUL Anand") | **REPLACE** | Bind to authenticated user profile via `/api/v1/auth/me`. |

---

## 2. HARDWARE & FIRMWARE BLE CONTRACT

From `hardware/esp32_sensor_probe/esp32_sensor_probe.ino`:
- **Device Advertised Name:** `SilageGuard-Probe`
- **GATT Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **GATT Characteristic UUID:** `beb5483e-36e1-4688-b7f5-ea07361b26a8` (READ + NOTIFY, 2902 Descriptor enabled)
- **Sample Rate:** 1.0 Hz (1000 ms loop delay)
- **Payload Schema:**
  ```json
  {
    "temp": 24.8,
    "moisture": 64.5,
    "ambient": 25.0,
    "ph": 4.12,          // or null if only 2-sensor physical probe is wired
    "battery": null,
    "probe_id": "SILAGE-ESP32-PROBE",
    "seq": 124,
    "mode": "REAL_SENSOR",
    "is_demo": false,
    "is_valid": true
  }
  ```

---

## 3. BACKEND API CONTRACTS (FASTAPI)

### Multimodal Inference
- **Endpoint:** `POST /api/v1/inference/predict`
- **Request Schema (`MultimodalPayload`):**
  ```json
  {
    "image_base64": "<base64_string_or_null>",
    "telemetry": {
      "ph": 4.12,
      "moisture": 64.5,
      "temperature": 24.8,
      "ambient": 25.0,
      "crop_type": "Corn Silage",
      "pit_depth_cm": 40
    }
  }
  ```
- **Response Schema:**
  ```json
  {
    "decision": "SAFE" | "CAUTION" | "UNSAFE" | "RETAKE_REQUIRED",
    "mssi_score": 92,
    "confidence": 94,
    "need_retake": false,
    "modality_state": "MULTIMODAL" | "SENSOR_ONLY" | "VISION_ONLY",
    "vision_result": { ... },
    "sensor_result": { ... },
    "total_latency_ms": 14.8,
    "disclaimer": "Rapid AI Screening Tool — Not a laboratory diagnostic device."
  }
  ```

### Synchronization (Idempotent SQLite to Supabase)
- **Endpoint:** `POST /api/v1/sync/batches`
- **Request Schema (`SyncBatchRequest`):**
  ```json
  {
    "device_id": "android_uuid_or_probe_id",
    "app_version": "3.0.0",
    "batches": [
      {
        "client_batch_id": "BATCH-UUID",
        "scanned_at": "2026-10-18T11:45:00Z",
        "ph": 4.12,
        "moisture_pct": 64.5,
        "temperature_c": 24.8,
        "ambient_temp_c": 25.0,
        "fused_decision": "SAFE",
        "fused_score": 92.0
      }
    ]
  }
  ```

---

## 4. ARCHITECTURAL RESOLUTION: EXPO GO VS NATIVE BLE

- **Expo Go Constraint:** Stock Expo Go does not compile arbitrary binary C++ native BLE drivers (such as `react-native-ble-plx`).
- **Production Architecture Solution:**
  1. For Web / Simulator / Expo Go: Web Bluetooth API (or Bluetooth Web Serial / simulated hardware bridge) with strict zero-fake telemetry markers.
  2. For Production Android (.apk / Custom Dev Client): Native BLE manager using Android Bluetooth LE GATT client APIs.
  3. UI will show truthful status: `"PROBE CONNECTED (BLE)"` when genuine hardware is paired, or `"NO PROBE DETECTED"` with clear retry prompts.

---

## 5. AUDIT CONCLUSION & SPRINT PLAN
Proceeding to:
- **Sprint 1:** Native BLE service architecture, Web Bluetooth bridge, and telemetry parser with packet age & stale detection.
- **Sprint 2:** Real `expo-camera` integration with 3-photo guidance, IQA brightness/blur gate, and base64 preprocessing.
- **Sprint 3:** Real SQLite local database schema (`batches`, `observations`, `sync_queue`, `app_settings`).
- **Sprint 4:** FastAPI prediction pipeline connection & removal of mock data from production screens.
- **Sprint 5:** Isolated Demo Mode toggle under Profile for hardware-free judge inspections.
