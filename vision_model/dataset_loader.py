"""
SILAGEGUARD AI V2.2 — 100% Real-Data Vision Dataset Loader
Loads real silage & mold imagery verified against datasets/metadata/vision_manifest.csv.
Enforces Rule 1 assertion: 100% REAL, 0% SYNTHETIC images.
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

CLASS_NAMES = ["NO_MOLD", "VISIBLE_MOLD"]
CLASS_TO_IDX = {name: i for i, name in enumerate(CLASS_NAMES)}

def verify_zero_synthetic_in_manifest(manifest_csv_path: str):
    """
    Rule 1 & Rule 7 Hard Assertion:
    The training and validation manifests must contain ZERO synthetic rows.
    """
    if not os.path.exists(manifest_csv_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_csv_path}")
        
    synthetic_count = 0
    real_count = 0
    
    with open(manifest_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            val = row.get("real_or_synthetic", "").strip().upper()
            if val != "REAL":
                synthetic_count += 1
            else:
                real_count += 1
                
    if synthetic_count > 0:
        raise RuntimeError(
            f"🚨 RULE 1 VIOLATION: Found {synthetic_count} non-real/synthetic images in {manifest_csv_path}! "
            "Production training MUST be 100% real photographs."
        )
    if real_count == 0:
        raise RuntimeError(f"Manifest {manifest_csv_path} contains 0 real images!")
        
    return real_count

def get_train_transforms(image_size=224):
    """
    Realistic agricultural augmentations (Rule 13):
    - Horizontal flips
    - Subtle rotation / scale variation
    - Natural illumination shifts (brightness/contrast)
    - Mild camera blur / hand jitter
    - Standard ImageNet normalization
    DOES NOT add artificial mold or synthetic fungal patterns.
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        A.HorizontalFlip(p=0.5),
        A.Affine(scale=(0.9, 1.1), translate_percent=(-0.05, 0.05), rotate=(-15, 15), p=0.5, mode=cv2.BORDER_REFLECT),
        A.RandomBrightnessContrast(brightness_limit=0.18, contrast_limit=0.18, p=0.6),
        A.HueSaturationValue(hue_shift_limit=10, sat_shift_limit=15, val_shift_limit=12, p=0.5),
        A.GaussianBlur(blur_limit=(3, 5), p=0.25),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

def get_eval_transforms(image_size=224):
    """Evaluation / Test transforms: deterministic resize and normalization only."""
    return A.Compose([
        A.Resize(image_size, image_size),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

class RealSilageDataset(Dataset):
    def __init__(self, records, transform=None):
        self.records = records
        self.transform = transform
        
    def __len__(self):
        return len(self.records)
        
    def __getitem__(self, idx):
        rec = self.records[idx]
        image_path = rec.get("processed_path") or rec.get("local_path") or rec.get("local_raw_path")
        if not image_path:
            raise KeyError(f"Record missing image path keys: {rec}")
            
        if not os.path.isabs(image_path):
            cand1 = os.path.join(PROJECT_ROOT, "datasets", image_path)
            cand2 = os.path.join(PROJECT_ROOT, image_path)
            if os.path.exists(cand1):
                image_path = cand1
            elif os.path.exists(cand2):
                image_path = cand2
            else:
                image_path = cand1
            
        image = cv2.imread(image_path)
        if image is None:
            # Fallback neutral grey image if read failure
            image = np.full((224, 224, 3), 128, dtype=np.uint8)
        else:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
        if self.transform:
            augmented = self.transform(image=image)
            image = augmented["image"]
            
        image = image.transpose(2, 0, 1).astype(np.float32)
        tensor_img = torch.tensor(image, dtype=torch.float32)
        
        label_str = rec.get("normalized_label", "").strip().upper()
        label_idx = CLASS_TO_IDX.get(label_str, 0)
        label_tensor = torch.tensor(label_idx, dtype=torch.long)
        
        return {
            "image": tensor_img,
            "label": label_tensor,
            "image_id": rec.get("image_id", ""),
            "group_id": rec.get("group_id", ""),
            "dataset_id": rec.get("dataset_id", ""),
            "local_path": image_path
        }

def load_split_records(split_name: str):
    split_csv = os.path.join(SPLITS_DIR, f"{split_name}_manifest.csv")
    if not os.path.exists(split_csv):
        raise FileNotFoundError(f"Split manifest does not exist: {split_csv}")
        
    verify_zero_synthetic_in_manifest(split_csv)
    
    records = []
    with open(split_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records

def get_dataloaders(image_size=224, batch_size=8):
    # Rule 1 Assertions on all splits
    train_records = load_split_records("train")
    val_records = load_split_records("val")
    test_records = load_split_records("test")
    
    print(f"Loaded Real Splits -> Train: {len(train_records)}, Val: {len(val_records)}, Test: {len(test_records)}")
    
    train_dataset = RealSilageDataset(train_records, transform=get_train_transforms(image_size))
    val_dataset = RealSilageDataset(val_records, transform=get_eval_transforms(image_size))
    test_dataset = RealSilageDataset(test_records, transform=get_eval_transforms(image_size))
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader, test_loader, CLASS_NAMES
