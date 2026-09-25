"""
SilageGuard AI — Dataset Fetching (src/fetch_data.py)
SIH26111 | Phase 2

Datasets used:
  1. MobileMold     (HuggingFace: nphamdinh/mobilemold)         4 941 images
  2. PlantVillage   (HuggingFace: mohanty/PlantVillage)        54 303 images
  3. FBSI           (Mendeley — manual download required)        1 511 images
  4. BDHusk         (Mendeley — manual download required)        2 400 images
  5. sensor_data.csv  (synthetic, generated locally)

Run once:
    python src/fetch_data.py
"""

import os
import sys
import json
import shutil
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from PIL import Image

RAW              = "data/raw"
PROCESSED_VISION = "data/processed/vision"
VISION_CLASSES   = ["safe", "caution", "unsafe"]

# Ensure directories exist
for label in VISION_CLASSES:
    os.makedirs(os.path.join(PROCESSED_VISION, label), exist_ok=True)
os.makedirs(RAW, exist_ok=True)


# ── 1. MobileMold ─────────────────────────────────────────────────────────────

def fetch_mobilemold():
    dest = os.path.join(RAW, "mobilemold")
    if os.path.exists(dest) and any(Path(dest).rglob("*.jpg")):
        print(f"[OK] MobileMold already present at {dest}")
        return

    print("Fetching MobileMold from HuggingFace (nphamdinh/mobilemold)...")
    try:
        from datasets import load_dataset
        ds = load_dataset("nphamdinh/mobilemold", cache_dir=RAW)
        # Materialise as image folder: raw/mobilemold/<split>/<index>.jpg
        for split in ds.keys():
            split_dir = os.path.join(dest, split)
            os.makedirs(split_dir, exist_ok=True)
            for i, sample in enumerate(ds[split]):
                img = sample.get("image") or sample.get("img")
                if img is None:
                    continue
                out_path = os.path.join(split_dir, f"{i:05d}.jpg")
                img.convert("RGB").save(out_path)
        count = len(list(Path(dest).rglob("*.jpg")))
        print(f"[OK] MobileMold: {count} images saved to {dest}")
    except Exception as exc:
        print(f"[WARN] Could not auto-fetch MobileMold: {exc}")
        print(f"       Download manually from HuggingFace and place in {dest}/")


# ── 2. PlantVillage ───────────────────────────────────────────────────────────

def fetch_plantvillage():
    dest = os.path.join(RAW, "plantvillage")
    if os.path.exists(dest) and any(Path(dest).rglob("*.jpg")):
        print(f"[OK] PlantVillage already present at {dest}")
        return

    print("Fetching PlantVillage from HuggingFace (mohanty/PlantVillage)...")
    try:
        from datasets import load_dataset
        ds = load_dataset("mohanty/PlantVillage", "color", cache_dir=RAW)
        for split in ds.keys():
            split_dir = os.path.join(dest, split)
            os.makedirs(split_dir, exist_ok=True)
            for i, sample in enumerate(ds[split]):
                img = sample.get("image") or sample.get("img")
                if img is None:
                    continue
                out_path = os.path.join(split_dir, f"{i:05d}.jpg")
                img.convert("RGB").save(out_path)
        count = len(list(Path(dest).rglob("*.jpg")))
        print(f"[OK] PlantVillage: {count} images saved to {dest}")
    except Exception as exc:
        print(f"[WARN] Could not auto-fetch PlantVillage: {exc}")
        print(f"       Download manually from HuggingFace and place in {dest}/")


# ── 3. FBSI (manual) ──────────────────────────────────────────────────────────

def check_fbsi():
    dest = os.path.join(RAW, "fbsi")
    if os.path.exists(dest) and any(Path(dest).rglob("*.jpg")):
        count = len(list(Path(dest).rglob("*.jpg")))
        print(f"[OK] FBSI: {count} images found at {dest}")
    else:
        print(
            "[WARN] FBSI dataset not found.\n"
            "       Download from: https://data.mendeley.com/datasets/p9cr67s6jp/1\n"
            f"       Extract to: {dest}/"
        )


# ── 4. BDHusk (manual) ────────────────────────────────────────────────────────

def check_bdhusk():
    dest = os.path.join(RAW, "bdhusk")
    if os.path.exists(dest) and any(Path(dest).rglob("*.jpg")):
        count = len(list(Path(dest).rglob("*.jpg")))
        print(f"[OK] BDHusk: {count} images found at {dest}")
    else:
        print(
            "[WARN] BDHusk dataset not found.\n"
            "       Download from: https://data.mendeley.com/datasets/4hkbxktypk/1\n"
            f"       Extract to: {dest}/"
        )


# ── 5. Sensor CSV ─────────────────────────────────────────────────────────────

