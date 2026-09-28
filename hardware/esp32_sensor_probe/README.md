# SILAGEGUARD AI — Physical ESP32 Hardware Probe Guide
**SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**

This guide explains how to connect and run your real physical **ESP32** with **Moisture Sensor** and **Temperature Sensor** to stream live telemetry directly into the SilageGuard AI app over Bluetooth Low Energy (BLE).

---

## 1. Hardware Bill of Materials (BOM)

| # | Component | Model / Spec | Purpose | Connection Pin |
|---|---|---|---|---|
| 1 | Microcontroller | ESP32 DevKit v1 / ESP32-WROOM-32 / ESP32-S3 | Bluetooth GATT server & sensor reading | USB to PC for power/serial |
| 2 | Moisture Sensor | Capacitive Soil Moisture Sensor v1.2 (or resistive) | Measures silage moisture proxy | **GPIO 34** (ADC1_CH6) |
| 3 | Temperature Sensor | DS18B20 Digital Waterproof Probe | Measures silage core fermentation temp | **GPIO 4** (OneWire) |
| 4 | Resistor | 4.7 kΩ (Yellow-Violet-Red) | Pull-up resistor for DS18B20 | Between **GPIO 4** and **3.3V** |
| 5 | (Optional) pH Probe | DFRobot SEN0161 or analog pH electrode | Measures lactic acidification | **GPIO 35** (ADC1_CH7) |

> [!IMPORTANT]
> **Why GPIO 34 for Moisture?**
> On classic ESP32 boards, ADC2 pins cannot be used while Bluetooth is actively transmitting. GPIO 34, 35, 36, and 39 belong to **ADC1**, which works 100% reliably while Bluetooth Low Energy is transmitting!

---

## 2. Wiring Connections

### A. Capacitive Moisture Sensor v1.2
```
Sensor VCC  ──────> ESP32 3.3V
Sensor GND  ──────> ESP32 GND
Sensor AOUT ──────> ESP32 GPIO 34 (ADC1_CH6)
```

### B. DS18B20 Temperature Sensor
```
Probe VCC (Red)    ──────> ESP32 3.3V
Probe GND (Black)  ──────> ESP32 GND
Probe DATA (Yellow)──────> ESP32 GPIO 4
                            │
                        [4.7 kΩ Resistor]
                            │
                          3.3V (Pull-up)
```
*(Without the 4.7 kΩ pull-up resistor between DATA and 3.3V, the 1-Wire protocol will not detect the DS18B20!)*

---

## 3. Flashing the ESP32 in Arduino IDE

### Step 1: Install Required Libraries
Open Arduino IDE -> **Tools** -> **Manage Libraries...** and search for & install:
1. **ArduinoJson** (by Benoit Blanchon, v6.x or v7.x)
2. **OneWire** (by Paul Stoffregen)
3. **DallasTemperature** (by Miles Burton)

### Step 2: Open and Upload Firmware
1. Open [`esp32_sensor_probe.ino`](file:///E:/silageguard-ai/hardware/esp32_sensor_probe/esp32_sensor_probe.ino).
2. Select your board under **Tools -> Board -> ESP32 Arduino -> DOIT ESP32 DEVKIT V1** (or your specific ESP32 variant).
3. Select your serial port under **Tools -> Port**.
4. Click **Upload**.

### Step 3: Verify via Serial Monitor
Open **Tools -> Serial Monitor** at **115200 baud**. You should see:
```text
==========================================================
   SILAGEGUARD AI — Physical ESP32 Silage Probe Firmware   
   SIH26111 | Smart AI-Enabled Feed Quality Screening     
==========================================================
[INIT] DS18B20 Temperature sensor detected on GPIO 4.
[INIT] Moisture sensor analog input configured on GPIO 34.
[INIT] Initializing Bluetooth Low Energy (BLE)...
[BLE] Broadcasting as 'SilageGuard-Probe'
[BLE] Service UUID : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
[BLE] Char UUID    : beb5483e-36e1-4688-b7f5-ea07361b26a8
[SYSTEM] Ready! Open SilageGuard AI app and click 'PAIR & CONNECT VIA BLE'.
```

---

## 4. Connecting in the App

1. Ensure Bluetooth is enabled on your laptop or mobile phone.
2. In the SilageGuard AI app, open the **Probe (BLE)** screen.
3. The demo switch will be on **REAL HARDWARE** by default.
4. Click **PAIR & CONNECT VIA BLE**.
5. Your browser's native Bluetooth pairing prompt will open:
   - Select **`SilageGuard-Probe`** (or your ESP32 board).
   - Click **Pair**.
6. The app will immediately show:
   - **Status:** `CONNECTED`
   - **Mode:** `MODE: REAL_SENSOR`
   - **Live Gauges:** Real moisture % and real core temperature from your physical hardware!
   - **pH:** Shows `--` (`NO PROBE / UNMEASURED`) honestly without faking data.

---

## 5. Moisture Sensor Quick Calibration

In [`esp32_sensor_probe.ino`](file:///E:/silageguard-ai/hardware/esp32_sensor_probe/esp32_sensor_probe.ino#L45-L55):
- Note the raw ADC in dry air from the Serial Monitor (usually `~3100-3300`). Set `MOIST_DRY_ADC = 3200`.
- Submerge the probe in water up to the white boundary line and note the ADC (usually `~1200-1400`). Set `MOIST_WET_ADC = 1250`.
- Re-upload for precision calibration.
