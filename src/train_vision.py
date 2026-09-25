"""
SilageGuard AI — Vision Model Training (src/train_vision.py)
SIH26111 | Phase 4

Architecture: MobileNetV3-Small + custom 3-class head
Training strategy:
  Stage 1 (epochs 1-14)  — freeze backbone, train classifier head only
  Stage 2 (epoch 15+)    — unfreeze top backbone layers for fine-tuning
Memory optimisation: gradient checkpointing on the feature extractor

IMPORTANT: Dataset verification runs first. Training halts if the
           processed vision dataset is missing or has too few images.

Run:
    python src/train_vision.py
"""

import os
import sys
import yaml
import torch
import torch.nn as nn
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from sklearn.metrics import f1_score, accuracy_score, classification_report

# ── Step 0: Dataset verification ──────────────────────────────────────────────
from src.verify_datasets import verify

print("=" * 62)
print("  SILAGEGUARD AI — VISION MODEL TRAINING (Phase 4)")
print("=" * 62)
print("\n[Step 0] Verifying datasets ...")
report = verify(halt_on_fail=False)

vision_ok = next(
    (d["status"] == "OK" for d in report["datasets"] if d["name"] == "ProcessedVision"),
    False,
)
if not vision_ok:
    bad = next(d for d in report["datasets"] if d["name"] == "ProcessedVision")
    print(
        f"\n[HALT] Processed vision dataset is not ready: {bad.get('issues')}\n"
        "       Run: python src/fetch_data.py  and/or  python src/organize_real_vision_data.py\n"
        "       Then re-run this script.",
        file=sys.stderr,
    )
    sys.exit(1)

print("[OK]   Vision dataset verified.\n")

from src.dataloaders import get_vision_loaders


# ── Model ─────────────────────────────────────────────────────────────────────

class SilageGuardVision(nn.Module):
    """
    MobileNetV3-Small with gradient checkpointing on the feature extractor.

    Gradient checkpointing trades computation for memory: during the backward
    pass, activations are recomputed on-the-fly instead of being stored.
    This halves the GPU memory required at the cost of ~30% extra compute.
    Essential for training on laptops / machines with <4 GB VRAM.
    """

    def __init__(self, num_classes: int = 3, dropout: float = 0.4):
        super().__init__()

        try:
            backbone = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
            print("[OK] Loaded ImageNet pre-trained MobileNetV3-Small backbone.", flush=True)
        except Exception as exc:
            print(f"[WARN] Could not load pre-trained weights ({exc}). Random init.", flush=True)
            backbone = mobilenet_v3_small(weights=None)

        # Keep the backbone feature extractor as-is so gradient checkpointing
        # wraps the whole stack cleanly.
        self.features = backbone.features      # output: B×576×7×7
        self.pool     = nn.AdaptiveAvgPool2d(1) # → B×576×1×1

        # Custom classification head: 576 → 256 → num_classes
        self.classifier = nn.Sequential(
            nn.Linear(576, 256),
            nn.Hardswish(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes),
        )

        self._use_checkpointing = True  # toggled off during eval

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self._use_checkpointing and self.training:
            # Gradient checkpointing: recompute forward activations during backward
            x = torch.utils.checkpoint.checkpoint(
                self.features, x, use_reentrant=False
            )
        else:
            x = self.features(x)

        x = self.pool(x).flatten(1)
        return self.classifier(x)


# ── build_model helper (used by export.py) ────────────────────────────────────

def build_model(num_classes: int = 3, dropout: float = 0.4) -> SilageGuardVision:
    return SilageGuardVision(num_classes=num_classes, dropout=dropout)


# ── Training utilities ────────────────────────────────────────────────────────

def run_epoch(
    model:     nn.Module,
    loader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device:    torch.device,
    train:     bool = True,
):
    model.train() if train else model.eval()
    # Disable gradient checkpointing during evaluation (not needed + incompatible
    # with torch.no_grad()).
    if hasattr(model, "_use_checkpointing"):
        model._use_checkpointing = train

    losses, preds, targets = [], [], []
    ctx = torch.enable_grad() if train else torch.no_grad()

    with ctx:
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)

            if train:
                optimizer.zero_grad()

            out  = model(imgs)
            loss = criterion(out, labels)

            if train:
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()

            losses.append(loss.item())
            preds.extend(out.argmax(1).cpu().numpy())
            targets.extend(labels.cpu().numpy())

    return (
        sum(losses) / len(losses),
        accuracy_score(targets, preds),
        f1_score(targets, preds, average="macro"),
        preds,
        targets,
    )


