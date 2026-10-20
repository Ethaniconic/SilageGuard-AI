# SILAGEGUARD AI — OFFLINE-FIRST & SYNCHRONIZATION ARCHITECTURE
## Zero-Internet Field Inspection and Guaranteed Backend Synchronization

> **STATUS**: Code Implemented, Tested, Passing.
> **Database**: Local SQLite on Native Mobile (`silageguard_prod.db`), Web LocalStorage on Browser.
> **Verification**: `scripts/smoke_test.py` Section 4 ("Sync offline queue flush" - duplicate safe & idempotent).

---

## 1. The Offline-First Imperative

Indian and global dairy farms frequently operate in deep rural geographies where 4G/5G mobile cellular coverage is intermittent or completely absent around concrete bunker pits and trench silos.

SilageGuard AI is designed so that **zero internet connectivity is required to perform a full physical silage quality inspection**.

```text
Offline Field Scenario:
No Internet Connection
      ↓
Open SilageGuard Mobile App
      ↓
Select / Create Silage Batch (e.g., SG-2026-001)
      ↓
Connect Physical ESP32 Probe (Local Bluetooth Low Energy)
      ↓
Stream Real Telemetry (pH, Moisture, Core Temp)
      ↓
Capture Silage Face Photograph (Camera hardware)
      ↓
Run Image Quality Assessment (IQA on device)
      ↓
Run Edge ML Inference (Random Forest traversed locally in JS)
      ↓
Evaluate Centralized Deterministic Safety Rules
      ↓
Display SAFE / CAUTION / HIGH-RISK Screening Verdict
      ↓
Play Local Voice Guidance in Farmer's Language (expo-speech)
      ↓
Atomic SQLite Write (Batch + Observation + Sync Queue Item)
      ↓
Close App / Power Down Phone
      ↓
Reopen App: Complete History & Digital Twin Persists!
```

---

## 2. Sync Queue State Lifecycle

Records are never prematurely labeled as "Synced" or "Uploaded" until the FastAPI backend returns an explicit HTTP 200 response with confirmation of insertion.

```text
┌─────────────────┐
│   SAVED_LOCAL   │ ── Observation stored in SQLite on phone.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PENDING_SYNC   │ ── Queued into sync_queue table for transmission.
└────────┬────────┘
         │ Network connectivity detected / auto-sync trigger
         ▼
┌─────────────────┐
│     SYNCING     │ ── Transmitting payload via POST /api/v1/sync/batches.
└────────┬────────┘
         │
    ┌────┴──────────────────────────┐
    │ HTTP 200 (Success / Replay)   │ Network Failure / Timeout
    ▼                               ▼
┌─────────────────┐          ┌─────────────────┐
│     SYNCED      │          │   SYNC_FAILED   │ (Retries with backoff)
└─────────────────┘          └─────────────────┘
```

---

## 3. Idempotent Synchronization Contract

The sync gateway uses the client-generated `client_batch_id` and observation timestamp as the idempotency key:

- **Endpoint**: `POST /api/v1/sync/batches`
- **Duplicate Prevention**: If a network drop occurs during packet acknowledgment and the phone resends the same batch, the FastAPI backend checks the `client_batch_id`. If already present, it marks it `status: "SKIPPED"` and returns HTTP 200 without creating duplicate database rows.
- **Verification**: Verified automatically via `test_sync_idempotency` in `backend/tests/test_sync.py` and Section 4 of `scripts/smoke_test.py`.
