"""
SILAGEGUARD AI V3 — 11-Feature Sensor Pipeline & Feature Engineering
Features:
  1. ph (measured acidity)
  2. moisture_adc (capacitive raw ADC reading, calibrated to moisture %)
  3. temperature (probe core temperature in °C)
  4. ambient (ambient reference temperature in °C)
  5. delta_temp (core temp minus ambient)
  6. ph_dev (absolute deviation from optimal lactic pH 4.0)
  7. moisture_dev (absolute deviation from target moisture 64%)
  8. heat_rise (rectified aerobic respiration spike max(0, delta_temp))
  9. storage_type (categorical index: 0=Bunker, 1=Bag, 2=Tower, 3=Bale, 4=Clamp)
  10. crop_type (categorical index: 0=Corn, 1=Sorghum, 2=Napier, 3=Alfalfa, 4=Other)
  11. depth_bucket (categorical index: 0=20cm, 1=40cm, 2=60cm, 3=80cm)
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List

OPTIMAL_PH = 4.0
OPTIMAL_MOISTURE = 64.0

FEATURE_COLUMNS = [
    "ph",
    "moisture_adc",
    "temperature",
    "ambient",
    "delta_temp",
    "ph_dev",
    "moisture_dev",
    "heat_rise",
    "storage_type",
    "crop_type",
    "depth_bucket"
]

LABEL_MAPPING = {
    "Safe": 0,
    "Caution": 1,
    "Unsafe": 2,
    "SAFE": 0,
    "CAUTION": 1,
    "UNSAFE": 2
}
REVERSE_LABEL_MAPPING = {0: "SAFE", 1: "CAUTION", 2: "UNSAFE"}

def moisture_pct_to_adc(moisture_pct: float) -> int:
    """Converts moisture % (45-80%) to calibrated capacitive ADC reading (1200 - 3200)."""
    # 0% moisture -> 3200 (dry air), 100% moisture -> 1200 (water)
    adc = 3200 - (moisture_pct / 100.0) * 2000
    return int(np.clip(adc, 1100, 3300))

def adc_to_moisture_pct(adc: int) -> float:
    pct = ((3200 - adc) / 2000.0) * 100.0
    return float(np.clip(pct, 0.0, 100.0))

def engineer_features(raw_df: pd.DataFrame) -> pd.DataFrame:
    df = raw_df.copy()

    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]

    # Convert moisture to moisture_adc if not present
    if "moisture_adc" not in df.columns:
        if "moisture" in df.columns:
            df["moisture_adc"] = df["moisture"].apply(moisture_pct_to_adc)
        else:
            df["moisture_adc"] = 1920

    # Delta temp
    df["delta_temp"] = df["temperature"] - df["ambient"]

    # Deviations
    df["ph_dev"] = (df["ph"] - OPTIMAL_PH).abs()
    moisture_pct = df["moisture"] if "moisture" in df.columns else df["moisture_adc"].apply(adc_to_moisture_pct)
    df["moisture_dev"] = (moisture_pct - OPTIMAL_MOISTURE).abs()

    # Heat rise
    df["heat_rise"] = np.maximum(0.0, df["delta_temp"])

    # Categorical defaults if not present
    if "storage_type" not in df.columns:
        df["storage_type"] = 0
    if "crop_type" not in df.columns:
        df["crop_type"] = 0
    if "depth_bucket" not in df.columns:
        df["depth_bucket"] = 1

    return df[FEATURE_COLUMNS]

def explain_prediction(features_dict: Dict[str, float], importances: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Computes top contributing factors for a single prediction.
    e.g. High pH contributed +23%, High moisture +18%, Normal temperature -8%.
    """
    ph = features_dict.get("ph", 4.0)
    delta_temp = features_dict.get("delta_temp", 1.0)
    moisture_dev = features_dict.get("moisture_dev", 2.0)

    factors = []

    # pH factor
    ph_weight = importances.get("ph", 0.35)
    if ph > 4.6:
        pct = round(ph_weight * 100 * (ph - 4.0) / 1.5, 1)
        factors.append({
            "factor": f"High pH Acidity ({ph:.2f})",
            "contribution_percent": min(pct, 45.0),
            "rationale": "pH above 4.6 indicates failed lactic acid fermentation and clostridial risk."
        })
    elif ph <= 4.2:
        factors.append({
            "factor": f"Optimal pH Acidity ({ph:.2f})",
            "contribution_percent": -15.0,
            "rationale": "pH between 3.8-4.2 strongly suppresses enterobacteria."
        })

    # Delta Temp factor
    dt_weight = importances.get("delta_temp", 0.30)
    if delta_temp > 3.0:
        pct = round(dt_weight * 100 * delta_temp / 8.0, 1)
        factors.append({
            "factor": f"Core Heat Rise (+{delta_temp:.1f}°C)",
            "contribution_percent": min(pct, 38.0),
            "rationale": "Temperature elevation signifies active aerobic microbial respiration destroying energy."
        })
    else:
        factors.append({
            "factor": f"Normal Thermal Core (+{delta_temp:.1f}°C)",
            "contribution_percent": -10.0,
            "rationale": "Core is in thermal equilibrium with ambient bunker surroundings."
        })

    # Moisture factor
    m_weight = importances.get("moisture_dev", 0.20)
    if moisture_dev > 6.0:
        factors.append({
            "factor": f"Moisture Imbalance (±{moisture_dev:.1f}%)",
            "contribution_percent": 18.0,
            "rationale": "Deviation from optimal 60-68% range promotes clostridial or fungal spoilage."
        })
    else:
        factors.append({
            "factor": f"Optimal Moisture Band",
            "contribution_percent": -8.0,
            "rationale": "Silage moisture supports dense packing and anaerobic consolidation."
        })

    # Sort by absolute contribution
    factors.sort(key=lambda x: abs(x["contribution_percent"]), reverse=True)
    return factors


def engineer_single_reading(
    ph: float,
    moisture: float,
    temperature: float,
    ambient: float,
    storage_type: int = 0,
    crop_type: int = 0,
    depth_bucket: int = 1
) -> List[float]:
    """Engineers the 11-feature vector from a single raw sensor reading."""
    moisture_adc = moisture_pct_to_adc(moisture)
    delta_temp = temperature - ambient
    ph_dev = abs(ph - OPTIMAL_PH)
    moisture_dev = abs(moisture - OPTIMAL_MOISTURE)
    heat_rise = max(0.0, delta_temp)
    return [
        float(ph),
        float(moisture_adc),
        float(temperature),
        float(ambient),
        float(delta_temp),
        float(ph_dev),
        float(moisture_dev),
        float(heat_rise),
        float(storage_type),
        float(crop_type),
        float(depth_bucket)
    ]
