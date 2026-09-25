"""
SilageGuard AI — Dataset Verification (src/verify_datasets.py)
SIH26111 | Phase 2

Run BEFORE any training:
    python src/verify_datasets.py

Exit code 0 = all OK, exit code 1 = one or more datasets missing/invalid.
The pipeline (train_sensor.py, train_vision.py) calls verify() at startup
and will refuse to train if this check fails.
"""

import os
import sys
import json
from pathlib import Path

# Make sure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# ── Constants ─────────────────────────────────────────────────────────────────
VISION_CLASSES = ["safe", "caution", "unsafe"]

EXPECTED_DATASETS = {
    "MobileMold": {
        "path": "data/raw/mobilemold",
        "type": "image_folder",
        "min_images": 100,     # relaxed: real dataset has 4 941
        "description": "Food mould detection — fungal texture recognition",
    },
    "PlantVillage": {
        "path": "data/raw/plantvillage",
        "type": "image_folder",
        "min_images": 100,     # relaxed: real dataset has 54 303
        "description": "Plant disease textures — generalises to organic spoilage",
    },
    "FBSI": {
        "path": "data/raw/fbsi",
        "type": "image_folder",
        "min_images": 50,      # relaxed: real dataset has 1 511
        "description": "Feed Bunk Score Images — direct silage surface relevance",
    },
    "BDHusk": {
        "path": "data/raw/bdhusk",
        "type": "image_folder",
        "min_images": 50,      # relaxed: real dataset has 2 400
        "description": "Cattle-feed husk classification — feed texture variety",
    },
    "ProcessedVision": {
        "path": "data/processed/vision",
        "type": "image_folder",
        "expected_classes": VISION_CLASSES,
        "min_images": 10,      # minimum per class for sanity check
        "description": "Aggregated & labelled vision dataset for training",
    },
    "SensorCSV": {
        "path": "data/raw/sensor_data.csv",
        "type": "csv",
        "required_columns": ["ph", "moisture_pct", "temperature_c", "ambient_temp_c", "label"],
        "required_labels": VISION_CLASSES,
        "min_rows": 100,
        "description": "Sensor readings labelled safe/caution/unsafe",
    },
}


# ── Verifiers ─────────────────────────────────────────────────────────────────

def _count_images(directory: str) -> dict:
    """Return {class_name: image_count} for a folder tree."""
    counts = {}
    if not os.path.isdir(directory):
        return counts
    for entry in sorted(os.listdir(directory)):
        full = os.path.join(directory, entry)
        if os.path.isdir(full):
            imgs = [
                f for f in os.listdir(full)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
            ]
            counts[entry] = len(imgs)
    # Also count flat images directly inside the directory
    flat = [
        f for f in os.listdir(directory)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
    ]
    if flat:
        counts["_flat"] = len(flat)
    return counts


def verify_image_dataset(name: str, spec: dict) -> dict:
    path = spec["path"]
    result = {
        "name": name,
        "path": path,
        "description": spec.get("description", ""),
        "status": "UNKNOWN",
        "issues": [],
    }

    if not os.path.exists(path):
        result["status"] = "MISSING"
        result["issues"].append(f"Path not found: {path}")
        return result

    class_counts = _count_images(path)
    total = sum(class_counts.values())
    result["classes"] = class_counts
    result["total_images"] = total

    # Check minimum total
    min_imgs = spec.get("min_images", 10)
    if total < min_imgs:
        result["status"] = "INSUFFICIENT"
        result["issues"].append(
            f"Only {total} images found (minimum {min_imgs})"
        )
        return result

    # Check expected classes if specified
    expected_cls = spec.get("expected_classes")
    if expected_cls:
        missing_cls = [c for c in expected_cls if c not in class_counts]
        if missing_cls:
            result["status"] = "MISSING_CLASSES"
            result["issues"].append(f"Missing class directories: {missing_cls}")
            return result

        # Per-class minimum (at least 10 images each)
        per_cls_min = spec.get("min_images", 10)
        for cls in expected_cls:
            if class_counts.get(cls, 0) < per_cls_min:
                result["issues"].append(
                    f"Class '{cls}' has only {class_counts.get(cls, 0)} images "
                    f"(need {per_cls_min})"
                )
        if result["issues"]:
            result["status"] = "INSUFFICIENT_PER_CLASS"
            return result

    result["status"] = "OK"
    return result


