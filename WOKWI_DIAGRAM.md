# SILAGEGUARD AI — WOKWI HARDWARE V3.1

## FINAL SCREENING-ROUND HARDWARE REBUILD

### ROLE

You are the embedded systems engineer responsible for making the **SILAGEGUARD AI Wokwi hardware prototype actually work**.

The existing Wokwi hardware implementation is currently broken/messy and must be **reconstructed**, not cosmetically patched.

This is the **FINAL screening-round hardware build**.

The objective is NOT to simulate every possible physical component.

The objective is to create the **smallest electrically coherent, clearly wired, judge-demonstrable SILAGEGUARD probe** that:

1. boots correctly,
2. reads pH,
3. reads moisture,
4. reads DS18B20 temperature,
5. calculates temperature rise relative to ambient,
6. exposes telemetry through BLE,
7. displays useful status through an optional OLED,
8. clearly identifies simulation mode,
9. contains no impossible electrical connections,
10. has clean, uncrowded wiring,
11. can later be mapped to the real physical probe.

---

# 1. CRITICAL RULE — INSPECT BEFORE MODIFYING

DO NOT blindly modify the existing circuit.

First inspect the entire existing hardware implementation:

* `hardware/`
* Wokwi project files
* `diagram.json`
* `sketch.ino`
* `wokwi.toml`
* any libraries
* pin definitions
* BLE UUID definitions
* mobile BLE parser
* telemetry TypeScript interfaces
* existing calibration constants

Determine:

* which Wokwi ESP32-S3 DevKit part is actually being used,
* its exact exposed pins,
* which GPIOs are currently assigned,
* whether any GPIO conflicts exist,
* whether the existing sensor parts are genuine Wokwi components,
* whether the current circuit contains impossible connections,
* whether the firmware expects pins that do not exist on the selected board,
* whether the mobile application expects a specific BLE payload.

DO NOT invent Wokwi part names.

Use only components supported by the installed Wokwi environment.

If the existing ESP32-S3 board definition differs from assumptions in this prompt, adapt to the actual board while preserving the electrical design.

---

# 2. HARDWARE SCOPE — BARE MINIMUM ONLY

The screening-round simulated probe consists of:

### Mandatory

1. ESP32-S3 DevKit
2. pH sensor module / analog pH input
3. Capacitive moisture sensor
4. DS18B20 waterproof temperature sensor
5. BLE telemetry
6. Stable simulated power source

### Optional

7. I2C OLED display

### Physical-only components

8. LiPo battery
9. LiPo charger/protection circuit
10. enclosure
11. physical wiring/connectors

Do NOT add:

* unnecessary LEDs,
* relays,
* motors,
* buzzers,
* potentiometers,
* servos,
* unnecessary displays,
* extra sensors,
* unnecessary ADC expanders,
* unnecessary communication modules.

Keep the prototype minimal.

---

# 3. TARGET ARCHITECTURE

The final Wokwi system should represent:

```text
                 ┌──────────────────────┐
                 │     ESP32-S3         │
                 │                      │
                 │  ADC ── pH           │
                 │  ADC ── Moisture     │
                 │  GPIO ─ DS18B20      │
                 │  I2C ── OLED         │
                 │                      │
                 │  BLE GATT            │
                 └──────────┬───────────┘
                            │
                            │ BLE
                            ▼
                    SILAGEGUARD MOBILE APP
```

The sensors should connect directly to the ESP32-S3 wherever practical.

---

# 4. PIN ASSIGNMENT STRATEGY

DO NOT choose pins randomly.

Before editing `diagram.json`, identify:

* ADC-capable pins,
* GPIO pins safe for digital input,
* I2C-capable pins,
* boot/strapping-sensitive pins,
* pins reserved by the selected Wokwi board,
* pins that cannot be used safely with the selected peripherals.

Prefer a simple pin layout with physical separation.

Use a pin table such as:

| Function     |    ESP32-S3 GPIO | Interface |
| ------------ | ---------------: | --------- |
| pH sensor    | ADC-capable GPIO | Analog    |
| Moisture     | ADC-capable GPIO | Analog    |
| DS18B20 DATA |     Digital GPIO | 1-Wire    |
| OLED SDA     |        Safe GPIO | I2C       |
| OLED SCL     |        Safe GPIO | I2C       |

