from __future__ import annotations

import time

from fastapi import APIRouter
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.redis_client import get_redis_client

router = APIRouter(tags=["health"])
_START_TIME = time.time()


@router.get("/health")
async def health():
    db_ok = True
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        client = get_redis_client()
        client.get("health:ping")
    except Exception:
        redis_ok = False

    status = "ONLINE" if (db_ok and redis_ok) else ("DEGRADED" if (db_ok or redis_ok) else "OFFLINE")

    return {
        "status": status,
        "ok": db_ok or redis_ok,
        "version": "3.0.0",
        "model_registry": {
            "vision_model_version": "3.0.0",
            "sensor_model_version": "3.0.0",
            "fusion_engine_version": "3.0.0",
        },
        "edge_ready": True,
        "database_ready": db_ok,
        "cache_ready": redis_ok,
        "uptime_seconds": int(time.time() - _START_TIME),
    }


@router.get("/ready")
async def ready():
    db_ok = True
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    cache_ok = True
    try:
        client = get_redis_client()
        client.get("health:ping")
    except Exception:
        cache_ok = False

    if db_ok and cache_ok:
        return {"status": "ready", "database": "connected", "cache": "connected"}
    return {"status": "not_ready", "database": "ok" if db_ok else "failed", "cache": "ok" if cache_ok else "failed"}


@router.get("/metrics")
async def metrics():
    return {
        "uptime_seconds": int(time.time() - _START_TIME),
        "service": "silageguard-ai-backend",
        "status": "healthy",
    }

