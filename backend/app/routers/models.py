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

router = APIRouter(tags=["models"])


def _workspace_root() -> Path:
    # backend/app/routers/models.py -> ../../.. == integration root
    return Path(__file__).resolve().parents[3]


def _models_dir() -> Path:
    return _workspace_root() / "models"


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


@router.get("/registry")
async def model_registry():
    """Full registry: both model families, their artefacts and metrics."""
    return _registry()


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
