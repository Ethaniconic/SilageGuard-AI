# SilageGuard AI — Integrated Workspace

Standalone integration of the three previously separate projects:

| Component | Source                                                  | Location here |
| --------- | ------------------------------------------------------- | ------------- |
| Frontend  | Expo / React Native app (repo `mobile/`)                | `frontend/`   |
| Backend   | FastAPI service (auth, sync, QR, analytics)             | `backend/`    |
| Models    | Vision (MobileNetV3) + Sensor (Random Forest) artefacts | `models/`     |
| Contracts | Shared DTOs and API contract                            | `shared/`     |

Nothing in this folder is committed to, or read from, the original repository at
runtime. The originals stay untouched.

## Start here

Full install and run instructions, including the complete dependency list, are in
**[INSTALL.md](./INSTALL.md)**. The short version:

```powershell
# once
.\scripts\setup.ps1

# every run — terminal 1 (backend)
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# every run — terminal 2 (web frontend)
cd frontend
npm run web
```

Check everything still works:

```powershell
.\scripts\verify_all.ps1
```

## Layout

```
SilageGuard-AI-Integrated/
├── frontend/          Expo Router app (the "mobile" app)
│   ├── services/      ← NEW: apiConfig, apiClient, syncBridge, modelRegistry, deviceInfo
│   ├── app/           Screens (processing.tsx also triggers the sync)
│   ├── ai/            On-device inference (unchanged)
│   ├── features/      BLE, fusion, safety rules (unchanged)
│   ├── sqlite/        Offline store (unchanged)
│   └── assets/models/ Bundled model metadata
├── backend/           FastAPI app (as-is + 2 new routers)
│   ├── app/routers/models.py       ← NEW: /api/v1/models/registry
│   └── app/routers/device_auth.py  ← NEW: /api/v1/auth/device
├── models/
│   ├── vision/        MobileNetV3 weights + eval metrics
│   ├── sensor/        Random Forest pipeline + metrics
│   └── docs/          Model card
├── shared/contracts/  API contract (md) + Python/TS DTOs
└── scripts/
    ├── setup.ps1            install everything (idempotent)
    ├── start_backend.ps1
    ├── start_frontend.ps1
    ├── verify_all.ps1       all checks in one command
    ├── verify_integration.py
    ├── smoke_test.py
    └── sync_model_assets.py
```

## Quick start

See [INSTALL.md](./INSTALL.md) for the complete guide. Summary:

```powershell
cd SilageGuard-AI-Integrated
.\scripts\setup.ps1                # once: venv, deps, JWT keys, npm install
```

Then open two terminals from the project root. In terminal 1 run `cd backend`,
activate the venv with `\.venv\Scripts\Activate.ps1`, and start the API with
`python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`. In terminal
2 run `cd frontend` and `npm run web`. The API docs are at
http://localhost:8000/docs and the Expo web app is at http://localhost:8081.

## Pointing the app at the backend

`frontend/services/apiConfig.ts` resolves the base URL in this order:

1. `EXPO_PUBLIC_API_URL` in `frontend/.env`
2. `expo.extra.apiUrl` in `frontend/app.json`
3. Platform default — `http://10.0.2.2:8000` on Android, `http://localhost:8000` elsewhere

| Where the app runs       | Value to use                |
| ------------------------ | --------------------------- |
| iOS simulator            | `http://localhost:8000`     |
| Android emulator         | `http://10.0.2.2:8000`      |
| Physical phone (Expo Go) | `http://<your-LAN-IP>:8000` |

For a device on the same Wi-Fi, start the backend bound to all interfaces and
firewall port 8000, then set the LAN IP in `.env` and restart Expo (env vars are
read at bundle time).

## How the pieces talk

The app is offline-first, so the backend is never in the critical path of a scan:

1. A scan is scored on-device (vision model + sensor model + fusion + safety rules)
   and written to local SQLite.
2. `services/syncBridge.ts` converts those local records into the backend's
   `SyncBatchRequest` shape and POSTs them to `/api/v1/sync/batches`. The
   processing screen fires this off without awaiting it.
3. The backend de-duplicates on `client_batch_id`, so replaying the queue is
   safe — duplicates come back as `skipped`.
4. If the backend is unreachable, the flush returns `{ ok: false }` and the data
   simply stays local. Nothing is lost, and no screen blocks on the network.

**Authentication.** The app has no login screen, and the backend signs RS256
tokens that a client cannot mint. So the app provisions a *device-scoped* token
from `POST /api/v1/auth/device` using the shared `EXPO_PUBLIC_DEVICE_SECRET`,
compared in constant time against `DEVICE_PROVISIONING_SECRET` on the server.
The issued principal is per-device, so it cannot read another device's data.
Setting `DEVICE_PROVISIONING_SECRET` empty disables this and leaves OTP login
as the only path — in which case the app runs local-only until a user logs in.

A 401 triggers one automatic re-provision and retry, so a 15-minute token
expiry never surfaces to the farmer.

## Model integration

Inference stays on-device. The backend only serves the _registry_ so a client or
auditor can confirm which weights are deployed:

```
GET /api/v1/models/registry              # both families + metrics
GET /api/v1/models/registry/vision       # vision only
GET /api/v1/models/registry/sensor/metrics
GET /api/v1/models/registry/vision/ready # readiness probe
```

These read the artefacts and metrics directly from `models/`, so the endpoint
fails loudly if the weights are missing from the bundle rather than silently
reporting a healthy system.

To refresh the metadata bundled into the app after retraining:

```powershell
python scripts/sync_model_assets.py
```

## Verify the integration

```powershell
.\scripts\verify_all.ps1
```

Three checks:

| Check | Covers |
|---|---|
| `verify_integration.py` | Components present, backend imports, every frontend API call matched against the backend's real routes (46) |
| `smoke_test.py` | Live in-process run: health, model registry, device auth, batch upload, replay de-duplication (26) |
| `tsc --noEmit` | Frontend type errors |

The Python checks use a throwaway database and the in-memory Redis stub, so they
never touch `backend/silageguard.db` and need no running services.

## Notes and caveats

- **The backend does not run the models.** Inference stays on-device, as the
  architecture requires. The model endpoints exist to report which weights are
  deployed, not to score images.
- **Metrics files contain `NaN`** in a few ROC fields (normal when a class is
  missing from a test split). Python's `json` reads these but the HTTP layer
  cannot serialise them, so the registry normalises them to `null`.
- **Redis is optional locally.** `REDIS_URL=memory://` runs the backend with no
  Redis server. The same is true of SQLite standing in for PostgreSQL.
- **`EXPO_PUBLIC_DEVICE_SECRET` is not a secret.** Anything prefixed
  `EXPO_PUBLIC_` is inlined into the JS bundle and readable from the APK. Fine
  for a prototype; for production, leave `DEVICE_PROVISIONING_SECRET` empty and
  use per-user OTP.
- **OTP in development.** With the default mock provider, `/auth/otp/request`
  returns the code in its response so you can log in without an SMS gateway.
- `frontend/.env` is read at bundle time. Restart the Expo dev server after
  changing any `EXPO_PUBLIC_*` value.
