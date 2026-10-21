# SilageGuard AI — Digital Twin Final Engineering Report

## 1. What Existed Before

Prior to this mega-sprint, the SilageGuard AI repository contained substantial individual functional subsystems, but lacked a cohesive, persistent, longitudinal Digital Twin:
- **Client Application**: An Expo/React Native mobile application with 7-screen navigation, onboarding, multilingual localization, offline SQLite database, BLE connection manager, camera capture with IQA, and client-side ONNX MobileNetV3 vision inference and Random Forest inference.
- **Backend**: A FastAPI application with PostgreSQL/SQLite persistence, JWT/OTP authentication, batch ingestion sync service, analytics router, model registry, and QR verification.
- **Limitation**: The system operated primarily as a disconnected single-point screening tool. When viewing a batch, the UI only displayed the instantaneous values of the single latest observation or an unranked history of raw records. There was no concept of a physical batch baseline, no computation of longitudinal drift rates ($\Delta\text{pH}$, $\Delta\text{temp}$, $\Delta\text{MSSI}$ per day), no multi-signal deterioration heuristics, no evidence-backed reasoning, and no cloud endpoint to retrieve or reconstruct a batch's Digital Twin.

---

## 2. What Was Missing

1. **A Formal, Persistent Digital Twin State Model**: No explicit data contract representing baseline metrics, current metrics, deltas, rates per day, deterioration flags, warning levels, evidence reasons, and farmer recommendations.
2. **Deterministic Longitudinal Trend Engine**: No mathematical engine to compute parameter drift and rates across observation histories.
3. **Multi-Signal Early Deterioration Logic**: No multi-sensor cross-validation (e.g. detecting simultaneous $\text{pH}\uparrow + \text{Temp}\uparrow + \text{MSSI}\downarrow$ before visible mold appears).
4. **Offline Twin Derivation**: The local SQLite database lacked methods to reconstruct and serve the Digital Twin state directly to the mobile UI without cloud connectivity.
5. **Backend Digital Twin Service & API**: The backend analytics service lacked a `get_batch_digital_twin` method and a dedicated `GET /api/v1/analytics/twin/{batch_id}` REST endpoint.
6. **Sync History Accumulation**: The sync service replaced batch summary data but did not record sequential scans into the `BatchObservation` longitudinal table.
7. **Farmer-Facing Explanations & Actionable Advice**: The UI lacked simple evidence strings explaining *why* a batch was deteriorating and conservative guidance on what physical steps to take.
8. **UI Integration**: The Home screen and Record Detail screens did not display baseline comparisons, drift rates, or twin insights.

---

## 3. What Was Implemented

1. **Deterministic Digital Twin Engines (100% Mathematical Parity)**:
   - Client-side: `frontend/services/ai/digitalTwinEngine.js`
   - Server-side: `backend/app/services/digital_twin_engine.py`
2. **Offline Local SQLite Integration**:
   - Implemented `localDb.getDigitalTwin(batchId)` in both native SQLite (`localDb.js`) and web fallback (`localDb.web.js`).
   - Re-routed `detectDeteriorationTrend(batchId)` to use the deterministic engine.
3. **Backend Analytics Service & API Endpoint**:
   - Added `get_batch_digital_twin(client_batch_id, user_id)` to `backend/app/services/analytics_service.py`.
   - Exposed `GET /api/v1/analytics/twin/{batch_id}` in `backend/app/routers/analytics.py`.
4. **Longitudinal Observation Accumulation in Sync Service**:
   - Updated `backend/app/services/sync_service.py` to insert new scans into `BatchObservation` while maintaining idempotent replay deduplication.
5. **Upgraded Farmer-Facing UI**:
   - `frontend/components/HealthStatusCard.jsx`: Added Digital Twin badge, metric drift micro-pills, insight box, action recommendations, and touch navigation to batch records.
   - `frontend/screens/HomeScreen.jsx`: Fetches and supplies live Digital Twin state.
   - `frontend/screens/RecordDetailScreen.jsx`: Added comprehensive Digital Twin section showing Baseline vs Current comparison table, daily drift rate banner, evidence list, and recommended farmer actions.
   - `frontend/components/Timeline.jsx`: Highlights the `📍 BASELINE` observation and displays MSSI indicators.
   - `frontend/i18n/translations.js`: Added 9 new localized Digital Twin keys across all 5 supported languages (English, Hindi, Marathi, Kannada, Telugu).
6. **Automated Verification & Regression Test Suites**:
   - Standalone comprehensive unit test: `scripts/test_digital_twin.py` (31 tests).
   - Backend integration test: `backend/tests/test_digital_twin.py` (Pytest).
   - Full regression across `scripts/verify_integration.py`, `scripts/smoke_test.py`, and `npm run typecheck`.

---

## 4. Files Changed

