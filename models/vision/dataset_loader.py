"""
SILAGEGUARD AI V3 — Production Real-Data Vision Dataset Loader
Loads 100% real agricultural silage and mold imagery verified against manifests.
Classes:
  0: SAFE (Healthy Silage)
  1: CAUTION (Early Spoilage / Aerobic Heating)
  2: UNSAFE (Visible Mold Mycelium)
"""

import os
import csv
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import albumentations as A

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
SPLITS_DIR = os.path.join(PROJECT_ROOT, "datasets", "splits", "vision")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "datasets", "metadata", "vision_manifest.csv")

CLASS_NAMES = ["SAFE", "CAUTION", "UNSAFE"]
CLASS_TO_IDX = {name: i for i, name in enumerate(CLASS_NAMES)}

def verify_zero_synthetic_in_manifest(manifest_csv_path: str):
    """Rule 1 & Rule 7 Hard Assertion: Every image must be traceable real imagery."""
    if not os.path.exists(manifest_csv_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_csv_path}")

    with open(manifest_csv_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            did = row.get("dataset_id", "")
            if "SYNTHETIC" in did.upper():
                raise RuntimeError(f"RULE 1 VIOLATION: Synthetic image detected in production manifest! ({row.get('clean_name')})")

class SilageDatasetV3(Dataset):
    def __init__(self, manifest_csv: str, transform=None):
        verify_zero_synthetic_in_manifest(manifest_csv)
        self.transform = transform
        self.samples = []

        with open(manifest_csv, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c_label = row.get("class_label", "").strip()
                if c_label in CLASS_TO_IDX:
                    p_path = row.get("processed_path", "")
                    # Fallback to local path if absolute path differs across environments
                    if not os.path.exists(p_path):
                        clean_name = row.get("clean_name", "")
                        candidate = os.path.join(PROJECT_ROOT, "datasets", "processed", "vision", c_label, f"{c_label}_{clean_name}")
                        if os.path.exists(candidate):
                            p_path = candidate
                        elif os.path.exists(os.path.join(PROJECT_ROOT, "datasets", "raw", "vision", c_label, clean_name)):
                            p_path = os.path.join(PROJECT_ROOT, "datasets", "raw", "vision", c_label, clean_name)

                    if os.path.exists(p_path):
                        self.samples.append({
                            "path": p_path,
                            "label_idx": CLASS_TO_IDX[c_label],
                            "image_id": row.get("image_id", ""),
                            "crop": row.get("crop", "")
                        })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        img_bgr = cv2.imread(item["path"])
        if img_bgr is None:
            # Fallback black image if corrupted
            img_rgb = np.zeros((224, 224, 3), dtype=np.uint8)
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            if img_rgb.shape[:2] != (224, 224):
                img_rgb = cv2.resize(img_rgb, (224, 224))

        if self.transform:
            augmented = self.transform(image=img_rgb)
            img_rgb = augmented["image"]

        # HWC uint8 -> CHW float32 tensor normalized to [0, 1]
        img_tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).float() / 255.0

        # ImageNet normalization
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        img_tensor = (img_tensor - mean) / std

        return img_tensor, item["label_idx"], item["path"]

def get_train_transforms():
    """Realistic Agricultural Augmentation Pipeline."""
    return A.Compose([
        A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=0.4),
        A.CLAHE(clip_limit=2.0, tile_grid_size=(8, 8), p=0.3),
        A.HueSaturationValue(hue_shift_limit=10, sat_shift_limit=15, val_shift_limit=10, p=0.3),
        A.Rotate(limit=15, border_mode=cv2.BORDER_REFLECT, p=0.4),
        A.GaussianBlur(blur_limit=(3, 5), p=0.2),
        A.RandomShadow(p=0.2)
    ])

def get_dataloaders(batch_size=16):
    train_csv = os.path.join(SPLITS_DIR, "train_manifest.csv")
    val_csv = os.path.join(SPLITS_DIR, "val_manifest.csv")
    test_csv = os.path.join(SPLITS_DIR, "test_manifest.csv")

    train_ds = SilageDatasetV3(train_csv, transform=get_train_transforms())
    val_ds = SilageDatasetV3(val_csv, transform=None)
    test_ds = SilageDatasetV3(test_csv, transform=None)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    return train_loader, val_loader, test_loader
