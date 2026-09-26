/**
 * SILAGEGUARD AI V3.1 — ESP32-S3 Silage Probe Firmware
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 *
 * Hardware Platform : ESP32-S3 DevKitC-1 (board-esp32-s3-devkitc-1)
 * Wokwi Simulation  : Validated for screening-round demonstration
 *
 * === GPIO ASSIGNMENT ===
 *   GPIO 1  — pH analog input         (ADC1 CH0, 0–3.3 V safe range)
 *   GPIO 2  — Moisture analog input   (ADC1 CH1, 0–3.3 V safe range)
 *   GPIO 4  — DS18B20 DATA  (1-Wire + 4.7 kΩ pull-up to 3.3 V)
 *   GPIO 8  — OLED SDA (I2C)
 *   GPIO 9  — OLED SCL (I2C)
 *
 * === ANALOG SAFETY NOTE ===
 *   ESP32-S3 ADC inputs: absolute maximum 3.6 V, recommended ≤ 3.3 V.
 *   Both pH and moisture analog outputs are simulated by potentiometers
 *   connected between 3.3 V and GND — output is therefore bounded [0, 3.3 V].
 *   No voltage divider is required in this Wokwi configuration.
 *   On physical hardware: verify pH module AO range before direct connection.
 *   If AO > 3.3 V, add a resistive voltage divider before GPIO 1.
 *
 * === BLE COMPATIBILITY ===
 *   Service UUID      : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
 *   Device Name       : SilageGuard-Probe
 *   Payload           : JSON, 1 Hz NOTIFY
 *
 * === TELEMETRY CONTRACT (matches mobile bleService.ts) ===
 *   ph, moisture, temp, ambient, battery,
 *   probe_id, seq, mode, is_demo, calibrated,
 *   is_valid, validation_error
 *
 * === DEMO PROFILES ===
 *   PROFILE_IDEAL     — Healthy silage  : pH ~4.1, moisture ~64, dT ~2°C
 *   PROFILE_CAUTION   — Aerobic heating : pH ~4.9, moisture ~70, dT ~6°C
 *   PROFILE_UNSAFE    — Clostridial     : pH ~6.3, moisture ~77, dT ~12°C
 *
 *   Profile is selected by the #define DEMO_PROFILE below.
 *   Change the define and re-flash for each demo scenario.
 *
 * === SIMULATION MODE ===
 *   ALL Wokwi readings carry  mode = "WOKWI_SIMULATION"  and  is_demo = true.
 *   Never set PHYSICAL_PROBE mode in Wokwi firmware.
 *
 * === SCIENTIFIC LIMITATIONS ===
 *   pH       — Relative screening; not a certified laboratory pH meter.
 *   Moisture — Relative moisture proxy; not gravimetric dry-matter %.
 *   Temp     — Probe-tip temperature; ambient supplied as reference constant.
 *   Delta T  — Temperature rise relative to ambient; not certified heat flux.
 *
 * === DO NOT USE WOKWI DATA FOR ML TRAINING ===
 *   Simulation profiles are demonstration-only.
 *   Never use simulated telemetry as sensor model training or validation data.
 *
 * Copyright (c) 2026 SILAGEGUARD AI Team — SIH26111
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// ─── PIN DEFINITIONS ────────────────────────────────────────────────────────
#define PIN_PH_ANALOG       1    // ADC1 CH0 — pH analog input
#define PIN_MOIST_ANALOG    2    // ADC1 CH1 — Moisture analog input
#define PIN_DS18B20         4    // 1-Wire bus (+ 4.7 kΩ pull-up external)
#define PIN_I2C_SDA         8    // OLED SDA
#define PIN_I2C_SCL         9    // OLED SCL

// ─── DEMO PROFILE SELECTOR ──────────────────────────────────────────────────
// Change this define to switch between screening-round demonstration profiles.
// Options: PROFILE_IDEAL  |  PROFILE_CAUTION  |  PROFILE_UNSAFE
#define DEMO_PROFILE PROFILE_IDEAL

// ─── BLE UUIDS (must match mobile/utils/constants.ts) ───────────────────────
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_DEVICE_NAME         "SilageGuard-Probe"

// ─── PHYSICAL PROBE IDENTITY ────────────────────────────────────────────────
#define PROBE_ID "SILAGE-ESP32-S3-01"

// ─── OLED DISPLAY ───────────────────────────────────────────────────────────
#define OLED_WIDTH  128
#define OLED_HEIGHT  64
#define OLED_RESET   -1          // No reset pin shared
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);
bool oledAvailable = false;

// ─── pH CALIBRATION ─────────────────────────────────────────────────────────
// 2-point linear calibration: pH = slope × voltage + intercept
// Determined from pH 4.01 and pH 7.00 buffer immersions.
// Wokwi: potentiometer provides 0–3.3 V; mapping below is a linear proxy.
//   Voltage 0.00 V → pH 10.0 (high)
//   Voltage 3.30 V → pH  2.0 (acidic)
// Slope: (2.0 - 10.0) / (3.3 - 0.0) = -2.424 pH/V
// Intercept: 10.0 (at 0 V)
// Physical calibration will replace these with bench-measured values.
const float PH_SLOPE     = -2.424f;   // pH per volt
const float PH_INTERCEPT = 10.0f;     // pH at 0 V
const float PH_MIN_VALID = 2.0f;
const float PH_MAX_VALID = 12.0f;

// ─── MOISTURE CALIBRATION ───────────────────────────────────────────────────
// ADC 12-bit (0–4095 counts), 0 V → 0 count → ~0 % proxy, 3.3 V → 4095 → ~100 %
// Physical probe: air-dry ≈ 3200 ADC counts; saturated ≈ 1250 ADC counts.
// Wokwi potentiometer maps 0–3.3 V linearly → 0–4095 ADC.
// Relative moisture index = (4095 - rawADC) / (4095 - 0) × 100
// Adjust MOIST_DRY_ADC / MOIST_WET_ADC after physical calibration.
const int MOIST_DRY_ADC =  200;   // Pot at minimum (dry proxy)
const int MOIST_WET_ADC = 3900;   // Pot at maximum (wet proxy)

// ─── AMBIENT TEMPERATURE (REFERENCE) ────────────────────────────────────────
// Option A (spec §11): ambient is a fixed reference constant.
// The DS18B20 measures silage probe temperature only.
// On physical hardware: use a second DS18B20 or SHT31 for ambient.
const float AMBIENT_TEMP_REFERENCE = 26.0f;  // °C, Indian summer barn ambient

// ─── 1-WIRE DS18B20 ─────────────────────────────────────────────────────────
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

// ─── BLE OBJECTS ────────────────────────────────────────────────────────────
BLEServer*         pServer         = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

// ─── RUNTIME STATE ──────────────────────────────────────────────────────────
uint32_t sampleSeq = 0;

// ─── DEMO PROFILE DEFINITIONS ───────────────────────────────────────────────
// Each profile provides stable base values with small deterministic variation.
// Noise is bounded and does NOT change classification on every tick.
enum DemoProfile {
  PROFILE_IDEAL,    // Healthy fermentation
  PROFILE_CAUTION,  // Aerobic deterioration onset
  PROFILE_UNSAFE    // Clostridial spoilage
};

struct ProfileParams {
  float phBase;
  float moistBase;
  float tempRise;   // dT above ambient
  const char* label;
};

const ProfileParams PROFILES[] = {
  //  pH     moist   dT      label
  { 4.08f,  63.8f,  2.1f,  "IDEAL"   },   // PROFILE_IDEAL
  { 4.92f,  70.4f,  6.2f,  "CAUTION" },   // PROFILE_CAUTION
  { 6.28f,  77.1f, 12.4f,  "UNSAFE"  }    // PROFILE_UNSAFE
};

// ─── BLE SERVER CALLBACKS ───────────────────────────────────────────────────
class ProbeServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Mobile client CONNECTED.");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Mobile client DISCONNECTED. Restarting advertising...");
  }
};

// ─── OLED HELPERS ───────────────────────────────────────────────────────────
void oledClear() {
  if (!oledAvailable) return;
  display.clearDisplay();
}

void oledShow() {
  if (!oledAvailable) return;
  display.display();
}

void oledBootScreen() {
  if (!oledAvailable) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("SILAGEGUARD PROBE");
  display.println("----------------");
  display.println("Initializing...");
  display.println();
  display.println("[OK] ESP32-S3");
  display.println("[OK] DS18B20");
  display.println("[OK] BLE GATT");
  display.println("[OK] OLED");
  display.display();
  delay(1800);
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("MODE:");
  display.println("WOKWI_SIMULATION");
  display.println();
  display.println("STATUS: READY");
  display.display();
  delay(1200);
}

void oledUpdate(float ph, float moist, float temp, float dT, bool connected, bool phOk, bool moistOk, bool tempOk) {
  if (!oledAvailable) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("SILAGEGUARD AI");
  display.println("---------------");

  // BLE status
  display.print("BLE: ");
  display.println(connected ? "CONNECTED   " : "ADVERTISING ");

  // Mode label
  display.println("MODE: SIMULATION");
  display.println();

  // Sensor readings — show "--" if invalid
  display.print("pH     ");
  if (phOk)   { display.println(ph, 2); }
  else         { display.println("--"); }

  display.print("Moist  ");
  if (moistOk) { display.print(moist, 1); display.println("%"); }
  else         { display.println("--"); }

  display.print("Temp   ");
  if (tempOk)  { display.print(temp, 1); display.println("C"); }
  else         { display.println("--"); }

  display.print("dT     +");
  if (tempOk)  { display.print(dT, 1); display.println("C"); }
  else         { display.println("--"); }

  display.display();
}

// ─── SENSOR SANITY CHECKS ───────────────────────────────────────────────────
bool validatePh(float v)    { return !isnan(v) && !isinf(v) && v >= PH_MIN_VALID && v <= PH_MAX_VALID; }
bool validateMoist(float v) { return !isnan(v) && !isinf(v) && v >= 0.0f && v <= 100.0f; }
bool validateTemp(float v)  { return !isnan(v) && !isinf(v) && v > -10.0f && v < 85.0f; }

// ─── SETUP ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println("=================================================");
  Serial.println(" SILAGEGUARD AI V3.1 — ESP32-S3 Probe Firmware");
  Serial.println(" SIH26111 | MODE: WOKWI_SIMULATION");
  Serial.println("=================================================");
  Serial.println("[INIT] GPIO 1=pH_ADC  GPIO 2=Moisture_ADC");
  Serial.println("[INIT] GPIO 4=DS18B20 GPIO 8=SDA GPIO 9=SCL");

  // I2C + OLED
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oledAvailable = true;
    Serial.println("[OLED] SSD1306 initialized at 0x3C.");
  } else {
    Serial.println("[OLED] Not found — continuing without display.");
  }

  // ADC resolution
  analogReadResolution(12);   // 12-bit: 0–4095

  // DS18B20
  ds18b20.begin();
  ds18b20.setResolution(11);  // ~375 ms conversion, ±0.125°C
  Serial.println("[SENSOR] DS18B20 initialized on GPIO 4.");

  // BLE
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ProbeServerCallbacks());

  BLEService* pService = pServer->createService(BLE_SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    BLE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(BLE_SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.print("[BLE] Advertising as '");
  Serial.print(BLE_DEVICE_NAME);
  Serial.println("'");
  Serial.print("[BLE] Service UUID: ");
  Serial.println(BLE_SERVICE_UUID);
  Serial.print("[BLE] Demo Profile: ");
  Serial.println(PROFILES[DEMO_PROFILE].label);
  Serial.println("[SYSTEM] Ready. Waiting for mobile connection...");

  oledBootScreen();
}

// ─── SENSOR READING WITH WOKWI SIMULATION FALLBACK ──────────────────────────
void readSensors(
  float &phOut,    bool &phValid,
  float &moistOut, bool &moistValid,
  float &tempOut,  bool &tempValid
) {
  // --- DS18B20 temperature ---
  ds18b20.requestTemperatures();
  float rawTemp = ds18b20.getTempCByIndex(0);

  if (rawTemp != DEVICE_DISCONNECTED_C && rawTemp != 85.0f && validateTemp(rawTemp)) {
    // Physical DS18B20 responded — use real reading
    tempOut   = rawTemp;
    tempValid = true;
    Serial.print("[TEMP] Physical DS18B20: ");
    Serial.println(tempOut, 2);
  } else {
    // Wokwi simulation — DS18B20 not responding, use profile
    const ProfileParams &p = PROFILES[DEMO_PROFILE];
    // Small deterministic noise: ±0.08°C bounded
    float noise = ((sampleSeq % 7) - 3) * 0.027f;
    tempOut   = AMBIENT_TEMP_REFERENCE + p.tempRise + noise;
    tempValid = validateTemp(tempOut);
    if (!tempValid) { tempOut = 0.0f; }
  }

  // --- pH analog (GPIO 1, ADC1 CH0) ---
  int rawPhAdc = analogRead(PIN_PH_ANALOG);
  // ADC → Voltage → pH (bounded [0, 3.3 V] by potentiometer)
  // Physical: verify module AO range; add divider if AO > 3.3 V.
  float phVoltage = (rawPhAdc / 4095.0f) * 3.3f;
  float phReading = PH_SLOPE * phVoltage + PH_INTERCEPT;

  if (phReading < 3.5f && phReading > 2.0f) {
    // Pot at minimum → appears very acidic → treat as Wokwi not turned
    // Fallback to simulation profile (pot center = pH 7, turn left = acid)
    const ProfileParams &p = PROFILES[DEMO_PROFILE];
    float noise = ((sampleSeq % 5) - 2) * 0.012f;
    phReading = p.phBase + noise;
  }

  phOut   = constrain(phReading, PH_MIN_VALID, PH_MAX_VALID);
  phValid = validatePh(phOut);
  if (!phValid) { phOut = 0.0f; }

  // --- Moisture analog (GPIO 2, ADC1 CH1) ---
  int rawMoistAdc = analogRead(PIN_MOIST_ANALOG);
  // Physical capacitive sensor: high ADC = dry, low ADC = wet.
  // Potentiometer: 0 V → 0 ADC (dry proxy), 3.3 V → 4095 ADC (wet proxy).
  // Invert mapping so pot center ≈ 50% moisture.
  float moistPct;

  if (rawMoistAdc < 100) {
    // Pot at ground → Wokwi not turned → use simulation profile
    const ProfileParams &p = PROFILES[DEMO_PROFILE];
    float noise = ((sampleSeq % 9) - 4) * 0.15f;
    moistPct = p.moistBase + noise;
  } else {
    moistPct = ((float)(rawMoistAdc - MOIST_DRY_ADC) /
                (float)(MOIST_WET_ADC - MOIST_DRY_ADC)) * 100.0f;
    moistPct = constrain(moistPct, 0.0f, 100.0f);
  }

  moistOut   = moistPct;
  moistValid = validateMoist(moistOut);
  if (!moistValid) { moistOut = 0.0f; }
}

// ─── BUILD JSON TELEMETRY ────────────────────────────────────────────────────
// Payload fields MUST match ProbeTelemetryData in mobile/features/ble/bleService.ts
void buildTelemetry(
  float ph,    bool phValid,
  float moist, bool moistValid,
  float temp,  bool tempValid,
  char* outBuf, size_t bufSize
) {
  float ambient = AMBIENT_TEMP_REFERENCE;
  float deltaT  = tempValid ? (temp - ambient) : 0.0f;

  bool anyInvalid = !phValid || !moistValid || !tempValid;

  StaticJsonDocument<512> doc;

  // Null-safe field assignment (Rule 2 compliance)
  if (phValid)    doc["ph"]       = round(ph    * 100.0f) / 100.0f;
  else            doc["ph"]       = nullptr;

  if (moistValid) doc["moisture"] = round(moist * 10.0f)  / 10.0f;
  else            doc["moisture"] = nullptr;

  if (tempValid)  doc["temp"]     = round(temp  * 10.0f)  / 10.0f;
  else            doc["temp"]     = nullptr;

  doc["ambient"]  = round(ambient * 10.0f) / 10.0f;

  // Battery: null in Wokwi (USB power, no LiPo monitor in simulation)
  doc["battery"]  = nullptr;

  doc["probe_id"] = PROBE_ID;
  doc["seq"]      = sampleSeq;

  // Mode fields (must be honest — always WOKWI_SIMULATION in this firmware)
  doc["mode"]      = "WOKWI_SIMULATION";
  doc["is_demo"]   = true;
  doc["calibrated"]= false;

  doc["is_valid"] = !anyInvalid;
  if (anyInvalid) {
    String err = "";
    if (!phValid)    err += "pH_INVALID ";
    if (!moistValid) err += "MOIST_INVALID ";
    if (!tempValid)  err += "TEMP_INVALID";
    doc["validation_error"] = err;
  }

  serializeJson(doc, outBuf, bufSize);
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
void loop() {
  sampleSeq++;

  float ph      = 0.0f; bool phOk    = false;
  float moist   = 0.0f; bool moistOk = false;
  float temp    = 0.0f; bool tempOk  = false;

  readSensors(ph, phOk, moist, moistOk, temp, tempOk);

  float deltaT = tempOk ? (temp - AMBIENT_TEMP_REFERENCE) : 0.0f;

  // Build JSON payload
  char jsonBuf[512];
  buildTelemetry(ph, phOk, moist, moistOk, temp, tempOk, jsonBuf, sizeof(jsonBuf));

  // Print to Serial Monitor
  Serial.print("[TELEMETRY #");
  Serial.print(sampleSeq);
  Serial.print("] ");
  Serial.println(jsonBuf);

  // BLE NOTIFY if client connected
  if (deviceConnected) {
    pCharacteristic->setValue((uint8_t*)jsonBuf, strlen(jsonBuf));
    pCharacteristic->notify();
  }

  // OLED update (continues even when BLE disconnected)
  oledUpdate(ph, moist, temp, deltaT, deviceConnected, phOk, moistOk, tempOk);

  // BLE reconnect handling (non-blocking)
  if (!deviceConnected && oldDeviceConnected) {
    delay(300);
    pServer->startAdvertising();
    Serial.println("[BLE] Reconnect advertising started.");
    oldDeviceConnected = false;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
    Serial.println("[BLE] Connection registered.");
  }

  // 1 Hz sampling
  delay(1000);
}
