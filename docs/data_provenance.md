# 🔬 DATA PROVENANCE & AGRONOMIC FEATURE SPECIFICATION

**SILAGEGUARD AI V2 • Problem Statement: SIH26111**

---

## 1. Scientific References for Agronomic Thresholds

The diagnostic boundaries used in SILAGEGUARD AI V2 are anchored in peer-reviewed agricultural research:

1. **Kung, L., Shaver, R. D., Grant, R. J., & Schmidt, R. J. (2018)**. *Silage review: Interpretation of chemical, microbial, and organoleptic components of silages*. Journal of Dairy Science, 101(5), 4020–4033.
   - Establishes normal silage pH ranges: Corn/Maize ($3.7–4.2$), Grass ($4.3–4.7$), Legume ($4.5–5.0$).
   - Identifies $\text{pH} > 5.0$ in whole-plant corn silage as an indicator of clostridial secondary fermentation and lactic acid breakdown.
2. **Borreani, G., Tabacco, E., Schmidt, R. J., Holmes, B. J., & Muck, R. E. (2018)**. *Silage review: Factors affecting dry matter and quality losses in silages*. Journal of Dairy Science, 101(5), 3952–3979.
   - Defines optimal bunker packing density ($>225\text{ kg DM/m}^3$) and target moisture content ($60–68\%$).
   - Documents aerobic instability: exposure to oxygen reactivates spoilage yeasts that metabolize residual sugars and lactic acid, producing thermal spikes ($>3–5^\circ\text{C}$ above ambient).
3. **Muck, R. E., Nadeau, E. M., McAllister, T. A., Contreras-Govea, F. E., Santos, M. C., & Kung, L. (2018)**. *Silage review: Recent advances and future uses of silage additives*. Journal of Dairy Science, 101(5), 3980–4000.

---

## 2. Feature Provenance Matrix

| Feature | Physical Measurement Source | Unit | Agronomic Significance | Provenance Type |
|---|---|---|---|---|
| `ph` | Analog Glass Electrode (BNC to ADC) | pH (0–14) | Indicator of lactic acid concentration. Low pH ($<4.2$) inhibits pathogenic Clostridia and Listeria. | Physical Sensor |
| `moisture` | Capacitive Probe (Dielectric constant to ADC) | % ($w/w$) | Target: 60–68%. Above 72% promotes butyric fermentation and effluent leaching; below 55% hinders compaction. | Physical Sensor |
| `temperature` | DS18B20 Digital Thermometer (1-Wire) | °C | Core pit temperature at 30–80 cm insertion depth. | Physical Sensor |
| `ambient` | Probe Internal / Air Thermistor | °C | Baseline environmental ambient air temperature. | Physical Sensor |
| `delta_temp` | Derived: $\text{temperature} - \text{ambient}$ | °C | Core temperature rise above ambient air. | Derived Physical |
| `ph_deviation` | Derived: $|\text{ph} - 4.0|$ | pH units | Absolute distance from optimal lactic fermentation equilibrium. | Derived Feature |
| `moisture_deviation` | Derived: $|\text{moisture} - 64.0|$ | % units | Absolute distance from ideal bunker compaction moisture. | Derived Feature |
| `temp_rise` | Derived: $\max(0, \text{delta_temp})$ | °C | Rectified measure of active aerobic respiration and biological heating. | Derived Feature |
| `dry_matter` | Derived: $100.0 - \text{moisture}$ | % ($w/w$) | True nutritive solid fraction. | Derived Feature |

---

## 3. Separation of Synthetic vs. Field Datasets

To ensure strict compliance with Rule 1 ("No fabricated scientific evidence"):
- **`datasets/synthetic/`**: Houses all parametrically synthesized test data. It is explicitly annotated with `not_for_field_validation: true`.
- **`datasets/field/`**: Contains the pilot field observation registry where all unmeasured values are preserved as `null`. No synthetic values are ever backfilled into field records.
