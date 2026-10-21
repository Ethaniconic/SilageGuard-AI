# SilageGuard AI — Physical Hardware & Field Validation Checklist

## 1. Overview & Verification Protocol

The SilageGuard AI system combines a custom ESP32-S3 BLE smart probe, multi-modal edge AI inference, and a mobile application running on Android / iOS.

> **Honesty & Integrity Statement**: Physical hardware testing cannot be executed inside a remote headless IDE environment. This document clearly distinguishes between what has been verified in software/automated test suites versus the rigorous physical, benchtop, and field tests that must be executed on real hardware prior to farm deployment.

### Verification Status Legend:
- **`IMPLEMENTED`**: Source code is fully written, integrated, and verified against API/firmware contracts.
- **`AUTOMATED TESTED`**: Validated by automated end-to-end integration and unit test scripts.
- **`MANUAL TEST REQUIRED`**: Requires human tester with physical smartphone and ESP32 hardware in lab conditions.
- **`FIELD VALIDATION REQUIRED`**: Requires testing inside physical silage pits, bunker silos, or silage bags on a working farm.
- **`SCIENTIFIC VALIDATION REQUIRED`**: Requires multi-sample benchtop comparison against accredited wet-chemistry / dry-matter laboratory testing.

---

## 2. BLE & ESP32-S3 Firmware Validation

| Test Item | Verification Criteria | Status | Required Action / Protocol |
| :--- | :--- | :--- | :--- |
| **Probe Advertising** | ESP32-S3 broadcasts BLE advertisements under name `SilageGuard-Probe`. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED` | Power on ESP32 probe; open nRF Connect app; verify device advertisement packet with correct service UUID. |
| **Service & Characteristic UUIDs** | Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`<br>Telemetry Char UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8` | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`MANUAL TEST REQUIRED` | Contract verified in `BleManager.js` and firmware. Validate connection handshake and characteristic subscription in Expo app. |
| **Connection & MTU Negotiation** | Mobile connects cleanly within 3.0 seconds; MTU negotiated to $\ge 128$ bytes. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED` | Test across Samsung, Xiaomi, and Pixel devices under both Bluetooth 5.0 and 5.2. |
| **Telemetry Payload Parsing** | JSON telemetry stream parsed without dropped frames: `ph`, `temp_core`, `temp_ambient`, `moisture`, `battery_pct`, `is_stable`. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`MANUAL TEST REQUIRED` | Verify live data stream on app dashboard updates every 1.0 second. |
| **Connection Watchdog & Stale Data Timeout** | If probe telemetry stops for $> 4.0$ seconds, probe status drops to `DISCONNECTED` or `STALE` and locks screening button. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`MANUAL TEST REQUIRED` | Power off probe during active connection; confirm mobile app immediately reflects disconnection within 4 seconds. |
| **Auto-Reconnect on Range Re-entry** | App seamlessly reconnects when phone re-enters BLE range ($\sim 10\text{ m}$). | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED` | Walk 15 meters away from probe until disconnected, return within 5 meters, verify auto-reconnection. |

---

## 3. Sensor Benchtop Calibration

| Sensor Subsystem | Laboratory Calibration Criteria | Status | Benchtop Protocol |
| :--- | :--- | :--- | :--- |
| **pH Electrode (Analog/I2C Probe)** | Two-point buffer calibration: pH 4.01 and pH 7.00 standards at $25^\circ\text{C}$. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED`<br>`SCIENTIFIC VALIDATION REQUIRED` | Submerge probe in standard NIST pH 4.01 and pH 7.00 buffers. Record raw ADC voltage, calibrate slope/intercept in ESP32 NVS flash storage. Tolerance: $\pm 0.05 \text{ pH}$. |
| **Core Temperature (DS18B20 / PT100)** | Calibrated against calibrated reference thermometer in ice-water bath ($0.0^\circ\text{C}$) and warm water bath ($40.0^\circ\text{C}$). | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED`<br>`SCIENTIFIC VALIDATION REQUIRED` | Validate thermal response time ($t_{90} \le 45\text{ s}$) inside high-density media. Tolerance: $\pm 0.5^\circ\text{C}$. |
| **Ambient Temperature Sensor (DHT22 / SHT30)** | Ambient thermal monitoring across $10^\circ\text{C} - 45^\circ\text{C}$ range. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED` | Validate that $\Delta T = T_{\text{core}} - T_{\text{ambient}}$ reads $0.0 \pm 0.5^\circ\text{C}$ when probe is held uninserted in free ambient air. |
| **Capacitive Moisture Sensor** | Frequency / capacitance calibration against oven dry-matter test ($105^\circ\text{C}$ for 24h). | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED`<br>`SCIENTIFIC VALIDATION REQUIRED` | Prepare 5 silage samples with known dry matter (30%, 35%, 40%, 45%, 50%). Measure probe dielectric response and fit calibration curve. |
| **Probe Thermal Stability Logic (`is_stable`)** | Temperature variance $< 0.15^\circ\text{C}$ over rolling 5-second window. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` | Verify app disables "Capture & Screen" until probe has reached thermal equilibrium in the bunker. |

