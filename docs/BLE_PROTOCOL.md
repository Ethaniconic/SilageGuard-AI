# SilageGuard AI — BLE Communication Protocol Specification

This document defines the physical Bluetooth Low Energy (BLE) protocol between the SilageGuard ESP32 probe and the mobile client application.

---

## 1. Hardware & Radio Specifications

- **Microcontroller**: ESP32-WROOM-32 / ESP32-S3
- **Bluetooth Specification**: BLE 4.2 / 5.0 Compliant
- **TX Power**: +9 dBm (Default)
- **Advertising Interval**: 100 ms (Fast connect)
- **Telemetry Frequency**: 1.0 Hz (1 transmission per second)
- **Connection Interval**: Min 15 ms, Max 30 ms
- **Supervision Timeout**: 4000 ms

---

## 2. GATT Service & Characteristic Hierarchy

```
Primary Service: SilageGuard Environmental Probe Service
└── UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
    └── Characteristic: Live Silage Telemetry Stream
        ├── UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
        ├── Properties: READ | NOTIFY
        └── Descriptors:
            └── Client Characteristic Configuration Descriptor (CCCD): 0x2902
```

---

## 3. Telemetry Payload Specification

The ESP32 encodes telemetry as a compact UTF-8 JSON object (length: 120–220 bytes) transmitted via GATT NOTIFY.

### Packet Schema
```json
{
  "temp": 24.6,
  "moisture": 64.8,
  "ambient": 25.0,
  "ph": 4.12,
  "battery": null,
  "probe_id": "SILAGE-ESP32-PROBE",
  "seq": 142,
  "mode": "REAL_SENSOR",
  "is_demo": false,
  "is_valid": true
}
```

### Field Definitions
| Field | Type | Unit | Physical Range | Description |
|---|---|---|---|---|
| `temp` | `float` | °C | -10.0 – 85.0 | Sub-surface internal bunker temperature from DS18B20 1-Wire probe. |
| `moisture` | `float` | % | 0.0 – 100.0 | Volumetric moisture proxy computed from 16x oversampled ADC curve. |
| `ambient` | `float` | °C | -10.0 – 50.0 | Reference atmospheric temperature used for thermal delta ($\Delta T$). |
| `ph` | `float \| null` | pH units | 2.0 – 12.0 | Acidity measurement from analog glass electrode. If sensor unpopulated, transmits honest `null`. |
| `battery` | `int \| null` | % | 0 – 100 | Optional LiPo battery percentage or `null` if USB powered. |
| `probe_id` | `string` | — | Constant | Unique hardware serial string (`SILAGE-ESP32-PROBE`). |
| `seq` | `int` | Count | 1 – $2^{32}-1$ | Monotonically incrementing sample sequence number for loss/duplicate detection. |
| `mode` | `string` | — | Constant | `REAL_SENSOR` (never simulated). |
| `is_demo` | `bool` | — | Constant | `false` in production firmware. |
| `is_valid` | `bool` | — | Flag | Hardware self-test validation flag. |

---

## 4. Connection Lifecycle & Error Handling

```
[Discovered]
     │
     ▼
[GATT Connect] ──── (Timeout > 5s) ───► [Connection Failed: Retry 1/3]
     │
     ▼
[Discover Primary Service 4fafc201...]
     │
     ├── (Missing) ───────────────────► [Reject: Not a SilageGuard Probe]
     │
     ▼
[Discover Characteristic beb5483e...]
     │
     ▼
[Enable CCCD 0x2902 Notifications]
     │
     ▼
[STREAMING ACTIVE (1 Hz)]
     │
     ├── Packet arrived ──────────────► Validate bounds & seq via TelemetryParser
     │
     └── No packet for > 3.5s ────────► declare SIGNAL_STALE / DISCONNECTED
```
