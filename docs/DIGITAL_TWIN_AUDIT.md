# SilageGuard AI — Digital Twin Audit Report

**Date**: 2026-10-21  
**Sprint**: Digital Twin Completion Mega-Sprint  
**Status**: Completed Baseline Audit

---

## A. Already Implemented

1. **Database Schema & Models**:
   - `backend/app/models/digital_twin.py`: Defines `BatchObservation` and `DeteriorationEvent` with full tracking of observation numbers, timestamps, raw sensor telemetry (pH, moisture, temperature, ambient, delta temp), fused decision, and MSSI score.
   - `backend/app/models/batch.py`: Defines `Batch` table with `client_batch_id`, storage type, fused decision, and QR token.
   - `frontend/services/db/localDb.js` & `localDb.web.js`: Defines `batches`, `observations`, and `sync_queue` SQLite tables with auto-migration columns for base64 images, Grad-CAM overlays, and bounding box coordinates.
2. **Offline Observation Capture & Persistence**:
   - `frontend/screens/CheckScreen.jsx`: Creates/selects batches, captures real BLE telemetry or manual readings, acquires silage face images, executes inference, and atomically saves observations into local SQLite and sync queue.
3. **Core Screening & Explainability**:
   - 5-class MobileNetV3 vision inference + PyTorch Grad-CAM + model-derived hotspot bounding boxes.
   - 25-tree Random Forest sensor model (in Python and on-device JavaScript `edgeInference.js`).
   - Deterministic safety rule overrides (severe pH $\ge 5.0$, thermal heat rise $\Delta T \ge 8.0^\circ\text{C}$, visible mould $\ge 70\%$).
   - Multimodal Silage Stability Index (MSSI v3.0, 0–100 scale).
4. **Initial Trend Prototype**:
   - `frontend/services/db/localDb.js`: Prototype `detectDeteriorationTrend()` comparing the latest observation with the immediately preceding observation for pH rise ($\ge 0.20$), core temp rise ($\ge 1.5^\circ\text{C}$), MSSI drop ($\ge 8$), and visual condition worsening.
   - `frontend/components/HealthStatusCard.jsx`: Displays batch ID, health state, last checked time, trend label, and warning box.
5. **Batch History UI**:
   - `frontend/screens/RecordsScreen.jsx` & `RecordDetailScreen.jsx`: Displays batch list, metrics grid, 3-tab Silage Feed Inspection viewer (Grad-CAM, Hotspot Bounding Box, Original Photo), and `Timeline.jsx`.

---

## B. Partially Implemented

