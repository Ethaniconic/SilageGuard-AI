"""
SILAGEGUARD AI — Integration: Model Registry

Exposes the on-device ML artefacts that ship with this workspace
(models/vision + models/sensor) so the mobile client and any auditor can
confirm which weights are deployed, without loading them into memory.

This is metadata-only by design: inference happens on-device, the backend
never runs the models (see shared/contracts/API_CONTRACTS.md).
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(tags=["models"])


def _workspace_root() -> Path:
    # backend/app/routers/models.py -> ../../.. == integration root
    return Path(__file__).resolve().parents[3]


def _models_dir() -> Path:
    import os
    env_dir = os.environ.get("MODELS_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir)
    backend_models = Path(__file__).resolve().parents[2] / "models"
    if backend_models.exists():
        return backend_models
    ws = _workspace_root() / "models"
    if ws.exists():
        return ws
    fallback = Path("/app/models")
    if fallback.exists():
        return fallback
    return backend_models


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _json_safe(value):
    """
    Strip non-JSON float values.

    The training metrics files legitimately contain NaN/Infinity (e.g. roc_auc
    when a class is absent from the test split). Python's json module accepts
    them on read, but they are not valid JSON and make the HTTP response fail
    to serialise, so we normalise them to None.
    """
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


@lru_cache(maxsize=1)
def _registry() -> dict:
    root = _models_dir()
    vision_dir = root / "vision"
    sensor_dir = root / "sensor"

    vision_metrics = _json_safe(_read_json(vision_dir / "vision_model_metrics.json") or {})
    sensor_metrics = _json_safe(_read_json(sensor_dir / "sensor_model_metrics.json") or {})

    vision_artefacts = sorted(
        p.name for p in vision_dir.glob("mobilenetv3_silage.*") if p.is_file()
    )
    sensor_artefacts = sorted(
        p.name for p in sensor_dir.glob("sensor_rf_model.json") if p.is_file()
    )

    return {
        "vision": {
            "name": "mobilenetv3_silage",
            "format": ["onnx", "pytorch"],
            "artifact_dir": str(vision_dir),
            "artifacts_present": vision_artefacts,
            "classes": vision_metrics.get("classes") or vision_metrics.get("labels"),
            "metrics": vision_metrics,
        },
        "sensor": {
            "name": "sensor_rf_model",
            "format": ["json-forest"],
            "artifact_dir": str(sensor_dir),
            "artifacts_present": sensor_artefacts,
            "metrics": sensor_metrics,
        },
        "fusion_engine": {
            "name": "multimodal_fusion_engine",
            "location": "frontend/features/fusion/multimodalFusionEngine.ts",
        },
        "safety_rules": {
            "name": "safety_rule_engine",
            "location": "frontend/features/fusion/safetyRuleEngine.ts",
        },
    }


@router.get("")
@router.get("/")
@router.get("/registry")
async def model_registry():
    """
    Contract & registry endpoint: GET /api/v1/models & GET /api/v1/models/registry
    Returns checksums and metadata for quantized on-device models for offline OTA model updates.
    """
    reg = _registry()
    return {
        "status": "ok",
        "active_version": "3.0.0",
        "vision": reg["vision"],
        "sensor": reg["sensor"],
        "models": {
            "vision": {
                "architecture": "MobileNetV3-Small",
                "format": "ONNX_INT8",
                "classes": reg["vision"].get("classes") or ["SAFE", "CAUTION", "UNSAFE"],
                "artifacts": reg["vision"].get("artifacts_present", []),
            },
            "sensor": {
                "architecture": "RandomForest-25Trees",
                "format": "JSON_TREE_TABLE",
                "features": ["ph", "moisture_adc", "core_temp", "ambient_temp", "delta_temp", "ph_dev", "moist_dev", "heat_rise", "storage_type", "crop_type", "depth_bucket"],
                "artifacts": reg["sensor"].get("artifacts_present", []),
            },
            "fusion": {
                "algorithm": "MSSI-v3.0-Calibrated",
                "sensor_weight": 0.55,
                "vision_weight": 0.45,
            },
        },
        "registry_details": reg,
    }



@router.get("/registry/{family}")
async def model_family(family: str):
    """Single model family: 'vision' or 'sensor'."""
    data = _registry()
    if family not in data:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown model family '{family}'. Expected one of: {sorted(data.keys())}",
        )
    return {family: data[family]}


@router.get("/registry/{family}/metrics")
async def model_metrics(family: str):
    """Only the evaluation metrics for a model family."""
    data = _registry()
    if family not in data:
        raise HTTPException(status_code=404, detail=f"Unknown model family '{family}'")
    return {"family": family, "metrics": data[family].get("metrics", {})}


@router.get("/registry/{family}/ready")
async def model_ready(family: str):
    """Lightweight readiness probe used by the mobile settings screen."""
    data = _registry()
    if family not in data:
        raise HTTPException(status_code=404, detail=f"Unknown model family '{family}'")
    artefacts = data[family].get("artifacts_present") or []
    return {"family": family, "ready": len(artefacts) > 0, "artifact_count": len(artefacts)}


@router.get("/download/sensor")
async def download_sensor_model():
    """Download the trained Random Forest 25-tree model JSON for edge execution."""
    model_path = _models_dir() / "sensor" / "sensor_rf_model.json"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Sensor model not found")
    data = json.loads(model_path.read_text(encoding="utf-8"))
    return JSONResponse(content=data)


@router.get("/download/vision")
async def download_vision_model():
    """Download the trained MobileNetV3 ONNX model for on-device inference."""
    model_path = _models_dir() / "vision" / "mobilenetv3_silage.onnx"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Vision ONNX model not found")
    return FileResponse(
        path=str(model_path),
        filename="mobilenetv3_silage.onnx",
        media_type="application/octet-stream"
    )


@router.get("/download/vision/weights")
async def download_vision_weights():
    """Download the trained MobileNetV3 PyTorch weights."""
    model_path = _models_dir() / "vision" / "mobilenetv3_silage.pth"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Vision weights not found")
    return FileResponse(
        path=str(model_path),
        filename="mobilenetv3_silage.pth",
        media_type="application/octet-stream"
    )


@router.get("/download/vision/metadata")
async def download_vision_metadata():
    """Download vision model metadata and labels."""
    meta_path = _models_dir() / "vision" / "vision_model_metadata.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Vision metadata not found")
    data = json.loads(meta_path.read_text(encoding="utf-8"))
    return JSONResponse(content=data)

