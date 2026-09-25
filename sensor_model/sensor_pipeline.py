"""
SILAGEGUARD AI — Sensor Pipeline & Feature Engineering
Computes agronomic fermentation indices from raw sensor telemetry.
"""

import numpy as np
import pandas as pd
from typing import Dict, Union, List

# Optimal agronomic constants for temperate & tropical corn/forage silage
OPTIMAL_PH = 4.0
OPTIMAL_MOISTURE = 64.0

FEATURE_COLUMNS = [
    "ph",
    "moisture",
    "temperature",
    "ambient",
    "delta_temp",
    "ph_deviation",
    "moisture_deviation",
    "temp_rise"
]

LABEL_MAPPING = {
    "Safe": 0,
    "Caution": 1,
    "Unsafe": 2
}
REVERSE_LABEL_MAPPING = {v: k for k, v in LABEL_MAPPING.items()}

def engineer_sensor_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw probe telemetries into high-signal agronomic indicators:
    - delta_temp: probe temp minus ambient temp
    - ph_deviation: absolute deviation from ideal lactic acid fermentation pH (4.0)
    - moisture_deviation: absolute deviation from target bunker moisture (64%)
    - temp_rise: positive thermal spike indicating active aerobic microbial respiration
    """
    data = df.copy()
    
    # 1. Delta Temperature
    data["delta_temp"] = data["temperature"] - data["ambient"]
    
    # 2. pH Deviation
    data["ph_deviation"] = (data["ph"] - OPTIMAL_PH).abs()
    
    # 3. Moisture Deviation
    data["moisture_deviation"] = (data["moisture"] - OPTIMAL_MOISTURE).abs()
    
    # 4. Temperature Rise (Rectified linear aerobic respiration heating)
    data["temp_rise"] = np.maximum(0.0, data["delta_temp"])
    
    return data[FEATURE_COLUMNS]

def engineer_single_reading(ph: float, moisture: float, temp: float, ambient: float) -> List[float]:
    """
    Utility for single-sample inference feature calculation.
    Returns: [ph, moisture, temperature, ambient, delta_temp, ph_deviation, moisture_deviation, temp_rise]
    """
    delta_temp = temp - ambient
    ph_dev = abs(ph - OPTIMAL_PH)
    moist_dev = abs(moisture - OPTIMAL_MOISTURE)
    temp_rise = max(0.0, delta_temp)
    
    return [
        float(ph),
        float(moisture),
        float(temp),
        float(ambient),
        round(delta_temp, 3),
        round(ph_dev, 3),
        round(moist_dev, 3),
        round(temp_rise, 3)
    ]
