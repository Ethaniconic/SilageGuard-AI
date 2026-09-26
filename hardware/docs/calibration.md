# SILAGEGUARD AI — pH Probe Calibration
# V3.1 | SIH26111

## Wokwi Simulation Calibration

In Wokwi, pH is simulated by a potentiometer (0–3.3 V).
The firmware applies a linear conversion:

```
pH = slope × voltage + intercept
   = -2.424 × voltage + 10.0
```

This is a demonstration mapping only.
It is NOT a physical calibration.
`calibrated = false` is always sent in Wokwi telemetry.

---

## Physical pH Electrode Calibration (2-Point Buffer)

Physical calibration is required before field use.

### Required Materials

- pH 4.01 buffer solution (color: red/orange)
- pH 7.00 buffer solution (color: yellow)
- Distilled water for rinsing
- Temperature reference (25°C nominal)

### Calibration Procedure

1. Rinse electrode with distilled water. Pat dry.
2. Immerse in pH 7.00 buffer.
3. Wait for stable ADC reading (≥30 seconds).
4. Record `adc_at_7` and compute `voltage_at_7 = adc_at_7 / 4095.0 × 3.3`.
5. Rinse electrode with distilled water. Pat dry.
6. Immerse in pH 4.01 buffer.
7. Wait for stable ADC reading (≥30 seconds).
8. Record `adc_at_4` and compute `voltage_at_4 = adc_at_4 / 4095.0 × 3.3`.
9. Compute calibration parameters:

```
slope     = (4.01 - 7.00) / (voltage_at_4 - voltage_at_7)
intercept = 7.00 - (slope × voltage_at_7)
```

10. Update `PH_SLOPE` and `PH_INTERCEPT` constants in firmware.
11. Set `calibrated = true` in physical firmware.
12. Record calibration date and temperature in this document.

### Expected Nernst Slope

Ideal slope for a pH glass electrode at 25°C: ~59.16 mV/pH unit (Nernst equation).
In voltage terms with typical op-amp conditioning: ~−0.06 V/pH.

Reject calibration if computed slope deviates > 20% from Nernst ideal.

---

## Moisture Calibration (2-Point: Air/Water)

### Procedure

1. Hold capacitive sensor in open air for 10 seconds.
   Record `adc_dry` (typically 3000–3200 on ESP32-S3 12-bit ADC).

2. Immerse sensor in clean water (not beyond MAX_WATER_LINE marker).
   Wait 10 seconds for stable reading.
   Record `adc_wet` (typically 1200–1500).

3. Update firmware constants:
```c
const int MOIST_DRY_ADC = adc_dry;
const int MOIST_WET_ADC = adc_wet;
```

4. Moisture proxy = `(adc_dry - rawADC) / (adc_dry - adc_wet) × 100`

### IMPORTANT LIMITATION

This moisture proxy is a relative index only.
It is NOT equivalent to laboratory gravimetric dry-matter moisture%.
Silage dry-matter moisture requires oven-drying samples.
Do not report as "laboratory moisture percentage" — report as "relative moisture index".

---

## Calibration Storage

On physical hardware, store calibration coefficients in ESP32 NVS (Non-Volatile Storage).
They should persist across power cycles and firmware updates.
The mobile app reads calibration state from the `calibrated` field in telemetry.