def _freeze(module: nn.Module):
    for p in module.parameters():
        p.requires_grad = False


def _unfreeze(module: nn.Module):
    for p in module.parameters():
        p.requires_grad = True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Load config
    config_path = "configs/config.yaml"
    if os.path.exists(config_path):
        with open(config_path) as fh:
            cfg = yaml.safe_load(fh).get("vision", {})
    else:
        cfg = {}

    data_root    = cfg.get("data_root",    "data/processed/vision")
    num_classes  = cfg.get("num_classes",  3)
    batch_size   = cfg.get("batch_size",   16)
    epochs       = cfg.get("epochs",       50)
    stage2_start = cfg.get("stage2_start", 15)
    dropout      = cfg.get("dropout",      0.4)
    patience     = 10

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} | Epochs: {epochs} | Batch: {batch_size}", flush=True)
    if cfg.get("gradient_checkpointing", True):
        print("[OK] Gradient checkpointing ENABLED (memory-efficient training)", flush=True)

    train_loader, val_loader, test_loader = get_vision_loaders(
        data_root, batch_size=batch_size
    )

    # ── Build model ────────────────────────────────────────────────────────────
    model = build_model(num_classes=num_classes, dropout=dropout).to(device)

    # ── Stage 1: freeze backbone, train head only ──────────────────────────────
    _freeze(model.features)
    _unfreeze(model.classifier)
    print(f"\n[Stage 1] Epochs 1-{stage2_start - 1}: classifier head only (backbone frozen)", flush=True)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-3, weight_decay=1e-4,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    os.makedirs("models", exist_ok=True)
    best_f1, wait = 0.0, 0

    for epoch in range(1, epochs + 1):

        # ── Stage 2: unfreeze top backbone layers for fine-tuning ─────────────
        if epoch == stage2_start:
            print(f"\n[Stage 2] Epoch {epoch}: unfreezing top backbone layers for fine-tuning ...", flush=True)
            # Unfreeze the last 4 feature blocks (blocks 8-11 of 12 total)
            for i, layer in enumerate(model.features):
                if i >= 8:
                    _unfreeze(layer)
            optimizer = torch.optim.AdamW(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=1e-4, weight_decay=1e-4,
            )
            # Reset scheduler for new LR
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=(epochs - stage2_start + 1)
            )

        tr_loss, tr_acc, tr_f1, _, _         = run_epoch(model, train_loader, criterion, optimizer, device, True)
        vl_loss, vl_acc, vl_f1, vl_preds, _  = run_epoch(model, val_loader,   criterion, optimizer, device, False)
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{epochs} "
            f"| Train Loss {tr_loss:.4f} Acc {tr_acc:.3f} F1 {tr_f1:.3f} "
            f"| Val Loss {vl_loss:.4f} Acc {vl_acc:.3f} F1 {vl_f1:.3f}",
            flush=True,
        )

        if vl_f1 > best_f1:
            best_f1 = vl_f1
            torch.save(model.state_dict(), "models/vision.pt")
            wait = 0
            print(f"  --> New best saved (Val F1: {best_f1:.3f})", flush=True)
        else:
            wait += 1
            if wait >= patience:
                print(f"[Early stop] Epoch {epoch}. Best Val F1: {best_f1:.3f}", flush=True)
                break

    print(f"\n[OK] Vision training complete. Best Val F1: {best_f1:.3f}", flush=True)

    # ── Test evaluation on held-out split ──────────────────────────────────────
    print("\n--- HELD-OUT TEST EVALUATION ---", flush=True)
    model.load_state_dict(torch.load("models/vision.pt", map_location=device))
    _, test_acc, test_f1, t_preds, t_targets = run_epoch(
        model, test_loader, criterion, optimizer, device, False
    )
    print(
        classification_report(t_targets, t_preds, target_names=["safe", "caution", "unsafe"]),
        flush=True,
    )
    print(f"[OK] Test Accuracy: {test_acc:.4f} | Macro F1: {test_f1:.4f}", flush=True)


if __name__ == "__main__":
    main()
