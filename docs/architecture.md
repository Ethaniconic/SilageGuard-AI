# SILAGEGUARD AI — SYSTEM ARCHITECTURE SPECIFICATION

## 1. Overview
**SILAGEGUARD AI (SIH26111)** is a robust, offline-first, multimodal rapid screening system for dairy silage quality assessment. It integrates an ultra-low-cost ESP32 physical multi-sensor probe, edge and server computer vision (MobileNetV3), client/server Random Forest sensor inference, continuous multimodal evidence fusion (MSSI), and a deterministic agronomic safety rule engine to produce actionable screening triage verdicts without requiring internet connectivity in the field.

---

## 2. End-to-End System Target Architecture

```text
                ┌─────────────────────┐
                │    React Native     │
                │     Expo SDK 57     │
                └──────────┬──────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
        Camera           BLE          SQLite
            │              │      (Local DB & Twin)
            ▼              ▼              │
       Image IQA      ESP32 Probe         │
            │        (pH/Temp/Moist)      │
            ▼              ▼              │
        Vision ML      Sensor ML          │
      (MobileNetV3)  (Random Forest)      │
            │              │              │
            └───────┬──────┘              │
                    ▼                     │
                  MSSI                    │
             (0.55 / 0.45)                │
                    │                     │
                    ▼                     │
              Safety Rules                │
             (Deterministic)              │
                    │                     │
                    ▼                     │
             Screening Result             │
             (Safe/Watch/Risk)            │
                    │                     │
                    ▼                     │
             Digital Twin  ◄──────────────┘
                    │
                    ▼
             Deterioration
                 Trends
                    │
                    ▼
               Sync Queue
                    │
            (Network Restored)
                    │
                    ▼
             FastAPI Backend
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Database            Analytics
```

---

## 3. Subsystem Breakdown

### 3.1 Physical Hardware Probe Subsystem
- **Microcontroller**: ESP32 DevKit v1 / ESP32-WROOM-32 (Dual-core Tensilica Xtensa 240 MHz).
- **Physical Sensors**:
  - **Moisture**: Capacitive Soil Moisture Sensor v1.2 wired to **GPIO 34** (ADC1_CH6, analog input).
  - **pH**: Analog Industrial pH Probe with signal conditioning amplifier wired to **GPIO 35** (ADC1_CH7, analog input).
  - **Core Temperature**: DS18B20 Stainless Probe on **GPIO 4** (Dallas 1-Wire with 4.7kΩ pull-up).
  - **Status LED**: **GPIO 2** (Blinks at 1 Hz when advertising, solid when connected).
- **Authoritative BLE Contract**:
  - Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - Broadcast Rate: 1.0 Hz `NOTIFY` with sequence number and checksum.

### 3.2 Mobile Client Subsystem
- **Framework**: React Native with Expo SDK 57 running JavaScript (JSX) on Hermes engine.
- **Local Database**: `expo-sqlite` (Android/iOS) and `localStorage` (Web browser).
- **Voice Guidance**: `expo-speech` delivering localized audio advisories in 5 Indian languages (English, Hindi, Marathi, Kannada, Telugu).
- **Zero-Cloud Capability**: Complete Random Forest traversal, safety rules evaluation, and record storage executed 100% on-device when offline.

### 3.3 Machine Learning & Explainability
- **Vision Classifier**:
  - Architecture: MobileNetV3-Large 5-Class (`Healthy`, `Abnormal_Appearance`, `Mould`, `Spoilage`, `Foreign_Object`).
  - Preprocessing: 224x224 RGB tensor with ImageNet normalization.
  - Explainability: PyTorch Grad-CAM on bottleneck layer (`features[-1]`) generating Jet heatmaps and bounding box hotspot focus.
- **Sensor Classifier**:
  - Architecture: 25-Tree Random Forest traversing authoritative 11-feature vector.
  - Artifact: Serialized JSON decision forest (`models/sensor/sensor_random_forest.json`).
  - Output Classes: `SAFE`, `CAUTION`, `UNSAFE`.

### 3.4 Multimodal Evidence Fusion & Deterministic Rules
- **Continuous Fusion**: $\text{MSSI} = 0.55 \times \text{SensorScore} + 0.45 \times \text{VisionScore}$.
- **Deterministic Overrides**: Hard biological safety rules (pH $\ge$ 5.0, $\Delta T \ge 8^\circ\text{C}$, visible mould) override ML scores and guarantee conservative farmer safety.

### 3.5 Synchronization & Cloud Storage
- **Backend**: FastAPI (Python 3.13) with Pydantic contracts and SQLAlchemy ORM.
- **Idempotent Queue**: Sync queue on mobile uploads pending records via `POST /api/v1/sync/batches`. Server deduplicates by `client_batch_id`, safely skipping existing rows.