def generate_synthetic_sensor_csv(filepath: str, num_samples: int = 1200):
    """
    Generates a realistic silage sensor dataset based on domain science.

    Label thresholds (from literature):
      safe    — pH 3.6-4.4, moisture 55-68%, Δtemp ≤5 °C
      caution — pH 4.4-5.4, moisture 40-72%, Δtemp 4-9 °C
      unsafe  — pH >5.5,    moisture any,     Δtemp >8 °C
    """
    print(f"Generating silage sensor dataset ({num_samples} samples) → {filepath}")
    rng = np.random.default_rng(42)

    rows = []
    classes = ["safe", "caution", "unsafe"]
    priors  = [0.45, 0.35, 0.20]

    storage_types = ["bale", "bunker", "pit", "tower"]

    for i in range(num_samples):
        sample_id    = f"SIL_{10000 + i}"
        storage      = rng.choice(storage_types)
        ambient_temp = float(rng.normal(28.0, 4.0))
        target       = rng.choice(classes, p=priors)

        if target == "safe":
            ph       = float(np.clip(rng.normal(4.0, 0.2),  3.6, 4.4))
            moisture = float(np.clip(rng.normal(62.0, 3.0), 55.0, 68.0))
            temp     = float(np.clip(ambient_temp + rng.normal(2.0, 1.0),
                                     ambient_temp, ambient_temp + 5.0))
        elif target == "caution":
            ph       = float(np.clip(rng.normal(4.8, 0.3),  4.4, 5.4))
            moisture = float(np.clip(rng.normal(52.0, 6.0), 40.0, 72.0))
            temp     = float(np.clip(ambient_temp + rng.normal(6.0, 1.5),
                                     ambient_temp + 4.0, ambient_temp + 9.0))
        else:  # unsafe
            ph       = float(np.clip(rng.normal(6.2, 0.5),  5.5, 8.0))
            moisture = float(np.clip(rng.normal(75.0, 5.0), 30.0, 85.0))
            temp     = float(np.clip(ambient_temp + rng.normal(12.0, 2.5),
                                     ambient_temp + 8.0, ambient_temp + 20.0))

        rows.append({
            "sample_id":      sample_id,
            "ph":             round(ph, 2),
            "moisture_pct":   round(moisture, 1),
            "temperature_c":  round(temp, 1),
            "ambient_temp_c": round(ambient_temp, 1),
            "storage_type":   storage,
            "label":          target,
        })

    import pandas as pd
    df = pd.DataFrame(rows)
    df.to_csv(filepath, index=False)
    dist = df["label"].value_counts().to_dict()
    print(f"[OK] sensor_data.csv saved ({len(df)} rows) | distribution: {dist}")


# ── 6. Processed vision placeholder images ────────────────────────────────────

def generate_placeholder_vision(root_dir: str, samples_per_class: int = 60):
    """
    Generate colour-coded placeholder images for each vision class.
    Used only when real datasets are not yet organised via
    src/organize_real_vision_data.py.
    Existing real images are NEVER overwritten.
    """
    colour_map = {
        "safe":    [(34, 139, 34), (85, 107, 47), (0, 128, 0)],
        "caution": [(218, 165, 32), (184, 134, 11), (255, 165, 0)],
        "unsafe":  [(139, 69, 19), (160, 82, 45), (105, 105, 105)],
    }
    rng = np.random.default_rng(42)

    for cls in VISION_CLASSES:
        cls_dir = os.path.join(root_dir, cls)
        existing = [
            f for f in os.listdir(cls_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        if len(existing) >= samples_per_class:
            continue  # Already has enough images

        to_generate = samples_per_class - len(existing)
        palette = colour_map[cls]
        for i in range(to_generate):
            base_c = palette[i % len(palette)]
            noise  = rng.integers(-25, 25, (224, 224, 3))
            arr    = np.clip(np.array(base_c, dtype=np.int32) + noise, 0, 255).astype(np.uint8)

            # Add a dark patch to caution/unsafe classes to simulate spoilage
            if cls == "caution":
                arr[60:100, 60:100] = [80, 80, 60]
            elif cls == "unsafe":
                arr[40:140, 40:140] = [60, 40, 30]
                arr[60:80, 60:80]   = [200, 200, 200]  # mould spores

            img = Image.fromarray(arr.astype(np.uint8))
            fname = f"{cls}_placeholder_{len(existing) + i + 1:04d}.jpg"
            img.save(os.path.join(cls_dir, fname), quality=90)

    print(f"[OK] Processed vision placeholders in {root_dir}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  SILAGEGUARD AI — DATASET FETCHING")
    print("=" * 60 + "\n")

    # 1. HuggingFace datasets (auto)
    fetch_mobilemold()
    fetch_plantvillage()

    # 2. Mendeley datasets (manual — just check)
    check_fbsi()
    check_bdhusk()

    # 3. Sensor CSV
    sensor_csv = os.path.join(RAW, "sensor_data.csv")
    if not os.path.exists(sensor_csv):
        generate_synthetic_sensor_csv(sensor_csv)
    else:
        print(f"[OK] sensor_data.csv already exists at {sensor_csv}")

    # 4. Processed vision placeholders (if real images not yet organised)
    generate_placeholder_vision(PROCESSED_VISION, samples_per_class=60)

    print("\n[DONE] Dataset fetching complete.\n")
    print("Next steps:")
    print("  1. Place FBSI images in data/raw/fbsi/")
    print("  2. Place BDHusk images in data/raw/bdhusk/")
    print("  3. Run: python src/verify_datasets.py")
    print("  4. Run: python src/organize_real_vision_data.py  (maps raw → processed)")


if __name__ == "__main__":
    main()
