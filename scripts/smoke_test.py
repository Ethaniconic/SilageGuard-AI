"""
SILAGEGUARD AI — Integration smoke test

Boots the FastAPI app in-process and exercises the real request paths the
frontend depends on: health, model registry, OTP auth, and batch sync
(including the idempotency the offline queue relies on).

Usage:
    python scripts/smoke_test.py
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"

# Isolate the database so a smoke run never touches backend/silageguard.db
tmp_db = Path(tempfile.gettempdir()) / "silageguard_smoke.db"
if tmp_db.exists():
    tmp_db.unlink()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db.as_posix()}"
os.environ["REDIS_URL"] = "memory://"
os.environ["OTP_PROVIDER"] = "mock"
os.environ["JWT_PRIVATE_KEY_PATH"] = str(BACKEND / "keys" / "private.pem")
os.environ["JWT_PUBLIC_KEY_PATH"] = str(BACKEND / "keys" / "public.pem")

sys.path.insert(0, str(BACKEND))

# Starlette 1.x warns that TestClient is built on the deprecated httpx transport.
# It is a library-internal deprecation, not an issue in our app, and we pin the
# stack deliberately for reproducible runs -- so silence just that category.
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="starlette.*")
warnings.filterwarnings("ignore", message=".*TestClient.*")
warnings.filterwarnings("ignore", message=".*httpx.*")

passed, failed = 0, []


def check(label: str, ok: bool, detail: str = "") -> None:
    global passed
    if ok:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed.append(f"{label}{(' — ' + detail) if detail else ''}")
        print(f"  FAIL  {label}" + (f" — {detail}" if detail else ""))


def main() -> int:
    try:
        from fastapi.testclient import TestClient
    except ImportError:
        print("fastapi.testclient unavailable (needs httpx). Install: pip install httpx", file=sys.stderr)
        return 2

    from app.main import app

    with TestClient(app) as c:
        print("\n1. Health\n---------")
        r = c.get("/api/v1/health")
        check("GET /api/v1/health -> 200", r.status_code == 200, r.text[:120])
        check("health reports ok", r.json().get("status") == "ok", r.text[:120])

        r = c.get("/api/v1/ready")
        check("GET /api/v1/ready -> 200", r.status_code == 200, r.text[:120])

        print("\n2. Model registry (frontend <-> models integration)\n" + "-" * 52)
        r = c.get("/api/v1/models/registry")
        check("GET /api/v1/models/registry -> 200", r.status_code == 200, r.text[:200])
        if r.status_code == 200:
            reg = r.json()
            check("registry has vision family", "vision" in reg, str(list(reg)))
            check("registry has sensor family", "sensor" in reg, str(list(reg)))
            check(
                "vision artefacts discovered from models/",
                len(reg.get("vision", {}).get("artifacts_present", [])) > 0,
                json_preview(reg.get("vision", {}).get("artifacts_present")),
            )
            check(
                "sensor artefact discovered from models/",
                len(reg.get("sensor", {}).get("artifacts_present", [])) > 0,
                json_preview(reg.get("sensor", {}).get("artifacts_present")),
            )

        r = c.get("/api/v1/models/registry/vision")
        check("GET /api/v1/models/registry/vision -> 200", r.status_code == 200, r.text[:120])

        r = c.get("/api/v1/models/registry/vision/ready")
        check("vision readiness probe -> 200", r.status_code == 200, r.text[:120])
        if r.status_code == 200:
            check("vision reports ready", r.json().get("ready") is True, r.text[:120])

        r = c.get("/api/v1/models/registry/sensor/metrics")
        check("GET .../sensor/metrics -> 200", r.status_code == 200, r.text[:120])

        r = c.get("/api/v1/models/registry/bogus")
        check("unknown family -> 404", r.status_code == 404, r.text[:120])

        print("\n3. Auth (OTP flow used by apiClient)\n" + "-" * 40)
        r = c.post("/api/v1/auth/otp/request", json={"phone": "9999999999"})
        check("POST /auth/otp/request -> 200", r.status_code == 200, r.text[:200])
        # The dev/mock provider echoes the OTP in the response.
        otp = r.json().get("otp") if r.status_code == 200 else None
        check("request returns an OTP to verify", bool(otp), r.text[:200])

        r = c.post("/api/v1/auth/otp/verify", json={"phone": "9999999999", "otp": otp or "123456"})
        check("POST /auth/otp/verify -> 200", r.status_code == 200, r.text[:200])
        token = None
        if r.status_code == 200:
            token = r.json().get("access_token")
            check("access_token returned", bool(token), r.text[:200])

        if not token:
            print("\ncannot continue: no token (OTP provider is 'mock' by default)")
            return 1

        auth = {"Authorization": f"Bearer {token}"}

        print("\n4. Sync (offline queue flush)\n" + "-" * 40)
        r = c.get("/api/v1/sync/batches", headers=auth)
        check("GET /sync/batches -> 200", r.status_code == 200, r.text[:200])

        batch = {
            "client_batch_id": "BATCH-SMOKE-001",
            "scanned_at": "2026-09-26T10:00:00Z",
            "storage_type": "BUNKER_PIT",
            "ph": 3.96,
            "moisture_pct": 63.8,
            "temperature_c": 24.8,
            "ambient_temp_c": 23.5,
            "sensor_decision": "SAFE",
            "vision_decision": "SAFE",
            "fused_decision": "SAFE",
            "fused_score": 91.5,
            "qr_token": "SGQR-SMOKE-001",
            "image_count": 1,
            "device_model": "SG-test-SMOKE",
            "app_version": "1.0.0",
        }
        payload = {"device_id": "SG-test-SMOKE", "app_version": "1.0.0", "batches": [batch]}

        r = c.post("/api/v1/sync/batches", json=payload, headers=auth)
        check("POST /sync/batches -> 200", r.status_code == 200, r.text[:200])
        first_inserted = None
        if r.status_code == 200:
            first_inserted = r.json().get("inserted")
            check("first upload inserts the batch", first_inserted == 1, r.text[:200])

        # Replay the same batch: the offline queue retries, so this must dedupe.
        r = c.post("/api/v1/sync/batches", json=payload, headers=auth)
        check("replayed upload -> 200", r.status_code == 200, r.text[:200])
        if r.status_code == 200:
            check(
                "replayed batch is skipped, not duplicated",
                r.json().get("inserted") == 0 and r.json().get("skipped", 0) >= 1,
                r.text[:200],
            )

        r = c.get("/api/v1/sync/batches", headers=auth)
        if r.status_code == 200 and isinstance(r.json(), dict):
            items = r.json().get("items", [])
            ids = [i.get("client_batch_id") for i in items if isinstance(i, dict)]
            check("uploaded batch is listed", batch["client_batch_id"] in ids, str(ids[:5]))
            check("no duplicate rows after replay", ids.count(batch["client_batch_id"]) == 1, str(ids[:5]))

        print("\n5. Analytics + auth guard\n" + "-" * 34)
        r = c.get("/api/v1/analytics/farmer/me", headers=auth)
        check("GET /analytics/farmer/me -> 200", r.status_code == 200, r.text[:200])

        r = c.get("/api/v1/sync/batches")
        check("unauthenticated sync is rejected", r.status_code == 401, f"got {r.status_code}")

    print("\n" + "=" * 60)
    print(f"passed: {passed}   failed: {len(failed)}")
    for f in failed:
        print(f"  - {f}")
    print("=" * 60)
    return 1 if failed else 0


def json_preview(value) -> str:
    text = str(value)
    return text[:80]


if __name__ == "__main__":
    raise SystemExit(main())
