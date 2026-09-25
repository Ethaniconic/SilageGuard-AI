# 🎓 SIH 2026 JUDGE FAQ — SCIENTIFIC & TECHNICAL DEFENSE GUIDE

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Team: The Bro-grammers**  
**Version: V2.2 (Real-Data Vision Model & Screening-Round Hardening)**  
**Core Motto: "Every number in our presentation can be traced to a real dataset, a reproducible experiment, or an explicitly identified prototype assumption."**

---

### Q1: Where did your images come from?
> **Answer**:  
> "The production vision model is trained **exclusively on 100% real agricultural and mycological photographs**. Every image has documented provenance and open licensing (CC BY-SA 4.0, CC BY 2.0, Public Domain):  
> 1. **Wikimedia Commons Silage Archive (`DS-REAL-COMMONS-SILAGE-01`):** 42 real photographs of whole-plant corn/grass bunker clamp faces, trench pits, and baled silage across European and North American farms.  
> 2. **Real Mold & Aerobic Spoilage Archive (`DS-REAL-COMMONS-MOLD-02`):** 23 macroscopic photographs of real surface molds (*Mucor*, *Rhizopus*, bread and grain molds).  
> 3. **Aerobic Silage Surface Deterioration (`DS-REAL-COMMONS-SPOIL-03`):** 9 photographs of weathered, deteriorating baled forage.  
> 4. **Agricultural Fungal Isolates (`DS-REAL-COMMONS-ASPERGILLUS-04`):** 25 documented photographs of *Aspergillus flavus*, *Aspergillus niger*, and *Penicillium roqueforti* cultures on grain and forage media.  
> Full URLs, author attributions, and SHA-256 hashes are tracked in `datasets/metadata/vision_manifest.csv` and registered in `datasets/metadata/vision_dataset_registry.json`."

---

### Q2: Are your images synthetic?
> **Answer**:  
> "**No. The production vision model is trained only on traceable real photographs.**  
> In V1/V2, a 160-image procedural synthetic dataset was used purely as a software engineering benchmark. In V2.2, those 160 synthetic images were completely removed from the production pipeline and isolated in `datasets/archive/synthetic_v1/`. They are strictly flagged as non-production historical prototype data and **never** appear in `datasets/splits/vision/` or any production training manifest."

---

### Q3: How did you validate the vision model?
> **Answer**:  
> "We evaluated the model through three strictly separated tiers:  
> 1. **Held-Out Independent Real Test Set ($N = 29$):** Partitioned using `group_id` so that samples from the same physical farm session or organism series were completely held out from training. The model achieved **93.10% accuracy**, **0.9237 Macro F1**, **90.00% mould recall**, and a well-calibrated **Brier score of 0.0624**.  
> 2. **Cross-Source External Generalization:** Evaluated performance across distinct photographic sources (bunker face: 92.9%, baled forage: 100%, pure fungal cultures: 90.0%).  
> 3. **Grad-CAM Visual Verification:** Verified that saliency maps tightly localize on surface fungal mycelium and forage textures rather than photographic artifacts, backgrounds, or borders."

---

### Q4: Does your camera detect aflatoxin?
> **Answer**:  
> "**No, and scientifically it cannot.** An RGB camera sensor measures reflected photons across visible red, green, and blue wavelengths; it cannot measure biochemical aflatoxin $B_1$, deoxynivalenol (DON), or zearalenone concentrations in parts per billion (ppb).  
> Anyone claiming a smartphone camera quantifies aflatoxin ppb is making a scientifically false claim. In published literature (e.g., *Sensors* & *Journal of Dairy Science*), visible mold presence does not correlate linearly with chemical mycotoxin concentration. Our camera performs **qualitative visual screening for visible mould-like anomalies and surface spoilage only**. Suspected batches must be confirmed via laboratory HPLC or ELISA testing."

---

### Q5: Is the sensor physically validated on farms?
> **Answer**:  
> "**Physical field calibration is currently pending.**  
> We clearly distinguish between **WOKWI_SIMULATION** and **PHYSICAL_PROBE**:  
> - For firmware and BLE validation, we run automated simulations in Wokwi (`firmware/simulation/diagram.json`).  
> - Our physical probe schematic uses an ESP32-S3 with a DFRobot industrial pH glass probe, DS18B20 digital temperature probe, and capacitive moisture sensor.  
> - We do not claim field validation until laboratory buffer calibration (pH 4.01 and 7.00) and gravimetric oven-drying moisture calibrations are completed. We report moisture as a *relative moisture proxy*, not a laboratory-certified dry matter percentage."

---

### Q6: What does the 94.38% sensor metric mean?
> **Answer**:  
> "It is performance on our **group-aware research-informed synthetic sensor benchmark** (2,400 samples across 60 simulated bunker pits parameterized using Kung et al. 2018 and Borreani et al. 2018 in the *Journal of Dairy Science*).  
> **It is NOT a field-accuracy claim.** We maintain it solely as an edge software benchmark to verify on-device decision-tree inference, missing-modality handling, and BLE packet processing."

---

### Q7: Why did you choose 55% sensor and 45% vision weighting?
> **Answer**:  
> "The 55% sensor / 45% vision weighting is an **explicit prototype engineering heuristic**, not a clinically fitted law.  
> Internal bunker chemistry (anaerobic lactic acid pH preservation and heat rise) is the primary driver of silage safety, while surface photography inspects the exposed bunker face. If one modality is unavailable (e.g., probe disconnected), our decoupled fusion engine automatically falls back to single-modality screening without fabricating numbers."

---

### Q8: How do you measure urea adulteration?
> **Answer**:  
> "We do not directly measure urea molecules. A glass electrode measures hydronium ion activity ($-\log[H^+]$). When urea or protein decomposes under clostridial degradation, it releases basic ammonia ($NH_3 / NH_4^+$), which neutralizes lactic acid and drives pH above 5.5–6.0. Our system flags this severe pH spike as an aerobic spoilage or basic adulteration indicator, but does not claim specific molecular urea quantification."

---

### Q9: Does SILAGEGUARD AI work 100% offline without the internet?
> **Answer**:  
> "**Yes, 100% offline.**  
> All computation runs entirely on-device on the smartphone:  
> - Sensor inference: Pure TypeScript decision tree model (`sensorInference.ts`).  
> - Vision inference: On-device quantized MobileNetV3 TFLite/TorchScript engine (`visionInference.ts`).  
> - Fusion & Safety Rules: Decoupled client-side rule engine (`multimodalFusionEngine.ts`, `safetyRuleEngine.ts`).  
> - Advisory & Speech: Local Expo SQLite database and on-device text-to-speech engine.  
> - Data Transfer: Bluetooth Low Energy (BLE) direct to ESP32-S3.  
> An automated offline pipeline verification script (`validation/offline/verify_offline_flow.py`) confirms that a full scan, fusion, explanation, and QR generation completes with all network interfaces severed."