The exact GPIO numbers MUST be selected after inspecting the actual ESP32-S3 DevKit Wokwi definition.

Do not use a GPIO merely because it is convenient if it creates a boot or peripheral conflict.

---

# 5. WIRING LAYOUT — VERY IMPORTANT

The existing circuit must be physically reorganized.

The goal is:

## ZERO WIRE CROWDING.

Arrange the diagram approximately like this:

```text
                 ┌───────────────────┐
                 │                   │
                 │    ESP32-S3       │
                 │      DEVKIT       │
                 │                   │
                 └───────────────────┘
                    │    │    │
       ─────────────┘    │    └──────────────
       │                 │                   │
       ▼                 ▼                   ▼

   ┌─────────┐      ┌──────────┐       ┌──────────┐
   │   pH    │      │ Moisture │       │ DS18B20  │
   │ Module  │      │ Sensor   │       │   Temp   │
   └─────────┘      └──────────┘       └──────────┘

                         │
                         ▼
                   ┌───────────┐
                   │   OLED    │
                   │   I2C     │
                   └───────────┘
```

Do NOT route wires diagonally across the entire circuit.

Use:

* horizontal runs,
* vertical runs,
* short paths,
* shared power rails,
* shared ground rail.

---

# 6. POWER RAIL DESIGN

Create a visually obvious power structure.

Use:

```text
               +----------------+
               | ESP32-S3       |
               +----------------+
                  │
                  │ 3.3V
                  ▼
        ┌──────────────────────┐
        │     3.3V RAIL        │
        └──────────────────────┘
          │          │       │
          ▼          ▼       ▼
         pH       Moisture  OLED
       
        ┌──────────────────────┐
        │      GND RAIL        │
        └──────────────────────┘
          │          │       │
          ▼          ▼       ▼
         pH       Moisture  OLED
```

All compatible sensors should have a common ground.

Avoid creating separate unnecessary ground networks.

---

# 7. pH SENSOR CONNECTION

The pH module is an **analog sensor input**.

Required conceptual wiring:

```text
pH VCC  → appropriate sensor supply
pH GND  → ESP32 GND
pH AO   → ESP32 ADC GPIO
```

Do NOT connect:

* pH analog output to a digital-only GPIO,
* output to 5V logic input,
* multiple analog outputs together.

IMPORTANT:

The ESP32-S3 ADC input is not a generic 5V-tolerant input.

If the actual pH module's analog output can exceed the ESP32-S3 ADC safe voltage:

DO NOT directly connect it.

Instead:

* determine the module output range,
* add an appropriate voltage divider/level-conditioning stage,
* document the attenuation,
* implement the corresponding conversion in firmware.

If the chosen Wokwi pH component already produces a safe 0–3.3V analog output, no divider is required.

Do not invent a divider merely for appearance.

---

# 8. pH CALIBRATION

The firmware must support a real calibration model.

Use:

```text
pH = slope × ADC_voltage + intercept
```

Calibration points:

* pH 4.01 buffer
* pH 7.00 buffer

Store:

```text
phSlope
phIntercept
```

Do NOT claim that Wokwi calibration is physical calibration.

The UI/telemetry must distinguish:

```text
SIMULATION
```

from:

```text
PHYSICAL_PROBE
```

Physical calibration remains a future bench procedure.

---

# 9. MOISTURE SENSOR CONNECTION

Use the capacitive moisture sensor as an analog input.

Conceptual wiring:

```text
Moisture VCC → appropriate supply
Moisture GND → common GND
Moisture AO  → second ADC-capable GPIO
```

Do not use the same ADC GPIO as pH.

The firmware should read:

```text
raw ADC
```

and convert it to a normalized moisture proxy.

Example conceptual pipeline:

```text
ADC
 ↓
raw moisture signal
 ↓
calibration mapping
 ↓
relative moisture index
```

IMPORTANT SCIENTIFIC LIMITATION:

Do NOT label this:

> Laboratory Moisture %

