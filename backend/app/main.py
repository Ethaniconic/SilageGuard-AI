from __future__ import annotations

import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    has_prometheus = True
except ImportError:
    has_prometheus = False
from starlette.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.middleware.error_handler import exception_handler
from app.middleware.request_id import request_id_middleware
from app.models import (
    AnalyticsEvent,
    Batch,
    BatchObservation,
    CalibrationRecord,
    Cooperative,
    DeteriorationEvent,
    RegionalAggregate,
    SyncLog,
    User,
)
from app.routers import analytics, auth, contracts, device_auth, health, inference, models, qr, sync
from app.utils.jwt import decode_access_token

logger = logging.getLogger("uvicorn.error")


async def ensure_schema() -> bool:
    """
    Ensures database schema tables exist.
    Retries up to 3 times to allow network interfaces / DNS to settle on Windows startup.
    If the remote database is unreachable or offline, returns False so the backend can
    start in degraded mode without crashing.
    """
    max_retries = 3
    retry_delay_seconds = 2.0

    for attempt in range(1, max_retries + 1):
        try:
            async with asyncio.timeout(6.0):
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
            logger.info("[startup] Database schema verified successfully.")
            return True
        except Exception as exc:
            if attempt < max_retries:
                logger.warning(
                    "[startup] Database connection attempt %d/%d failed: %s. Retrying in %ds...",
                    attempt,
                    max_retries,
                    exc,
                    int(retry_delay_seconds),
                )
                await asyncio.sleep(retry_delay_seconds)
            else:
                logger.warning(
                    "[startup] Database connection failed after %d attempts: %s. "
                    "Starting backend in degraded/offline mode. Background reconnection active.",
                    max_retries,
                    exc,
                )
                return False


async def _background_db_reconnect():
    """Periodically retries database schema verification until database is reachable."""
    delay = 10.0
    while True:
        try:
            await asyncio.sleep(delay)
            async with asyncio.timeout(6.0):
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
            logger.info("[background-db] Database reconnected and schema verified successfully.")
            break
        except asyncio.CancelledError:
            break
        except Exception:
            delay = min(delay * 1.5, 60.0)


@asynccontextmanager
async def lifespan(_: FastAPI):
    db_connected = await ensure_schema()
    reconnect_task = None
    if not db_connected:
        reconnect_task = asyncio.create_task(_background_db_reconnect())

    # Pre-activate MobileNetV3 vision ONNX, PyTorch Grad-CAM, and Sensor RF models on startup
    try:
        from app.routers.inference import _get_onnx_session, _get_pytorch_model, _get_sensor_forest
        _get_onnx_session()
        _get_pytorch_model()
        _get_sensor_forest()
        logger.info("[startup] Vision ONNX, PyTorch Grad-CAM, and Sensor RF models pre-loaded and active.")
    except Exception as exc:
        logger.warning("[startup] Model pre-activation notice: %s", exc)

    try:
        yield
    finally:
        if reconnect_task and not reconnect_task.done():
            reconnect_task.cancel()


app = FastAPI(title="SilageGuard AI", version="3.0.0", lifespan=lifespan)

# Attach request-id middleware for distributed tracing
app.middleware("http")(request_id_middleware)

# Register safe global exception handler
app.add_exception_handler(Exception, exception_handler)


@app.middleware("http")
async def validate_bearer_if_present(request, call_next):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            decode_access_token(auth_header.split(" ", 1)[1])
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGINS == "*" else settings.CORS_ORIGINS.split(","),
    allow_credentials=True if settings.CORS_ORIGINS != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)
if has_prometheus:
    Instrumentator().instrument(app).expose(app)


@app.get("/")
async def root():
    return {"message": "SilageGuard AI backend", "version": "3.0.0", "status": "ONLINE"}


app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(device_auth.router, prefix="/api/v1/auth")
app.include_router(sync.router, prefix="/api/v1/sync")
app.include_router(contracts.router, prefix="/api/v1")
app.include_router(qr.router, prefix="/api/v1/qr")
app.include_router(analytics.router, prefix="/api/v1/analytics")
app.include_router(models.router, prefix="/api/v1/models")
app.include_router(inference.router, prefix="/api/v1/inference")
app.include_router(health.router, prefix="/api/v1")

# Route aliases for root health and contract compatibility
app.add_api_route("/health", health.health, methods=["GET"], operation_id="root_health")
app.add_api_route("/ready", health.ready, methods=["GET"], operation_id="root_ready")

