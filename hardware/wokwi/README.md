# SILAGEGUARD AI — Wokwi Hardware Simulation
# V3.1 | SIH26111 | ESP32-S3 DevKitC-1

## Overview

This Wokwi project simulates the **SilageGuard AI ESP32-S3 probe** for
the Smart India Hackathon 2026 Screening Round (SIH26111).

It validates the firmware, sensor ADC pipeline, and BLE telemetry pipeline
**before physical hardware is built**.

> Wokwi validates the firmware, sensor interfaces, and BLE pipeline.
> The battery subsystem is part of the physical enclosure implementation.

---

## Files

| File          | Purpose                                         |
|---------------|-------------------------------------------------|
| `diagram.json`| Circuit schematic (ESP32-S3 + sensors + OLED)  |
| `sketch.ino`  | Complete V3.1 ESP32-S3 firmware                 |
| `libraries.txt`| Required Arduino libraries                     |
| `README.md`   | This file                                       |

---

## Circuit Components

| Component           | Role                                     |
|---------------------|------------------------------------------|
| ESP32-S3 DevKitC-1  | Main MCU, BLE 5.0 GATT server            |
| DS18B20             | Silage probe temperature (1-Wire, GPIO 4)|
| 4.7 kΩ resistor     | DS18B20 DATA pull-up to 3.3 V            |
| Potentiometer (pH)  | Simulates pH analog output (GPIO 1)      |
| Potentiometer (M)   | Simulates moisture analog output (GPIO 2)|
| SSD1306 OLED        | Status display (I2C, GPIO 8/9)           |

**NOT included in Wokwi (physical-only):**
- LiPo battery
- TP4056 LiPo charger
- LDO voltage regulator
- IP65 enclosure

---

## Demo Profiles

Change `#define DEMO_PROFILE` in `sketch.ino`:

| Define              | pH   | Moisture | ΔT     | Expected result |
|---------------------|------|----------|--------|-----------------|
| `PROFILE_IDEAL`     | 4.08 | 63.8%    | +2.1°C | SAFE            |
| `PROFILE_CAUTION`   | 4.92 | 70.4%    | +6.2°C | CAUTION         |
| `PROFILE_UNSAFE`    | 6.28 | 77.1%    | +12.4°C| UNSAFE          |

> ⚠ These profiles are for demonstration only.
> NEVER use simulated telemetry as ML training, validation, or test data.

---

## BLE Connection

| Field               | Value                                  |
|---------------------|----------------------------------------|
| Device Name         | `SilageGuard-Probe`                    |
| Service UUID        | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| Characteristic UUID | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |
| Rate                | 1 Hz NOTIFY                            |

---

## Telemetry Mode

All Wokwi telemetry contains:

```json
"mode": "WOKWI_SIMULATION",
"is_demo": true,
"calibrated": false
```

A judge must never mistake simulated telemetry for a physical measurement.
The mobile app explicitly shows **SIMULATION** when these fields are present.

---

## Running in Wokwi

1. Open [wokwi.com](https://wokwi.com) and import `diagram.json`
2. Upload `sketch.ino` as the main firmware file
3. Add libraries from `libraries.txt`
4. Start simulation
5. Open Serial Monitor to see telemetry JSON
6. Open Wokwi Logic Analyzer if needed

---

## Scientific Limitations

| Measurement          | What it is                     | What it is NOT                  |
|----------------------|--------------------------------|---------------------------------|
| pH                   | Relative electrochemical screen| Certified laboratory pH value   |
| Moisture             | Relative ADC-based proxy       | Gravimetric dry-matter %        |
| Temperature          | Probe-tip thermometry          | Core silage temperature average |
| Delta T              | Rise above ambient reference   | Certified calorimetric heat flux|
| Overall system       | Rapid on-farm screening signal | Laboratory analytical chemistry |
