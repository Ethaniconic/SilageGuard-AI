# DATA CARD — SilageGuard AI Real Vision Dataset (V2.2)

## 1. Dataset Overview
- **Dataset Title:** SilageGuard AI Real Agricultural & Mycological Vision Dataset
- **Version:** 2.2.0 (Real Data Screening Release)
- **Total Images:** 99 unique photographic assets
- **Image Modality:** Real RGB photographs (standardized to 224 × 224 JPEG)
- **Primary Task:** Binary visual screening: `NO_MOLD` vs `VISIBLE_MOLD`
- **Synthetic Training Images:** **0 (0.0%)** (Rule 1 strictly enforced)
- **License Status:** 100% verified open-access (Creative Commons CC BY-SA 4.0, CC BY 2.0, Public Domain)

---

## 2. Provenance & Data Sources

### Where did every image come from?
Every image in this dataset was sourced from open-access agricultural archives and documented mycological photograph repositories hosted on Wikimedia Commons:
1. **Source 1 (`DS-REAL-COMMONS-SILAGE-01`):** 42 photographs of chopped whole-crop maize silage, bunker clamps, baled silage, and pit trenches. Sourced from agricultural extension photographers and farming documentation projects across Europe and North America.
2. **Source 2 (`DS-REAL-COMMONS-MOLD-02`):** 23 macroscopic and macro-lens photographs of real fungal mold colonies (*Mucor*, *Rhizopus*, bread and grain molds).
3. **Source 3 (`DS-REAL-COMMONS-SPOIL-03`):** 9 photographs of naturally weathered and deteriorated baled forage displaying plastic wrap exposure and aerobic surface drying.
4. **Source 4 (`DS-REAL-COMMONS-ASPERGILLUS-04`):** 25 documented agricultural fungal culture photographs (*Aspergillus flavus*, *Aspergillus niger*, *Penicillium roqueforti*) on grain and forage media.

Complete individual image URLs, author attributions, original Wikimedia file titles, and SHA-256 hashes are recorded in `datasets/metadata/vision_manifest.csv`.

---

## 3. Label Semantics & Mapping Rules

### What does each original label mean?
- **Original Source Label `NO_MOLD`:** The image depicts normal fermented silage or forage (whole-plant maize, grass, or sorghum) exhibiting characteristic olive/golden-brown coloration and chop fiber structures without macroscopic mycelial patches.
- **Original Source Label `VISIBLE_MOLD`:** The image depicts visible superficial fungal hyphae, cottony or filamentous mycelial growth, or dark/green/white sporulation patches typical of aerobic deterioration.

### Which labels were mapped?
| Original Source Annotation | Normalized Dataset Label | Downstream Multimodal Role |
|---|---|---|
| Chopped silage / bunker face / bale | `NO_MOLD` | $P(\text{mould}) < 0.35 \implies$ High visual safety score |
| Filamentous mold / Aspergillus / Penicillium | `VISIBLE_MOLD` | $P(\text{mould}) \ge 0.50 \implies$ High mould signal |

### Which labels were NOT mapped?
- **Silage Quality Grades (Excellent / Good / Fair / Poor):** Not mapped, because visual RGB color alone does not reliably predict volatile fatty acid ratios.
- **Biochemical Safety (Safe / Caution / Unsafe):** **NOT mapped directly to single images.** The vision model only predicts mold probability. The final safety classification is performed exclusively by the Multimodal Fusion Engine combining physical pH, temperature difference, moisture proxy, and safety rules.
- **Toxin Concentration (Aflatoxin ppb / DON ppm):** **Strictly unmapped.** Vision does not measure chemical toxins.

---

## 4. Leakage Prevention & Group Partitioning

### How was leakage prevented?
Images belonging to the same physical acquisition sequence, farm pit, or organism series share an identical `group_id` (15 total groups across 99 images).
We strictly enforced **group-level disjoint splitting**:
- An entire group is assigned to either `train`, `val`, or `test`.
- **Zero sample groups appear in more than one split.**

| Split | Sample Count | Sample Groups | Purpose |
|---|---|---|---|
| **Train** | 55 images (55.6%) | 8 groups | Feature learning and classification head tuning |
| **Validation** | 15 images (15.1%) | 3 groups | Hyperparameter tuning and model checkpointing |
| **Held-Out Test** | 29 images (29.3%) | 4 groups | Unbiased external evaluation (untouched during training) |

---

## 5. Duplicate & Quality Auditing

### How was data quality assured?
Before ingestion, the dataset was audited by `validation/vision/validate_dataset.py`:
- **Corrupted / Unreadable Files:** 0
- **SHA-256 Exact Duplicates:** 0
- **Extremely Low Resolution (< 100px):** 0
- **Synthetic / Procedural Textures:** 0
- **Inter-Split Leakage:** 0

---

## 6. Historical Synthetic Data Isolation
Legacy prototype images (the 160 PIL-generated procedural textures from V1/V2) were removed from the active training path and archived in:
```text
datasets/archive/synthetic_v1/
```
The archive includes a mandatory disclaimer:
> *"Historical synthetic prototype data. Not used for production training, validation, or field-performance claims."*