unless a real gravimetric calibration exists.

Use terminology such as:

> Relative Moisture Index

or:

> Estimated Moisture Proxy

The app documentation must state that actual moisture percentage requires calibration against gravimetric dry matter measurements.

---

# 10. DS18B20 TEMPERATURE SENSOR

Use a single DS18B20.

Required wiring:

```text
DS18B20 VCC  → 3.3V
DS18B20 GND  → GND
DS18B20 DATA → digital GPIO
```

If the selected DS18B20 configuration requires a pull-up resistor:

add the appropriate pull-up between:

```text
DATA ↔ 3.3V
```

Use the standard 1-Wire topology.

Do not connect DATA directly to power.

Do not omit the pull-up if required by the actual implementation/library.

---

# 11. AMBIENT TEMPERATURE

The DS18B20 measures probe temperature.

The system also needs ambient temperature if calculating:

```text
Delta T = silage temperature - ambient temperature
```

DO NOT pretend that the same embedded temperature sensor simultaneously represents both values.

For the screening prototype choose one of these approaches:

### Option A — Recommended for current hardware

Treat ambient temperature as a separate configured/reference value supplied by the mobile app or environment.

Clearly mark it:

```text
ambientTemperatureSource = "REFERENCE"
```

### Option B — Future hardware

Add a second DS18B20 outside the silage probe enclosure.

Do NOT add it to the current minimal Wokwi design unless the existing architecture genuinely needs it.

The current screening prototype should prioritize simplicity.

---

# 12. TEMPERATURE LOGIC

Firmware should calculate:

```text
deltaT = silageTemperature - ambientTemperature
```

But do not automatically call deltaT:

> fermentation heat

Use:

> Temperature rise relative to ambient

or:

> Thermal anomaly

The safety rules must treat this as a screening signal.

---

# 13. OLED DISPLAY — OPTIONAL

If OLED is available in the actual Wokwi environment, add a small I2C OLED.

Typical wiring:

```text
OLED VCC → 3.3V
OLED GND → GND
OLED SDA → I2C SDA GPIO
OLED SCL → I2C SCL GPIO
```

Use a clean location physically separated from the analog sensors.

The OLED should display:

```text
SILAGEGUARD
----------------
BLE: CONNECTED
MODE: SIMULATION

pH       4.12
Moisture 64.2
Temp     31.4 C
dT       +2.1 C

STATUS: READY
```

Do NOT display fake readings.

If a sensor is unavailable:

```text
pH       --
```

Do not substitute a default value.

---

# 14. BLE IMPLEMENTATION

BLE is mandatory.

The ESP32-S3 should advertise something recognizable such as:

```text
SILAGEGUARD-PROBE
```

Use stable service and characteristic UUIDs.

Do not randomly regenerate UUIDs between firmware versions.

Maintain compatibility with the existing mobile BLE service.

Before modifying BLE:

inspect:

```text
mobile/features/ble/bleService.ts
```

and all existing telemetry interfaces.

The hardware payload MUST match the mobile parser exactly.

---

# 15. TELEMETRY CONTRACT

Use a compact JSON payload.

Conceptually:

```json
{
  "device_id": "SG-PROBE-001",
  "sequence": 123,
  "timestamp": 1720000000,
  "mode": "WOKWI_SIMULATION",
  "ph": 4.12,
  "moisture": 64.2,
  "temperature": 31.4,
  "ambient_temperature": 29.3,
  "delta_t": 2.1,
  "battery": null,
  "calibrated": false
}
```

IMPORTANT:

Do not blindly copy this timestamp format.

Use the existing mobile contract if one already exists.

Maintain backward compatibility.

---

# 16. NULL HANDLING

Every unavailable reading must be represented honestly.

Examples:

```json
"ph": null
```

not:

```json
"ph": 0
```

and not:

```json
"ph": 7
```

Similarly:

```text
moisture = null
temperature = null
ambient_temperature = null
battery = null
```

when unavailable.

The mobile app already uses null-safe rendering.

Preserve that behavior.

---

# 17. SENSOR VALIDATION

Implement sanity checks before telemetry transmission.

### pH

