"""
SILAGEGUARD AI V2 — Agronomic Sensor Dataset Builder
Generates a realistic research-grounded sensor dataset with natural biological variance,
class boundary overlap, and pit/farm cluster grouping for leakage-safe validation.
Conforms to Kung et al. (2018) and Borreani et al. (2018).
"""

import os
import random
import numpy as np
import pandas as pd

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

OUTPUT_CSV = os.path.join(PROCESSED_DIR, "silage_sensor_v2.csv")

def generate_realistic_silage_dataset(n_pits=60, samples_per_pit=40):
    """
    Simulates physical core probe measurements across 60 bunker pits and trenches.
    Groups samples by pit_id to evaluate GroupKFold generalization.
    Introduces natural biological noise and borderline transition cases.
    """
    records = []
    
    crops = ["Corn Silage", "Hybrid Napier Grass", "Sorghum (Jowar)", "Lucerne Mix"]
    
    pit_counter = 0
    for pit_idx in range(n_pits):
        pit_counter += 1
        pit_id = f"PIT-{pit_counter:03d}"
        farm_id = f"FARM-{(pit_idx // 6) + 1:02d}"
        crop = crops[pit_idx % len(crops)]
        
        # Assign pit condition archetype:
        # 45% well-managed anaerobic pits (Safe)
        # 30% borderline/moderately exposed pits (Caution)
        # 25% poorly sealed or clostridial spoiled pits (Unsafe)
        rand_type = random.random()
        if rand_type < 0.45:
            pit_condition = "Safe"
            base_ph = random.uniform(3.82, 4.15)
            base_moisture = random.uniform(61.0, 66.5)
            base_ambient = random.uniform(22.0, 32.0)
            base_delta_t = random.uniform(0.5, 2.2)
        elif rand_type < 0.75:
            pit_condition = "Caution"
            base_ph = random.uniform(4.35, 4.75)
            base_moisture = random.choice([random.uniform(55.5, 59.5), random.uniform(68.5, 71.5)])
            base_ambient = random.uniform(22.0, 32.0)
            base_delta_t = random.uniform(3.8, 6.8)
        else:
            pit_condition = "Unsafe"
            base_ph = random.uniform(5.15, 6.80)
            base_moisture = random.choice([random.uniform(73.0, 82.0), random.uniform(45.0, 52.0)])
            base_ambient = random.uniform(22.0, 32.0)
            base_delta_t = random.uniform(8.5, 16.0)
            
        for s in range(samples_per_pit):
            sample_id = f"{pit_id}-S{s+1:02d}"
            depth_cm = random.choice([20, 40, 60, 80])
            
            # Add spatial & depth gradient within pit (deeper = cooler & more acidic)
            depth_factor = (depth_cm - 40) / 100.0
            
            ph = base_ph - (depth_factor * 0.15) + np.random.normal(0, 0.12)
            ph = max(3.4, min(8.8, ph))
            
            moisture = base_moisture + np.random.normal(0, 1.8)
            moisture = max(40.0, min(88.0, moisture))
            
            ambient = base_ambient + np.random.normal(0, 0.8)
            
            # Temperature fluctuates based on surface exposure vs core depth
            delta_t = base_delta_t - (depth_factor * 2.0) + np.random.normal(0, 1.1)
            temp = ambient + delta_t
            
            dry_matter = round(100.0 - moisture, 2)
            
            # Ground truth screening label determined by multi-factor agronomic criteria
            # with non-zero class overlap representing borderline biological cases
            score = 0
            if ph <= 4.25: score += 2
            elif ph <= 4.80: score += 1
            
            if 60.0 <= moisture <= 68.0: score += 2
            elif 54.0 <= moisture <= 72.0: score += 1
            
            if delta_t <= 3.0: score += 2
            elif delta_t <= 7.0: score += 1
            
            if score >= 5:
                label = "Safe"
            elif score >= 3:
                label = "Caution"
            else:
                label = "Unsafe"
                
            records.append({
                "sample_id": sample_id,
                "pit_id": pit_id,
                "farm_id": farm_id,
                "crop_type": crop,
                "depth_cm": depth_cm,
                "ph": round(float(ph), 2),
                "moisture": round(float(moisture), 1),
                "temperature": round(float(temp), 1),
                "ambient": round(float(ambient), 1),
                "dry_matter": dry_matter,
                "label": label,
                "label_source": "AGRONOMIC_MULTIFACTOR_REFERENCE"
            })
            
    df = pd.DataFrame(records)
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Generated {len(df)} records across {n_pits} pits in {OUTPUT_CSV}")
    print("Class Distribution:")
    print(df["label"].value_counts(normalize=True).round(3))
    return df

if __name__ == "__main__":
    generate_realistic_silage_dataset()
