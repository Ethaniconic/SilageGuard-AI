# SILAGEGUARD AI — Install & Run Guide

Everything needed to run the integrated app, in one place. No prior setup assumed.

---

## 1. What you must install (the short list)

| #   | Requirement                                         | Version                                 | Why                                              | Link                                 |
| --- | --------------------------------------------------- | --------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| 1   | **Node.js**                                         | **18 LTS or newer** (20/22 recommended) | Runs the Expo bundler and Metro for the frontend | https://nodejs.org                   |
| 2   | **npm**                                             | ships with Node                         | Installs frontend packages                       | bundled                              |
| 3   | **Python**                                          | **3.11 – 3.14**                         | Runs the FastAPI backend                         | https://python.org                   |
| 4   | **Expo Go** _(only for a physical phone)_           | latest                                  | Loads the app on a real device                   | App Store / Play Store               |
| 5   | **Android Studio** _(only for an Android emulator)_ | any                                     | Provides the emulator + adb                      | https://developer.android.com/studio |
| 6   | **Xcode** _(macOS only, for an iOS simulator)_      | 15+                                     | iOS simulator                                    | App Store                            |

That is the complete list. **No Redis, no PostgreSQL, no Docker, no PyTorch**
are needed — `REDIS_URL=memory://` and SQLite are pre-configured, and the
vision model runs through `onnxruntime` (CPU) rather than PyTorch.

`scripts/setup.ps1` installs every Python and Node package for you, so you
never run `pip install` or `npm install` by hand.

### Optional

| Tool           | When you need it                                                                  |
| -------------- | --------------------------------------------------------------------------------- |
| Redis          | Only if you switch `REDIS_URL` off `memory://` (single-node OTP/rate-limit store) |
| PostgreSQL     | Only for a real deployment (`DATABASE_URL=postgresql+asyncpg://…`)                |
| Docker Desktop | Only if you prefer `docker compose up` instead of the scripts                     |
| Git            | Only if you want version control in this folder                                   |

### During Node/Python installation, tick these boxes

- Python → **"Add python.exe to PATH"** _(the single most common cause of failure)_
- Node.js → the installer adds it to PATH automatically; if `node --version`
  fails afterwards, reopen the terminal

---

## 2. Install everything (one command)

```powershell
cd "C:\Users\kanch\OneDrive\Desktop\SilageGuard-AI-Integrated"
.\scripts\setup.ps1
```

This script is idempotent — re-run it any time; it skips what is already done.
It will:

1. check Node ≥ 18 and Python, with clear errors if either is missing
2. create `backend/.venv` and install the 21 packages in `requirements.txt`
3. install `httpx` (smoke test) and `onnxruntime` + `numpy` + `pillow` (model runtime)
4. generate `backend/keys/private.pem` + `public.pem` for JWT signing
5. run `npm install` in `frontend/`
6. create `frontend/.env` from the example and match the device secret
7. sync model metadata into `frontend/assets/models/`
8. run the model + integration verification

Typical first run: **3–6 minutes** (dominated by `npm install` and the
~200 MB `onnxruntime` download). Subsequent runs finish in seconds.

**If Python is installed but not on PATH**, point the script at it:

```powershell
.\scripts\setup.ps1 -PythonExe "C:\Python314\python.exe"
```

To wipe the venv and rebuild from scratch:

```powershell
.\scripts\setup.ps1 -Force
```

### What "install everything" resolves to

**Backend** (`backend/requirements.txt`, into `.venv`):

```
fastapi 0.141.1          uvicorn[standard] 0.54.0    sqlalchemy[asyncio] 2.1.1
aiosqlite 0.22.1         asyncpg 0.31.0              alembic 1.20.0
pydantic 2.13.5          pydantic-settings 2.15.0    python-jose[cryptography] 3.5.0
passlib[bcrypt] 1.7.4    bcrypt 5.0.0                 python-multipart 0.0.32
redis 5.3.1              arq 0.28.0                  slowapi 0.1.10
httpx 0.28.1             sentry-sdk[fastapi] 2.70.0   prometheus-fastapi-instrumentator 8.1.0
python-dotenv 1.2.3      pytest 9.1.1                 pytest-asyncio 1.4.0
```

`httpx` is required by the smoke test; everything else comes from the original
backend's lockfile, unchanged.

Plus, added by `setup.ps1` because they are needed to actually *run* and
*verify* the models rather than merely serve them:

