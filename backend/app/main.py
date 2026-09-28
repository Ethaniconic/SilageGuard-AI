from __future__ import annotations

from contextlib import asynccontextmanager

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
from app.models import AnalyticsEvent, Batch, Cooperative, RegionalAggregate, SyncLog, User
from app.routers import analytics, auth, device_auth, health, inference, models, qr, sync
from app.utils.jwt import decode_access_token


@asynccontextmanager
async def lifespan(_: FastAPI):
    await ensure_schema()
    yield


async def ensure_schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app = FastAPI(title="SilageGuard AI", version="0.1.0", lifespan=lifespan)


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
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
if has_prometheus:
    Instrumentator().instrument(app).expose(app)


@app.get("/")
async def root():
    return {"message": "SilageGuard AI backend"}


app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(device_auth.router, prefix="/api/v1/auth")
app.include_router(sync.router, prefix="/api/v1/sync")
app.include_router(qr.router, prefix="/api/v1/qr")
app.include_router(analytics.router, prefix="/api/v1/analytics")
app.include_router(models.router, prefix="/api/v1/models")
app.include_router(inference.router, prefix="/api/v1/inference")
app.include_router(health.router, prefix="/api/v1")
# NOTE: "/metrics" at the root is owned by the Prometheus Instrumentator above.
# The application's own health metrics stay available at "/api/v1/metrics"
# via the health router. Distinct operation IDs avoid a duplicate-operation warning.
app.add_api_route("/health", health.health, methods=["GET"], operation_id="root_health")
app.add_api_route("/ready", health.ready, methods=["GET"], operation_id="root_ready")


# NOTE: FastAPI's built-in Swagger UI is intentionally left available at /docs
# and /redoc. It is NOT shadowed by any custom route here.
