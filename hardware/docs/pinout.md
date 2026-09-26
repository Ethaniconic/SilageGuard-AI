# SILAGEGUARD AI — Hardware Pinout Reference
# V3.1 | Board: ESP32-S3 DevKitC-1 | SIH26111

## GPIO Assignment Table

| GPIO | Function        | Interface | Notes                                    |
|------|-----------------|-----------|------------------------------------------|
| 1    | pH Analog Input | ADC1 CH0  | 0–3.3 V safe; verify module AO on physical |
| 2    | Moisture Analog | ADC1 CH1  | 0–3.3 V safe; potentiometer in Wokwi     |
| 4    | DS18B20 DATA    | 1-Wire    | 4.7 kΩ pull-up to 3.3 V required        |
| 8    | OLED SDA        | I2C       | Wire.begin(8, 9)                          |
| 9    | OLED SCL        | I2C       | Wire.begin(8, 9)                          |

## Boot-Safe GPIO Notes (ESP32-S3 DevKitC-1)

GPIO 0  — Boot strapping (avoid for inputs at boot)
GPIO 3  — Strapping pin (avoid)
GPIO 45 — Strapping pin (avoid)
GPIO 46 — Strapping pin (avoid)
GPIO 1, 2 — ADC1, safe for analog (no boot conflict on S3)
GPIO 4  — Safe digital; confirmed 1-Wire compatible on S3
GPIO 8, 9 — Default I2C on ESP32-S3; safe for OLED
GPIO 10 — Previously used for LED; removed in V3.1 (unnecessary)

## ADC Voltage Safety

ESP32-S3 ADC absolute maximum: 3.6 V
ESP32-S3 ADC recommended operating: ≤ 3.3 V

### Wokwi Configuration
Both pH and moisture analog inputs are driven by potentiometers
connected between 3.3 V and GND → output bounded [0, 3.3 V].
No voltage divider required.

### Physical Hardware (Future)
Inspect pH module AO specification before direct connection.
Common DFRobot/Atlas Scientific analog pH modules:
- DFRobot SEN0161: AO 0–3.0 V (safe, no divider needed)
- Generic BNC + op-amp circuit: AO may reach 5 V (UNSAFE — add divider)

If AO > 3.3 V, use resistive divider:
  GPIO ← R1 ← AO
         R2 → GND
  Vout = Vin × R2 / (R1 + R2) ≤ 3.3 V

Example for 5 V → 3.0 V: R1 = 10 kΩ, R2 = 15 kΩ

## Unconnected Pins

All other GPIO pins are unconnected in V3.1.
No floating input pins affect operation.
DS18B20 DATA has pull-up (no floating state).
