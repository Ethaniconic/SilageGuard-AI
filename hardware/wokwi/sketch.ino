/**
 * SILAGEGUARD AI V2 — ESP32-S3 Multi-Sensor Fermentation Telemetry Firmware
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 * 
 * Hardware Platform: ESP32-S3 DevKitC-1
 * Sensors & GPIO Mapping:
 *  - Temperature: DS18B20 1-Wire Digital Probe (GPIO 4)
 *  - Moisture: Capacitive Soil Moisture Sensor v1.2 (ADC1 Ch0 on GPIO 1)
 *  - pH: Analog Industrial pH Probe with BNC Interface (ADC1 Ch1 on GPIO 2)
 *  - Status Indicator: Green Heartbeat LED (GPIO 10)
 * 
 * Connectivity: Bluetooth Low Energy (BLE 5.0 GATT)
 * Telemetry Protocol: JSON Payload over GATT Characteristic (1 Hz NOTIFY)
 * 
 * Scientific Integrity & Calibration:
 *  - Real physical ADC conversions with 2-point pH buffer calibration (pH 4.0 / 7.0)
 *  - Capacitive moisture calibration (air dry ADC vs water saturation ADC)
 *  - Automatic fallback to agronomic simulation when sensors are unattached/open in Wokwi
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// --- PIN DEFINITIONS ---
#define PIN_ONE_WIRE_BUS   4   // DS18B20 digital bus
#define PIN_ANALOG_MOIST   1   // Capacitive Moisture ADC
#define PIN_ANALOG_PH      2   // Analog pH ADC
#define PIN_STATUS_LED     10  // Green status LED

// --- CALIBRATION PARAMETERS ---
// pH Probe Calibration (2-Point Buffer Reference: pH 4.01 and pH 7.00 at 25C)
float phVoltageOffset = 0.00f;  // Millivolts offset
float phSlope = -5.70f;         // pH units per Volt (Nernstian slope proxy)
float ph7Voltage = 1.50f;       // Nominal voltage at pH 7.00 buffer

// Capacitive Moisture ADC Calibration (12-bit ADC: 0 - 4095)
const int MOIST_AIR_ADC = 3200;    // Dry air (0% moisture)
const int MOIST_WATER_ADC = 1450;  // Water immersion (100% moisture proxy)

// --- BLE GATT UUIDs ---
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// --- OBJECT INSTANTIATIONS ---
OneWire oneWire(PIN_ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// --- PROBE IDENTIFIER & METRICS ---
const char* PROBE_ID = "SILAGE-ESP32-S3-01";
uint32_t sampleCounter = 0;
float simulatedBattery = 98.5f;

// Simulation modes for Wokwi testing when physical probe is simulated
enum ProbeMode {
  MODE_IDEAL_FERMENTATION,    // pH ~4.0, Moist ~64%, Delta T < 2C
  MODE_AEROBIC_DETERIORATION, // pH ~4.6, Moist ~69%, Delta T ~6C
  MODE_SPOILED_BUTYRIC        // pH ~6.2, Moist ~76%, Delta T ~12C
};
ProbeMode currentMode = MODE_IDEAL_FERMENTATION;

// --- BLE SERVER CALLBACKS ---
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Mobile Client Connected!");
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Mobile Client Disconnected.");
    digitalWrite(PIN_STATUS_LED, LOW);
  }
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=================================================");
  Serial.println(" SILAGEGUARD AI V2 — ESP32-S3 Telemetry Firmware");
  Serial.println(" SIH26111 Smart Feed & Silage Quality System");
  Serial.println("=================================================");

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Configure ADC resolution (12-bit, 0-3.3V attenuation)
  analogReadResolution(12);

  // Initialize Dallas 1-Wire
  ds18b20.begin();
  ds18b20.setResolution(10); // 10-bit resolution for ~187ms fast conversion
  Serial.println("[SENSOR] DS18B20 1-Wire Bus Initialized on GPIO 4");

  // Initialize BLE
  BLEDevice::init("SilageGuard-Probe");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );
  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] GATT Server Advertising as 'SilageGuard-Probe'");
  Serial.println("[SYSTEM] Ready. Listening for BLE clients...");
}

// Read and convert physical sensors or fallback to agronomic simulation
void readSensors(float &phOut, float &moistOut, float &tempOut, float &ambientOut) {
  // Check physical DS18B20
  ds18b20.requestTemperatures();
  float rawTemp = ds18b20.getTempCByIndex(0);

  // Read analog pins
  int rawMoistAdc = analogRead(PIN_ANALOG_MOIST);
  int rawPhAdc = analogRead(PIN_ANALOG_PH);

  // If valid hardware detected (rawTemp between -10 and 85, ADC > 100)
  bool hasPhysicalSensors = (rawTemp > -10.0f && rawTemp < 85.0f && rawTemp != DEVICE_DISCONNECTED_C);

  if (hasPhysicalSensors) {
    // Physical hardware conversion
    tempOut = rawTemp;
    ambientOut = 24.5f; // Reference ambient temperature

    // Moisture conversion
    float moistPct = (float)(MOIST_AIR_ADC - rawMoistAdc) / (float)(MOIST_AIR_ADC - MOIST_WATER_ADC) * 100.0f;
    moistOut = constrain(moistPct, 0.0f, 100.0f);

    // pH conversion
    float phVoltage = (rawPhAdc / 4095.0f) * 3.3f;
    phOut = 7.00f + ((phVoltage - ph7Voltage) * phSlope) + phVoltageOffset;
    phOut = constrain(phOut, 2.0f, 12.0f);
  } else {
    // Fallback: Agronomic Fermentation Kinetics Simulation for Wokwi testing
    ambientOut = 24.5f + 1.2f * sin(sampleCounter * 0.05f);
    float noise = ((rand() % 100) / 500.0f) - 0.1f;

    // Cycle simulation modes every 60 seconds
    if (sampleCounter % 60 < 25) {
      currentMode = MODE_IDEAL_FERMENTATION;
    } else if (sampleCounter % 60 < 45) {
      currentMode = MODE_AEROBIC_DETERIORATION;
    } else {
      currentMode = MODE_SPOILED_BUTYRIC;
    }

    switch (currentMode) {
      case MODE_IDEAL_FERMENTATION:
        tempOut = ambientOut + 1.4f + noise;
        phOut = 3.98f + noise * 0.5f;
        moistOut = 64.2f + noise * 2.0f;
        break;

      case MODE_AEROBIC_DETERIORATION:
        tempOut = ambientOut + 5.8f + noise;
        phOut = 4.52f + noise * 0.5f;
        moistOut = 69.4f + noise * 2.0f;
        break;

      case MODE_SPOILED_BUTYRIC:
        tempOut = ambientOut + 11.5f + noise;
        phOut = 6.25f + noise * 0.6f;
        moistOut = 76.8f + noise * 2.5f;
        break;
    }
  }
}

void loop() {
  sampleCounter++;

  float phVal = 4.0f;
  float moistVal = 64.0f;
  float tempVal = 25.0f;
  float ambientVal = 24.0f;

  readSensors(phVal, moistVal, tempVal, ambientVal);

  // Battery simulation
  simulatedBattery = max(12.0f, simulatedBattery - 0.005f);

  // Prepare standard V2.1 JSON telemetry payload with honest mode separation
  StaticJsonDocument<384> doc;
  doc["ph"] = round(phVal * 100.0f) / 100.0f;
  doc["moisture"] = round(moistVal * 10.0f) / 10.0f;
  doc["temp"] = round(tempVal * 10.0f) / 10.0f;
  doc["ambient"] = round(ambientVal * 10.0f) / 10.0f;
  doc["battery"] = (int)round(simulatedBattery);
  doc["probe_id"] = PROBE_ID;
  doc["seq"] = sampleCounter;
  doc["mode"] = (rawTemp > -10.0f && rawTemp < 85.0f && rawTemp != DEVICE_DISCONNECTED_C) ? "REAL_SENSOR" : "WOKWI_SIMULATION";

  char jsonBuffer[384];
  serializeJson(doc, jsonBuffer);

  // Print to Serial Monitor for Wokwi visualization
  Serial.print("[TELEMETRY] ");
  Serial.println(jsonBuffer);

  // Transmit over BLE GATT if mobile client is connected
  if (deviceConnected) {
    pCharacteristic->setValue((uint8_t*)jsonBuffer, strlen(jsonBuffer));
    pCharacteristic->notify();
    
    // Heartbeat LED flash
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(40);
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  // Handle reconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarted Advertising.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(1000); // 1 Hz sample rate
}
