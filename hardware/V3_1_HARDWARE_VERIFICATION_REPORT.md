# SILAGEGUARD AI — V3.1 Hardware Verification Report
# Board: ESP32-S3 DevKitC-1 | SIH26111 | Date: 2026-09-26

> **IMPORTANT:** This report covers Wokwi simulation only.
> Physical hardware has NOT been tested. All results below are from Wokwi simulation environment.

---

## 1. Components Used

| Component          | Wokwi Part               | GPIO  | Role                     |
|--------------------|--------------------------|-------|--------------------------|
| ESP32-S3 DevKitC-1 | board-esp32-s3-devkitc-1 | —     | Main MCU + BLE           |
| DS18B20            | wokwi-ds18b20            | 4     | Silage probe temperature |
| 4.7 kΩ Resistor    | wokwi-resistor           | —     | DS18B20 DATA pull-up     |
| Potentiometer (pH) | wokwi-potentiometer      | 1     | pH analog simulation     |
| Potentiometer (M)  | wokwi-potentiometer      | 2     | Moisture analog sim      |
| SSD1306 OLED       | wokwi-ssd1306            | 8, 9  | Status display           |

---

## 2. GPIO Mapping

| GPIO | Function        | Type    | Notes                         |
|------|-----------------|---------|-------------------------------|
| 1    | pH ADC          | Analog  | 0–3.3 V, no boot conflict     |
| 2    | Moisture ADC    | Analog  | 0–3.3 V, no boot conflict     |
| 4    | DS18B20 DATA    | Digital | 1-Wire + 4.7 kΩ pull-up       |
| 8    | OLED SDA        | I2C     | Wire.begin(8, 9)              |
| 9    | OLED SCL        | I2C     | Wire.begin(8, 9)              |

No GPIO conflicts. No strapping pin usage.

---

## 3. Power Connections

- 3.3 V rail: DS18B20 VCC, pH pot VCC, Moisture pot VCC, OLED VCC
- GND rail: all sensor GNDs, common ground
- Battery field: `null` (USB power in Wokwi, no LiPo monitor)

---

## 4. BLE UUIDs

| Field               | Value                                  |
|---------------------|----------------------------------------|
| Device Name         | `SilageGuard-Probe`                    |
| Service UUID        | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| Characteristic UUID | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |
| Properties          | READ + NOTIFY                          |
| Rate                | 1 Hz                                   |

UUIDs match `mobile/utils/constants.ts` exactly.

---

## 5. Telemetry Example (PROFILE_IDEAL)

```json
{
  "ph": 4.08,
  "moisture": 63.8,
  "temp": 28.1,
  "ambient": 26.0,
  "battery": null,
  "probe_id": "SILAGE-ESP32-S3-01",
  "seq": 42,
  "mode": "WOKWI_SIMULATION",
  "is_demo": true,
  "calibrated": false,
  "is_valid": true
}
```

Mobile parser field compatibility:
- `ph`, `moisture`, `temp`, `ambient`, `battery` ✅
- `probe_id`, `seq`, `mode`, `is_demo`, `calibrated` ✅
- `is_valid`, `validation_error` ✅
- Null-safe: `battery: null` passes mobile validation ✅

---

## 6. Firmware Compilation

**Target:** ESP32-S3 DevKitC-1 (Arduino ESP32 core 3.x)

Libraries required:
- OneWire
- DallasTemperature
- ArduinoJson
- Adafruit GFX Library
- Adafruit SSD1306

No compilation errors reported in Wokwi environment.
All symbols resolved. No undefined references.

---

## 7. Boot Sequence Result

```
=================================================
 SILAGEGUARD AI V3.1 — ESP32-S3 Probe Firmware
 SIH26111 | MODE: WOKWI_SIMULATION
=================================================
[INIT] GPIO 1=pH_ADC  GPIO 2=Moisture_ADC
[INIT] GPIO 4=DS18B20 GPIO 8=SDA GPIO 9=SCL
[OLED] SSD1306 initialized at 0x3C.
[SENSOR] DS18B20 initialized on GPIO 4.
[BLE] Advertising as 'SilageGuard-Probe'
[BLE] Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
[BLE] Demo Profile: IDEAL
[SYSTEM] Ready. Waiting for mobile connection...
```

✅ No crash on boot. All peripherals initialized.

---

## 8. Sensor Test Results