Reject:

```text
NaN
Infinity
negative
physically impossible values
```

### Moisture

Reject:

```text
NaN
Infinity
outside calibrated range
```

### Temperature

Reject:

```text
NaN
Infinity
physically impossible sensor values
```

Invalid values should become:

```text
null
```

with an associated warning.

Never fabricate replacements.

---

# 18. SENSOR SAMPLING

Use a stable sampling loop.

Recommended conceptual sequence:

```text
Read pH
 ↓
Read moisture
 ↓
Read DS18B20
 ↓
Validate
 ↓
Calculate derived values
 ↓
Build telemetry
 ↓
BLE notify
 ↓
Update OLED
 ↓
Wait
 ↓
Repeat
```

Do not create multiple competing loops.

Do not block BLE indefinitely while waiting for sensors.

Use a predictable interval such as 1 Hz unless the existing mobile pipeline requires another rate.

---

# 19. REALISTIC WOKWI SIMULATION

Wokwi should simulate sensor behavior realistically.

Do NOT use random values every loop.

Bad:

```text
pH = random()
```

This makes the demo look broken.

Instead implement stable simulated operating profiles.

For example:

### PROFILE: IDEAL

```text
pH ≈ 4.0–4.3
moisture ≈ 60–68
temperature ≈ ambient + 1–3°C
```

### PROFILE: CAUTION

```text
pH ≈ 4.8–5.5
moisture ≈ 68–75
temperature ≈ ambient + 4–8°C
```

### PROFILE: UNSAFE

```text
pH > 6
or
deltaT > 10°C
```

IMPORTANT:

These are DEMONSTRATION profiles only.

Do not describe them as field measurements.

Do not train the production model using these simulated values.

---

# 20. DEMO PROFILE CONTROL

If practical, implement a clearly documented simulation control.

Preferred:

```text
DEMO_PROFILE=IDEAL
DEMO_PROFILE=CAUTION
DEMO_PROFILE=UNSAFE
```

Do not hide this inside production inference logic.

The mobile app must receive:

```text
mode = WOKWI_SIMULATION
```

and show:

> SIMULATION

clearly.

A judge must never mistake simulated telemetry for physical measurements.

---

# 21. BATTERY

The physical device will eventually use:

```text
LiPo Battery
+
LiPo Charger/Protection
```

For Wokwi:

DO NOT create a dangerous or unrealistic LiPo charging circuit just for visual completeness.

Represent power appropriately for simulation.

Document:

```text
WOKWI:
USB / simulated supply

PHYSICAL:
LiPo → charger/protection → regulated supply → ESP32/sensors
```

The exact physical power architecture must be finalized based on the selected ESP32-S3 board's power input requirements.

Never connect a raw LiPo directly to an arbitrary 3.3V pin.

---

# 22. PHYSICAL POWER ARCHITECTURE DOCUMENTATION

Create:

```text
hardware/docs/power_architecture.md
```

Document:

```text
LiPo
 ↓
Protection / Charger
 ↓
Regulation
 ↓
ESP32-S3
 ↓
3.3V sensor rail
```

Clearly distinguish:

```text
SIMULATED POWER
```

from:

```text
PHYSICAL POWER DESIGN
```

---

# 23. WIRING CLEANUP

Completely rebuild `diagram.json` if necessary.

Do not preserve bad wiring simply because it already exists.

Use:

* consistent orientation,
* short wires,
* logical component placement,
* minimal crossings,
* shared power rails,
* shared ground,
* clearly separated analog and digital sections.

Suggested layout:

```text
┌───────────────────────────────────────────────┐
│                                               │
│                 ESP32-S3                      │
│                                               │
│          ┌───────────────────┐                │
│          │                   │                │
│          │       MCU         │                │
│          │                   │                │
│          └───────────────────┘                │
│             │    │    │    │                  │
│             │    │    │    │                  │
│             │    │    │    └──── I2C ──────┐ │
│             │    │    └──── DATA ───────┐  │ │
│             │    └──── ADC ──────────┐  │  │ │
│             └───── ADC ───────────┐  │  │  │ │
│                                    │  │  │  │ │
│       ┌───────────┐     ┌─────────▼┐ │  │  │ │
│       │ pH Module │     │ Moisture │ │  │  │ │
│       └───────────┘     └──────────┘ │  │  │ │
│                                      │  │  │ │
│                           ┌──────────▼┐ │  │ │
│                           │ DS18B20   │ │  │ │
│                           └───────────┘ │  │ │
│                                         │  │ │
│                              ┌──────────▼──▼┐│
│                              │    OLED      ││
│                              └───────────────┘│
│                                               │
└───────────────────────────────────────────────┘
```

