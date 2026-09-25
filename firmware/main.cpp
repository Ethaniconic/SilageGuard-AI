/**
 * SilageGuard AI — ESP32-S3 Firmware
 * SIH26111 | Software Category
 *
 * Reads pH, soil-moisture, and DS18B20 temperature sensors.
 * Outputs a SENSOR_DATA JSON line every 2 s to the serial monitor.
 * This simulates the BLE payload that the React Native app consumes
 * (Wokwi does not fully simulate BLE, so serial is used instead).
 *
 * Build with PlatformIO:
 *   pio run -t upload
 * Simulate in VS Code:
 *   F1 → "Wokwi: Start Simulator"
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>          // Required by Adafruit_SSD1306
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ── Pin Definitions ──────────────────────────────────────────────────────────
#define PH_PIN        1   // ADC1_CH0 — analog pH output
#define MOISTURE_PIN  2   // ADC1_CH1 — analog soil-moisture output
#define ONE_WIRE_BUS  3   // 1-Wire data bus for DS18B20

// ── OLED (SSD1306 128×64, I2C on GPIO 4/5) ───────────────────────────────────
#define OLED_SDA      4
#define OLED_SCL      5
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ── Temperature Sensor ────────────────────────────────────────────────────────
OneWire           oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Convert raw 12-bit ADC (0-4095) to pH.
 *
 * Real sensor: op-amp circuit with V_neutral = 2.5V at pH 7, slope 0.18V/pH.
 * Wokwi simulation: potentiometer spans 0–3.3V.
 *   → We use V_neutral = 1.65V (half of 3.3V) so the full pot sweep
 *     gives pH 0–14 and the default 92% pot position gives pH ≈ 4.0
 *     (optimal well-fermented silage).
 *
 * Adjust to real calibration coefficients before deploying on hardware.
 */
float rawToPH(int raw) {
    const float V_REF     = 3.3f;
    const float V_NEUTRAL = 1.65f;   // 3.3V / 2 — midpoint at pH 7
    const float SLOPE     = 0.2357f; // V per pH unit = V_NEUTRAL / 7
    float voltage = raw * (V_REF / 4095.0f);
    float pH = 7.0f - ((voltage - V_NEUTRAL) / SLOPE);
    return constrain(pH, 0.0f, 14.0f);
}

/**
 * Convert raw 12-bit ADC (0-4095) to soil-moisture percentage.
 *
 * Real sensor: capacitive; DRY ≈ 3000, WET ≈ 1000 (3.3V system).
 * Wokwi simulation: potentiometer spans 0–4095.
 *   → 0% pot = 0 raw = 100% wet, 100% pot = 4095 raw = 0% wet.
 *   → Default 43% pot position gives moisture ≈ 57% (healthy silage range).
 */
float rawToMoisture(int raw) {
#ifdef WOKWI
    // Full-range mapping for potentiometer simulation
    return constrain(100.0f - (raw / 4095.0f) * 100.0f, 0.0f, 100.0f);
#else
    // Real capacitive sensor calibration
    const int DRY = 3000;
    const int WET = 1000;
    float pct = (float)(DRY - raw) / (float)(DRY - WET) * 100.0f;
    return constrain(pct, 0.0f, 100.0f);
#endif
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println(F("SilageGuard AI — Hardware Simulation Started"));

    // I2C bus for OLED
    Wire.begin(OLED_SDA, OLED_SCL);

    // Initialise OLED
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println(F("SSD1306 allocation failed — check wiring"));
    } else {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println(F("SilageGuard AI"));
        display.println(F("Initialising ..."));
        display.display();
    }

    // Initialise Dallas temperature
    sensors.begin();
    delay(1000);
    Serial.println(F("Sensors ready."));
}

// ── Main Loop ─────────────────────────────────────────────────────────────────
void loop() {
    // Read raw ADC values
    int phRaw       = analogRead(PH_PIN);
    int moistureRaw = analogRead(MOISTURE_PIN);

    // Request DS18B20 conversion
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    // Convert to engineering units
    float phValue        = rawToPH(phRaw);
    float moisturePct    = rawToMoisture(moistureRaw);

    // Guard against sensor error (-127 °C from OneWire lib)
    if (tempC < -100.0f) tempC = 0.0f;

    // ── Serial JSON output (simulates BLE payload) ────────────────────────────
    // Format: SENSOR_DATA:{"ph":4.02,"moisture":62.5,"temperature":30.1}
    Serial.print(F("SENSOR_DATA:{\"ph\":"));
    Serial.print(phValue, 2);
    Serial.print(F(",\"moisture\":"));
    Serial.print(moisturePct, 1);
    Serial.print(F(",\"temperature\":"));
    Serial.print(tempC, 1);
    Serial.println(F("}"));

    // ── OLED display ──────────────────────────────────────────────────────────
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println(F("-- SilageGuard AI --"));

    display.print(F("pH      : "));
    display.println(phValue, 2);

    display.print(F("Moisture: "));
    display.print(moisturePct, 1);
    display.println(F(" %"));

    display.print(F("Temp    : "));
    display.print(tempC, 1);
    display.println(F(" C"));

    // Simple safety indicator
    display.println();
    if (phValue > 6.0f || tempC > 45.0f) {
        display.println(F("STATUS: >>> UNSAFE <<<"));
    } else if (phValue > 4.8f || moisturePct < 50.0f || moisturePct > 72.0f) {
        display.println(F("STATUS: CAUTION"));
    } else {
        display.println(F("STATUS: SAFE"));
    }

    display.display();

    delay(2000);
}