def verify_csv_dataset(name: str, spec: dict) -> dict:
    path = spec["path"]
    result = {
        "name": name,
        "path": path,
        "description": spec.get("description", ""),
        "status": "UNKNOWN",
        "issues": [],
    }

    if not os.path.exists(path):
        result["status"] = "MISSING"
        result["issues"].append(f"File not found: {path}")
        return result

    try:
        import pandas as pd
        df = pd.read_csv(path)
    except Exception as exc:
        result["status"] = "ERROR"
        result["issues"].append(f"Cannot read CSV: {exc}")
        return result

    result["rows"] = len(df)
    result["columns"] = list(df.columns)

    # Required columns
    req_cols = spec.get("required_columns", [])
    missing_cols = [c for c in req_cols if c not in df.columns]
    if missing_cols:
        result["status"] = "MISSING_COLUMNS"
        result["issues"].append(f"Missing columns: {missing_cols}")
        return result

    # Minimum rows
    min_rows = spec.get("min_rows", 10)
    if len(df) < min_rows:
        result["status"] = "INSUFFICIENT"
        result["issues"].append(f"Only {len(df)} rows (need {min_rows})")
        return result

    # Label distribution
    if "label" in df.columns:
        label_counts = df["label"].value_counts().to_dict()
        result["label_distribution"] = label_counts

        req_labels = spec.get("required_labels", [])
        missing_labels = [l for l in req_labels if l not in label_counts]
        if missing_labels:
            result["status"] = "MISSING_LABELS"
            result["issues"].append(f"Missing label classes: {missing_labels}")
            return result

    result["status"] = "OK"
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def verify(halt_on_fail: bool = False) -> dict:
    """
    Run full dataset verification.

    Returns a dict with keys:
        all_ok  (bool)
        datasets (list of result dicts)

    If halt_on_fail=True, raises SystemExit(1) when any dataset fails.
    """
    results = []

    for name, spec in EXPECTED_DATASETS.items():
        if spec["type"] == "image_folder":
            r = verify_image_dataset(name, spec)
        elif spec["type"] == "csv":
            r = verify_csv_dataset(name, spec)
        else:
            r = {"name": name, "status": "UNKNOWN", "issues": [f"Unknown type: {spec['type']}"]}
        results.append(r)

    all_ok = all(r["status"] == "OK" for r in results)

    report = {"all_ok": all_ok, "datasets": results}

    # Persist verification log
    os.makedirs("data", exist_ok=True)
    with open("data/dataset_info.json", "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    if halt_on_fail and not all_ok:
        _print_report(results, all_ok)
        print("\n[HALT] Fix the issues above before training.", file=sys.stderr)
        sys.exit(1)

    return report


def _print_report(results: list, all_ok: bool):
    width = 62
    print("=" * width)
    print("  SILAGEGUARD AI — DATASET VERIFICATION REPORT")
    print("=" * width)

    for r in results:
        icon = "OK " if r["status"] == "OK" else "ERR"
        print(f"\n  [{icon}] {r['name']}  ({r['status']})")
        print(f"       Path  : {r['path']}")
        if r.get("description"):
            print(f"       About : {r['description']}")
        if "total_images" in r:
            print(f"       Images: {r['total_images']}")
            if r.get("classes"):
                cls_str = ", ".join(f"{k}:{v}" for k, v in r["classes"].items())
                print(f"       Classes: {cls_str}")
        if "rows" in r:
            print(f"       Rows  : {r['rows']}")
        if r.get("label_distribution"):
            ld = r["label_distribution"]
            print(f"       Labels: {ld}")
        for issue in r.get("issues", []):
            print(f"       ISSUE : {issue}")

    print("\n" + "=" * width)
    if all_ok:
        print("  ALL DATASETS VERIFIED — Ready for training")
    else:
        print("  DATASETS INCOMPLETE — Fix issues before running training")
        print("  Details saved to: data/dataset_info.json")
    print("=" * width)


# ── CLI entry-point ───────────────────────────────────────────────────────────

def main():
    report = verify(halt_on_fail=False)
    _print_report(report["datasets"], report["all_ok"])
    sys.exit(0 if report["all_ok"] else 1)


if __name__ == "__main__":
    main()