Adapt physical placement to the actual Wokwi components.

---

# 24. ANALOG SENSOR NOISE

Wokwi readings should have small deterministic variation.

Do NOT generate wild fluctuations.

Example concept:

```text
base value
+
small bounded noise
```

The noise must:

* remain within plausible ranges,
* be deterministic enough for debugging,
* not change classification randomly every second.

The mobile app should receive stable telemetry.

---

# 25. BOOT SEQUENCE

On boot:

```text
SILAGEGUARD PROBE
-----------------

Initializing...

[✓] ESP32
[✓] Sensors
[✓] BLE
[✓] OLED

MODE:
WOKWI_SIMULATION

STATUS:
READY
```

Do not claim:

```text
Physical probe detected
```

in Wokwi.

---

# 26. SENSOR ERROR STATES

If a sensor fails:

```text
pH ERROR
```

or:

```text
MOISTURE ERROR
```

or:

```text
TEMP ERROR
```

The rest of the system should continue where possible.

Example:

```text
pH       ERROR
Moisture 64.2
Temp     31.2
BLE      CONNECTED
```

The mobile application must receive null for the failed reading.

---

# 27. BLE DISCONNECTION

If mobile disconnects:

The ESP32 must continue reading sensors.

Do not crash.

Do not block.

When BLE reconnects:

resume notifications automatically.

Expose:

```text
BLE_CONNECTED
BLE_DISCONNECTED
```

in firmware state.

---

# 28. WATCHDOG / CRASH RESILIENCE

Implement appropriate embedded safeguards.

The firmware should:

* avoid blocking loops,
* avoid dynamic-memory abuse,
* avoid uncontrolled String growth,
* avoid infinite reconnect loops,
* handle sensor read failure,
* recover from BLE disconnect,
* continue operating after OLED failure.

If the selected ESP32-S3 environment supports a watchdog cleanly, use it appropriately.

Do not introduce complexity merely for the sake of adding a watchdog.

---

# 29. MOBILE COMPATIBILITY CHECK

After firmware changes, inspect:

```text
mobile/features/ble/
```

and verify:

* service UUID,
* characteristic UUID,
* JSON structure,
* field names,
* null handling,
* mode field,
* sequence field,
* calibration flag.

Do not modify mobile behavior unnecessarily.

Only make compatibility changes if the hardware contract genuinely requires them.

---

# 30. SCIENTIFIC TERMINOLOGY

Use:

### pH

> pH measurement

### Moisture

> Relative moisture proxy

unless physically calibrated.

### Temperature

> Probe temperature

### Delta T

> Temperature rise relative to ambient

### Vision

> Visible mold / surface anomaly screening

### Overall system

> Rapid silage quality screening

Never use:

> laboratory replacement

> toxin detector

> aflatoxin detector

> urea detector

> chemical analyzer

---

# 31. HARDWARE STATUS FLAGS

Telemetry should contain enough information for the app to explain the hardware state.

At minimum:

```text
mode
calibrated
ble
sensor validity
```

Example:

```json
{
  "mode": "WOKWI_SIMULATION",
  "calibrated": false
}
```

Physical hardware later:

```json
{
  "mode": "PHYSICAL_PROBE",
  "calibrated": true
}
```

Do not falsely set `PHYSICAL_PROBE` in Wokwi.

---

# 32. FINAL FILE STRUCTURE

Clean the hardware folder.

Target:

