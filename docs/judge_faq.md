# 🎓 SIH 2026 JUDGE FAQ — SCIENTIFIC & TECHNICAL DEFENSE GUIDE

**Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System**  
**Team: The Bro-grammers**  
**Philosophy: Absolute Scientific Honesty, Defensible Engineering, Zero Overstatement**

---

### Q1: Where did your data come from?
> **Answer**:  
> "Our current machine learning models were trained on research-informed synthetic benchmark datasets. For sensor modeling, we generated 2,400 samples across 60 simulated bunker pits using agronomic parameters established in peer-reviewed meta-analyses by Kung et al. (2018) and Borreani et al. (2018) in the *Journal of Dairy Science*. For computer vision, we generated 160 procedural surface texture images using Python PIL to verify our Albumentations pipeline and TFLite quantization.  
> We have established an open 16-field schema in `datasets/field/` and initiated preliminary pilot observations in Maharashtra's Vidarbha dairy belt. We do not disguise our synthetic benchmark as real-world field data."

---

### Q2: Is your dataset real?
> **Answer**:  
> "No. The 2,400 sensor samples and 160 image files are **synthetic prototype datasets**. They were developed to test our edge ML pipelines, group-aware cross-validation, and mobile JSON decision-tree execution engines. We believe in complete transparency: no physical probes were inserted into 60 commercial farms to generate the 2,400 training rows."

---

### Q3: How did you obtain ground truth labels?
> **Answer**:  
> "In the synthetic dataset, ground truth labels (`Safe`, `Caution`, `Unsafe`) were generated using multi-factor threshold logic reflecting standard silage fermentation criteria (pH $\le$ 4.25, moisture 60–68%, $\Delta T \le 3.0^\circ$C).  
> For our real field pilot observations in `datasets/field/field_pilot_observations.csv`, ground truth is categorized using our explicit labeling hierarchy (`EXPERT`, `LAB`, `RESEARCH`, `RULE`, `SYNTHETIC`). Unmeasured parameters remain strictly `null` and are never fabricated."

---

### Q4: How do you detect mycotoxins?
> **Answer**:  
> "We **do not** directly detect chemical mycotoxins. Our computer vision model screens for **visible surface anomalies, superficial mould-like mycelial patterns, and aerobic discoloration**.  
> If visible fungal colonies exceed our 60% screening threshold, the decoupled safety rule engine flags the batch as `UNSAFE / DO NOT FEED` and advises the farmer to isolate suspect feed and conduct certified laboratory testing if mycotoxin contamination is suspected."

---

### Q5: Can the smartphone camera measure aflatoxin?
> **Answer**:  
> "No, and scientifically it cannot. A standard RGB CMOS camera sensor cannot quantify aflatoxin B1, zearalenone, or deoxynivalenol concentrations in parts-per-billion (ppb). Anyone claiming a standard smartphone camera directly measures aflatoxin ppb is making an unscientific claim. We detect superficial visual fungal characteristics only."

---

### Q6: How do you measure urea adulteration?
> **Answer**:  
> "We do not measure urea molecules directly. An analog pH glass electrode measures hydronium ion activity ($-\log[H^+]$). When urea or protein breaks down, it releases volatile basic ammonia-N which neutralizes lactic acid and spikes pH above 5.5–6.0. Our system flags this severe pH spike as clostridial degradation or basic adulteration, but does not claim specific molecular urea quantification."

---

### Q7: Why did you choose 55% sensor and 45% vision weighting?
> **Answer**:  
> "The 55/45 split is a **prototype engineering design weighting**, not a clinically fitted parameter. We weighted sensors at 55% because core pH and thermal rise reflect the internal anaerobic chemistry of the bunker, whereas surface photography inspects the exposed bunker face. Once our real paired on-farm dataset with laboratory HPLC validation reaches sufficient statistical power (50+ samples), we will learn these coefficients empirically via logistic regression."

---

### Q8: Your model reports 94.38% accuracy. Is that real-world field accuracy?
> **Answer**:  
> "No. **94.38% is our group-aware benchmark result on the research-informed synthetic dataset.**  
> Because the synthetic generator used threshold rules to assign labels, the Random Forest essentially learned that rule system with noise. Real-world field accuracy has not yet been established, which is why SILAGEGUARD AI is strictly positioned as a **rapid triage screening system**, not a laboratory replacement."

---

### Q9: Has this been tested on real farms?
> **Answer**:  
> "We have conducted preliminary pilot field trials with 5 silage pits in the Vidarbha dairy cluster (Nagpur and Wardha districts) to validate our sampling depth protocol, stabilization time (60 seconds), and user experience. Full statistical multi-season validation across 50+ farms is our post-hackathon roadmap."

---

### Q10: Is SILAGEGUARD AI a laboratory replacement?
> **Answer**:  
> "No. SILAGEGUARD AI is an **on-farm rapid screening tool**. It gives dairy farmers an immediate (< 2 second) safety triage before feeding suspect silage to high-yielding cattle. For legal disputes, official feed sales certification, or veterinary clinical diagnostics, certified wet-chemistry laboratory analysis (HPLC, Kjeldahl) remains the gold standard."

---

### Q11: What happens if there is no internet on the farm?
> **Answer**:  
> "SILAGEGUARD AI is **100% offline-first**.  
> The sensor Random Forest model is serialized as an 18 KB JSON tree ensemble and executes entirely inside the mobile app's JavaScript engine on Hermes in under 2 milliseconds. The vision model runs via on-device TensorFlow Lite. Telemetry travels locally over BLE GATT, and historical records are saved in local SQLite. The app requires zero network requests."

---

### Q12: How do you handle sensor calibration and drift?
> **Answer**:  
> "Our app features a dedicated 2-point buffer calibration screen (`/settings`). The farmer immerses the probe in standard pH 4.01 and pH 7.00 reference buffer solutions, and the app calculates the Nernst slope and zero-point millivolts offset, which are persisted locally. For moisture, we utilize two empirical calibration points: dry air (0% reference) and water saturation (100% reference)."

---

### Q13: How does the system handle missing sensors or missed photos?
> **Answer**:  
> "We never silently invent missing values or inject fake 50% numbers:
> * **Sensor only**: Operates in sensor-only screening mode; vision is marked as not assessed.
> * **Vision only**: Operates in surface visual anomaly mode; core chemistry is marked unmeasured.
> * **Neither available**: The system returns `INSUFFICIENT DATA` and instructs the user to insert the probe or capture photos."
