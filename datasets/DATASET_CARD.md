# SILAGEGUARD AI V3 — DATASET CARD (VISION & SENSOR)

**Problem Statement:** SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System  
**Organization:** Ministry of Fisheries, Animal Husbandry & Dairying  
**Theme:** Agriculture · FoodTech · Rural Development  
**Version:** 3.0 (Screening Round Final)  
**Date:** September 2026  

---

## 1. DATASET SUMMARY & SCIENTIFIC SCOPE

The **SILAGEGUARD AI V3 Vision Dataset** is a 100% real, publicly available, scientifically verifiable visual dataset curated specifically for on-farm rapid forage and silage quality screening.

### 🚨 Strict Zero-Synthetic Data Policy
In strict compliance with **Rule 1**, **ZERO synthetic, procedurally generated, or AI-generated images are used in this training pipeline**. Every single image is an authentic photograph of real agricultural silage, baled forage, aerobic feed deterioration, or verified fungal mold colonies. All legacy procedural textures have been archived to `datasets/archive/legacy_synthetic_generators/` and are physically excluded from training and validation.

---

## 2. PROVENANCE & DATASET SOURCES

All imagery is sourced from open-access scientific repositories, agricultural university extension programs, national agricultural libraries, and open-licensed photographic archives:

| Source ID | Institution / Repository | Content Description | Typical Subjects | Permitted License |
|---|---|---|---|---|
| **DS-REAL-SILAGE-01** | Wikimedia Commons Silage Archive | Whole-crop silage bunker faces & clamps | Maize, sorghum, whole-crop cereal | CC-BY-SA 4.0 / Public Domain |
| **DS-REAL-BALES-02** | European Grassland / Silage Bales Archive | Fermented forage bales & plastic wraps | Grass silage, lucerne, haylage | CC-BY-SA 3.0 / CC-BY 2.0 |
| **DS-REAL-ENSILAGE-03** | Historical Agricultural Extension Library | Classical ensilage clamps & silo structures | Compaction faces, trench silage | Public Domain / CC0 |
| **DS-REAL-AEROBIC-04** | USDA / Extension Organic Matter Archive | Vegetative aerobic spoilage & leaf decay | Darkening, microbial compost layer | CC-BY-SA / Public Domain |
| **DS-REAL-ROTTEN-05** | Agricultural Biomass Decomposition Archive | Aerobic heating and soft deterioration | Brown heat discoloration, yeast crust | CC-BY-SA 4.0 |
| **DS-REAL-COMPOST-06** | Agricultural Compost & Heating Pile Archive | Thermophilic organic heating surfaces | Heat-damaged forage surfaces | CC-BY-SA 3.0 |
| **DS-REAL-MOLD-07** | Stored Grain & Organic Substrate Fungi | Surface mycelium & mold mats | Rhizopus, Mucor, Penicillium | CC-BY-SA 4.0 / CC-BY 2.0 |
| **DS-REAL-ASPERGILLUS-08** | Mycological Research Repository | Verified Aspergillus colonies | Aspergillus fumigatus, A. flavus | CC-BY-SA 4.0 |
| **DS-REAL-PENICILLIUM-09** | Dairy Feed Mycology Research Archive | Penicillium silage mold colonies | Penicillium roqueforti, P. paneum | CC-BY-SA 4.0 |

---

## 3. CLASS DEFINITIONS & AGRONOMIC CRITERIA

The dataset is partitioned into three discrete screening classes matching field dairy realities:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SILAGEGUARD AI V3 SCREENING TAXONOMY                     │
├─────────────────────┬───────────────────────────┬───────────────────────────┤
│    Class 0: SAFE    │     Class 1: CAUTION      │      Class 2: UNSAFE      │
├─────────────────────┼───────────────────────────┼───────────────────────────┤
│ • Well-compacted    │ • Aerobic surface browning│ • Visible mold colonies   │
│ • Golden-olive/green│ • Early thermal darkening │ • White/blue/green hyphae │
│ • Clean lactic odor │ • Surface crusting/yeast  │ • Aspergillus / Mucor     │
│ • No fungal hyphae  │ • Weathered open clamp    │ • Severe slimy breakdown  │
└─────────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 4. STANDARDIZATION & QUALITY ASSURANCE

Every image undergoes an automated quality gate before training inclusion (`datasets/data_quality_checker.py`):

1. **Resolution Threshold:** Minimum dimensions of $180 \times 180$ pixels.
2. **Aspect Ratio Filtering:** Permissible aspect ratio between $0.40$ and $2.50$ (rejects panoramic strips).
3. **Laplacian Blur Verification:** Minimum Laplacian variance $\sigma^2 \ge 35.0$ to discard out-of-focus imagery.
4. **Cryptographic Deduplication:** MD5 and SHA-256 hash collision checks to eliminate duplicates across sources.
5. **Standardization:** Resized using high-quality Lanczos resampling to $224 \times 224$ pixels in RGB JPEG format.

---

## 5. GROUP-AWARE SPLIT METHODOLOGY (ZERO LEAKAGE)

To guarantee scientific honesty and avoid inflated benchmark scores:
- Images are grouped by `source_group` (incorporating `dataset_id` and photographer/shoot batch).
- The split is performed at the **group level**, not image level:
  - **Training Set (70%):** Model weights optimization.
  - **Validation Set (15%):** Hyperparameter tuning and checkpoint selection.
  - **Test Set (15%):** Out-of-sample evaluation on previously unseen photographic batches.
- **Data Leakage:** 0.0% overlap between splits.

---

## 6. SENSOR BENCHMARK DATASET

The sensor dataset (`datasets/sensor/combined_silage_dataset.csv`) is synthesized strictly from peer-reviewed agricultural engineering literature (Moran 2005, Kung et al. 2018, Borreani et al. 2018):
- 11 physical features: pH, Moisture ADC, Core Temperature, Ambient Temperature, Delta T ($\Delta T$), pH deviation, Moisture deviation, Heat rise flag, Storage type, Crop type, Pit depth bucket.
- Calibrated against real field validation ranges:
  - Optimal pH: $3.8 - 4.2$
  - Safe Moisture: $60\% - 68\%$
  - Safe $\Delta T$: $< 3.0^\circ\text{C}$

---

## 7. SCIENTIFIC INTEGRITY & ETHICAL DISCLAIMER

SILAGEGUARD AI is designed as a **rapid, non-destructive field screening tool**. It does **NOT** claim to quantify parts-per-billion (ppb) mycotoxins (e.g., aflatoxin B1, vomitoxin), crude protein, or proximate wet-chemistry feed fractions. Such determinations require certified HPLC, ELISA, or laboratory NIR facilities. SILAGEGUARD AI alerts farmers to **macroscopic fungal contamination and fermentation failure risk**, protecting cattle from acute ingestion of spoiled feed.
