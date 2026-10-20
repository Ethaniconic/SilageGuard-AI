# SilageGuard AI — Complete System Reconciliation

This document establishes the verified source-of-truth reconciliation across physical hardware, BLE protocol, machine learning models, database schema, and backend API contracts.

---

## 1. System Reconciliation Matrix

| Component | Expected | Actual | Source | Decision | Confidence |
|---|---|---|---|---|---|
| **ESP32 MCU** | ESP32 DevKit v1 / ESP32-WROOM-32 / ESP32-S3 | Dual-Core Xtensa LX6 @ 240MHz, 520KB SRAM, 4MB Flash | `hardware/esp32_sensor_probe/esp32_sensor_probe.ino:8-10` | Canonical board: ESP32-WROOM-32 with BLE 4.2 / SoftAP | **HIGH (100%)** |
| **Moisture Sensor** | Capacitive Silage Moisture v1.2 | Analog voltage on GPIO 34 (ADC1_CH6). Calibrated: Dry ADC 3200 (0%), Wet ADC 1250 (100%) | `esp32_sensor_probe.ino:53,68-73` | 16x oversampled ADC with physical bound clamping [0, 100]% | **HIGH (100%)** |
| **Core Temp Sensor** | DS18B20 Digital 1-Wire | DallasTemperature on GPIO 4 with 4.7kΩ pull-up | `esp32_sensor_probe.ino:54,79-80,123-143` | 11-bit resolution (±0.125°C). Returns honest disconnected flag if probe unseated | **HIGH (100%)** |
| **pH Sensor** | Analog Glass BNC Probe | Optional analog input on GPIO 35 (ADC1_CH7). Centered at 1.65V (pH 7.00) | `esp32_sensor_probe.ino:55,145-161` | If sensor unpopulated/floating, transmits `ph = null`. Zero fabricated pH | **HIGH (100%)** |
| **BLE Service UUID** | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` | `esp32_sensor_probe.ino:58`, `bleConstants.js:6` | Exact 128-bit UUID matched across firmware and mobile client | **HIGH (100%)** |
| **BLE Char UUID** | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | `beb5483e-36e1-4688-b7f5-ea07361b26a8` (READ + NOTIFY + 2902) | `esp32_sensor_probe.ino:59,201-208`, `bleConstants.js:7` | Exact 128-bit UUID matched across firmware and mobile client | **HIGH (100%)** |
| **BLE Device Name** | `SilageGuard-Probe` | `SilageGuard-Probe` | `esp32_sensor_probe.ino:60`, `bleConstants.js:5` | Exact match for discovery filtering | **HIGH (100%)** |
| **Telemetry Format** | UTF-8 JSON stream at 1.0 Hz | `{"temp": float, "moisture": float, "ambient": float, "ph": float|null, "probe_id": str, "seq": int, "mode": "REAL_SENSOR", "is_demo": false, "is_valid": true}` | `esp32_sensor_probe.ino:266-286`, `bleParser.js:16-64` | Validated by `TelemetryParser` with duplicate sequence and physical bound checks | **HIGH (100%)** |
| **Vision Model** | MobileNetV3-Large | PyTorch MobileNetV3-Large (`.pth`) + ONNX INT8 (`.onnx`) | `models/vision/vision_model_metadata.json`, `models/vision/train_mobilenetv3.py` | 5 classes: `Abnormal_appearance`, `Foreign_object`, `Healthy`, `Mould`, `Spoilage`. Input `[1,3,224,224]`, output `probabilities` `[1,5]` | **HIGH (100%)** |
| **Grad-CAM Layer** | Final convolutional stage | `model.features[-1]` in PyTorch MobileNetV3 | `backend/app/routers/inference.py:100` | True activation maps computed on CPU/CUDA, normalized to base64 JPEG | **HIGH (100%)** |
| **Sensor Model** | 25-Tree Random Forest | 25 estimators, 11 features, 3 classes (`SAFE`, `CAUTION`, `UNSAFE`) | `models/sensor/sensor_rf_model.json`, `models/sensor/train_sensor_model.py` | Exact feature vector alignment between backend Python and frontend JS engine | **HIGH (100%)** |
| **MSSI Fusion** | Multimodal evidence weighting | $\text{MSSI} = \text{clip}(0.55 \times S + 0.45 \times V, 0, 100)$ with deterministic safety gates | `backend/app/routers/inference.py:578-604`, `edgeInference.js` | If either modality indicates `UNSAFE`, verdict is `UNSAFE`. Honest `VISION_ONLY` when probe disconnected | **HIGH (100%)** |
| **Local Database** | SQLite (Mobile) / Web Storage (Web) | Native `expo-sqlite` with tables `batches`, `observations`, `sync_queue` | `frontend/services/db/localDb.js`, `frontend/services/db/localDb.web.js` | Full offline durability with atomic transactions and zero fake fallback defaults | **HIGH (100%)** |
| **Cloud Sync** | FastAPI REST sync | `POST /api/v1/sync/batches` with Bearer auth and idempotency check | `backend/app/routers/sync.py`, `backend/app/services/sync_service.py` | Idempotent insertion by `client_batch_id`; returns `inserted` and `skipped` counts | **HIGH (100%)** |

---

## 2. Hardware Pinout & Wiring Truth

```
ESP32 Pin      Connected Hardware                  Signal / Role
-----------------------------------------------------------------------------------
GPIO 34        Capacitive Moisture Sensor v1.2     Analog Output (ADC1_CH6, 0 - 3.3V)
GPIO 4         DS18B20 Temperature Probe          1-Wire Data (Requires 4.7kΩ pull-up to 3.3V)
GPIO 35        Analog pH Sensor (SEN0161)         Analog Output (ADC1_CH7, 0 - 3.3V)
3V3            Sensor VCC Rails                    Regulated 3.3V DC Power
GND            Common Ground                       System Ground Reference
```

---

## 3. Discrepancies Identified and Resolved

1. **BLE UUID Consistency**: Historical notes referenced `FFE0`/`FFE1` (HM-10 legacy format). Source code audit confirmed the firmware uses modern 128-bit UUIDs (`4fafc201-1fb5-459e-8fcc-c5c9c331914b` and `beb5483e-36e1-4688-b7f5-ea07361b26a8`). Both frontend `bleConstants.js` and firmware `esp32_sensor_probe.ino` are 100% reconciled on these UUIDs.
2. **Vision Model Dimensions and Classes**: The model is MobileNetV3-Large with input `[1, 3, 224, 224]` and 5 verified classes in strict alphabetical order:
   - `0: Abnormal_appearance`
   - `1: Foreign_object`
   - `2: Healthy`
   - `3: Mould`
   - `4: Spoilage`
3. **Private Network Access (PNA) CORS**: Starlette `CORSMiddleware` was missing `allow_private_network=True`, which triggered Chrome's `Failed to fetch` error when web apps on `localhost` contacted LAN IP backends. This was resolved by enabling `allow_private_network=True` and setting origin-matching host resolution in `frontend/services/api.js`.
4. **No Simulated Fallbacks**: Eliminated hardcoded placeholder defaults (`|| 90`, `|| 92`, `|| 25`, `|| 42`). Real telemetry, inference outputs, and confidence scores are presented directly; missing readings render as `"--"`.