### Documentation Created
- `docs/DIGITAL_TWIN_AUDIT.md`
- `docs/DIGITAL_TWIN_DECISIONS.md`
- `docs/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/DIGITAL_TWIN_TESTING.md`
- `docs/PHYSICAL_VALIDATION_CHECKLIST.md`
- `docs/DIGITAL_TWIN_FINAL_REPORT.md`

### Frontend Files
- `frontend/services/ai/digitalTwinEngine.js` *(New)*
- `frontend/services/db/localDb.js` *(Modified)*
- `frontend/services/db/localDb.web.js` *(Modified)*
- `frontend/components/HealthStatusCard.jsx` *(Modified)*
- `frontend/screens/HomeScreen.jsx` *(Modified)*
- `frontend/screens/RecordDetailScreen.jsx` *(Modified)*
- `frontend/components/Timeline.jsx` *(Modified)*
- `frontend/i18n/translations.js` *(Modified)*

### Backend Files
- `backend/app/services/digital_twin_engine.py` *(New)*
- `backend/app/services/analytics_service.py` *(Modified)*
- `backend/app/services/sync_service.py` *(Modified)*
- `backend/app/routers/analytics.py` *(Modified)*

### Tests Created
- `scripts/test_digital_twin.py` *(New)*
- `backend/tests/test_digital_twin.py` *(New)*

---

## 5. Database Changes

- **Schema Stability**: No disruptive schema migrations were required. The existing SQLite `observations` table and PostgreSQL `batch_observations` / `batches` tables already had the required columns (`ph`, `temperature_c`, `ambient_temp_c`, `moisture_pct`, `fused_score`, `visual_class`, `scanned_at`, `client_batch_id`).
- **Data Derivation Paradigm**: The Digital Twin is derived directly from chronological observation rows (`ORDER BY scanned_at ASC`).
- **Sync Fix**: In `backend/app/services/sync_service.py`, new scans submitted via `POST /api/v1/sync/batches` are now appended to `BatchObservation` if an observation at that exact timestamp does not already exist, enabling longitudinal twin history accumulation in PostgreSQL.

---

## 6. API Changes

- **New REST Endpoint**:
  `GET /api/v1/analytics/twin/{batch_id}`
  - **Auth**: Bearer JWT token required.
  - **Path Parameter**: `batch_id` (client batch identifier, e.g. `SG-2026-001`).
  - **Response Payload**:
    ```json
    {
      "batch_id": "SG-2026-001",
      "baseline_observation_id": "obs-001",
      "latest_observation_id": "obs-004",
      "observation_count": 4,
      "first_observed_at": "2026-10-01T08:00:00Z",
      "last_observed_at": "2026-10-07T08:00:00Z",
      "current_status": "CAUTION",
      "current_mssi": 63.0,
      "baseline_mssi": 92.0,
      "mssi_change": -29.0,
      "mssi_change_percent": -31.5,
      "ph_baseline": 3.92,
      "ph_current": 4.45,
      "ph_change": 0.53,
      "temperature_baseline": 24.0,
      "temperature_current": 29.5,
      "temperature_change": 5.5,
      "delta_temperature_baseline": 1.5,
      "delta_temperature_current": 5.5,
      "moisture_baseline": 64.0,
      "moisture_current": 66.0,
      "visual_baseline": "Healthy",
      "visual_current": "Abnormal Appearance",
      "rates_per_day": {
        "ph_per_day": 0.088,
        "temperature_per_day": 0.917,
        "mssi_per_day": -4.833,
        "days_elapsed": 6.0
      },
      "trend_direction": "DETERIORATING",
      "deterioration_detected": true,
      "warning_level": "EARLY_DETERIORATION",
      "warning_reasons": [
        "MSSI safety index dropped by 29.0 points from baseline.",
        "Core pH increased by 0.53 from baseline (3.92 -> 4.45).",
        "Core temperature increased by 5.5°C from baseline (24.0°C -> 29.5°C).",
        "Differential temperature (ΔT above ambient) rose by 4.0°C.",
        "Visual condition changed from Healthy to Abnormal Appearance."
      ],
      "recommended_action": "Inspect the silage bunker face immediately. Check for localized heating, air ingress, or packing voids. Review feed-out rate and discard visibly compromised feed before ration mixing.",
      "last_updated": "2026-10-21T15:05:00Z"
    }
    ```

---

## 7. Frontend Changes

- **Home Screen (`frontend/screens/HomeScreen.jsx` & `frontend/components/HealthStatusCard.jsx`)**:
  - Automatically loads and displays the active batch's Digital Twin state.
  - Displays batch status pill, current MSSI score, observation count, and time elapsed.
  - Micro-pills for parameter drift: $\Delta\text{MSSI}$, $\Delta\text{pH}$, and $\Delta\text{Temp}$.
  - Twin Insight callout with clear explanatory text.
  - Recommended Farmer Action box with prominent guidance.
  - Tapping the card opens the batch's complete longitudinal record.