| Package       | Why                                                    |
| ------------- | ------------------------------------------------------ |
| `onnxruntime` | Executes `models/vision/mobilenetv3_silage.onnx` on CPU |
| `numpy`       | Tensor input/output for the ONNX session                |
| `pillow`      | Image loading for offline model evaluation              |
| `httpx`       | Required by the smoke test's in-process client          |

**Frontend** (`frontend/package.json`, 22 runtime + 3 dev):

| Area           | Packages                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | `expo 57.0.25`, `react 19.2.3`, `react-dom 19.2.3`, `react-native 0.86.3`                                                                           |
| Routing        | `expo-router ~57.0.23`                                                                                                                              |
| Native modules | `expo-camera`, `expo-sqlite`, `expo-haptics`, `expo-speech`, `expo-image-picker`, `expo-asset`, `expo-constants`, `expo-linking`, `expo-status-bar` |
| UI             | `@expo/vector-icons`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-web`                              |
| State / data   | `zustand`, `@tanstack/react-query`                                                                                                                  |
| Dev            | `typescript ~5.9.3`, `@types/react`, `@babel/core`                                                                                                  |

**Models** — nothing to install. The weights ship in the repo:

| Model                      | File                                                                 | Runtime                             | Used by                          |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------- | -------------------------------- |
| Vision (MobileNetV3-Small) | `models/vision/mobilenetv3_silage.onnx` (12 MB, NCHW `1×3×224×224`, 3 classes) | `onnxruntime` CPU / on-device JS    | `frontend/ai/visionInference.ts` |
| Sensor (Random Forest)     | `models/sensor/sensor_rf_model.json` (101 KB, 20 trees, 11 features) | plain JSON, interpreted in TypeScript | `frontend/ai/sensorInference.ts` |
| Fusion                     | `frontend/features/fusion/multimodalFusionEngine.ts`                 | —                                   | combines both                    |
| Safety rules               | `frontend/features/fusion/safetyRuleEngine.ts`                     | pH/temperature overrides         |

The sensor forest needs **no** ML library — it is a JSON dump of the tree
structure, walked directly by the app. The vision model runs through
`onnxruntime` on the server for testing, and inside the app on-device.

`models/vision/requirements.txt` and `models/sensor/requirements.txt` list the
heavier training stack (PyTorch, torchvision, albumentations, OpenCV,
scikit-learn, pandas, SciPy). **You do not need these** unless you retrain.
Only run `python scripts/sync_model_assets.py` after retraining, to refresh the
bundled metadata.

---

## 3. Run it

Run the one-time setup above first. Then open two PowerShell terminals from the
integrated project folder.

### Terminal 1 — backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Listens on <http://localhost:8000> · Swagger at <http://localhost:8000/docs>

### Terminal 2 — frontend

```powershell
cd frontend
npm run web
```

Use `npm start` for Expo's platform menu, `npm run android` for an Android
emulator, or `npm run ios` for the iOS simulator.

### Choosing the right API URL

This is the setting people trip over. The emulator cannot see your `localhost`.

| Running the app on | Command                                                          |
| ------------------ | ---------------------------------------------------------------- |
| iOS simulator      | `npm run ios` _(default URL is correct)_                            |
| Web browser        | `npm run web`                                                       |
| Android emulator   | `$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000"; npm run android` |
| Physical phone     | Set `EXPO_PUBLIC_API_URL` to `http://<YOUR-LAN-IP>:8000`, then `npm start` |

For a physical device, also:

1. start the backend so it is reachable off-box — the script already binds
   `0.0.0.0`, so just allow port 8000 through Windows Firewall when prompted
2. get your IP with `ipconfig` (the IPv4 address on your Wi-Fi adapter)
3. keep the phone and PC on the same Wi-Fi

> `EXPO_PUBLIC_*` values are inlined into the JavaScript bundle at build time.
> Changing the URL requires **restarting** the Expo dev server — a running
> server will not pick it up.

---

## 4. Verify it works

```powershell
.\scripts\verify_all.ps1
```

Runs four checks and prints a summary:

| Check                | What it proves                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `verify_integration` | All components present; backend imports; **every frontend API call matches a real backend route** (46 assertions)           |
| `verify_models`      | The ONNX model loads and returns a valid 3-class softmax; the sensor forest predicts SAFE for good silage and UNSAFE for spoiled (23 assertions) |
| `smoke_test`         | Boots the app in-process: health, model registry, device auth, batch upload, and **replay de-duplication** (26 assertions)  |
| `tsc`                | No TypeScript errors in the frontend                                                                                       |