---

## 4. Complete Field Workflow Validation (On-Farm)

| Step | Action | Expected Behavior | Verification Status |
| :--- | :--- | :--- | :--- |
| **1. Bunker Inspection** | Farmer opens app and selects existing batch `SG-2026-001`. | Digital Twin card loads previous status, baseline values, and observation count. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |
| **2. Probe Insertion** | Insert probe 30–50 cm into silage face at 3 designated grid points. | Telemetry stabilizes within 60 seconds; `is_stable` flag transitions to `true`. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED`<br>`FIELD VALIDATION REQUIRED` |
| **3. Image Capture** | Capture silage bunker face with phone camera under ambient daylight. | Image Quality Assessment (IQA) passes: brightness, contrast, blur check ok. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |
| **4. On-Device Inference** | Edge MobileNetV3 (vision) + Random Forest (sensors) execute offline. | Classification result, Grad-CAM heatmap, and MSSI score derived in $< 800\text{ ms}$. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |
| **5. Digital Twin Derivation** | Observation appended to local SQLite history; Twin state updated. | Baseline compared, drift rates computed, warning level updated, advice displayed. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |
| **6. TTS Voice Feedback** | Multilingual audio plays in farmer's chosen local language. | Clean audio playback in English, Hindi, Marathi, Kannada, or Telugu. | `IMPLEMENTED`<br>`MANUAL TEST REQUIRED` |
| **7. Offline Durability** | Farmer tests in remote silage pit with Airplane Mode active. | All records save locally; no crashes; offline badge clearly indicates queued sync. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |
| **8. Cloud Synchronization** | Phone returns to farmhouse WiFi or cellular connectivity. | Sync service auto-flushes; backend reconstructs identical Digital Twin state. | `IMPLEMENTED`<br>`AUTOMATED TESTED`<br>`FIELD VALIDATION REQUIRED` |

---

## 5. Scientific Validation Program (Pre-Commercialization)

Prior to marketing SilageGuard as an enterprise dairy screening platform, the following scientific validation studies must be conducted:

1. **Multi-Bunker Correlative Trial**:
   - Minimum 100 physical core samples taken across 10 commercial dairy bunkers across different seasons (Kharif and Rabi).
   - Comparative laboratory testing: volatile fatty acid analysis (lactic, acetic, butyric), ammonia-N fraction, and wet-chemistry pH (NIST electrode).
   - Correlation target: $R^2 \ge 0.88$ between sensor probe pH and laboratory laboratory pH.
2. **Aerobic Deterioration Time-Series Study**:
   - Intentionally expose packed silage cores to oxygen over 7 consecutive days.
   - Record daily thermal rise, pH elevation, and visual fungal colony emergence.
   - Verify that the SilageGuard Digital Twin triggers `EARLY_DETERIORATION` warning at least 48 hours prior to visible fungal sporulation.
