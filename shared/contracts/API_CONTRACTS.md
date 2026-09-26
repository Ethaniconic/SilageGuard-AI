# SILAGEGUARD AI V3 — FUTURE BACKEND API SPECIFICATION & CONTRACTS

**Problem Statement:** SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System  
**Organization:** Ministry of Fisheries, Animal Husbandry & Dairying  
**Version:** 3.0 (Screening Round Final)  
**Status:** BACKEND-READY (INTERFACES ONLY — NO SERVER CODE EXECUTED)  

---

## 1. ARCHITECTURAL MANDATE

In strict accordance with the screening round requirements:
- **100% of all screening inference, SQLite storage, voice generation, and QR verification run offline on the Android device.**
- No active backend server is required, spawned, or bundled.
- This document, along with [`dtos.ts`](file:///e:/silageguard-ai/shared/contracts/ts/dtos.ts) and [`dtos.py`](file:///e:/silageguard-ai/shared/contracts/py/dtos.py), defines the exact frozen REST API contracts for future national-scale dairy cooperative federation (e.g., NDDB, AMUL, Nandini) integration in Phase 2.

```
┌────────────────────────────────────────────────────────┐
│             MOBILE CLIENT (SILAGEGUARD AI V3)          │
│  - 100% Offline PyTorch MobileNetV3 + RF Inference    │
│  - SQLite Local Edge Persistence                       │
└───────────────────────────┬────────────────────────────┘
                            │ (Optional Opportunistic Sync)
                            ▼
┌────────────────────────────────────────────────────────┐
│            FUTURE FEDERATED COOPERATIVE CLOUD          │
│             FastAPI / PostgreSQL / Supabase            │
│  • /api/v1/batches      • /api/v1/history              │
│  • /api/v1/calibration  • /api/v1/models               │
└────────────────────────────────────────────────────────┘
```

---

## 2. API ENDPOINTS & SCHEMAS

### 2.1 Batch Ingestion & Telemetry Sync
- **Endpoint:** `POST /api/v1/batches`
- **Description:** Asynchronously syncs an offline-completed batch evaluation record into the regional milk union database.
- **Request Body:** [`BatchUploadDTO`](file:///e:/silageguard-ai/shared/contracts/ts/dtos.ts)
- **Responses:**
  - `201 Created`: Batch accepted and assigned global audit index.
  - `400 Bad Request`: Payload validation error.
  - `409 Conflict`: Batch ID already synced (idempotent deduplication).

#### Example Request
```json
{
  "batch_id": "BATCH-20260926-7A1C",
  "farmer_id": "FARMER-MAH-PUN-0842",
  "crop_type": "CORN_SILAGE",
  "storage_type": "BUNKER_PIT",
  "pit_depth_cm": 40,
  "timestamp": "2026-09-26T14:30:00Z",
  "is_demo": false,
  "telemetry": {
    "probe_id": "SG-PROBE-ESP32-S3-004",
    "firmware_version": "3.0.0-PROD",
    "ph": 3.95,
    "moisture": 64.2,
    "core_temperature": 27.4,
    "ambient_temperature": 25.8,
    "delta_temperature": 1.6,
    "battery_percentage": 94,
    "rssi_dbm": -58,
    "calibration_status": "CALIBRATED",
    "captured_at": "2026-09-26T14:29:45Z"
  },
  "vision": {
    "model_id": "MobileNetV3-Small-INT8",
    "model_version": "3.0.0",
    "image_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "image_quality_passed": true,
    "laplacian_blur_score": 142.5,
    "probabilities": {
      "safe": 0.9412,
      "caution": 0.0451,
      "unsafe": 0.0137
    },
    "predicted_class": "SAFE",
    "inferred_at": "2026-09-26T14:29:50Z"
  },
  "fusion_result": {
    "mssi_score": 91,
    "decision": "SAFE",
    "confidence_tier": "HIGH",
    "calibrated_confidence_score": 93,
    "rule_override_applied": false,
    "rule_override_reason": null,
    "top_explainability_factors": [
      {
        "factor": "Optimal pH Acidity (3.95)",
        "contribution_percent": 34.0,
        "agronomic_rationale": "Strong lactic acid preservation suppresses enterobacteria.",
        "severity": "INFO"
      },
      {
        "factor": "Minimal Heat Rise (+1.6C)",
        "contribution_percent": 22.0,
        "agronomic_rationale": "Anaerobic thermal equilibrium confirmed.",
        "severity": "INFO"
      }
    ],
    "triggered_rules": []
  },
  "advisory": {
    "language": "hi",
    "immediate_action": "यह साइलेज उच्च गुणवत्ता का है और दुधारू पशुओं को खिलाने के लिए पूरी तरह सुरक्षित है।",
    "feeding_recommendation": "दैनिक टीएमआर अनुपात के अनुसार उपयोग करें।",
    "long_term_prevention": "बंकर फेस को सीधा काटें और तिरपाल से ढककर रखें।"
  },
  "qr_certificate_payload": "SG|BATCH-20260926-7A1C|SAFE|91|3.95|64.2|27.4|CORN_SILAGE|2026-09-26T14:30:00Z|v3.0"
}
```

---

### 2.2 Historical Audit Queries
- **Endpoint:** `GET /api/v1/history`
- **Query Parameters:**
  - `farmer_id` (optional string)
  - `decision` (optional `SAFE` | `CAUTION` | `UNSAFE`)
  - `start_date` / `end_date` (ISO dates)
  - `page` / `page_size` (integers)
- **Response:** [`HistoryDTO`](file:///e:/silageguard-ai/shared/contracts/ts/dtos.ts)

---

### 2.3 Model Registry & OTA Manifest
- **Endpoint:** `GET /api/v1/models`
- **Description:** Returns checksums and download metadata for quantized on-device models for future offline OTA model updates.
- **Response Format:**
```json
{
  "active_version": "3.0.0",
  "models": {
    "vision": {
      "architecture": "MobileNetV3-Small",
      "format": "TFLITE_INT8",
      "sha256": "8a3d...",
      "size_bytes": 1640000,
      "classes": ["SAFE", "CAUTION", "UNSAFE"]
    },
    "sensor": {
      "architecture": "RandomForest-25Trees",
      "format": "JSON_TREE_TABLE",
      "sha256": "4c9e...",
      "features": ["ph", "moisture_adc", "core_temp", "ambient_temp", "delta_temp", "ph_dev", "moist_dev", "heat_rise", "storage_type", "crop_type", "depth_bucket"]
    },
    "fusion": {
      "algorithm": "MSSI-v3.0-Calibrated",
      "sensor_weight": 0.55,
      "vision_weight": 0.45
    }
  }
}
```

---

### 2.4 Probe Calibration Synchronization
- **Endpoint:** `POST /api/v1/calibration`
- **Description:** Records laboratory 2-point buffer calibration logs and probe voltage offsets for traceability.
- **Request Body:** [`CalibrationDTO`](file:///e:/silageguard-ai/shared/contracts/ts/dtos.ts)

---

### 2.5 Edge Gateway Health Check
- **Endpoint:** `GET /api/v1/health`
- **Description:** Simple liveness probe for future local fog/co-op edge nodes.
- **Response:** [`HealthDTO`](file:///e:/silageguard-ai/shared/contracts/ts/dtos.ts)
```json
{
  "status": "ONLINE",
  "version": "3.0.0",
  "model_registry": {
    "vision_model_version": "3.0.0",
    "sensor_model_version": "3.0.0",
    "fusion_engine_version": "3.0.0"
  },
  "edge_ready": true,
  "database_ready": true,
  "uptime_seconds": 84210
}
```
