# SILAGEGUARD AI — ESP32-S3 Hardware & Wokwi Simulation Guide
**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**

This directory contains the production-ready embedded firmware and simulation configuration for the **SilageGuard Multi-Sensor Probe**.

---

## 1. System Overview

The probe encapsulates:
1. **DS18B20 1-Wire Digital Temperature Sensor**: Measures core silage temperature inside bunker/silo pit (depth 30–100 cm).
2. **Capacitive Moisture Sensor v1.2**: Corrosion-resistant analog moisture measurement calibrated to silage dry matter range (35–85%).
3. **Analog Industrial pH Electrode**: Measures lactic acid fermentation buffering capacity (pH 3.5–8.0).
4. **Microcontroller**: ESP32-S3 (Dual-core Xtensa LX7 with native BLE 5.0 and Wi-Fi).

---

## 2. Hardware Pinout Table

| Sensor / Component | ESP32-S3 Pin | Interface / Protocol | Purpose |
|--------------------|--------------|----------------------|---------|
| DS18B20 Temp Probe | **GPIO 4**   | Dallas 1-Wire (4.7kΩ pullup) | Core Silage Temperature |
| Capacitive Moisture| **GPIO 1**   | ADC1 Channel 0       | Moisture % / Dry Matter |
| Analog pH Electrode| **GPIO 2**   | ADC1 Channel 1       | Silage Acidity (pH) |
| Green Status LED   | **GPIO 10**  | Digital Output (330Ω)| BLE Connection & Pulse |
| Power Rail (VCC)   | **3V3**      | Power                | Sensor VCC |
| Ground (GND)       | **GND**      | Ground               | Common Ground |

---

## 3. BLE GATT Specifications

* **Device Advertising Name**: `SilageGuard-Probe`
* **Custom Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
* **Sensor Telemetry Characteristic UUID**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
* **Properties**: `READ`, `NOTIFY`
* **Notification Interval**: 1000 ms (1 Hz)

### Telemetry JSON Payload Format
```json
{
  "ph": 4.12,
  "moisture": 64.5,
  "temp": 24.8,
  "ambient": 22.1,
  "battery": 94,
  "probe_id": "SILAGE-ESP32-S3-01",
  "seq": 142
}
```

---

## 4. How to Run in Wokwi Simulator

1. Go to [https://wokwi.com/projects/new/esp32-s3](https://wokwi.com/projects/new/esp32-s3).
2. Paste the contents of:
   * `sketch.ino` into the Code tab.
   * `diagram.json` into the `diagram.json` tab.
   * `libraries.txt` into the `libraries.txt` tab.
3. Click **Start Simulation** (Green Play button).
4. Watch the Serial Monitor at 115200 baud streaming real-time agronomic telemetry.
5. In Wokwi Chrome/Edge browser, connect the SilageGuard mobile app or web client using Web Bluetooth!

---

## 5. How to Flash Physical Hardware via Arduino IDE / ESP-IDF

1. Install **Arduino IDE 2.x**.
2. Add ESP32 board URL in Preferences:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install **ESP32 by Espressif** (v2.0.14 or later).
4. Select Board: `ESP32S3 Dev Module`.
5. Install libraries via Library Manager:
   - `DallasTemperature` by Miles Burton
   - `OneWire` by Paul Stoffregen
   - `ArduinoJson` by Benoit Blanchon
6. Connect ESP32-S3 via USB-C and hit **Upload**.
