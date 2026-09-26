# SILAGEGUARD AI — Hardware Wiring Reference
# V3.1 | Board: ESP32-S3 DevKitC-1 | SIH26111

## Component List

| # | Component                  | Wokwi Part               | Qty |
|---|----------------------------|--------------------------|-----|
| 1 | ESP32-S3 DevKitC-1         | board-esp32-s3-devkitc-1 | 1   |
| 2 | DS18B20 Temperature Sensor | wokwi-ds18b20            | 1   |
| 3 | 4.7 kΩ Pull-up Resistor    | wokwi-resistor           | 1   |
| 4 | pH Analog Sim (Pot)        | wokwi-potentiometer      | 1   |
| 5 | Moisture Analog Sim (Pot)  | wokwi-potentiometer      | 1   |
| 6 | SSD1306 OLED 128×64        | wokwi-ssd1306            | 1   |

**Note:** Potentiometers simulate the 0–3.3 V analog output of physical sensors.
On physical hardware, replace with DFRobot SEN0161 (pH) and capacitive moisture v1.2.

---

## Power Connections

All sensors powered from ESP32-S3 3.3 V rail.
All sensors share common GND.
USB provides simulation power (no LiPo in Wokwi).

```
ESP32-S3 3V3 ──┬─── DS18B20 VCC
               ├─── pH Pot VCC
               ├─── Moisture Pot VCC
               └─── OLED VCC

ESP32-S3 GND ──┬─── DS18B20 GND
               ├─── pH Pot GND
               ├─── Moisture Pot GND
               └─── OLED GND
```

---

## DS18B20 Wiring

```
ESP32-S3 3V3 ──── VCC
                  │
               [4.7 kΩ]   ← pull-up mandatory for 1-Wire
                  │
ESP32-S3 GPIO4 ── DATA (DQ)
ESP32-S3 GND ──── GND
```

⚠ The 4.7 kΩ pull-up connects between DATA and VCC.
Without it, the DS18B20 bus will not function correctly.

---

## pH Analog Wiring (Wokwi: potentiometer)

```
ESP32-S3 3V3 ──── Pot VCC (wiper max → 3.3 V)
ESP32-S3 GPIO1 ── Pot SIG (wiper output → 0 to 3.3 V)
ESP32-S3 GND ──── Pot GND (wiper min → 0 V)
```

Turn pot left → higher voltage → lower pH (more acidic)
Turn pot right → lower voltage → higher pH (more alkaline)

pH formula: `pH = -2.424 × voltage + 10.0`

| Voltage | pH   |
|---------|------|
| 0.00 V  | 10.0 |
| 1.20 V  | 7.09 |
| 2.47 V  | 4.02 |
| 3.30 V  | 2.0  |

Physical hardware: verify AO voltage range of pH module before connecting.
If AO > 3.3 V, add voltage divider (see pinout.md).

---

## Moisture Analog Wiring (Wokwi: potentiometer)

```
ESP32-S3 3V3 ──── Pot VCC
ESP32-S3 GPIO2 ── Pot SIG
ESP32-S3 GND ──── Pot GND
```

Turn pot right → higher ADC → higher moisture proxy reading.

Moisture formula: `moisture% = (ADC - DRY_ADC) / (WET_ADC - DRY_ADC) × 100`

Physical hardware: capacitive moisture sensor v1.2, 3.3 V supply.

---

## OLED I2C Wiring

```
ESP32-S3 GPIO8 ── SDA
ESP32-S3 GPIO9 ── SCL
ESP32-S3 3V3 ──── VCC
ESP32-S3 GND ──── GND
```

OLED I2C address: 0x3C (default SSD1306)
Library: Adafruit SSD1306

---

## ASCII Wiring Diagram

```
                    ┌─────────────────────────────┐
                    │       ESP32-S3 DevKitC-1    │
                    │                             │
   pH Pot           │  GPIO1 ◄── pH AO (0-3.3V)  │
   (wokwi-pot)──────┤                             │
                    │  GPIO2 ◄── Moisture AO      │
   Moisture Pot     │                             │
   (wokwi-pot)──────┤  GPIO4 ◄── DS18B20 DATA    │
                    │         (+ 4.7kΩ pullup)    │
   DS18B20──────────┤                             │
   (wokwi-ds18b20)  │  GPIO8 ──► OLED SDA        │
                    │  GPIO9 ──► OLED SCL        │
   OLED ────────────┤                             │
   (wokwi-ssd1306)  │  3V3  ──► All VCCs         │
                    │  GND  ──► All GNDs          │
                    └─────────────────────────────┘
                                │
                                │ BLE GATT (1 Hz)
                                ▼
                       SILAGEGUARD MOBILE APP
```

---

## Wokwi Simulation Limitations

1. Potentiometers simulate pH/moisture — not electrically identical to physical sensors
2. DS18B20 Wokwi model does not need pull-up for simulation but it is retained for physical accuracy
3. No LiPo battery / charging circuit in Wokwi — battery field is null in telemetry
4. ambient_temperature is a fixed software constant (26.0°C) — not a second sensor
5. BLE in Wokwi is simulated; actual RF pairing requires physical hardware

---

## Physical Hardware Migration Notes

When replacing Wokwi with physical components:

1. pH module: use DFRobot SEN0161 or equivalent (AO ≤ 3.3 V)
2. Moisture: capacitive soil moisture sensor v1.2 (3.3 V supply)
3. DS18B20: same GPIO 4, same firmware — no change needed
4. OLED: same wiring — no change needed
5. LiPo: add TP4056 charger + battery monitor to read battery%
6. Update `AMBIENT_TEMP_REFERENCE` or add second DS18B20 for real ambient
7. Calibrate pH with pH 4.01 and pH 7.00 buffer solutions to get real slope/intercept
8. Calibrate moisture with dry-air and water-immersion ADC readings
