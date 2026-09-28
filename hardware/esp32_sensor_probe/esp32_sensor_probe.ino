/**
 * ============================================================================
 * SILAGEGUARD AI — Physical ESP32 Silage Probe Firmware (Moisture + Temperature)
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 * ============================================================================
 *
 * Supported Boards:
 *   - ESP32 DevKit v1 / ESP32-WROOM-32 / NodeMCU-32S (Classic ESP32)
 *   - ESP32-S3 DevKitC-1
 *
 * Hardware Connected:
 *   1. Capacitive Soil / Silage Moisture Sensor v1.2 (Analog)
 *      - VCC -> 3.3V
 *      - GND -> GND
 *      - AOUT -> GPIO 34 (ADC1_CH6 - Input-only, safe with BLE)
 *
 *   2. DS18B20 Digital Temperature Sensor (1-Wire)
 *      - VCC -> 3.3V
 *      - GND -> GND
 *      - DATA -> GPIO 4 (with 4.7 kΩ pull-up resistor connected between DATA and 3.3V)
 *
 *   3. (Optional) Analog pH Sensor (e.g., DFRobot SEN0161)
 *      - VCC -> 3.3V (or 5V if buffered with voltage divider)
 *      - GND -> GND
 *      - AOUT -> GPIO 35 (ADC1_CH7)
 *      - Note: If no pH sensor is wired, firmware sends ph = null (honest 2-sensor mode).
 *
 * Bluetooth Low Energy (BLE) GATT Specifications:
 *   - Device Name       : SilageGuard-Probe
 *   - Service UUID      : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   - Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8 (NOTIFY + READ)
 *   - Telemetry Stream  : 1 Hz JSON notifying directly to mobile app / Web Bluetooth.
 *
 * Required Arduino Libraries:
 *   1. ArduinoJson (by Benoit Blanchon, v6.x or v7.x)
 *   2. OneWire (by Paul Stoffregen)
 *   3. DallasTemperature (by Miles Burton)
 * ============================================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// ─── PIN CONFIGURATION ──────────────────────────────────────────────────────
#define PIN_MOISTURE_ADC   34    // ADC1 CH6 (Safe on ESP32 while BLE is active)
#define PIN_ONEWIRE_TEMP   4     // Digital pin for DS18B20 (requires 4.7k pull-up)
#define PIN_PH_ADC         35    // Optional pH analog input (ADC1 CH7)

// ─── BLE GATT UUIDS (Must match mobile/utils/constants.ts) ──────────────────
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_DEVICE_NAME         "SilageGuard-Probe"
#define PROBE_ID                "SILAGE-ESP32-PROBE"

// ─── CALIBRATION CONSTANTS ──────────────────────────────────────────────────
// Capacitive Moisture Sensor v1.2 ADC mapping (12-bit ADC: 0 - 4095)
// Dry air reading in room conditions: ~3100 - 3300
// Submerged in water reading: ~1200 - 1400
// High ADC = Dry (low moisture), Low ADC = Wet (high moisture)
const int MOIST_DRY_ADC = 3200;  // 0% moisture proxy
const int MOIST_WET_ADC = 1250;  // 100% moisture proxy

// Ambient reference temperature (°C) if no second ambient sensor is installed
const float AMBIENT_TEMP_REF = 25.0f;

// ─── SENSOR INTERFACES ──────────────────────────────────────────────────────
OneWire oneWire(PIN_ONEWIRE_TEMP);
DallasTemperature ds18b20(&oneWire);

// ─── BLE STATE ──────────────────────────────────────────────────────────────
BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint32_t sampleSeq = 0;
bool ds18b20Found = false;

// ─── BLE SERVER CALLBACKS ───────────────────────────────────────────────────
class ProbeServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("\n>>> [BLE] Mobile App / Client Connected! <<<");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("\n<<< [BLE] Client Disconnected. Re-advertising... <<<");
  }
};

// ─── READ MOISTURE SENSOR (Oversampled 16x) ─────────────────────────────────
float readMoisture(int &rawAdcOut) {
  uint32_t sum = 0;
  const int SAMPLES = 16;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(PIN_MOISTURE_ADC);
    delayMicroseconds(200);
  }
  rawAdcOut = sum / SAMPLES;

  // Capacitive probe is inverse: higher voltage/ADC = drier
  float moistPct = ((float)(MOIST_DRY_ADC - rawAdcOut) / (float)(MOIST_DRY_ADC - MOIST_WET_ADC)) * 100.0f;
  if (moistPct < 0.0f) moistPct = 0.0f;
  if (moistPct > 100.0f) moistPct = 100.0f;
  return moistPct;
}

// ─── READ DS18B20 TEMPERATURE ───────────────────────────────────────────────
bool readTemperature(float &tempOut) {
  if (!ds18b20Found) {
    // Retry discovery in case probe was plugged in hot
    if (ds18b20.getDeviceCount() > 0) {
      ds18b20Found = true;
    } else {
      return false;
    }
  }

  ds18b20.requestTemperatures();
  float raw = ds18b20.getTempCByIndex(0);

  // Validate DS18B20 reading
  if (raw == DEVICE_DISCONNECTED_C || raw == 85.0f || raw < -20.0f || raw > 85.0f) {
    return false;
  }

  tempOut = raw;
  return true;
}

// ─── READ OPTIONAL pH SENSOR ────────────────────────────────────────────────
bool readPh(float &phOut) {
  int rawPhAdc = analogRead(PIN_PH_ADC);
  float voltage = (rawPhAdc / 4095.0f) * 3.3f;

  // Standard analog pH slope (verify against 4.01 and 7.00 buffers)
  // Neutral 7.00 pH is typically ~1.5V - 1.65V (centered)
  float estimatedPh = 7.0f - (voltage - 1.65f) * 3.5f;

  // If pin is floating or reads invalid, return false
  if (estimatedPh < 2.0f || estimatedPh > 12.0f || rawPhAdc < 100 || rawPhAdc > 4000) {
    return false;
  }

  phOut = estimatedPh;
  return true;
}

// ─── SETUP ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("==========================================================");
  Serial.println("   SILAGEGUARD AI — Physical ESP32 Silage Probe Firmware   ");
  Serial.println("   SIH26111 | Smart AI-Enabled Feed Quality Screening     ");
  Serial.println("==========================================================");

  // Configure ADC
  analogReadResolution(12); // 0 - 4095
  analogSetAttenuation(ADC_11db); // Full 0 - 3.3V range

  // Initialize DS18B20 1-Wire
  ds18b20.begin();
  int tempSensorCount = ds18b20.getDeviceCount();
  if (tempSensorCount > 0) {
    ds18b20Found = true;
    ds18b20.setResolution(11); // ±0.125°C precision
    Serial.printf("[INIT] DS18B20 Temperature sensor detected on GPIO %d.\n", PIN_ONEWIRE_TEMP);
  } else {
    ds18b20Found = false;
    Serial.printf("[WARN] No DS18B20 detected on GPIO %d. (Ensure 4.7k pull-up resistor is wired)\n", PIN_ONEWIRE_TEMP);
    Serial.println("[INFO] Running in fallback mode: ambient reference temperature used.");
  }

  Serial.printf("[INIT] Moisture sensor analog input configured on GPIO %d.\n", PIN_MOISTURE_ADC);

  // Initialize BLE Stack
  Serial.println("[INIT] Initializing Bluetooth Low Energy (BLE)...");
  BLEDevice::init(BLE_DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ProbeServerCallbacks());

  BLEService* pService = pServer->createService(BLE_SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    BLE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  // Add 2902 descriptor for mobile GATT notifications
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  // Configure BLE Advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.printf("[BLE] Broadcasting as '%s'\n", BLE_DEVICE_NAME);
  Serial.printf("[BLE] Service UUID : %s\n", BLE_SERVICE_UUID);
  Serial.printf("[BLE] Char UUID    : %s\n", BLE_CHARACTERISTIC_UUID);
  Serial.println("[SYSTEM] Ready! Open SilageGuard AI app and click 'PAIR & CONNECT VIA BLE'.\n");
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
void loop() {
  sampleSeq++;

  // 1. Read Moisture
  int rawMoistAdc = 0;
  float moisturePct = readMoisture(rawMoistAdc);

  // 2. Read Temperature
  float coreTemp = 0.0f;
  bool hasTemp = readTemperature(coreTemp);
  if (!hasTemp) {
    // If DS18B20 is missing, use stable ambient reference
    coreTemp = AMBIENT_TEMP_REF;
  }

  // 3. Read pH (Optional)
  float phVal = 0.0f;
  bool hasPh = readPh(phVal);

  // 4. Construct JSON Payload
  StaticJsonDocument<384> doc;
  doc["temp"]      = round(coreTemp * 10.0f) / 10.0f;
  doc["moisture"]  = round(moisturePct * 10.0f) / 10.0f;
  doc["ambient"]   = AMBIENT_TEMP_REF;

  if (hasPh) {
    doc["ph"] = round(phVal * 100.0f) / 100.0f;
  } else {
    doc["ph"] = nullptr; // Honest null: no fake pH!
  }

  doc["battery"]   = nullptr;
  doc["probe_id"]  = PROBE_ID;
  doc["seq"]       = sampleSeq;
  doc["mode"]      = "REAL_SENSOR";
  doc["is_demo"]   = false;
  doc["is_valid"]  = true;

  char jsonBuf[384];
  serializeJson(doc, jsonBuf, sizeof(jsonBuf));

  // 5. Print to Serial Monitor
  Serial.printf("[%04d] Moist: %5.1f%% (ADC: %4d) | Temp: %4.1f C | pH: %s | BLE: %s\n",
    sampleSeq,
    moisturePct,
    rawMoistAdc,
    coreTemp,
    hasPh ? String(phVal, 2).c_str() : "N/A",
    deviceConnected ? "CONNECTED" : "ADVERTISING"
  );

  // 6. Notify Connected BLE Client
  if (deviceConnected && pCharacteristic) {
    pCharacteristic->setValue((uint8_t*)jsonBuf, strlen(jsonBuf));
    pCharacteristic->notify();
  }

  // Handle BLE re-advertising on disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarted advertising.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(1000); // 1 Hz stream interval
}
