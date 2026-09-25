# 📦 ARCHIVE: SYNTHETIC VISION DATASET (V1 / V2.0 / V2.1)

> ⚠️ **CRITICAL SCIENTIFIC NOTICE**:
> **Historical synthetic prototype data. NOT used for production training, validation, or field-performance claims.**

## Archive Contents
1. `images/`: The 160 procedurally drawn PIL image textures (60 Safe, 50 Caution, 50 Unsafe) originally created in V1 using Python Pillow `PIL.ImageDraw`.
2. `synthetic_raw/`: Legacy synthetic folder containing duplicate vision textures and V1 synthetic sensor CSV.

## Reason for Archival
In SILAGEGUARD AI V2.2, all production computer vision models are strictly trained and validated on **100% real, traceable, externally sourced agricultural and silage photographs**. 
These synthetic files are preserved solely for historical auditability and reproducibility of the early software pipeline benchmarks. They must never appear in `datasets/processed/vision/` or any production training manifest.
