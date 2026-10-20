"""
SILAGEGUARD AI — Integration verification

Confirms all system components are present, mutually consistent, and that the
frontend's API client surface matches the backend's real routes.

Usage:
    python scripts/verify_integration.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
MODELS = ROOT / "models"

passed: list[str] = []
failed: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        passed.append(label)
        print(f"  PASS  {label}")
    else:
        failed.append(f"{label}{(' — ' + detail) if detail else ''}")
        print(f"  FAIL  {label}" + (f" — {detail}" if detail else ""))


def section(title: str) -> None:
    print(f"\n{title}\n{'-' * len(title)}")


# ---------------------------------------------------------------------------
section("1. Component presence")

for name, path in [
    ("backend", BACKEND),
    ("frontend", FRONTEND),
    ("models", MODELS),
    ("shared contracts", ROOT / "shared" / "contracts"),
]:
    check(f"{name}/ exists", path.is_dir(), str(path))

for name, rel in [
    ("backend app package", "backend/app"),
    ("FastAPI entrypoint", "backend/app/main.py"),
    ("Expo config", "frontend/app.json"),
    ("package.json", "frontend/package.json"),
    ("shared TS DTOs", "shared/contracts/ts/dtos.ts"),
    ("shared PY DTOs", "shared/contracts/py/dtos.py"),
]:
    check(name, (ROOT / rel).exists(), rel)

for name, rel in [
    ("integration api service", "frontend/services/api.js"),
    ("local database service", "frontend/services/db/localDb.js"),
    ("BLE manager service", "frontend/services/ble/bleManager.js"),
    ("edge inference engine", "frontend/services/ai/edgeInference.js"),
    ("camera image validator", "frontend/services/camera/imageValidator.js"),
    ("models router", "backend/app/routers/models.py"),
]:
    check(name, (ROOT / rel).exists(), rel)

# ---------------------------------------------------------------------------
section("2. Model artefacts")

check("vision ONNX weights", (MODELS / "vision" / "mobilenetv3_silage.onnx").exists())
check("vision metrics json", (MODELS / "vision" / "vision_model_metrics.json").exists())
check("sensor forest json", (MODELS / "sensor" / "sensor_rf_model.json").exists())
check("sensor metrics json", (MODELS / "sensor" / "sensor_model_metrics.json").exists())
check("model card", (MODELS / "docs" / "MODEL_CARD.md").exists())

# ---------------------------------------------------------------------------
section("3. Frontend modules readable")

js_files = sorted((FRONTEND / "services").rglob("*.js"))
check("services/ has JS modules", len(js_files) > 0, "none found")

for path in js_files:
    try:
        text = path.read_text(encoding="utf-8")
        check(f"{path.name} decodes as UTF-8", True)
        stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        stripped = re.sub(r'"(?:\\.|[^"\\])*"', '""', stripped)
        stripped = re.sub(r"'(?:\\.|[^'\\])*'", "''", stripped)
        stripped = re.sub(r"`(?:\\.|[^`\\])*`", "``", stripped, flags=re.S)
        stripped = re.sub(r"//[^\n]*", "", stripped)
        balanced = (
            stripped.count("{") == stripped.count("}")
            and stripped.count("(") == stripped.count(")")
            and stripped.count("[") == stripped.count("]")
        )
        check(f"{path.name} delimiters balanced", balanced)
    except Exception as exc:  # noqa: BLE001
        check(f"{path.name} decodes as UTF-8", False, str(exc))

# ---------------------------------------------------------------------------
section("4. Backend imports")

sys.path.insert(0, str(BACKEND))
try:
    from app.main import app as fastapi_app

    backend_routes: set[str] = set(fastapi_app.openapi().get("paths", {}).keys())
    check("app.main imports", True)
    check("FastAPI app object", fastapi_app is not None)
except Exception as exc:  # noqa: BLE001
    check("app.main imports", False, f"{type(exc).__name__}: {exc}")
    backend_routes = set()

# ---------------------------------------------------------------------------
section("5. Frontend API surface matches backend routes")

client_src = (FRONTEND / "services" / "api.js").read_text(encoding="utf-8")

# Extract endpoints called by client fetch
client_endpoints = re.findall(r'fetch\([`"\'](?:(?:\$\{[^}]+\})?)(/(?:health|api/v1/[^`"\'?]+))', client_src)
for ep in set(client_endpoints):
    # Check if ep or parameterized variant is in backend_routes
    is_served = ep in backend_routes or ep.replace("/health", "/health") in backend_routes or any(ep.startswith(r.split("{")[0]) for r in backend_routes)
    check(f"backend serves {ep}", is_served, f"not found in {sorted(backend_routes)}")

check(f"backend exposes {len(backend_routes)} active routes", len(backend_routes) > 0)

# ---------------------------------------------------------------------------
section("6. Models router mounted")

if backend_routes:
    check("/api/v1/models/registry mounted", "/api/v1/models/registry" in backend_routes)
    check("main.py imports models router", "models" in (BACKEND / "app" / "main.py").read_text(encoding="utf-8"))

# ---------------------------------------------------------------------------
print(f"\n{'=' * 60}")
print(f"passed: {len(passed)}   failed: {len(failed)}")
if failed:
    print("\nFailures:")
    for f in failed:
        print(f"  - {f}")
print("=" * 60)
sys.exit(1 if failed else 0)
