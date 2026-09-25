"""
SILAGEGUARD AI — MobileNetV3-Small Transfer Learning Pipeline
SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System

Trains an ultra-lightweight MobileNetV3-Small classifier on silage surface images.
Prioritizes high Recall on 'Unsafe' class (preventing mycotoxic feed ingestion).
"""

import os
import copy
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from sklearn.metrics import accuracy_score, f1_score, recall_score, precision_score, confusion_matrix
from dataset_loader import load_dataset_splits, CLASS_NAMES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "datasets", "vision")
CHECKPOINT_PATH = os.path.join(BASE_DIR, "mobilenetv3_silage.pth")
METRICS_PATH = os.path.join(BASE_DIR, "vision_model_metrics.json")

def build_model(num_classes=3):
    print("Loading MobileNetV3-Small pretrained backbone...")
    try:
        weights = models.MobileNet_V3_Small_Weights.DEFAULT
        model = models.mobilenet_v3_small(weights=weights)
    except Exception as e:
        print(f"Loading pretrained weights failed ({e}), initializing standard MobileNetV3-Small.")
        model = models.mobilenet_v3_small(weights=None)
        
    # Replace final classification head
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, num_classes)
    )
    return model

def train_model(epochs_head=4, epochs_fine=6):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")
    
    train_loader, val_loader, class_names = load_dataset_splits(DATA_DIR, train_ratio=0.8, image_size=224, batch_size=16)
    model = build_model(num_classes=len(class_names)).to(device)
    
    # Weighted Cross Entropy to heavily penalize missing Unsafe silage:
    # Safe=1.0, Caution=1.2, Unsafe=1.8
    class_weights = torch.tensor([1.0, 1.2, 1.8], dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    # Phase 1: Train Head only (backbone frozen)
    print("\n--- PHASE 1: Training Classification Head (Backbone Frozen) ---")
    for param in model.features.parameters():
        param.requires_grad = False
        
    optimizer_head = optim.Adam(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)
    
    for epoch in range(epochs_head):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer_head.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer_head.step()
            running_loss += loss.item() * images.size(0)
            
        epoch_loss = running_loss / len(train_loader.dataset)
        print(f"  Head Epoch [{epoch+1}/{epochs_head}] - Loss: {epoch_loss:.4f}")
        
    # Phase 2: Fine-tune Entire Model with Low Learning Rate
    print("\n--- PHASE 2: Fine-Tuning Entire MobileNetV3-Small Backbone ---")
    for param in model.parameters():
        param.requires_grad = True
        
    optimizer_fine = optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer_fine, T_max=epochs_fine)
    
    best_f1 = 0.0
    best_weights = copy.deepcopy(model.state_dict())
    
    for epoch in range(epochs_fine):
        model.train()
        train_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer_fine.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer_fine.step()
            train_loss += loss.item() * images.size(0)
            
        scheduler.step()
        train_loss /= len(train_loader.dataset)
        
        # Validation
        model.eval()
        all_preds = []
        all_targets = []
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                preds = torch.argmax(outputs, dim=1)
                all_preds.extend(preds.cpu().numpy())
                all_targets.extend(labels.cpu().numpy())
                
        val_acc = accuracy_score(all_targets, all_preds)
        val_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
        unsafe_recall = recall_score(all_targets, all_preds, labels=[2], average="macro", zero_division=0)
        
        print(f"  Fine-Tune Epoch [{epoch+1}/{epochs_fine}] - Loss: {train_loss:.4f} | Val Acc: {val_acc*100:.1f}% | Val F1: {val_f1*100:.1f}% | Unsafe Recall: {unsafe_recall*100:.1f}%")
        
        if val_f1 > best_f1:
            best_f1 = val_f1
            best_weights = copy.deepcopy(model.state_dict())
            
    print(f"\nBest Validation F1: {best_f1*100:.2f}%")
    model.load_state_dict(best_weights)
    torch.save(model.state_dict(), CHECKPOINT_PATH)
    print(f"Saved best model weights to: {CHECKPOINT_PATH}")
    
    # Final Full Evaluation on Validation Set
    model.eval()
    final_preds = []
    final_targets = []
    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            outputs = model(images)
            preds = torch.argmax(outputs, dim=1)
            final_preds.extend(preds.cpu().numpy())
            final_targets.extend(labels.numpy())
            
    final_acc = accuracy_score(final_targets, final_preds)
    final_f1 = f1_score(final_targets, final_preds, average="macro", zero_division=0)
    final_prec = precision_score(final_targets, final_preds, average="macro", zero_division=0)
    final_unsafe_recall = recall_score(final_targets, final_preds, labels=[2], average="macro", zero_division=0)
    cm = confusion_matrix(final_targets, final_preds).tolist()
    
    metrics = {
        "architecture": "MobileNetV3-Small",
        "input_resolution": "224x224x3",
        "accuracy": round(float(final_acc), 4),
        "f1_macro": round(float(final_f1), 4),
        "precision_macro": round(float(final_prec), 4),
        "recall_unsafe": round(float(final_unsafe_recall), 4),
        "classes": class_names,
        "confusion_matrix": cm
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved evaluation metrics to: {METRICS_PATH}")
    
    return model

if __name__ == "__main__":
    train_model()
