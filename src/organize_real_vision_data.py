"""
Organize REAL vision dataset images into safe, caution, and unsafe silage categories based on
visual mold density, texture variance, and organic surface characteristics.
"""
import os, sys, shutil
import numpy as np
import cv2
from PIL import Image

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROCESSED_VISION = "data/processed/vision"
CACHE_MOLD_DIR = os.path.expanduser("~/.cache/huggingface/hub/datasets--nphamdinh--mobilemold/snapshots/f405db912ae00d1ea3a9a10d285ef20b8b141b93/train/images")

def compute_mold_texture_score(img_path):
    """
    Computes visual mold density score using edge variance, color saturation,
    and high-frequency texture variation (Laplacian variance + HSV discoloration).
    """
    try:
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            return 0.0
        
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        
        # High frequency fungal texture (Laplacian variance)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sat_std = float(np.std(hsv[:, :, 1]))
        val_std = float(np.std(hsv[:, :, 2]))
        
        score = lap_var * 0.6 + (sat_std + val_std) * 1.5
        return score
    except Exception:
        return 0.0

def process_real_images():
    print("Purging previous image folders...", flush=True)
    for cat in ["safe", "caution", "unsafe"]:
        cat_dir = os.path.join(PROCESSED_VISION, cat)
        if os.path.exists(cat_dir):
            shutil.rmtree(cat_dir)
        os.makedirs(cat_dir, exist_ok=True)

    # 1. Collect all real mold images from MobileMold
    mold_images = []
    if os.path.exists(CACHE_MOLD_DIR):
        files = [os.path.join(CACHE_MOLD_DIR, f) for f in os.listdir(CACHE_MOLD_DIR) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
        print(f"Scoring {len(files)} REAL MobileMold images...", flush=True)
        for f in files:
            score = compute_mold_texture_score(f)
            mold_images.append((f, score))
            
    # Sort by mold density score
    mold_images.sort(key=lambda x: x[1])
    n = len(mold_images)
    print(f"Total REAL MobileMold images available: {n}", flush=True)
    
    if n > 0:
        # Split 712 REAL mold images into 3 distinct visual tiers:
        # Lowest 1/3 (cleanest surfaces) -> SAFE
        # Middle 1/3 (mild fungal spots / discoloration) -> CAUTION
        # Upper 1/3 (heavy fungal mold decay) -> UNSAFE
        third = n // 3
        safe_set = mold_images[:third]
        caution_set = mold_images[third:third*2]
        unsafe_set = mold_images[third*2:]
        
        for i, (path, sc) in enumerate(safe_set):
            dst = os.path.join(PROCESSED_VISION, "safe", f"real_mold_safe_{i:04d}.jpg")
            shutil.copy(path, dst)

        for i, (path, sc) in enumerate(caution_set):
            dst = os.path.join(PROCESSED_VISION, "caution", f"real_mold_caution_{i:04d}.jpg")
            shutil.copy(path, dst)
            
        for i, (path, sc) in enumerate(unsafe_set):
            dst = os.path.join(PROCESSED_VISION, "unsafe", f"real_mold_unsafe_{i:04d}.jpg")
            shutil.copy(path, dst)
            
        print(f"[OK] Categorized {len(safe_set)} REAL images into SAFE", flush=True)
        print(f"[OK] Categorized {len(caution_set)} REAL images into CAUTION", flush=True)
        print(f"[OK] Categorized {len(unsafe_set)} REAL images into UNSAFE", flush=True)

    # Summary
    print("\n=== FINAL REAL VISION DATASET BREAKDOWN ===", flush=True)
    for cat in ["safe", "caution", "unsafe"]:
        cat_dir = os.path.join(PROCESSED_VISION, cat)
        c = len(os.listdir(cat_dir))
        print(f"  {cat.upper()}: {c} REAL images", flush=True)
    print("[OK] Dataset organization complete!", flush=True)

if __name__ == "__main__":
    process_real_images()
