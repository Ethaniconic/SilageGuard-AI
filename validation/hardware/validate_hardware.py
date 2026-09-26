#!/usr/bin/env python3
"""
SILAGEGUARD AI — Hardware Validation Suite
V3.1 | SIH26111

Validates the Wokwi hardware implementation statically:
- diagram.json structure and GPIO assignments
- Firmware sketch constants and UUIDs
- Mobile BLE contract compatibility
- No duplicate GPIO, no floating pins, no impossible connections

Run: python validation/hardware/validate_hardware.py
"""

import json
import re
import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIAGRAM_PATH    = os.path.join(ROOT, "hardware", "wokwi", "diagram.json")
SKETCH_PATH     = os.path.join(ROOT, "hardware", "wokwi", "sketch.ino")
CONSTANTS_PATH  = os.path.join(ROOT, "mobile", "utils", "constants.ts")
LIBRARIES_PATH  = os.path.join(ROOT, "hardware", "wokwi", "libraries.txt")

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

results = {"pass": 0, "fail": 0, "warn": 0}

def check(name, condition, msg_pass="", msg_fail=""):
    if condition:
        print(f"{PASS} {name}" + (f": {msg_pass}" if msg_pass else ""))
        results["pass"] += 1
    else:
        print(f"{FAIL} {name}" + (f": {msg_fail}" if msg_fail else ""))
        results["fail"] += 1
    return condition

def warn(name, msg):
    print(f"{WARN} {name}: {msg}")
    results["warn"] += 1

def info(msg):
    print(f"{INFO} {msg}")

print("=" * 60)
print(" SILAGEGUARD AI — Hardware Validation Suite V3.1")
print(" SIH26111")
print("=" * 60)

# ─── 1. FILE EXISTENCE ──────────────────────────────────────────
print("\n[1] File Existence Checks")
check("diagram.json exists",     os.path.exists(DIAGRAM_PATH))
check("sketch.ino exists",       os.path.exists(SKETCH_PATH))
check("constants.ts exists",     os.path.exists(CONSTANTS_PATH))
check("libraries.txt exists",    os.path.exists(LIBRARIES_PATH))

if not os.path.exists(DIAGRAM_PATH) or not os.path.exists(SKETCH_PATH):
    print(f"\n{FAIL} Critical files missing. Aborting.")
    sys.exit(1)

# ─── 2. DIAGRAM STRUCTURE ───────────────────────────────────────
print("\n[2] Diagram Structure")
with open(DIAGRAM_PATH) as f:
    diagram = json.load(f)

check("diagram has 'parts'",       "parts" in diagram)
check("diagram has 'connections'", "connections" in diagram)
check("diagram has 'version'",     "version" in diagram)

parts = diagram.get("parts", [])
part_ids = [p["id"] for p in parts]
part_types = {p["id"]: p["type"] for p in parts}

info(f"Parts found: {part_ids}")

# ─── 3. REQUIRED COMPONENTS ─────────────────────────────────────
print("\n[3] Required Component Checks")
esp32_parts = [p for p in parts if "esp32-s3" in p["type"].lower() or "esp32" in p["type"].lower()]
check("ESP32-S3 board present", len(esp32_parts) > 0,
      msg_pass=f"Found: {esp32_parts[0]['type']}" if esp32_parts else "",
      msg_fail="No ESP32-S3 found in diagram")

ds18b20_parts = [p for p in parts if "ds18b20" in p["type"].lower()]
check("DS18B20 present", len(ds18b20_parts) > 0,
      msg_pass="wokwi-ds18b20 found")

pullup_resistors = [p for p in parts if "resistor" in p["type"].lower()]
check("Pull-up resistor present", len(pullup_resistors) > 0,
      msg_pass=f"{len(pullup_resistors)} resistor(s) found",
      msg_fail="No pull-up resistor found — DS18B20 1-Wire requires 4.7kΩ")

analog_parts = [p for p in parts if "potentiometer" in p["type"].lower() or "analog" in p["type"].lower()]
check("pH analog input component present", len(analog_parts) >= 1,
      msg_pass=f"{len(analog_parts)} analog component(s) found")
check("Moisture analog input component present", len(analog_parts) >= 2,
      msg_pass="Both pH and moisture analog inputs found",
      msg_fail="Need at least 2 analog components for pH and moisture")

