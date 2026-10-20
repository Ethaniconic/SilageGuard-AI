# SILAGEGUARD AI — PHYSICAL HARDWARE VALIDATION CHECKLIST
## SIH26111 Physical Probe & BLE Telemetry Field Protocol

> **STATUS**: Code Implemented & Contract Reconciled — Physical Lab & Farm Validation Required.
> **Authoritative BLE Contract**: [`docs/BLE_CONTRACT.md`](./BLE_CONTRACT.md)
> **Authoritative Firmware**: `hardware/firmware/esp32_probe/esp32_probe.ino`

---

## 1. Physical Hardware Setup

| Component | Specification | Authoritative Pin / Interface | Physical State |
|---|---|---|---|
| **MCU** | ESP32-WROOM-32 (NodeMCU / DevKit v1) | Dual-core Tensilica Xtensa 240MHz | Configured in firmware |
| **Moisture Sensor** | Capacitive Soil Moisture Sensor v1.2 | **GPIO 34** (ADC1_CH6, input only) | Circuit mapped |
| **pH Sensor** | Analog pH Sensor with BNC Probe Interface | **GPIO 35** (ADC1_CH7, input only) | Circuit mapped |
| **Temperature Sensor** | DS18B20 Digital Thermometer (Stainless Probe) | **GPIO 4** (OneWire 4.7kΩ pull-up) | Protocol verified |
| **Ambient Reference** | SHT31-D or board thermistor | I2C / internal calibration | Firmware calibrated |
| **Battery Level** | 100kΩ / 100kΩ divider from Li-ion (3.7V - 4.2V) | **GPIO 36** (ADC1_CH0) | Divider mapped |
| **Status LED** | Blue/Green Indicator | **GPIO 2** | Blink pattern implemented |

---

## 2. Field Validation Checklist

Check off each item during bench testing and field deployment with actual silage pits/bales:

### Power & Bluetooth Advertising
- [ ] **ESP32 Powers On**: Power regulator provides stable 3.3V; status LED on GPIO 2 illuminates.
- [ ] **BLE Advertised**: Advertising name `SilageGuard-Probe` broadcasts within 2 seconds of boot.
- [ ] **Service & Characteristic Discovery**:
  - Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b` discovered.
  - Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8` discovered with `NOTIFY | READ` properties.
- [ ] **Mobile Discovery**: SilageGuard mobile client (React Native) discovers `SilageGuard-Probe` via BLE scan within 3 seconds.

### Telemetry Streaming & Stability
- [ ] **Telemetry Packet Received**: 1 Hz JSON telemetry streams into `bleManager.js` and updates live UI.
- [ ] **Sequence Counter Increments**: `seq` field increments sequentially without dropped packets.
- [ ] **pH Dynamic Response**:
  - Probe immersed in pH 4.01 buffer reads between 3.90 and 4.15.
  - Probe immersed in pH 7.00 buffer reads between 6.85 and 7.15.
- [ ] **Temperature Dynamic Response**:
  - Probe at ambient (24°C) reads room temperature.
  - Core probe immersed in warm water (38°C) rises rapidly; `coreTemp` and `deltaTemp` reflect heating.
- [ ] **Moisture Dynamic Response**:
  - Sensor in open air reads dry band (< 15%).
  - Sensor in silage core sample reads expected target band (60% – 68%).
- [ ] **Readings Stabilization**: Client UI transitions from "Awaiting stabilization..." to "✓ Readings stable" after 3 consecutive stable packets.

### Fault Tolerance & Reconnection
- [ ] **Probe Signal Loss / Out of Range**: Phone moved > 15 meters away; app catches disconnect without crashing, displays `"Probe signal lost — check battery or proximity"`.
- [ ] **Reconnection Within Session**: Probe brought back in range; auto-reconnect restores live streaming without restarting the app.
- [ ] **Manual Disconnect**: Farmer taps "Disconnect Probe" or "Switch to Vision-Only"; app cleanly releases BLE GATT connection.

### End-to-End Workflow with Hardware
- [ ] **Offline Screening**: With cellular data and Wi-Fi disabled, live BLE telemetry fuses with captured photo.
- [ ] **Local Record Stored**: Result with real hardware metrics (pH, moisture, temp) saved to SQLite.
- [ ] **Cloud Sync on Network Return**: Reconnect Wi-Fi; queued observation uploads to FastAPI backend with matching metrics and probe ID.

---

## 3. Physical Lab Test Log

| Date | Tester | ESP32 Serial / Probe ID | Silage Sample Type | Tested Values (pH, Moist %, Temp °C) | Status | Notes |
|---|---|---|---|---|---|---|
| *Pending* | Field Engineer | `SILAGE-ESP32-PROBE-01` | Corn / Maize (Bunker) | *Pending physical probe run* | REQUIRES VALIDATION | Bench test scheduled |

---

## 4. Hardware Safety Precautions
1. **Shaft Cleaning**: Wipe the stainless steel temperature/pH shaft with distilled water and clean cloth between batch insertions.
2. **Moisture Calibration**: Recalibrate air/water ADC raw values in firmware if probe blade is replaced.
3. **Battery Safety**: Ensure 3.7V 18650 Li-ion cell is sealed in an IP65 moisture-resistant enclosure to prevent silage effluent infiltration.
