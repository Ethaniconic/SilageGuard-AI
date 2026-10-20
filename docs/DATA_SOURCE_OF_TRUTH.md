# SILAGEGUARD AI — DATA SOURCE OF TRUTH MATRIX

**Version:** 3.0.0-PROD  
**Architecture:** Physical ESP32 Sensor Probe ➔ BLE Layer ➔ React Native Client ➔ Local SQLite ➔ FastAPI ASGI ➔ Supabase Managed PostgreSQL

---

## 1. DATA PROVENANCE & LIFECYCLE TABLE

| Field / Attribute | Runtime Source | On-Device Persistence | Cloud Source of Truth | Notes & Handling |
|---|---|---|---|---|
| **pH Acidity** | Physical analog pH probe via ESP32 ADC1 | SQLite (`observations.ph`) | Supabase `batch_observations.ph` | Value is `null` if 2-sensor physical probe is wired. Valid chemical range: 1.0 – 14.0. |
| **Moisture %** | Capacitive soil/silage sensor v1.2 (Oversampled 16x) | SQLite (`observations.moisture`) | Supabase `batch_observations.moisture_pct` | 0 – 100% bounded mapping based on physical ADC calibration (Dry: 3200, Wet: 1250). |
| **Core Temperature** | DS18B20 digital 1-Wire probe on GPIO 4 | SQLite (`observations.temperature`) | Supabase `batch_observations.temperature_c` | Accurate to ±0.125°C. Disconnect flag (`85.0°C` / `-127°C`) triggers sensor error. |
| **Ambient Temperature** | Reference/ambient sensor via ESP32 telemetry | SQLite (`observations.ambient`) | Supabase `batch_observations.ambient_temp_c` | Used to compute Delta-T ($\Delta T = T_{\text{core}} - T_{\text{ambient}}$) to flag aerobic heat spikes. |
| **Probe Identity** | ESP32 GATT string (`SILAGE-ESP32-PROBE`) | SQLite (`observations.probe_id`) | Supabase `calibration_records.probe_id` | Enforces hardware binding. Never fabricated. |
| **Silage Face Photo** | Mobile phone camera (`expo-camera`) | Temporary local image buffer | Uploaded to FastAPI / Supabase | Preprocessed by Image Quality Assessment (IQA) gate before ONNX vision inference. |
| **Vision Classification** | MobileNetV3-Small INT8 ONNX Model | SQLite (`observations.vision_result`) | Supabase `batch_observations.vision_decision` | Classes: Healthy, Mould, Spoilage, Abnormal appearance, Foreign object. |
| **Sensor Decision** | 11-Feature Random Forest (`scikit-learn`) | SQLite (`observations.sensor_result`) | Supabase `batch_observations.sensor_decision` | Evaluates pH, moisture, delta-T, core temperature, and interaction terms. |
| **Fused MSSI Score** | Multimodal Silage Stability Index (FastAPI) | SQLite (`observations.mssi_score`) | Supabase `batch_observations.fused_score` | Weighted multimodal fusion ($0.55 \times \text{Sensor} + 0.45 \times \text{Vision}$) clipped to 0 – 100. |
| **Screening Verdict** | Calibrated Fusion Engine + Safety Overrides | SQLite (`observations.decision`) | Supabase `batch_observations.fused_decision` | Outcomes: `SAFE` (Good), `CAUTION` (Watch), `UNSAFE` (High Risk). |
| **Batch Digital Twin** | Cumulative observations over time | SQLite (`observations` table) | Supabase `batch_observations` + `batches` | Digital Twin timeline derived exclusively from real saved observation points. |
| **Sync Status** | Offline Sync Queue Engine | SQLite (`sync_queue.status`) | Supabase `sync_log` | States: `SAVED_LOCAL` ➔ `PENDING` ➔ `SYNCING` ➔ `SYNCED`. Never displays synced without server 200 OK. |

---

## 2. OFFLINE-FIRST INTEGRITY GUARANTEE

1. **No Fake Results on Offline Inference:**
   - If the mobile phone loses cellular/Wi-Fi connection during analysis, the app informs the farmer honestly:
     > *"Internet connection required to run server-verified AI inference. Sensor telemetry and photo are saved locally on phone."*
   - Telemetry and photo bytes are preserved locally in SQLite.
2. **Deterministic Synchronization:**
   - Observations stored in `sync_queue` are uploaded via `POST /api/v1/sync/batches`.
   - Records use stable client UUIDs (`client_batch_id`) to ensure absolute idempotency (replaying requests never creates duplicate observations in PostgreSQL).
