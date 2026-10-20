# SilageGuard AI — Backend REST API Contracts

This document specifies the canonical endpoints, request/response schemas, status codes, and security policies for the FastAPI backend service.

---

## 1. Global Specifications

- **Base URL**: `http://localhost:8000` (or `http://<host_ip>:8000`)
- **Version**: `3.0.0`
- **Content-Type**: `application/json` (or `multipart/form-data` for file uploads)
- **CORS Support**: `*` with `Access-Control-Allow-Private-Network: true`
- **Authentication**: Bearer JWT token in header `Authorization: Bearer <token>` for protected sync/history routes.

---

## 2. Core Endpoints

### `GET /health`
Returns runtime health status, model registry readiness, and uptime.
- **Auth**: None
- **Response**:
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
    "cache_ready": true,
    "uptime_seconds": 944
  }
  ```

---

### `POST /api/v1/inference/predict`
Executes real multimodal AI inference (Vision ONNX + Sensor Random Forest + PyTorch Grad-CAM).
- **Auth**: None (Field-accessible rapid inference)
- **Request Schema**:
  ```json
  {
    "image_base64": "string (optional base64-encoded JPEG/PNG)",
    "telemetry": {
      "ph": 4.10,
      "moisture": 64.5,
      "temperature": 24.8,
      "ambient": 23.0,
      "crop_type": "Corn Silage",
      "pit_depth_cm": 40
    }
  }
  ```
- **Response Schema**:
  ```json
  {
    "decision": "SAFE",
    "mssi_score": 92,
    "confidence": 95,
    "need_retake": false,
    "modality_state": "MULTIMODAL",
    "vision_result": {
      "prediction": "SAFE",
      "detected_class": "Healthy",
      "confidence": 92,
      "probabilities": {
        "Abnormal_appearance": 0.05,
        "Foreign_object": 0.01,
        "Healthy": 0.92,
        "Mould": 0.01,
        "Spoilage": 0.01
      },
      "mould_risk": 0.0,
      "latency_ms": 42.5
    },
    "sensor_result": {
      "prediction": "SAFE",
      "confidence": 96,
      "probabilities": {
        "safe": 0.96,
        "caution": 0.04,
        "unsafe": 0.00
      },
      "latency_ms": 4.2
    },
    "gradcam_heatmap_b64": "data:image/jpeg;base64,...",
    "hotspot_bbox": null,
    "hotspot_description": "Silage face shows healthy lactic acid fermentation.",
    "total_latency_ms": 46.7,
    "disclaimer": "Rapid AI Screening Tool — Not a laboratory diagnostic device."
  }
  ```

---

### `POST /api/v1/sync/batches`
Idempotently inserts client-side queued observations into the persistent cloud database.
- **Auth**: `Authorization: Bearer <token>`
- **Request Schema**:
  ```json
  {
    "device_id": "SILAGE-MOBILE-01",
    "app_version": "3.0.0",
    "batches": [
      {
        "client_batch_id": "BATCH-2026-X1",
        "scanned_at": "2026-10-18T10:00:00Z",
        "storage_type": "BUNKER_PIT",
        "ph": 4.05,
        "moisture_pct": 63.5,
        "temperature_c": 26.2,
        "ambient_temp_c": 24.5,
        "sensor_decision": "SAFE",
        "vision_decision": "SAFE",
        "fused_decision": "SAFE",
        "fused_score": 0.93,
        "advisory_text": "Safe for feeding.",
        "qr_token": "qr-token-abc",
        "image_count": 1
      }
    ]
  }
  ```
- **Response Schema**:
  ```json
  {
    "inserted": 1,
    "skipped": 0,
    "total": 1,
    "user_id": "usr-uuid"
  }
  ```

---

### `GET /api/v1/models/download/sensor`
Over-the-Air (OTA) download of the latest 25-tree Random Forest JSON definition.
- **Response**: Full `sensor_rf_model.json` payload for client-side edge inference cache updates.
