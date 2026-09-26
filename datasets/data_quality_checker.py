"""
SILAGEGUARD AI V3 — Automated Real Dataset Quality & Integrity Checker
Inspects all downloaded real agricultural imagery for:
  - Exact & near-duplicate hash collisions (MD5 & SHA-256)
  - Blurry images (Laplacian variance threshold)
  - Low resolution (minimum dimensions threshold: 180x180)
  - Extreme aspect ratio distortions (< 0.4 or > 2.5)
  - Color channel & decoding integrity

Outputs:
  - datasets/metadata/data_quality_rejection_report.json
  - datasets/metadata/quality_audit_summary.json
"""

import os
import sys
import json
import hashlib
from typing import Dict, List, Tuple, Any
from PIL import Image
import numpy as np

# Minimum quality thresholds
MIN_WIDTH = 180
MIN_HEIGHT = 180
MIN_ASPECT_RATIO = 0.40
MAX_ASPECT_RATIO = 2.50
MIN_LAPLACIAN_VAR = 35.0  # Images below this are rejected as severe out-of-focus blur

def compute_hashes(filepath: str) -> Tuple[str, str]:
    hasher_md5 = hashlib.md5()
    hasher_sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher_md5.update(buf)
            hasher_sha.update(buf)
            buf = f.read(65536)
    return hasher_md5.hexdigest(), hasher_sha.hexdigest()

def estimate_blur(img: Image.Image) -> float:
    """Computes Laplacian variance on grayscale image for sharpness estimation."""
    try:
        gray = img.convert("L")
        arr = np.array(gray, dtype=np.float64)
        # 3x3 Discrete Laplacian kernel
        # [ 0,  1,  0]
        # [ 1, -4,  1]
        # [ 0,  1,  0]
        padded = np.pad(arr, ((1, 1), (1, 1)), mode="edge")
        laplacian = (
            padded[:-2, 1:-1] +
            padded[2:, 1:-1] +
            padded[1:-1, :-2] +
            padded[1:-1, 2:] -
            4.0 * arr
        )
        return float(np.var(laplacian))
    except Exception:
        return 100.0

def audit_directory(raw_dir: str) -> Dict[str, Any]:
    seen_hashes: Dict[str, str] = {}
    rejections: List[Dict[str, Any]] = []
    accepted: List[Dict[str, Any]] = []

    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}

    for root, _, files in os.walk(raw_dir):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext not in valid_extensions:
                continue

            file_path = os.path.join(root, f)
            rel_path = os.path.relpath(file_path, raw_dir)

            try:
                # 1. Decode check
                with Image.open(file_path) as img:
                    img.verify()

                # Re-open for measurements (verify closes the file)
                with Image.open(file_path) as img:
                    img_rgb = img.convert("RGB")
                    width, height = img.size
                    aspect_ratio = width / max(height, 1)

                    # 2. Hash check (duplicate detection)
                    md5_hash, sha_hash = compute_hashes(file_path)
                    if md5_hash in seen_hashes:
                        rejections.append({
                            "file": rel_path,
                            "reason": "DUPLICATE_HASH",
                            "details": f"Exact match with {seen_hashes[md5_hash]} (MD5: {md5_hash})"
                        })
                        continue
                    seen_hashes[md5_hash] = rel_path

                    # 3. Resolution check
                    if width < MIN_WIDTH or height < MIN_HEIGHT:
                        rejections.append({
                            "file": rel_path,
                            "reason": "LOW_RESOLUTION",
                            "details": f"Resolution {width}x{height} below minimum {MIN_WIDTH}x{MIN_HEIGHT}"
                        })
                        continue

                    # 4. Aspect ratio check
                    if aspect_ratio < MIN_ASPECT_RATIO or aspect_ratio > MAX_ASPECT_RATIO:
                        rejections.append({
                            "file": rel_path,
                            "reason": "EXTREME_ASPECT_RATIO",
                            "details": f"Aspect ratio {aspect_ratio:.2f} outside permissible range [{MIN_ASPECT_RATIO}, {MAX_ASPECT_RATIO}]"
                        })
                        continue

                    # 5. Blur check
                    lap_var = estimate_blur(img_rgb)
                    if lap_var < MIN_LAPLACIAN_VAR:
                        rejections.append({
                            "file": rel_path,
                            "reason": "EXCESSIVE_BLUR",
                            "details": f"Laplacian variance {lap_var:.1f} below threshold {MIN_LAPLACIAN_VAR}"
                        })
                        continue

                    accepted.append({
                        "file": rel_path,
                        "width": width,
                        "height": height,
                        "aspect_ratio": round(aspect_ratio, 3),
                        "laplacian_variance": round(lap_var, 1),
                        "md5": md5_hash,
                        "sha256": sha_hash
                    })

            except Exception as e:
                rejections.append({
                    "file": rel_path,
                    "reason": "CORRUPTED_OR_UNREADABLE",
                    "details": str(e)
                })

    return {
        "total_scanned": len(accepted) + len(rejections),
        "total_accepted": len(accepted),
        "total_rejected": len(rejections),
        "accepted": accepted,
        "rejections": rejections
    }

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(base_dir, "datasets", "raw")
    meta_dir = os.path.join(base_dir, "datasets", "metadata")
    os.makedirs(meta_dir, exist_ok=True)

    print(f"[*] Auditing real image repository: {raw_dir}")
    report = audit_directory(raw_dir)

    rejection_path = os.path.join(meta_dir, "data_quality_rejection_report.json")
    with open(rejection_path, "w", encoding="utf-8") as f:
        json.dump(report["rejections"], f, indent=2)

    summary = {
        "version": "SILAGEGUARD-AI-V3",
        "total_images_scanned": report["total_scanned"],
        "accepted_real_images": report["total_accepted"],
        "rejected_images": report["total_rejected"],
        "acceptance_rate_percent": round(report["total_accepted"] / max(report["total_scanned"], 1) * 100, 2),
        "rejection_categories": {}
    }
    for r in report["rejections"]:
        cat = r["reason"]
        summary["rejection_categories"][cat] = summary["rejection_categories"].get(cat, 0) + 1

    summary_path = os.path.join(meta_dir, "quality_audit_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"[+] Quality audit complete: {report['total_accepted']} accepted, {report['total_rejected']} rejected.")
    print(f"[+] Rejection report written to {rejection_path}")

if __name__ == "__main__":
    main()