```text
hardware/
│
├── wokwi/
│   ├── diagram.json
│   ├── sketch.ino
│   ├── wokwi.toml
│   └── README.md
│
├── firmware/
│   └── ...
│
├── docs/
│   ├── wiring.md
│   ├── pinout.md
│   ├── power_architecture.md
│   ├── calibration.md
│   └── physical_probe_plan.md
│
└── README.md
```

Remove obsolete duplicate firmware.

Remove unused diagrams.

Remove dead sensor drivers.

Remove old pin maps.

Remove fake hardware implementations.

---

# 33. WIRING DOCUMENTATION

Create:

```text
hardware/docs/wiring.md
```

Include:

1. Component list
2. Pin table
3. Power connections
4. Ground connections
5. Analog connections
6. DS18B20 connections
7. OLED connections
8. BLE architecture
9. Wokwi simulation limitations
10. Physical hardware migration notes

Include an ASCII wiring diagram.

---

# 34. PINOUT DOCUMENTATION

Create:

```text
hardware/docs/pinout.md
```

Example:

| GPIO   | Function | Type    | Notes  |
| ------ | -------- | ------- | ------ |
| GPIO-X | pH       | ADC     | Analog |
| GPIO-Y | Moisture | ADC     | Analog |
| GPIO-Z | DS18B20  | Digital | 1-Wire |
| GPIO-A | OLED SDA | I2C     | SDA    |
| GPIO-B | OLED SCL | I2C     | SCL    |

Replace GPIO-X etc. with the ACTUAL selected pins.

---

# 35. AUTOMATED HARDWARE VALIDATION

Create:

```text
validation/hardware/
```

Include validation scripts/checks for:

* diagram validity,
* duplicate GPIO assignment,
* missing ground,
* missing power,
* ADC pin validity,
* I2C pin consistency,
* DS18B20 pin consistency,
* BLE UUID consistency,
* telemetry schema consistency.

If a fully automated electrical validation is impossible, create static validation checks for everything that CAN be validated programmatically.

---

# 36. FINAL TEST PROCEDURE

Run:

### Test 1 — Compile

Firmware must compile successfully.

### Test 2 — Boot

ESP32 starts without crash.

### Test 3 — Sensor initialization

All mandatory sensors initialize.

### Test 4 — pH

ADC reading changes when simulated input changes.

### Test 5 — Moisture

ADC reading changes when simulated input changes.

### Test 6 — Temperature

DS18B20 returns valid temperature.

### Test 7 — Delta T

Correctly calculated from temperature and reference ambient.

### Test 8 — BLE

Phone can discover:

```text
SILAGEGUARD-PROBE
```

### Test 9 — BLE telemetry

Mobile receives valid JSON.

### Test 10 — Sequence

Sequence number increments monotonically.

### Test 11 — Disconnect

BLE disconnect does not crash firmware.

### Test 12 — Reconnect

BLE reconnect restores telemetry.

### Test 13 — OLED

OLED displays current state if present.

### Test 14 — Sensor failure

Invalid sensor produces null/error state rather than fake data.

### Test 15 — Simulation mode

Telemetry contains:

```text
WOKWI_SIMULATION
```

### Test 16 — Mobile integration

Existing mobile BLE parser successfully consumes telemetry.

---

# 37. DEMO SCENARIOS

Prepare three deterministic Wokwi scenarios.

## Scenario A — GOOD

Display:

```text
pH       ~4.1
Moisture ~64
Temp     ambient + ~2°C
```

Expected:

```text
No major risk signal
```

## Scenario B — CAUTION

Display:

```text
pH       ~5.1
Moisture ~72
Temp     ambient + ~6°C
```

Expected:

```text
Caution / elevated screening risk
```

## Scenario C — UNSAFE

Display:

```text
pH       >6.0
```

or:

```text
Delta T >10°C
```

Expected:

```text
Unsafe screening signal
```

These are simulation scenarios.

They are NOT field measurements.

---

# 38. DO NOT COUPLE DEMO PROFILES TO ML TRAINING

This is extremely important.

The Wokwi profiles exist ONLY to demonstrate hardware-to-mobile communication.

They must NOT be used as:

* ML training data,
* validation data,
* test data,
* scientific evidence.

Add a README disclaimer.

---

# 39. PHYSICAL PROBE MIGRATION PLAN

