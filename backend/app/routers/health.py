from __future__ import annotations

from fastapi import APIRouter

from app.redis_client import get_redis_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    try:
        get_redis_client()
        return {"status": "ready"}
    except Exception:
        return {"status": "not_ready"}


@router.get("/metrics")
async def metrics():
    return {"metrics": {"status": "ok"}}
