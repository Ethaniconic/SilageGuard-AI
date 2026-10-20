# SilageGuard AI — Offline Capability Matrix

This matrix establishes the verified architectural boundaries between offline-capable field operations, local durability guarantees, and cloud-dependent services.

---

## 1. Capability Verification Matrix

| System Capability | Genuinely Offline | Backend Required | Local Mechanism | Fallback / Behavior When Network is Cut |
|---|:---:|:---:|---|---|
| **ESP32 BLE Discovery** | **YES** | **NO** | Web Bluetooth GATT / Native BLE | Scans directly over 2.4 GHz radio. 0 internet needed. |
| **Physical Sensor Stream** | **YES** | **NO** | Nordic UART / GATT Notify | Streams 1 Hz JSON telemetry frames directly to phone RAM. |
| **Sensor Validation & Parsing** | **YES** | **NO** | `TelemetryParser` JS | Enforces physical thresholds and duplicate detection locally. |
| **Camera Capture** | **YES** | **NO** | Expo Camera / HTML5 MediaDevices | Captures high-res JPEG directly to device local cache. |
| **Image Quality Assessment** | **YES** | **NO** | `ImageValidator` JS | Computes luminance, darkness, and contrast histograms on-device. |
| **Sensor RF Inference** | **YES** | **NO** | `EdgeInferenceEngine` JS | Executes 25-tree Random Forest natively in JavaScript runtime. |
| **Vision Inference (Full)** | **PARTIAL** | **YES** | ONNX Runtime / FastAPI | Real MobileNetV3 + Grad-CAM runs on FastAPI. If offline, runs optical edge heuristic without crashing. |
| **Grad-CAM Heatmap** | **NO** | **YES** | PyTorch CUDA/CPU Backend | Requires PyTorch backpropagation. Omitted in zero-internet offline fallback mode. |
| **MSSI Multimodal Fusion** | **YES** | **NO** | `EdgeInferenceEngine` JS | Computes unified MSSI score and applies deterministic safety overrides locally. |
| **Save Batch Inspection** | **YES** | **NO** | SQLite / LocalStorage | Atomically commits observation to local database with `SAVED_LOCAL` tag. |
| **Offline Sync Queue** | **YES** | **NO** | SQLite `sync_queue` table | Queues full inspection payload for background synchronization. |
| **Inspection History Audit** | **YES** | **NO** | SQLite `observations` query | Queries local database for past batches and trends. |
| **Digital Twin Degradation** | **YES** | **NO** | SQLite chronological scan | Computes historical trends ($\Delta T$, pH drift) from stored local readings. |
| **Cloud Database Sync** | **NO** | **YES** | FastAPI `POST /api/v1/sync/batches` | Deferred until internet connectivity is restored; retried with exponential backoff. |
| **QR Code Verification** | **YES** | **NO** | Local SVG / Canvas renderer | Generates cryptographically verifiable QR payload offline for immediate field handoff. |
| **Model OTA Download** | **NO** | **YES** | FastAPI `/models/download/*` | Periodic check when online to refresh local Random Forest weights. |

---

## 2. Verification Protocol for Field Offline Operation

To physically verify the offline workflow:
1. Enable **Airplane Mode** on the mobile device or disconnect Wi-Fi/Ethernet.
2. Launch the SilageGuard AI app.
3. Observe that local database records, historical observations, and settings load instantly from local storage.
4. Connect the physical ESP32 probe over BLE — telemetry stream will arrive and display real-time physical readings.
5. Capture a silage face photograph — Image Quality Assessment evaluates the photo locally.
6. Trigger analysis — On-device `EdgeInferenceEngine` computes the 25-tree Random Forest output and MSSI score without network requests.
7. Confirm the inspection record is saved to local SQLite with status `SAVED_LOCAL` and added to `sync_queue`.
8. Re-enable network connectivity — Background sync engine flushes the queue to FastAPI `POST /api/v1/sync/batches` and transitions the record to `SYNCED`.
