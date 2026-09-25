# SILAGEGUARD AI V2 — System Architecture Specification

## 1. Overview
**SILAGEGUARD AI V2** is an offline-first, multimodal rapid screening system for dairy silage quality assessment. Designed for the Smart India Hackathon 2026 (Problem Statement **SIH26111**), it combines an ultra-low-cost ESP32-S3 physical sensor probe, smartphone edge computer vision, a continuous multimodal evidence fusion engine, and an agronomic safety rule engine to produce rapid triage verdicts without any cloud or internet dependency.

---

## 2. End-to-End System Architecture

```text
                                SILAGEGUARD AI V2

                                     FARMER
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
               ESP32-S3 PROBE                      SMARTPHONE
                      │                                 │
              ┌───────┼────────┐                ┌───────┼──────────┐
              │       │        │                │                  │
             pH    Moisture   Temp           Camera              BLE
              │       │        │                │                  │
              └───────┴────────┘                │                  │
                      │                         │                  │
                      └───────── BLE ───────────┘                  │
                                                │
                                      ┌─────────▼─────────┐
                                      │ Sensor Inference  │
                                      │   Random Forest   │
                                      └─────────┬─────────┘
                                                │
                                      Sensor Evidence Score
                                                │
                                      ┌─────────▼─────────┐
                                      │ Vision Inference  │
                                      │ MobileNetV3 INT8  │
                                      └─────────┬─────────┘
                                                │
                                      Vision Evidence Score
                                                │
                                      ┌─────────▼─────────┐
                                      │ Multimodal Fusion │
                                      │ (0.55/0.45 MSSI)  │
                                      └─────────┬─────────┘
                                                │
                                      Continuous MSSI Score
                                                │
                                      ┌─────────▼─────────┐
                                      │ Safety Rule Engine│
                                      │ (Deterministic)   │
                                      └─────────┬─────────┘
                                                │
                                         Final Verdict
                                                │
                         ┌──────────────────────┼─────────────────┐
                         │                      │                 │
                    Explainability          Advisory          Confidence
                   ("Why This Result")     (5 Languages)     (High/Mod/Low)
                         │                      │                 │
                         └──────────────────────┼─────────────────┘
                                                │
                                      ┌─────────▼─────────┐
                                      │  SQLite Local DB  │
                                      │ (100% Offline)    │
                                      └─────────┬─────────┘
                                                │
                                      ┌─────────▼─────────┐
                                      │ QR Certificate    │
                                      └───────────────────┘
```

---

## 3. Subsystem Breakdown

### 3.1 Hardware Probe Subsystem
- **Microcontroller**: ESP32-S3 DevKitC-1 with dual-core Xtensa 32-bit LX7 CPU at 240 MHz.
- **Sensors**:
  - Temperature: DS18B20 1-Wire digital probe on GPIO 4 (10-bit conversion, ±0.5°C accuracy).
  - Silage Moisture: Capacitive Soil Moisture Sensor v1.2 on ADC1 Channel 0 (GPIO 1).
  - Silage pH: Industrial Glass pH Electrode with high-impedance BNC signal conditioning board on ADC1 Channel 1 (GPIO 2).
  - Status Indicator: Heartbeat Green LED on GPIO 10.
- **Communication Protocol**: Bluetooth Low Energy (BLE 5.0 GATT).
  - Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - Broadcast Rate: 1.0 Hz `NOTIFY`.
  - Standard JSON Telemetry Payload:
    ```json
    {
      "ph": 4.12,
      "moisture": 64.5,
      "temp": 24.8,
      "ambient": 22.1,
      "battery": 94,
      "probe_id": "SILAGE-ESP32-S3-01",
      "seq": 142
    }
    ```

### 3.2 Mobile AI Subsystem
- **Sensor Inference Engine**:
  - Model: Random Forest Classifier (25 Trees, max depth 8).
  - Features: `ph`, `moisture`, `temp_rise`, `temperature`, `ambient`.
  - Execution: Zero-dependency embedded JSON decision tree interpreter in TypeScript.
  - Latency: < 25 ms.
- **Vision Inference Engine**:
  - Architecture: MobileNetV3-Small INT8 quantized (`mobilenetv3_silage_v2.0`).
  - Input: 224 × 224 RGB image tensor normalized with ImageNet stats.
  - Multi-Photo Stack: Processes 3 representative photos (surface crust, working face, trench base) and aggregates via mean probability.
  - Latency: ~180 ms on mobile NPU / CPU.
  - Scientific Scope: Surface anomaly and fungal mycelium pattern screening. Explicitly does not claim molecular toxin quantification.

### 3.3 Multimodal Fusion & Rule Engine
- **Decoupled Architecture**:
  1. Sensor Evidence Calculation: Converts Random Forest class probabilities into a continuous 0–100 score.
  2. Vision Evidence Calculation: Converts MobileNetV3-Small class probabilities into a continuous 0–100 score.
  3. Continuous Fusion: Weighted summation ($0.55 \times \text{Sensor} + 0.45 \times \text{Vision}$). Weights are documented prototype heuristics.
  4. Decoupled Agronomic Safety Rules: Hard-coded deterministic boundary checks (pH > 5.80, $\Delta T > 10.0^\circ\text{C}$, Mould $> 60\%$). If triggered, the rule engine overrides the probabilistic score and forces a conservative "DO NOT FEED" or "UNSAFE" verdict, explicitly logging `rule_override = true`.
  5. Traceable Explainability Chain: Generates a granular point-by-point diagnostic breakdown explaining the rationale for the verdict.

### 3.4 Local Data Persistence & QR Verification
- **Database**: SQLite (`expo-sqlite` on mobile, mock store on web/tests).
- **Relational Tables**:
  - `batches`: Core scan record including timestamps, verdicts, confidence levels, model versions, and override status.
  - `sensor_readings`: Raw physical sensor telemetry and derived metrics.
  - `predictions`: Model outputs, individual frame probabilities, and JSON explainability chains.
  - `settings`: Local configuration, language preferences, and pH calibration slope/offset.
- **QR Digital Certificate**: Compact verification payload encoded for offline scanning by dairy co-operatives and milk union chilling centers.

---

## 4. Zero Cloud Dependency
SILAGEGUARD AI operates 100% offline. No telemetry, audio, or scan images leave the farmer's smartphone. The entire pipeline functions in full airplane mode with zero external server dependencies.
