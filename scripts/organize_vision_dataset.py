"""
SILAGEGUARD AI — Vision Dataset Ingestion & Professional Organization Pipeline
Extracts raw zip archives (dry_silage.zip, healthy_silage.zip, low_quality_silage.zip)
and organizes all vision images into a stratified 80/20 train/test split:
  - Abnormal_appearance (300 images: 240 train / 60 test)
  - Foreign_object (100 images: 80 train / 20 test)
  - Healthy (300 images: 240 train / 60 test)
  - Mould (100 images: 80 train / 20 test)
  - Spoilage (400 images: 320 train / 80 test)
Total: 1,200 high-resolution real agricultural silage images.
"""
from __future__ import annotations

import os
import sys
import shutil
import zipfile
import random
from pathlib import Path
from PIL import Image

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

random.seed(42)

ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_VISION_DIR = ROOT_DIR / "datasets" / "raw" / "vision"
TRAIN_DIR = ROOT_DIR / "datasets" / "train"
TEST_DIR = ROOT_DIR / "datasets" / "test"
PROCESSED_VISION_DIR = ROOT_DIR / "datasets" / "processed" / "vision"

CLASSES = [
    "Abnormal_appearance",
    "Foreign_object",
    "Healthy",
    "Mould",
    "Spoilage",
]

ZIP_MAPPING = {
    "dry_silage.zip": "Abnormal_appearance",
    "healthy_silage.zip": "Healthy",
    "low_quality_silage.zip": "Spoilage",
}


def extract_zips():
    print("[1/4] Extracting zip archives from datasets/raw/vision...")
    for zip_name, target_class in ZIP_MAPPING.items():
        zip_path = RAW_VISION_DIR / zip_name
        if not zip_path.exists():
            print(f"  [!] Warning: {zip_name} not found at {zip_path}")
            continue

        target_dir = RAW_VISION_DIR / target_class
        target_dir.mkdir(parents=True, exist_ok=True)

        extracted_count = 0
        with zipfile.ZipFile(zip_path, "r") as z:
            for member in z.infolist():
                if member.filename.endswith((".jpg", ".jpeg", ".png")):
                    filename = Path(member.filename).name
                    # Prefix to prevent collisions
                    dest_filename = f"{target_class.lower()}_zip_{filename}"
                    dest_path = target_dir / dest_filename
                    if not dest_path.exists():
                        with z.open(member) as src, open(dest_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        extracted_count += 1

        print(f"  [+] {zip_name} -> {target_class}: {extracted_count} new images extracted.")


def validate_image(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False


def build_splits(split_ratio: float = 0.8):
    print(f"\n[2/4] Organizing stratified dataset splits ({int(split_ratio*100)}% train / {int((1-split_ratio)*100)}% test)...")

    # Clear and recreate train/test folders
    for cls in CLASSES:
        (TRAIN_DIR / cls).mkdir(parents=True, exist_ok=True)
        (TEST_DIR / cls).mkdir(parents=True, exist_ok=True)
        (PROCESSED_VISION_DIR / "train" / cls).mkdir(parents=True, exist_ok=True)
        (PROCESSED_VISION_DIR / "test" / cls).mkdir(parents=True, exist_ok=True)

    summary = {}

    for cls in CLASSES:
        raw_cls_dir = RAW_VISION_DIR / cls
        if not raw_cls_dir.exists():
            print(f"  [!] Missing raw directory for {cls}")
            continue

        all_files = sorted([
            f for f in raw_cls_dir.iterdir()
            if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
        ])

        valid_files = [f for f in all_files if validate_image(f)]
        random.shuffle(valid_files)

        n_total = len(valid_files)
        n_train = int(round(n_total * split_ratio))
        train_files = valid_files[:n_train]
        test_files = valid_files[n_train:]

        # Clean existing files in split dirs
        for split_dir in [TRAIN_DIR / cls, TEST_DIR / cls, PROCESSED_VISION_DIR / "train" / cls, PROCESSED_VISION_DIR / "test" / cls]:
            for f in split_dir.iterdir():
                if f.is_file():
                    f.unlink()

        # Copy to train
        for f in train_files:
            shutil.copy2(f, TRAIN_DIR / cls / f.name)
            shutil.copy2(f, PROCESSED_VISION_DIR / "train" / cls / f.name)

        # Copy to test
        for f in test_files:
            shutil.copy2(f, TEST_DIR / cls / f.name)
            shutil.copy2(f, PROCESSED_VISION_DIR / "test" / cls / f.name)

        summary[cls] = {
            "total": n_total,
            "train": len(train_files),
            "test": len(test_files),
        }
        print(f"  [OK] {cls:20s}: {n_total} total -> {len(train_files)} train, {len(test_files)} test", flush=True)

    total_images = sum(s["total"] for s in summary.values())
    total_train = sum(s["train"] for s in summary.values())
    total_test = sum(s["test"] for s in summary.values())

    print(f"\n[3/4] Dataset verification complete:")
    print(f"  Total Vision Images: {total_images}")
    print(f"  Total Training:      {total_train} ({round(total_train/total_images*100, 1)}%)")
    print(f"  Total Testing:       {total_test} ({round(total_test/total_images*100, 1)}%)")

    return summary


if __name__ == "__main__":
    extract_zips()
    build_splits()
    print("\n[4/4] Vision dataset organization completed successfully!")
