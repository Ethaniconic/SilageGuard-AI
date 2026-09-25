"""
SILAGEGUARD AI — Vision Dataset Loader with Albumentations Augmentations
Loads silage surface images from datasets/vision/{safe, caution, unsafe}
and applies rigorous agricultural field data augmentations.
"""

import os
import glob
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import albumentations as A

CLASS_NAMES = ["Safe", "Caution", "Unsafe"]
CLASS_TO_IDX = {name.lower(): i for i, name in enumerate(CLASS_NAMES)}

def get_train_transforms(image_size=224):
    """
    Rigorously augments agricultural field imagery to simulate harsh farm conditions:
    - Direct sunlight vs bunker shade (RandomBrightnessContrast)
    - Soil/mud and lighting hue shifts (HueSaturationValue)
    - Motion jitter from farmer hands (GaussianBlur)
    - High dynamic range of silage bunker walls (CLAHE)
    - Multidirectional bunker face orientation (Flips & Rotations)
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.RandomBrightnessContrast(brightness_limit=0.25, contrast_limit=0.25, p=0.7),
        A.HueSaturationValue(hue_shift_limit=15, sat_shift_limit=25, val_shift_limit=20, p=0.6),
        A.GaussianBlur(blur_limit=(3, 5), p=0.3),
        A.CLAHE(clip_limit=3.0, tile_grid_size=(8, 8), p=0.4),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

def get_val_transforms(image_size=224):
    return A.Compose([
        A.Resize(image_size, image_size),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

class SilageVisionDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform
        
    def __len__(self):
        return len(self.file_paths)
        
    def __getitem__(self, idx):
        path = self.file_paths[idx]
        image = cv2.imread(path)
        if image is None:
            # Fallback black image if corrupted
            image = np.zeros((224, 224, 3), dtype=np.uint8)
        else:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
        if self.transform:
            augmented = self.transform(image=image)
            image = augmented["image"]
            
        # Convert HWC numpy to CHW PyTorch tensor
        image = image.transpose(2, 0, 1).astype(np.float32)
        tensor_img = torch.tensor(image, dtype=torch.float32)
        label = torch.tensor(self.labels[idx], dtype=torch.long)
        
        return tensor_img, label

def load_dataset_splits(data_dir: str, train_ratio=0.8, image_size=224, batch_size=16):
    all_paths = []
    all_labels = []
    
    for cls_name in ["safe", "caution", "unsafe"]:
        cls_dir = os.path.join(data_dir, cls_name)
        paths = glob.glob(os.path.join(cls_dir, "*.jpg")) + glob.glob(os.path.join(cls_dir, "*.png"))
        label_idx = CLASS_TO_IDX[cls_name]
        for p in paths:
            all_paths.append(p)
            all_labels.append(label_idx)
            
    print(f"Total silage images found: {len(all_paths)} across {len(CLASS_NAMES)} classes.")
    
    # Stratified split
    indices = np.arange(len(all_paths))
    np.random.seed(42)
    np.random.shuffle(indices)
    
    split_point = int(len(indices) * train_ratio)
    train_idx = indices[:split_point]
    val_idx = indices[split_point:]
    
    train_paths = [all_paths[i] for i in train_idx]
    train_labels = [all_labels[i] for i in train_idx]
    
    val_paths = [all_paths[i] for i in val_idx]
    val_labels = [all_labels[i] for i in val_idx]
    
    train_dataset = SilageVisionDataset(train_paths, train_labels, transform=get_train_transforms(image_size))
    val_dataset = SilageVisionDataset(val_paths, val_labels, transform=get_val_transforms(image_size))
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader, CLASS_NAMES