The Python checks use a throwaway database and the in-memory Redis stub, so
they never touch your data and need no running services. **95 assertions total.**

### Confirm sync really works, by hand

With the backend running:

```powershell
# 1. health
curl http://localhost:8000/api/v1/health

# 2. model registry — should list the real .onnx / .json artefacts
curl http://localhost:8000/api/v1/models/registry

# 3. device auth
curl -X POST http://localhost:8000/api/v1/auth/device `
  -H "Content-Type: application/json" `
  -d '{"device_id":"SG-TEST-001","secret":"sg-dev-device-secret-change-me"}'
```

Paste the returned `access_token`, then upload a batch twice and confirm the
second call reports `inserted:0, skipped:1` — that is the de-duplication the
offline queue depends on.

---

## 5. Troubleshooting

| Symptom                            | Cause                                                | Fix                                                                        |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `'node' is not recognized`         | Node installed, not on PATH                          | Reopen the terminal; or `set PATH=C:\Program Files\nodejs;%PATH%`          |
| `'python' is not recognized`       | Python installed without the PATH option             | Reinstall and tick "Add python.exe to PATH", or use `setup.ps1 -PythonExe` |
| `ECONNREFUSED` on sync             | Wrong host for your target                           | Android emulator → `10.0.2.2`; phone → LAN IP                              |
| App cannot reach backend on device | Firewall blocking 8000                               | Allow the port; keep both on the same Wi-Fi                                |
| `503` from `/auth/device`          | `DEVICE_PROVISIONING_SECRET` empty in `backend/.env` | Set it, and match `EXPO_PUBLIC_DEVICE_SECRET` in `frontend/.env`           |
| `401` immediately on sync          | Secrets mismatched                                   | Both files must hold the identical string                                  |
| Sync never happens                 | No login screen exists by design                     | Expected without a device secret; set both secrets, restart Expo           |
| Metro cache errors after edits     | Stale cache                                          | `npx expo start --clear`                                                   |
| Port 8000 already in use           | Previous run still alive                             | `Get-NetTCPConnection -LocalPort 8000` then stop that PID                  |
| `ModuleNotFoundError: onnxruntime` | ML runtime not installed in that Python env         | `.\scripts\setup.ps1` (or `.\.venv\Scripts\pip install -r requirements-models.txt`) |
| `RuntimeError` in `verify_models`  | Model input shape assertion mismatch                 | Already fixed in the integrated copy; re-pull only if you edited models    |
| `onxx` / `Failed to load model`     | Truncated or wrong `.onnx` artefact                  | `python scripts\verify_models.py` re-downloads nothing; re-copy from models |

---

## 6. Environment variables

**`backend/.env`**

| Variable                     | Local value                            | Notes                                                  |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`               | `sqlite+aiosqlite:///./silageguard.db` | file DB, no server needed                              |
| `REDIS_URL`                  | `memory://`                            | no Redis needed locally                                |
| `OTP_PROVIDER`               | `mock`                                 | OTP is returned in the response instead of sent by SMS |
| `JWT_*_KEY_PATH`             | `./keys/*.pem`                         | generated by `setup.ps1`                               |
| `DEVICE_PROVISIONING_SECRET` | dev value                              | empty disables `/auth/device`                          |
| `CORS_ORIGINS`               | `*`                                    | tighten before deploying                               |

**`frontend/.env`**

| Variable                     | Local value             | Notes                         |
| ---------------------------- | ----------------------- | ----------------------------- |
| `EXPO_PUBLIC_API_URL`        | `http://localhost:8000` | no trailing slash             |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `15000`                 | request timeout               |
| `EXPO_PUBLIC_DEVICE_SECRET`  | dev value               | must match the backend secret |

> `EXPO_PUBLIC_*` values are **shipped inside the app bundle** and are readable
> by anyone with the APK. That is acceptable for a shared device secret on a
> prototype; for production, front the backend with per-user OTP auth and leave
> `DEVICE_PROVISIONING_SECRET` empty.

---

## 7. Original project untouched

This workspace is a **copy**. The source folders were never written to:

```
SilageGuard-AI/                    ← original repo (frontend + models)
silageguard-backend/               ← original backend
silageguard-backend-integration/   ← pre-existing integration copy
SilageGuard-AI-Integrated/         ← this integration (new)
```

Verified by SHA-256 hashing all three source trees before and after — identical.
