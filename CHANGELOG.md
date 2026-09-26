# SILAGEGUARD AI — Changelog

All notable changes to SILAGEGUARD AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-09-26

### Mobile Stack Upgrade (Expo SDK 57 & React 19)
- Upgraded project to Expo SDK 57 (`expo@~57.0.25`, `react@19.2.3`, `react-native@0.86.3`).
- Installed native companions: `react-native-safe-area-context@5.7.0`, `react-native-screens@4.26.2`, `expo-linking@57.0.11`, `expo-camera@57.0.5`.
- Resolved all peer dependencies and TypeScript types (`@types/react@19.2.4`, `typescript@5.9.3`).
- Verified zero errors on Metro bundler export (`npx expo export --platform android` -> 1386 modules).

### UI/UX & Design Enhancements
- **Dynamic Theme Engine**: High-contrast Dark Mode and daylight-readable Light Mode with instant 1-tap toggle switch in Header and Settings.
- **Strict Zero Dummy Data Policy**: Eradicated all hardcoded/seeded mock values in SQLite and BLE service. Disconnected probe shows `--` and "No Probe Connected". Empty database starts clean.
- **Status Bar & Notch Clearance**: Integrated `useSafeAreaInsets` across all headers and screens, fixing notification center clipping.
- **Full Viewport Width**: Reduced screen container horizontal padding from 24px to 12px.
- **Sharp Industrial Geometry**: Replaced bubble/pill radii with clean 8px/10px corners for professional instrumentation aesthetic.
- **Farmer-First Scanner Experience**:
  - Live hardware camera viewfinder with `expo-camera` (`CameraView`) and runtime permission handling.
  - Gallery upload and demo sample photo fallbacks.
  - De-cluttered 3-step guided flow (Step 1: Photo, Step 2: Probe Telemetry, Step 3: Analyze).
  - Collapsible advanced parameters (Crop & Depth).

---

## [2.2.0] - 2026-09-25

### 100% Real-Data Vision Model & Provenance
- Replaced all procedural synthetic images with 99 authentic, CC-licensed agricultural silage photos with complete DOI provenance.
- Cleanly isolated legacy synthetic datasets into `datasets/archive/synthetic_v1/`.
- Validated zero synthetic image leakage into production vision models.

---

## [2.1.0] - 2026-09-25

### Scientific Verification & Hardening
- Decoupled agronomic safety rules from ML probabilistic weights.
- Implemented 2-point buffer calibration in hardware firmware and app settings.
- Established model cards and reproducible holdout testing benchmarks.

---

## [2.0.0] - 2026-09-25
- Major architectural rebuild: offline-first React Native + SQLite architecture, BLE GATT service, on-device Random Forest sensor model, and MobileNetV3 INT8 edge vision model.

---

## [1.0.0] - 2026-09-24
- Initial prototype release for SIH 2026.