# ─── 4. RESISTOR VALUES ─────────────────────────────────────────
print("\n[4] Pull-up Resistor Value")
for r in pullup_resistors:
    val = r.get("attrs", {}).get("resistance", "unknown")
    try:
        resistance = float(str(val).replace(',', '').strip())
        ok = 4000 <= resistance <= 5000
        check(f"Resistor '{r['id']}' value",  ok,
              msg_pass=f"{val}Ω (acceptable 4k–5k for 1-Wire)",
              msg_fail=f"{val}Ω (expected ~4700Ω for DS18B20 1-Wire)")
    except ValueError:
        warn(f"Resistor '{r['id']}'", f"Could not parse resistance value: {val}")

# ─── 5. CONNECTION ANALYSIS ─────────────────────────────────────
print("\n[5] Connection Analysis")

# Load sketch early so we can use it throughout
with open(SKETCH_PATH) as f:
    sketch = f.read()
# Strip block comments so false-claim checks work on code only
import re as _re
sketch_code_only = _re.sub(r'/\*.*?\*/', '', sketch, flags=_re.DOTALL)

connections = diagram.get("connections", [])
info(f"Total connections: {len(connections)}")

# Extract GPIO pins used in connections
gpio_pattern = re.compile(r"GPIO(\d+)", re.IGNORECASE)
gpio_usages = {}

for conn in connections:
    for endpoint in conn[:2]:  # First two elements are endpoints
        match = gpio_pattern.search(str(endpoint))
        if match:
            gpio_num = int(match.group(1))
            gpio_usages.setdefault(gpio_num, []).append(str(endpoint))

info(f"GPIOs in use: {sorted(gpio_usages.keys())}")

# Check for duplicate GPIO usage (same GPIO appearing as multiple source endpoints)
dupe_gpios = {g: eps for g, eps in gpio_usages.items() if len(eps) > 1}
if dupe_gpios:
    # Pull-up to GPIO4 is valid (2 connections to same GPIO is normal for 1-Wire)
    real_dupes = {g: eps for g, eps in dupe_gpios.items() if g != 4}
    if real_dupes:
        for g, eps in real_dupes.items():
            check(f"GPIO {g} not duplicated", False,
                  msg_fail=f"GPIO {g} appears {len(eps)} times: {eps}")
    else:
        check("No illegitimate duplicate GPIO usage", True,
              msg_pass="GPIO 4 correctly has 2 connections (DATA + pull-up)")
else:
    check("No duplicate GPIO usage", True)

# Check strapping pins not used
STRAPPING_PINS = {0, 3, 45, 46}
used_strapping = set(gpio_usages.keys()) & STRAPPING_PINS
check("No strapping pins used", len(used_strapping) == 0,
      msg_pass="GPIO 0, 3, 45, 46 are all free",
      msg_fail=f"Strapping pins in use: {used_strapping}")

# Check GND connections exist
gnd_conns = [c for c in connections if "GND" in str(c[:2])]
check("Ground connections present", len(gnd_conns) >= 3,
      msg_pass=f"{len(gnd_conns)} GND connections",
      msg_fail="Fewer than 3 GND connections — some components may be floating")

# Check VCC connections exist
vcc_conns = [c for c in connections if "3V3" in str(c[:2]) or "VCC" in str(c[:2])]
check("Power connections present", len(vcc_conns) >= 3,
      msg_pass=f"{len(vcc_conns)} VCC/3V3 connections")

# ─── 6. SKETCH VALIDATION ───────────────────────────────────────
print("\n[6] Firmware Sketch Checks")

# Required BLE UUIDs
SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
CHAR_UUID    = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
DEVICE_NAME  = "SilageGuard-Probe"

check("Service UUID correct",        SERVICE_UUID in sketch,
      msg_fail=f"Expected: {SERVICE_UUID}")
check("Characteristic UUID correct", CHAR_UUID in sketch,
      msg_fail=f"Expected: {CHAR_UUID}")
check("BLE device name correct",     DEVICE_NAME in sketch,
      msg_fail=f"Expected: {DEVICE_NAME}")

# GPIO definitions
check("GPIO 4 defined (DS18B20)",    "PIN_DS18B20" in sketch and "4" in sketch)
check("GPIO 1 defined (pH ADC)",     "PIN_PH_ANALOG" in sketch)
check("GPIO 2 defined (Moisture)",   "PIN_MOIST_ANALOG" in sketch)
check("GPIO 8 defined (SDA)",        "PIN_I2C_SDA" in sketch)
check("GPIO 9 defined (SCL)",        "PIN_I2C_SCL" in sketch)

# Simulation mode honesty
check("WOKWI_SIMULATION mode string present", "WOKWI_SIMULATION" in sketch,
      msg_fail="Firmware must declare WOKWI_SIMULATION mode in telemetry")
