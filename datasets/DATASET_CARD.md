# 📄 DATASET CARD — SILAGEGUARD AI V2

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Maintainers: The Bro-grammers (SIH 2026)**  
**Version: 2.0.0**  
**Last Updated: September 25, 2026**

---

## 1. Dataset Taxonomy & Directory Structure

In adherence to scientific integrity principles, SILAGEGUARD AI V2 strictly separates data into dedicated namespaces:

```
datasets/
├── raw/                  # Original, unmodified reference tables from scientific publications
├── processed/            # Harmonized data with documented feature transformations
├── synthetic/            # Explicitly tagged prototype data used for pipeline & mobile testing
├── field/                # Genuine on-farm observations from physical probes and cameras
├── metadata/             # Granular JSON schema cards for each individual file
├── dataset_registry.json # Machine-readable registry of all data sources
└── DATASET_CARD.md       # This comprehensive specification
```

---

## 2. Dataset Descriptions & Provenance

### A. Synthetic Benchmark (`datasets/synthetic/synthetic_sensor_benchmark.csv`)
* **Category**: `SYNTHETIC / PROTOTYPE DATA`
* **Real or Synthetic**: **100% Synthetic**
* **Purpose**: Used solely for verifying that the on-device Random Forest training pipeline, JSON tree serialization, and mobile TypeScript execution engines traverse decision paths without runtime errors.
* **Collection Method**: Parametric synthesis utilizing Gaussian and uniform distributions constrained by published agronomic boundaries (Kung et al., 2018; Borreani et al., 2018).
* **Sample Count**: 3,200 rows.
* **Features Included**:
  * `ph`: Acidity level (Simulated range: 3.6 to 8.2)
  * `moisture`: Moisture percentage (Simulated range: 38% to 85%)
  * `temperature`: Pit probe core temperature (Simulated range: 18°C to 55°C)
  * `ambient`: Ambient air temperature (Simulated range: 18°C to 40°C)
  * `dry_matter`: Derived as $100.0 - \text{moisture}$
* **Limitations**:
  > ⚠️ **CRITICAL DISCLAIMER**: This dataset was generated mathematically. It must **never** be cited as physical farm evidence or used to claim real-world clinical/veterinary diagnostic efficacy.

---

### B. Synthetic Silage Surface Textures (`datasets/synthetic/vision/`)
* **Category**: `SYNTHETIC / PROTOTYPE DATA`
* **Real or Synthetic**: **100% Synthetic**
* **Purpose**: Used for testing the PyTorch `torchvision.models.mobilenet_v3_small` architecture, Albumentations pipeline, and on-device TFLite INT8 quantization container format.
* **Collection Method**: Procedural generation using Python Pillow (`PIL.ImageDraw`). Simulated green fibers represent chop strands; dark brown patches represent caramelized Maillard oxidation; high-contrast white/cyan/grey stippling represents filamentous mold colonies.
* **Sample Count**: 160 images (60 Safe, 50 Caution, 50 Unsafe).
* **Limitations**:
  > ⚠️ **CRITICAL DISCLAIMER**: Synthetic image textures do **not** capture real-world agricultural visual variance (e.g., uneven bunker pit lighting, dust sheens, shadow occlusions, mud splatters). Real field testing requires genuine on-farm smartphone photography.

---

### C. Field Pilot Dataset (`datasets/field/field_pilot_observations.csv`)
* **Category**: `FIELD PILOT OBSERVATIONS`
* **Real or Synthetic**: **Real Physical Protocol & Preliminary Pilot Benchmarks**
* **Collection Location**: Vidarbha Dairy Belt (Nagpur, Amravati, Wardha districts, Maharashtra).
* **Target Sampling Protocol**:
  * Silage bunker depth: 15–80 cm.
  * Probe insertion stabilization time: 60 seconds.
  * Paired 3-photo camera capture (top surface, middle face, lower trench).
* **Columns**:
  `sample_id`, `farm_id`, `pit_id`, `crop_type`, `silage_age_days`, `sampling_depth_cm`, `ph`, `moisture`, `temperature`, `ambient_temperature`, `image_path`, `timestamp`, `operator`, `expert_label`, `label_source`, `laboratory_notes`.
* **Missing Value Policy**:
  * Missing measurements are recorded as `null` / empty.
  * Missing measurements are **never** filled with fabricated synthetic numbers.

---

## 3. Ground Truth Labeling Hierarchy

Every sample across all V2 datasets must contain an explicit `label_source`:

| Label Source | Scientific Description | Credibility Level |
|---|---|---|
| `LAB` | Verified by accredited wet-chemistry analytical laboratory (HPLC for volatile fatty acids, Kjeldahl for ammonia-N, ELISA/LC-MS for mycotoxins). | **Gold Standard** |
| `EXPERT` | Evaluated on-site by a trained dairy nutritionist, extension veterinarian, or agronomy researcher using standard organoleptic & sensory rubrics. | **High** |
| `RESEARCH_DATASET` | Derived from peer-reviewed scientific publications with published methodology. | **High** |
| `AGRONOMIC_RULE` | Threshold-based rule classification derived from published literature invariants. | **Moderate (Rule-Based)** |
| `SYNTHETIC` | Parametrically manufactured for software pipeline testing. | **Prototype Only (Not Evidence)** |

---

## 4. Prohibited Scientific Claims

In accordance with SIH 2026 engineering standards:
1. **No Direct Mycotoxin Quantification**: Standard RGB cameras cannot measure aflatoxin, zearalenone, or deoxynivalenol (DON) concentrations in parts-per-billion (ppb). The system reports **visible surface anomaly / mould-like discoloration risk**.
2. **No Direct Urea Quantification**: A basic pH electrode cannot distinguish between volatile ammonia-N, proteolysis, and urea adulteration without specific enzymatic (urease) reagents.
3. **No Laboratory Replacement**: SILAGEGUARD AI is positioned exclusively as an **on-farm rapid screening tool** to triage suspicious feed prior to official laboratory inspection.
