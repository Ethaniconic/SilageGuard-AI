/**
 * SILAGEGUARD AI — ESP32-S3 Multi-Sensor Fermentation Telemetry Firmware
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 * 
 * Hardware Platform: ESP32-S3 DevKitC-1
 * Sensors:
 *  - Temperature: DS18B20 (Dallas 1-Wire Digital on GPIO 4)
 *  - Moisture: Capacitive Soil Moisture Sensor v1.2 (ADC on GPIO 1)
 *  - pH: Analog Industrial pH Probe (ADC on GPIO 2)
 *  - Status Indicator: Green LED on GPIO 10
 * 
 * Connectivity: Bluetooth Low Energy (BLE 5.0)
 * Telemetry Protocol: JSON Payload over GATT Characteristic (1 Hz NOTIFY)
 * 
 * Direct Sensor Simulation:
 *   Realistic agronomic fermentation kinetics with probe equilibration,
 *   aerobic thermal rise, and battery telemetry. No potentiometer knobs required.
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
float simulatedBattery = 98.5;

// Fermentation mode simulation states for seamless testing in Wokwi
enum ProbeMode {
  MODE_IDEAL_FERMENTATION,    // pH ~4.0, Moist ~64%, Delta T < 2C
  MODE_AEROBIC_DETERIORATION, // pH ~4.6, Moist ~69%, Delta T ~6C
  MODE_SPOILED_BUTYRIC        // pH ~6.2, Moist ~76%, Delta T ~12C
};
ProbeMode currentMode = MODE_IDEAL_FERMENTATION;

// --- BLE CALLBACKS ---
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
  Serial.println(" SILAGEGUARD AI — ESP32-S3 Firmware v1.0.0");
  Serial.println(" SIH26111 Smart Feed & Silage Testing System");
  Serial.println("=================================================");

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize Dallas 1-Wire
  ds18b20.begin();
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
  Serial.println("[SYSTEM] Direct Agronomic Simulation Active.");
}

void loop() {
  sampleCounter++;

  // Cycle simulation modes every 40 samples to thoroughly test mobile app UI & AI
  if (sampleCounter % 60 < 25) {
    currentMode = MODE_IDEAL_FERMENTATION;
  } else if (sampleCounter % 60 < 45) {
    currentMode = MODE_AEROBIC_DETERIORATION;
  } else {
    currentMode = MODE_SPOILED_BUTYRIC;
  }

  // Base physics calculation
  float ambientTemp = 24.5 + 1.2 * sin(sampleCounter * 0.05);
  float probeTemp = ambientTemp;
  float phValue = 4.0;
  float moistureValue = 64.0;

  // Add realistic micro-fluctuations (sensor noise)
  float noise = ((rand() % 100) / 500.0) - 0.1;

  switch (currentMode) {
    case MODE_IDEAL_FERMENTATION:
      // Tight lactic pH, optimal dry matter, negligible thermal rise
      probeTemp = ambientTemp + 1.4 + noise;
      phValue = 3.98 + noise * 0.5;
      moistureValue = 64.2 + noise * 2.0;
      break;

    case MODE_AEROBIC_DETERIORATION:
      // Air leak in bunker face, temperature rise 5-7C, mild pH shift
      probeTemp = ambientTemp + 5.8 + noise;
      phValue = 4.52 + noise * 0.5;
      moistureValue = 69.4 + noise * 2.0;
      break;

    case MODE_SPOILED_BUTYRIC:
      // Clostridial / mould respiration, high heat, alkalization pH > 5.5
      probeTemp = ambientTemp + 11.5 + noise;
      phValue = 6.25 + noise * 0.6;
      moistureValue = 76.8 + noise * 2.5;
      break;
  }

  // Battery drain simulation
  simulatedBattery = max(12.0f, simulatedBattery - 0.005f);

  // Format telemetry JSON
  StaticJsonDocument<256> doc;
  doc["ph"] = round(phValue * 100.0) / 100.0;
  doc["moisture"] = round(moistureValue * 10.0) / 10.0;
  doc["temp"] = round(probeTemp * 10.0) / 10.0;
  doc["ambient"] = round(ambientTemp * 10.0) / 10.0;
  doc["battery"] = round(simulatedBattery);
  doc["probe_id"] = PROBE_ID;
  doc["seq"] = sampleCounter;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  // Output to Serial Monitor for Wokwi visualization
  Serial.print("[TELEMETRY] ");
  Serial.println(jsonBuffer);

  // Send over BLE Notify if mobile phone is connected
  if (deviceConnected) {
    pCharacteristic->setValue((uint8_t*)jsonBuffer, strlen(jsonBuffer));
    pCharacteristic->notify();
    // Heartbeat flash
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(50);
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  // Handle reconnection states
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
