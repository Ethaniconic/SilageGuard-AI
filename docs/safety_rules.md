# 🛡️ SILAGEGUARD AI V2 — SAFETY RULE ENGINE & THRESHOLD SPECIFICATION

**Version**: `rules_v2.0`  
**Problem Statement**: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System  
**Maintainers**: The Bro-grammers (SIH 2026)

---

## 1. Safety Rule Architecture

In SILAGEGUARD AI V2, ML probabilistic evidence and agronomic safety rules are strictly decoupled:

```
[ Sensor Features ] ──► [ Random Forest (sensor_rf_v2.0) ] ──► [ Sensor Evidence Score ]
                                                                       │
[ 3-Photo Camera  ] ──► [ MobileNetV3 (mobilenetv3_v2.0) ] ──► [ Vision Evidence Score ]
                                                                       │
                                                         ▼
                                          [ Weighted Multimodal Fusion (MSSI) ]
                                          (Prototype Weights: 0.55 / 0.45)
                                                               │
                                                               ▼
                                          [ Decoupled Safety Rule Engine ]
                                          (Literature Thresholds & Precautionary Overrides)
                                                               │
                                                               ▼
                                                  [ FINAL SCREENING VERDICT ]
                                            (SAFE / CAUTION / UNSAFE / DO NOT FEED)
```

If an agronomic safety invariant is breached, the rule engine overrides the model's weighted score and flags `override = true` on the mobile UI.

---

## 2. Invariant Threshold Catalog

| Rule ID | Parameter | Threshold | Unit | Rule Type | Literature Source | Agronomic Risk Prevented |
|---|---|---|---|---|---|---|
| `RULE_PH_CRITICAL` | `ph` | $> 6.0$ | pH units | **Hard Override $\to$ DO NOT FEED** | Kung et al. (2018), J. Dairy Sci. | Clostridial secondary fermentation, protein breakdown into volatile ammonia-N, loss of anaerobic buffering. |
| `RULE_TEMP_RISE_CRITICAL` | `temp_rise` ($\Delta T$) | $> 10.0^\circ\text{C}$ | °C above ambient | **Hard Override $\to$ DO NOT FEED** | Borreani et al. (2018), J. Dairy Sci. | Runaway aerobic biological heating caused by opportunistic yeasts destroying carbohydrates and dry matter. |
| `RULE_MOULD_DETECTED` | `mould_prob` | $> 0.60$ | probability fraction | **Hard Override $\to$ DO NOT FEED** | Precautionary Screening Heuristic (`PROTOTYPE_HEURISTIC`) | Fungal mycelial proliferation signals potential mycotoxin presence (*Aspergillus*, *Penicillium*, *Fusarium*). |
| `RULE_IDEAL_FERMENTATION` | `ph`, `moisture`, $\Delta T$, `mould` | $3.8 \le \text{pH} \le 4.2$, $60 \le M \le 68$, $\Delta T < 3$, Mould $< 0.15$ | Compound | **Positive Invariant $\to$ SAFE TO FEED** | Kung et al. (2018); Borreani et al. (2018) | Gold-standard anaerobic lactic preservation with minimal nutrient loss and zero visual spoilage. |

---

## 3. Communication Guidelines for Livestock Hazards

### 3.1 Mycotoxin Communication Policy
* ❌ **Prohibited Statement**: *"AI has verified that silage has 0 ppb aflatoxin."* or *"Camera detected aflatoxin."*
* ✔️ **Approved Statement**: *"Visible mould-like pattern detected. This may indicate contamination risk. Laboratory testing is recommended if mycotoxin contamination is suspected."*

### 3.2 Urea Adulteration Communication Policy
* ❌ **Prohibited Statement**: *"pH sensor detected urea adulteration."*
* ✔️ **Approved Statement**: *"Sensor readings show an abnormal alkaline fermentation pattern (pH > 6.0). Further investigation or laboratory enzymatic analysis is required."*