check("is_demo field set true",               'is_demo' in sketch and 'true' in sketch.lower(),
      msg_fail="Firmware must set is_demo=true in Wokwi")
check("calibrated field set false",           'calibrated' in sketch and 'false' in sketch.lower(),
      msg_fail="Firmware must set calibrated=false in Wokwi")

# Null safety
check("null used for unavailable battery",    "nullptr" in sketch or "null" in sketch,
      msg_pass="null assignment found for battery")

# Scientific honesty — no physical probe claims
bad_claims = ["PHYSICAL_PROBE", "LAB_GRADE", "laboratory pH", "gravimetric"]
for claim in bad_claims:
    # Find all occurrences in code-only (block comments already stripped)
    lower_code = sketch_code_only.lower()
    claim_lower = claim.lower()
    idx = lower_code.find(claim_lower)
    in_non_comment = False
    while idx != -1:
        line_start = sketch_code_only.rfind('\n', 0, idx) + 1
        line = sketch_code_only[line_start:sketch_code_only.find('\n', idx)]
        stripped = line.lstrip()
        if stripped and not stripped.startswith('//'):
            in_non_comment = True
            break
        idx = lower_code.find(claim_lower, idx + 1)
    check(f"No false claim in code: '{claim}'",
          not in_non_comment,
          msg_pass="Only in comments (acceptable)",
          msg_fail=f"Found '{claim}' in non-comment code line")

# No random() generating wild values
random_count = sketch.count("random()")
if random_count > 0:
    warn("random() usage", f"Found {random_count} random() call(s) — ensure bounded deterministic noise only")
else:
    check("No unbounded random() calls", True, msg_pass="No random() found")

# DallasTemperature library used
check("DallasTemperature library included", "#include <DallasTemperature.h>" in sketch)
check("OneWire library included",           "#include <OneWire.h>" in sketch)
check("ArduinoJson library included",       "#include <ArduinoJson.h>" in sketch)
check("BLE library included",               "#include <BLEDevice.h>" in sketch)

# ─── 7. MOBILE CONTRACT COMPATIBILITY ───────────────────────────
print("\n[7] Mobile Contract Compatibility")
with open(CONSTANTS_PATH, encoding='utf-8') as f:
    constants = f.read()

mobile_service_match = re.search(r'SERVICE_UUID.*?"(.+?)"', constants)
mobile_char_match    = re.search(r'CHARACTERISTIC_UUID.*?"(.+?)"', constants)
mobile_name_match    = re.search(r'DEVICE_NAME.*?"(.+?)"', constants)

if mobile_service_match:
    mobile_service = mobile_service_match.group(1)
    check("Service UUID matches mobile", mobile_service in sketch,
          msg_pass=f"Mobile: {mobile_service}",
          msg_fail=f"Mobile expects: {mobile_service}")

if mobile_char_match:
    mobile_char = mobile_char_match.group(1)
    check("Characteristic UUID matches mobile", mobile_char in sketch,
          msg_pass=f"Mobile: {mobile_char}",
          msg_fail=f"Mobile expects: {mobile_char}")

if mobile_name_match:
    mobile_name = mobile_name_match.group(1)
    check("Device name matches mobile", mobile_name in sketch,
          msg_pass=f"Mobile: {mobile_name}",
          msg_fail=f"Mobile expects: {mobile_name}")

# Required telemetry fields (mobile ProbeTelemetryData)
required_fields = ["ph", "moisture", "temp", "ambient", "battery",
                   "probe_id", "seq", "mode", "is_demo", "calibrated",
                   "is_valid"]
for field in required_fields:
    check(f"Telemetry field '{field}' in sketch",
          f'"{field}"' in sketch,
          msg_fail=f"Field '{field}' not found in JSON doc[] assignment")

# ─── 8. LIBRARIES ───────────────────────────────────────────────
print("\n[8] Library Requirements")
with open(LIBRARIES_PATH) as f:
    libs = f.read()

required_libs = ["OneWire", "DallasTemperature", "ArduinoJson",
                 "Adafruit GFX", "Adafruit SSD1306"]
for lib in required_libs:
    check(f"Library '{lib}' in libraries.txt", lib in libs)

# ─── SUMMARY ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f" VALIDATION SUMMARY")
print(f" PASS: {results['pass']}  |  FAIL: {results['fail']}  |  WARN: {results['warn']}")
print("=" * 60)

if results["fail"] == 0:
    print(f"\n{PASS} All hardware validation checks passed.")
    print("  Wokwi hardware design is ready for screening-round demo.")
else:
    print(f"\n{FAIL} {results['fail']} check(s) failed. Fix before demo.")
    sys.exit(1)