- **Record Detail (`frontend/screens/RecordDetailScreen.jsx`)**:
  - Added dedicated Digital Twin card.
  - Baseline vs Current comparison table showing Initial, Current, and Delta for MSSI, pH, Temperature, $\Delta T$, and Moisture.
  - Daily drift rates banner showing parameter drift normalized per 24 hours.
  - Evidence list displaying bullet points of physical deterioration signals.
  - Recommended Action container advising the farmer on concrete mitigation steps.
- **Timeline (`frontend/components/Timeline.jsx`)**:
  - Highlights Step 1 as `📍 BASELINE`.
  - Displays MSSI score badges on each observation card.
- **Localization (`frontend/i18n/translations.js`)**:
  - Full translations for all new Twin elements in English, Hindi, Marathi, Kannada, and Telugu.

---

## 8. Offline Changes

- Completely offline capable: `localDb.getDigitalTwin(batchId)` runs entirely on the device.
- Zero network dependencies for baseline comparison, delta calculation, drift rates, deterioration detection, evidence extraction, or recommendation generation.
- Re-running offline screenings continuously updates the local twin state.
- When network is restored, offline records are pushed via the sync queue, matching the backend twin state.

---

## 9. Trend Logic

- Single Observation Rule: An initial observation ($N=1$) establishes the baseline only. Rate calculations and deterioration trends are suppressed (`trend_direction = "INSUFFICIENT_DATA"`, `warning_level = "STABLE"`).
- Two Observations ($N=2$): Computes changes from previous observation and baseline. Flags acute deterioration if severe changes are observed.
- Three or More Observations ($N \ge 3$): Declares a persistent longitudinal trajectory.
- Minimum Time Elapsed Clamp: If elapsed time between observations is $< 0.05 \text{ days}$ (1.2 hours), daily rates are clamped to `null` to prevent false drift spikes.

---

## 10. Warning Logic

- **Instantaneous Safety Overrides**: Critical single-point failures ($\text{pH} \ge 5.0$, $\Delta T \ge 10.0^\circ\text{C}$, or $\text{MSSI} < 45$) immediately override longitudinal trend to `HIGH_RISK`.
- **`EARLY_DETERIORATION`**: Triggered when $\ge 3$ simultaneous negative signals occur (e.g. $\text{MSSI}\downarrow + \text{pH}\uparrow + \text{Temp}\uparrow$) OR visual condition degrades to `Spoilage / Mould`.
- **`WATCH`**: Triggered when 1 or 2 deterioration signals are active.
- **`STABLE`**: Triggered when 0 deterioration signals are active.

---

## 11. Tests

All automated tests pass with 100% success:
- `scripts/test_digital_twin.py`: **31/31 PASSED** (0 failures).
- `scripts/verify_integration.py`: **57/57 PASSED** (0 failures).
- `scripts/smoke_test.py`: **26/26 PASSED** (0 failures).
- `backend/tests/` (Pytest): **9/9 test suites PASSED** in 58.81s.
- `frontend/` (TypeScript): **0 errors** across all screens and components.

---

## 12. Remaining Limitations

1. **Benchtop Sensor Calibration Required**: Physical pH, PT100/DS18B20, and capacitive moisture probes require benchtop calibration against buffer standards.
2. **Laboratory Wet-Chemistry Ground Truth**: True dry-matter and volatile fatty acid (VFA) profiles must be validated against accredited laboratory testing.
3. **Environmental Exposure Variations**: Ambient temperature swings between day and night in uninsulated trenches must be factored into longer multi-week field deployments.

---

## 13. Physical Validation Still Required

Refer to `docs/PHYSICAL_VALIDATION_CHECKLIST.md`:
1. ESP32-S3 BLE advertising and connection stability with mobile devices.
2. Sensor calibration in buffer solutions (pH 4.01 and 7.00 standards).
3. Core temperature probe response time ($t_{90} \le 45\text{ s}$) inside packed silage.
4. Moisture dielectric sensor calibration curve against oven-dried silage samples.
5. Watchdog disconnection timer verification on real hardware.

---

## 14. Scientific Validation Still Required

1. Multi-bunker correlative study comparing probe pH against standard laboratory electrode pH across 100+ samples.
2. Time-series aerobic deterioration trial validating early thermal/pH warnings 48 hours prior to visible fungal sporulation.
3. Mycotoxin screening correlation studies with accredited veterinary toxicology labs before asserting any toxin-related risk correlations.

---

## 15. Recommended Next Steps

1. Flash the ESP32-S3 probe firmware and run the benchtop calibration protocol in `docs/PHYSICAL_VALIDATION_CHECKLIST.md`.
2. Generate an Android APK build using Expo EAS (`eas build -p android --profile preview`) for farm field testing.
3. Perform a 7-day physical test on an active bunker silo to record real-world multi-day drift curves.
