"""
DataLoaders for vision and sensor models.
Kept minimal — no custom Dataset classes beyond what's needed.
"""
import os
import pandas as pd
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.model_selection import train_test_split

# ---------- VISION ----------

class SilageImageDataset(Dataset):
    """Expects folder structure: root/{safe,caution,unsafe}/*.jpg"""
    def __init__(self, root, transform=None):
        self.samples = []
        self.classes = sorted([d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))])
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        for cls in self.classes:
            cls_dir = os.path.join(root, cls)
            for fname in os.listdir(cls_dir):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    self.samples.append(
                        (os.path.join(cls_dir, fname), self.class_to_idx[cls])
                    )
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def get_vision_loaders(data_root, batch_size=32, num_workers=0):
    """
    Build train/val/test loaders with proper split.
    IMPORTANT: split first, augment train only.
    """
    # Collect all paths + labels for splitting
    all_paths, all_labels = [], []
    valid_dirs = sorted([d for d in os.listdir(data_root) if os.path.isdir(os.path.join(data_root, d))])
    
    for cls in valid_dirs:
        cls_dir = os.path.join(data_root, cls)
        for fname in os.listdir(cls_dir):
            if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                all_paths.append(os.path.join(cls_dir, fname))
                all_labels.append(cls)

    if not all_paths:
        raise ValueError(f"No image files found in subdirectories of {data_root}")

    # 70 / 15 / 15 stratified split
    train_p, temp_p, train_l, temp_l = train_test_split(
        all_paths, all_labels, test_size=0.30,
        stratify=all_labels, random_state=42
    )
    val_p, test_p, val_l, test_l = train_test_split(
        temp_p, temp_l, test_size=0.50,
        stratify=temp_l, random_state=42
    )

    # Transforms
    train_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.25),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Build loaders
    def make_loader(paths, labels, tf, shuffle):
        class _DS(Dataset):
            def __init__(self):
                self.paths, self.labels = paths, labels
                self.cls_to_idx = {c: i for i, c in enumerate(sorted(set(all_labels)))}
            def __len__(self): return len(self.paths)
            def __getitem__(self, i):
                img = Image.open(self.paths[i]).convert("RGB")
                return tf(img), self.cls_to_idx[self.labels[i]]
        return DataLoader(_DS(), batch_size=batch_size,
                          shuffle=shuffle, num_workers=num_workers, pin_memory=True if torch.cuda.is_available() else False)

    return (
        make_loader(train_p, train_l, train_tf, True),
        make_loader(val_p,   val_l,   eval_tf,  False),
        make_loader(test_p,  test_l,  eval_tf,  False),
    )


# ---------- SENSOR ----------

def get_sensor_data(csv_path):
    """Returns X (features), y (labels) for Random Forest."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Sensor CSV file not found at {csv_path}. Run src/fetch_data.py first.")

    df = pd.read_csv(csv_path)

    # Feature engineering
    df["ph_dev"] = (df["ph"] - 4.0).abs()
    df["moist_dev"] = (df["moisture_pct"] - 60).abs()
    df["delta_t"] = df["temperature_c"] - df["ambient_temp_c"]
    df["ph_x_moist"] = df["ph"] * df["moisture_pct"]
    df["dt_x_moist"] = df["delta_t"] * df["moisture_pct"]

    features = ["ph", "moisture_pct", "temperature_c", "ambient_temp_c",
                "ph_dev", "moist_dev", "delta_t", "ph_x_moist", "dt_x_moist"]
    label_map = {"safe": 0, "caution": 1, "unsafe": 2}

    return df[features].values, df["label"].map(label_map).values, features
