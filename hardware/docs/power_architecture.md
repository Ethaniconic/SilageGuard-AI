# SILAGEGUARD AI — Power Architecture
# V3.1 | SIH26111

## Wokwi Simulation Power

```
USB (Wokwi simulated)
  │
  ▼
ESP32-S3 DevKitC-1
  │
  ├─── 3.3 V regulated rail ──► DS18B20 / pH pot / Moisture pot / OLED
  └─── GND ──────────────────► All sensor GNDs
```

Battery field in telemetry: `null` (no LiPo monitor in Wokwi)

---

## Physical Hardware Power Design (Future)

```
LiPo 3.7 V (1S)
  │
  ▼
TP4056 Charger + DW01A Protection IC
  │
  ▼
HT7333 or AMS1117-3.3 LDO Regulator
  │
  ├─── 3.3 V rail ──► ESP32-S3 (3V3 pin)
  │                ──► DS18B20 VCC
  │                ──► pH module VCC (if AO ≤ 3.3 V)
  │                ──► Capacitive moisture VCC
  │                ──► OLED VCC
  │
  └─── GND ──► All sensor GNDs (common ground plane)
```

### Battery Monitoring

Add voltage divider from LiPo+ to ESP32 ADC pin for battery level %.

```
LiPo+ ─── R1 (100 kΩ) ─── ADC_PIN ─── R2 (100 kΩ) ─── GND
```

Vout = LiPo_V × 0.5 → report as battery% via firmware

### CRITICAL: Never connect LiPo directly to 3.3 V rail
The 3.3 V regulator must be between battery and sensor rail.
Bypassing the regulator will damage the ESP32-S3 and sensors.

---

## Enclosure Power Requirements

| Component     | Current (typ) | Notes              |
|---------------|--------------|---------------------|
| ESP32-S3      | 80–240 mA    | BLE active          |
| DS18B20       | 1.5 mA       | 1-Wire, negligible  |
| OLED SSD1306  | 20 mA        | At max brightness   |
| pH module     | ~5 mA        | Analog op-amp stage |
| Moisture      | ~5 mA        | Capacitive sensor   |
| **Total**     | **~115–270 mA** | BLE + all active |

Minimum recommended LiPo: 800 mAh (≥3 hours continuous operation)
Recommended LiPo: 2000 mAh (8+ hours field use)

IP65 enclosure required for field deployment.