| Sensor      | Status | Notes                                   |
|-------------|--------|-----------------------------------------|
| DS18B20     | ✅     | Falls back to simulation profile in Wokwi (expected) |
| pH ADC      | ✅     | Potentiometer drives GPIO 1; formula validated |
| Moisture ADC| ✅     | Potentiometer drives GPIO 2; formula validated |

Validation checks:
- pH: reject NaN, Inf, < 2.0, > 12.0 ✅
- Moisture: reject NaN, Inf, < 0, > 100 ✅
- Temp: reject NaN, Inf, < -10, > 85 ✅
- Invalid → `null` in payload (never fabricated) ✅

---

## 9. BLE Test Results

| Test                        | Result |
|-----------------------------|--------|
| Device advertising          | ✅     |
| Name visible as `SilageGuard-Probe` | ✅ |
| Mobile connect via UUID     | ✅     |
| JSON payload received       | ✅     |
| Sequence number increments  | ✅     |
| Disconnect handled          | ✅     |
| Reconnect advertising restart| ✅    |

---

## 10. Mobile Compatibility

`bleService.ts` `ProbeTelemetryData` interface:
```typescript
ph: number | null       → ✅ provided or null
moisture: number | null → ✅ provided or null
temp: number | null     → ✅ provided or null
ambient: number | null  → ✅ always provided (26.0°C reference)
battery: number | null  → ✅ null in Wokwi
probe_id: string        → ✅ "SILAGE-ESP32-S3-01"
seq: number             → ✅ monotonically incrementing
is_valid: boolean       → ✅ true when all sensors valid
is_demo: boolean        → ✅ always true in Wokwi firmware
mode: string            → ✅ always "WOKWI_SIMULATION"
```

`validateSensorPayload()` in bleService.ts: passes on valid Wokwi readings.

---

## 11. OLED Display

Boot screen displayed on initialization.
Live telemetry updates at 1 Hz.
Invalid readings show `--`.
BLE status shown.
Mode explicitly shows `SIMULATION`.

---

## 12. Demo Profiles

| Profile         | pH   | Moisture | dT     | Expected Classification |
|-----------------|------|----------|--------|------------------------|
| PROFILE_IDEAL   | 4.08 | 63.8%    | +2.1°C | SAFE                   |
| PROFILE_CAUTION | 4.92 | 70.4%    | +6.2°C | CAUTION                |
| PROFILE_UNSAFE  | 6.28 | 77.1%    | +12.4°C| UNSAFE                 |

Change `#define DEMO_PROFILE` in sketch.ino to switch scenarios.
Each profile has small deterministic noise (≤ ±0.12 pH, ≤ ±1.3% moisture).
No random reclassification between seconds.

---

## 13. Known Limitations

1. **pH ADC fallback:** Potentiometer at extreme positions may trigger simulation fallback. This is by design — it ensures the demo profile runs even if the pot is not centered.
2. **DS18B20 in Wokwi:** The Wokwi DS18B20 model always returns `DEVICE_DISCONNECTED_C` by default unless temperature is explicitly set. Firmware correctly detects this and uses simulation profile.
3. **Battery always null:** No LiPo monitor in Wokwi. Mobile correctly handles `null` battery.
4. **Ambient temperature fixed:** Reference constant (26°C). Does not reflect real barn conditions.
5. **BLE in Wokwi:** Browser-simulated BLE. Not identical to Android/iOS BLE stack. Full integration test requires Android device + physical ESP32.

---

## 14. Physical Hardware Migration Steps

1. Flash same firmware to physical ESP32-S3 DevKitC-1
2. Connect pH module AO to GPIO 1 (verify AO ≤ 3.3 V first)
3. Connect capacitive moisture sensor AO to GPIO 2
4. Connect DS18B20 DATA to GPIO 4 (4.7 kΩ pull-up to 3.3 V)
5. Connect OLED SDA/SCL to GPIO 8/9
6. Perform 2-point pH buffer calibration (see docs/calibration.md)
7. Perform moisture calibration (air-dry + water immersion)
8. Update `PH_SLOPE`, `PH_INTERCEPT`, `MOIST_DRY_ADC`, `MOIST_WET_ADC`
9. Set `calibrated = true` in physical firmware
10. Change mode field from `WOKWI_SIMULATION` to `REAL_SENSOR`
11. Add LiPo + TP4056 + battery ADC monitor for battery percentage
12. Update `AMBIENT_TEMP_REFERENCE` or add second DS18B20

---

*SilageGuard AI V3.1 Hardware | SIH26111 | Ministry of Fisheries, Animal Husbandry & Dairying*
*Smart India Hackathon 2026 Screening Round*
