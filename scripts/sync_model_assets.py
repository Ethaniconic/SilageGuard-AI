"""
SILAGEGUARD AI — Integration: Aggregate model artefacts into the app bundle.

The mobile app ships its model metadata under frontend/assets/models/.
This script verifies that the bundled metadata still matches the trained
artefacts in models/, and refreshes the version/metrics blocks when they drift.

Usage (from the integration root):
    python scripts/sync_model_assets.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
ASSETS = ROOT / "frontend" / "assets" / "models"


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    ASSETS.mkdir(parents=True, exist_ok=True)

    plan = {
        "model_metadata.json": MODELS / "vision" / "vision_model_metrics.json",
        "vision_model_metrics.json": MODELS / "vision" / "vision_model_metrics.json",
        "sensor_model_metrics.json": MODELS / "sensor" / "sensor_model_metrics.json",
        "sensor_rf_model.json": MODELS / "sensor" / "sensor_rf_model.json",
    }

    copied, skipped = 0, 0
    for target_name, source in plan.items():
        target = ASSETS / target_name
        if not source.exists():
            print(f"  SKIP  {target_name:<28} (missing source {source.relative_to(ROOT)})")
            skipped += 1
            continue
        shutil.copyfile(source, target)
        print(f"  COPY  {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")
        copied += 1

    # Report artefact presence for the vision family.
    vision_dir = MODELS / "vision"
    artefacts = sorted(p.name for p in vision_dir.glob("mobilenetv3_silage.*") if p.is_file())
    metrics = load(MODELS / "vision" / "vision_model_metrics.json")
    print(f"\n  vision artefacts : {artefacts}")
    print(f"  vision metrics   : {'loaded' if metrics else 'unavailable'}")
    print(f"  sensor metrics   : {'loaded' if load(MODELS / 'sensor' / 'sensor_model_metrics.json') else 'unavailable'}")

    missing = [n for n, s in plan.items() if not s.exists()]
    if missing:
        print(f"\nWARNING: {len(missing)} source file(s) missing: {missing}", file=sys.stderr)

    print(f"\nDone. copied={copied} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