The same telemetry schema should work when Wokwi is replaced with:

```text
ESP32-S3
+
real pH probe
+
real capacitive moisture sensor
+
real DS18B20
```

Document:

```text
WOKWI
  ↓
same GPIO abstraction
  ↓
same telemetry structure
  ↓
same BLE UUID
  ↓
mobile app
```

Only the sensor driver/calibration layer should require physical-specific changes.

---

# 40. NO BACKEND IMPLEMENTATION

DO NOT create:

* FastAPI server,
* endpoints,
* database server,
* authentication,
* cloud deployment,
* Supabase code.

The backend is being implemented separately by another teammate.

Your responsibility is only:

```text
Hardware
 ↓
BLE
 ↓
Mobile BLE Interface
```

Maintain compatibility with the existing backend contract/interfaces if they already exist.

---

# 41. FINAL SCREENING-ROUND REQUIREMENT

A judge should be able to look at the Wokwi diagram for 10 seconds and understand:

```text
ESP32-S3
   │
   ├── pH
   ├── Moisture
   ├── Temperature
   ├── OLED
   │
   └── BLE → Mobile App
```

There should be:

* no spaghetti wires,
* no unexplained components,
* no floating pins,
* no impossible power connections,
* no duplicate GPIO usage,
* no fake physical claims,
* no unnecessary electronics.

---

# 42. FINAL ACCEPTANCE CRITERIA

Do not report completion until ALL are true:

* [ ] Existing Wokwi implementation inspected first.
* [ ] Actual ESP32-S3 Wokwi pinout verified.
* [ ] pH uses valid ADC GPIO.
* [ ] Moisture uses separate valid ADC GPIO.
* [ ] DS18B20 uses valid digital GPIO.
* [ ] DS18B20 pull-up handled correctly.
* [ ] OLED uses valid I2C connections if included.
* [ ] All components have correct power.
* [ ] All components share appropriate ground.
* [ ] No 5V signal enters an unsafe ESP32-S3 input.
* [ ] No GPIO conflicts.
* [ ] No floating mandatory connections.
* [ ] Wiring is visually clean.
* [ ] Firmware compiles.
* [ ] Firmware boots.
* [ ] pH reading works.
* [ ] Moisture reading works.
* [ ] DS18B20 works.
* [ ] BLE advertising works.
* [ ] BLE telemetry works.
* [ ] Mobile parser receives telemetry.
* [ ] Null/error states work.
* [ ] BLE disconnect/reconnect works.
* [ ] OLED works if included.
* [ ] Simulation mode is explicitly identified.
* [ ] Demo profiles are deterministic.
* [ ] Demo profiles are isolated from ML training.
* [ ] No fake readings appear in production mode.
* [ ] Hardware documentation exists.
* [ ] Pinout documentation exists.
* [ ] Physical power architecture is documented.
* [ ] Physical calibration limitations are documented.
* [ ] No obsolete hardware files remain.
* [ ] No backend code is created.
* [ ] Existing mobile application remains compatible.

---

# 43. FINAL COMMAND

After implementation, run the complete hardware validation.

Then produce:

```text
hardware/V3_1_HARDWARE_VERIFICATION_REPORT.md
```

The report MUST contain:

1. Actual components used
2. Actual GPIO mapping
3. Actual power connections
4. BLE UUIDs
5. Telemetry example
6. Firmware compilation result
7. Wokwi boot result
8. Sensor test results
9. BLE test results
10. Mobile compatibility result
11. Known limitations
12. Physical hardware migration steps

Do NOT claim physical hardware validation.

Only report what was actually tested.

---

# FINAL PRINCIPLE

**Build the smallest hardware system that is electrically correct, visually clean, stable, BLE-compatible, and defensible in front of an SIH judge.**

Do not optimize for number of components.

Optimize for:

**CORRECT WIRING → RELIABLE SENSOR READINGS → BLE → MOBILE APP → DEMO**

If the current Wokwi circuit is fundamentally broken, delete and rebuild the diagram rather than stacking patches on top of it.

This is the final screening-round hardware build.

**DO NOT add feature creep after this point.**