1. **Longitudinal Digital Twin State**:
   - `localDb.js` `detectDeteriorationTrend` only compares observation $N$ to $N-1$. It does not track baseline reference (Observation #1), total change since baseline ($\Delta\text{pH}_{\text{base}}$, $\Delta T_{\text{base}}$, $\Delta\text{MSSI}_{\text{base}}$), nor does it calculate daily drift rates ($\Delta\text{pH}/\text{day}$, $\Delta T/\text{day}$).
   - No explicit, structured `DigitalTwinState` DTO/model exists that represents the batch's current condition, baseline reference, longitudinal signals, evidence reasons, and farmer recommendations.
2. **Digital Twin Sync Ingestion**:
   - `backend/app/services/sync_service.py`: When a batch is updated or replayed, it updates the `Batch` row but skips adding new historical rows to `BatchObservation`. Repeated observations from the mobile client are not properly accumulated into `BatchObservation` in the cloud database.
3. **Home UI Twin Representation**:
   - `HealthStatusCard.jsx` on Home screen does not show current MSSI score, trend direction arrows ($\downarrow$ MSSI, $\uparrow$ pH, $\uparrow$ Temp), or evidence-backed farmer action recommendations.
4. **Record Detail Digital Twin View**:
   - `RecordDetailScreen.jsx` only shows current metrics and a basic timeline; it lacks a dedicated Digital Twin tab or card showing Baseline vs Current, Changes Since Baseline, Evidence Reasons, and Recommended Farmer Actions.
5. **Backend Digital Twin Endpoint**:
   - `backend/app/routers/analytics.py` only provides farmer aggregates (`/farmer/me`), cooperative stats, and regional heatmap. There is no batch-specific Digital Twin endpoint (`/api/v1/analytics/twin/{batch_id}`).

---

## C. Missing Functionality

1. **Deterministic Digital Twin Derivation Engine**:
   - A single, shared, deterministic derivation engine (implemented in frontend JavaScript for 100% offline functionality, and in backend Python for cloud parity) that consumes an array of ordered observations for a batch and derives:
     - Baseline observation ($O_1$)
     - Latest observation ($O_N$)
     - Metrics delta from baseline ($\Delta\text{pH}$, $\Delta\text{temp}$, $\Delta\Delta T$, $\Delta\text{moisture}$, $\Delta\text{MSSI}$)
     - Metrics delta from previous observation ($O_N - O_{N-1}$)
     - Validated drift rates per day (only when $\Delta t \ge 1$ hour and timestamps are valid)
     - Multi-signal deterioration detector combining thermal, chemical, visual, and MSSI shifts
     - Structured warning levels (`STABLE`, `WATCH`, `EARLY_DETERIORATION`, `HIGH_RISK`)
     - Evidence list (bulleted explanations of why warning was generated)
     - Conservative agronomic farmer recommendation
2. **Rule: Single Observation Is Not A Trend**:
   - Enforce that 1 observation establishes the **Baseline / Current Status** only, and does not trigger false deterioration trend alarms.
   - Require $\ge 2$ observations for change detection, and $\ge 3$ observations before persistent trend language.
3. **Automated Digital Twin Test Suite**:
   - Regression tests verifying: 1 observation behavior, falling MSSI, rising pH, rising temperature, combined multi-signal early deterioration, severe immediate overrides, visual condition worsening, invalid timestamps, offline calculation, and sync reconciliation.

---

## D. Conflicts & Discrepancies

1. **State vs Screening Verdict**:
   - *Conflict*: Previously, trend status strings like `"Watch Shift"` or `"Deteriorating"` were mixed with immediate screening verdicts (`"GOOD"`, `"WATCH"`, `"HIGH RISK"`).
   - *Resolution*: Clearly separate:
     - **Current Screening Verdict**: Immediate safety of latest physical sample (`GOOD` / `WATCH` / `HIGH RISK`).
     - **Digital Twin State**: Longitudinal condition evolution (`STABLE` / `WATCH` / `EARLY_DETERIORATION` / `HIGH_RISK`).
2. **Sync Deduplication vs Observation Accumulation**:
   - *Conflict*: `smoke_test.py` expects replayed sync batches to increment `skipped` rather than duplicate the batch.
   - *Resolution*: Keep batch-level deduplication (`skipped += 1`), but record new unique observations into `BatchObservation` so historical timeline is retained.

---

## E. Recommended Implementation Strategy (Smallest Reasonable Footprint)

1. **Core Trend & Twin Engine (`frontend/services/ai/digitalTwinEngine.js` & `backend/app/services/digital_twin_engine.py`)**:
   - Pure deterministic functions: `deriveDigitalTwin(observations)`.
   - Zero complex frameworks, no ML/neural nets, ~120 lines of readable JavaScript and Python.
2. **Backend API Endpoint**:
   - Expose `GET /api/v1/analytics/twin/{batch_id}` in `backend/app/routers/analytics.py`.
3. **Frontend Integration**:
   - Update `localDb.js` / `localDb.web.js` to expose `getDigitalTwin(batchId)`.
   - Upgrade `HealthStatusCard.jsx` to render current MSSI, trend badges, twin insights, and farmer recommendations.
   - Upgrade `RecordDetailScreen.jsx` to render Baseline vs Current comparison, longitudinal signals, evidence breakdown, and recommendations.
4. **Translations**:
   - Add localized twin strings across all 5 languages (`translations.js`).
5. **Testing**:
   - Add automated test script `scripts/test_digital_twin.py` and unit tests in `backend/tests/test_digital_twin.py`.

---

## F. Validation Requirements Matrix

| Component | Implemented | Automated Tested | Manually Tested | Physical Validation Req. | Scientific Validation Req. |
|---|---|---|---|---|---|
| Baseline Identification ($O_1$) | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ❌ Standard convention |
| Changes from Baseline ($\Delta$) | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ❌ Standard arithmetic |
| Rates per Day ($\Delta/\text{day}$) | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ❌ Standard arithmetic |
| Multi-Signal Deterioration | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ⚠️ Engineering heuristic |
| Offline Local Calculation | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ❌ Pure client logic |
| Cloud Sync Reconciliation | ⏳ Planned | ⏳ Planned | ❌ Pending | ❌ No (Software) | ❌ Backend logic |
| BLE Hardware Telemetry | ✅ Yes | ✅ Yes (Contracts) | ❌ Pending | ✅ Real ESP32 required | ❌ Firmware verified |
| Soil Moisture % Calibration | ✅ Yes | ✅ Yes | ❌ Pending | ✅ Probe inserted in pit | ✅ Lab oven-dry DM req. |
| Optical Spoilage Screening | ✅ Yes | ✅ Yes (ONNX) | ❌ Pending | ✅ Live camera frame | ⚠️ Field trial ongoing |
