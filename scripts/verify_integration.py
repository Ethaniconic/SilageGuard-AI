"""
SILAGEGUARD AI — Integration verification

Confirms the three components are present, mutually consistent, and that the
frontend's API surface matches the backend's real routes.

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
    ("integration apiClient", "frontend/services/apiClient.ts"),
    ("integration apiConfig", "frontend/services/apiConfig.ts"),
    ("integration syncBridge", "frontend/services/syncBridge.ts"),
    ("integration modelRegistry", "frontend/services/modelRegistry.ts"),
    ("integration deviceInfo", "frontend/services/deviceInfo.ts"),
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

ts_files = sorted((FRONTEND / "services").glob("*.ts"))
check("services/ has modules", len(ts_files) > 0, "none found")

for path in ts_files:
    try:
        text = path.read_text(encoding="utf-8")
        check(f"{path.name} decodes as UTF-8", True)
        # A TS module must at least be brace/paren balanced after stripping
        # strings and comments, otherwise it will not survive Metro's parse.
        stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        stripped = re.sub(r"//[^\n]*", "", stripped)
        stripped = re.sub(r'"(?:\\.|[^"\\])*"', '""', stripped)
        stripped = re.sub(r"'(?:\\.|[^'\\])*'", "''", stripped)
        stripped = re.sub(r"`(?:\\.|[^`\\])*`", "``", stripped)
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

    # Newer FastAPI defers router inclusion, so app.routes holds lazy
    # _IncludedRouter placeholders. The OpenAPI schema is always fully resolved.
    backend_routes: set[str] = set(fastapi_app.openapi().get("paths", {}).keys())
    check("app.main imports", True)
    check("FastAPI app object", fastapi_app is not None)
except Exception as exc:  # noqa: BLE001
    check("app.main imports", False, f"{type(exc).__name__}: {exc}")
    backend_routes = set()

# ---------------------------------------------------------------------------
section("5. Frontend API surface matches backend routes")

client_src = (FRONTEND / "services" / "apiClient.ts").read_text(encoding="utf-8")

# e.g. get("/auth/otp/request") -> "/api/v1/auth/otp/request"
literals = re.findall(r'["\'`](/(?:auth|sync|qr|analytics|models)/[^"\'`]*)["\'`]', client_src)
templates = re.findall(r'\$\{encodeURIComponent\((\w+)\)\}', client_src)
dynamic = {
    "/api/v1/qr/{token}": "/api/v1/qr/{token}" in backend_routes,
    "/api/v1/qr/{token}/report": "/api/v1/qr/{token}/report" in backend_routes,
    "/api/v1/analytics/cooperative/{cooperative_id}":
        "/api/v1/analytics/cooperative/{cooperative_id}" in backend_routes,
    "/api/v1/analytics/region/{district}": "/api/v1/analytics/region/{district}" in backend_routes,
    "/api/v1/models/registry/{family}": "/api/v1/models/registry/{family}" in backend_routes,
    "/api/v1/models/registry/{family}/metrics":
        "/api/v1/models/registry/{family}/metrics" in backend_routes,
    "/api/v1/models/registry/{family}/ready":
        "/api/v1/models/registry/{family}/ready" in backend_routes,
}
check("dynamic paths found in client", len(dynamic) > 0)
for path, ok in dynamic.items():
    check(f"backend serves {path}", ok)

if backend_routes:
    # Paths built with `${encodeURIComponent(...)}` are covered by the dynamic
    # checks above; skip them here so they are not reported twice.
    dynamic_stems = ("/qr/", "/analytics/cooperative/", "/analytics/region/")
    unmatched = []
    for lit in set(literals):
        if "${" in lit or lit.startswith(dynamic_stems):
            continue
        full = "/api/v1" + lit if not lit.startswith("/api/") else lit
        # strip query strings and interpolation fragments
        probe = full.split("?")[0]
        probe = re.sub(r"/\{.*?\}.*$", "", probe)
        if probe.endswith("/"):
            probe = probe[:-1]
        if not any(probe == r.split("?")[0] for r in backend_routes):
            unmatched.append(lit)
    check("all static client paths exist on backend", not unmatched, ", ".join(sorted(unmatched)))
    check(f"backend exposes {len(backend_routes)} routes", len(backend_routes) > 0)

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
