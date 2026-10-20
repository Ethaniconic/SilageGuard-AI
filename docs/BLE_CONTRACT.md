# SILAGEGUARD AI — Canonical BLE Hardware & Telemetry Contract

## 1. Physical ESP32 Hardware Profile
- **Target Boards**: ESP32 DevKit v1 / ESP32-WROOM-32 / ESP32-S3 DevKitC-1
- **Device Name**: `SilageGuard-Probe`
- **Firmware Implementation**: `hardware/esp32_sensor_probe/esp32_sensor_probe.ino`
- **Client Implementation**: `frontend/services/ble/bleManager.js`, `bleParser.js`, `bleConstants.js`

---

## 2. Pinout & Sensor Wiring

| Sensor | Protocol / Type | ESP32 Pin | Notes |
|:---|:---|:---|:---|
| **Capacitive Moisture Sensor v1.2** | Analog ADC (0–4095) | **GPIO 34** (ADC1_CH6) | Safe to read while BLE radio transmits (ADC1). Dry ADC ~3200 (0%), Wet ADC ~1250 (100%). |
| **DS18B20 Digital Core Temperature** | 1-Wire Digital | **GPIO 4** | Requires 4.7 kΩ pull-up resistor between GPIO 4 and 3.3V. |
| **Analog pH Probe (Optional)** | Analog ADC (0–4095) | **GPIO 35** (ADC1_CH7) | Optional. If not wired, sends `null`. |
| **Ambient Reference Temperature** | Constant / Reference | Embedded | Reference ambient temperature (25.0°C). |

---

## 3. Bluetooth Low Energy (BLE) GATT Architecture
- **Primary Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Telemetry Characteristic UUID**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Properties**: `READ | NOTIFY`
- **Descriptor**: `0x2902` (Client Characteristic Configuration Descriptor)
- **Notification Stream Rate**: 1.0 Hz (1 packet per second)
- **Timeout / Stale Window**: 3500 ms (Signal declared lost if packet not received within 3.5s)
- **Stabilization Requirement**: 3 consecutive stable readings (variation < 0.5°C, < 2% moisture)

---

## 4. Telemetry Wire Payload (JSON over BLE GATT)

Every second, the probe broadcasts a UTF-8 JSON packet:

```json
{
  "temp": 26.5,
  "moisture": 64.2,
  "ambient": 25.0,
  "ph": null,
  "battery": null,
  "probe_id": "SILAGE-ESP32-PROBE",
  "seq": 142
}
```

### Field Definitions & Physical Validation Rules

| Field | Type | Unit | Range / Constraints | Fallback / Missing Handling |
|:---|:---|:---|:---|:---|
| `temp` | Float | °C | -10.0°C to 75.0°C | If sensor disconnected, defaults to ambient reference. |
| `moisture`| Float | % | 0.0% to 100.0% | Derived from ADC: `clamp(100 - ((adc - 1250) / 1950) * 100, 0, 100)`. |
| `ambient` | Float | °C | 0.0°C to 55.0°C | Defaults to 25.0°C reference. |
| `ph` | Float \| null| pH | 1.0 to 14.0 | Honest `null` if optional pH electrode is not physically wired. |
| `battery` | Float \| null| % | 0% to 100% | `null` when powered via direct USB/VBUS. |
| `probe_id`| String | — | Identifier string | Defaults to `"SILAGE-ESP32-PROBE"`. |
| `seq` | Integer | Count | Monotonically increasing uint32 | Used by client for duplicate and packet-loss detection. |

---

## 5. Alternative Wi-Fi SoftAP HTTP Bridge
- **SSID**: `SilageGuard-Probe` (Open / No password for field triage)
- **Probe IP Address**: `192.168.4.1`
- **Endpoint**: `GET http://192.168.4.1/telemetry`
- **Response**: Same canonical JSON telemetry payload as BLE GATT.
- **CORS Headers**: `Access-Control-Allow-Origin: *`
