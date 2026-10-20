# SilageGuard AI — Database Architecture & Schema Specification

This document details the persistent data models, local SQLite schema, and cloud database relationships.

---

## 1. Local SQLite Architecture (Client-Side Field Storage)

On mobile devices, data is stored in `silageguard_prod.db` via `expo-sqlite`. On web browsers, the database API is backed by `window.localStorage` through `localDb.web.js`.

### Table: `batches`
Stores persistent batch metadata representing the bunker or pit section.
```sql
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  client_batch_id TEXT UNIQUE NOT NULL,
  crop_type TEXT NOT NULL,
  storage_type TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_batches_client_id ON batches(client_batch_id);
```

### Table: `observations`
Stores individual multimodal inspections (Digital Twin snapshots).
```sql
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  client_batch_id TEXT NOT NULL,
  ph REAL,
  moisture REAL,
  temperature REAL,
  ambient REAL,
  decision TEXT NOT NULL,
  mssi_score INTEGER,
  confidence INTEGER,
  summary TEXT,
  next_step TEXT,
  sync_status TEXT DEFAULT 'SAVED_LOCAL',
  created_at TEXT NOT NULL,
  FOREIGN KEY (client_batch_id) REFERENCES batches(client_batch_id)
);
CREATE INDEX IF NOT EXISTS idx_obs_batch_id ON observations(client_batch_id);
CREATE INDEX IF NOT EXISTS idx_obs_sync ON observations(sync_status);
```

### Table: `sync_queue`
Manages the offline-first retry queue for cloud synchronization.
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  observation_id TEXT UNIQUE NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
```

---

## 2. Sync State Machine

```
   [Offline Inspection Complete]
                 │
                 ▼
        (Status: SAVED_LOCAL)
                 │
                 ▼
      [Enqueued into sync_queue]
                 │
                 ▼
       (Status: PENDING)
                 │
        ┌────────┴────────┐
        ▼                 ▼
 (Network Online)   (Network Offline)
        │                 │
        ▼                 ▼
[POST /sync/batches]  [Wait for Reconnect]
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
(HTTP 200 OK)             (Network Error / 5xx)
   │                             │
   ▼                             ▼
(Status: SYNCED)          (Status: RETRY_PENDING)
                           Backoff: min(2^attempts * 1000ms, 60s)
```
