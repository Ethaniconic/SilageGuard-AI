"""
SilageGuard AI — MSSI Fusion Engine (src/fuse.py)
SIH26111 | Phase 5

Multi-Signal Silage Index (MSSI) fuses:
  - Sensor model probabilities   (weight 0.55)
  - Vision model probabilities   (weight 0.45)

Deterministic rule overrides are applied AFTER fusion to enforce
hard domain constraints that ML alone may violate.

Usage:
    from src.fuse import mssi_fuse
    decision, reason = mssi_fuse(sensor_probs, vision_probs, sensor_raw)
"""

import numpy as np
from typing import Tuple

# Label index map (must match training label_map)
SAFE    = 0
CAUTION = 1
UNSAFE  = 2
IDX_TO_LABEL = {SAFE: "safe", CAUTION: "caution", UNSAFE: "unsafe"}


# ── Rule overrides ─────────────────────────────────────────────────────────────
# Each entry: (condition_fn, forced_class, reason_string)
# Conditions are evaluated IN ORDER; first match wins.
# Thresholds derived from silage fermentation literature:
#   pH >6.0     → aerobic deterioration virtually certain
#   pH >5.5 AND Δtemp >8 °C → secondary fermentation onset
#   Δtemp >10 °C alone        → active heating / spoilage
#   pH <4.0 AND moist <55%   → over-dry & over-acidic → safe lactic
#   pH >4.8 AND moist >70%   → excess moisture, risk of clostridial activity

RULE_OVERRIDES = [
    # Rule 1: Advanced spoilage — pH high
    (
        lambda s: s["ph"] > 6.0,
        UNSAFE,
        "Rule 1: pH > 6.0 — advanced spoilage",
    ),
    # Rule 2: Clostridial fermentation
    (
        lambda s: s["ph"] > 5.5 and (s["temperature"] - s["ambient"]) > 8.0,
        UNSAFE,
        "Rule 2: pH > 5.5 and ΔT > 8°C — clostridial fermentation",
    ),
    # Rule 3: Active aerobic spoilage
    (
        lambda s: (s["temperature"] - s["ambient"]) > 10.0,
        UNSAFE,
        "Rule 3: ΔT > 10°C — active aerobic spoilage",
    ),
    # Rule 4: Well-preserved zone
    (
        lambda s: s["ph"] < 4.0 and s["moisture"] < 55.0,
        SAFE,
        "Rule 4: pH < 4.0 and moisture < 55% — well-preserved",
    ),
    # Rule 5: Marginal fermentation
    (
        lambda s: s["ph"] > 4.8 and s["moisture"] > 70.0,
        CAUTION,
        "Rule 5: pH > 4.8 and moisture > 70% — marginal fermentation",
    ),
    # Rule 6: Thermal runaway emergency
    (
        lambda s: (s["temperature"] - s["ambient"]) > 15.0,
        UNSAFE,
        "Rule 6: ΔT > 15°C — critical thermal runaway emergency",
    ),
    # Rule 7: Ideal preservation sweet spot
    (
        lambda s: s["ph"] < 4.2 and 60.0 <= s["moisture"] <= 68.0 and (s["temperature"] - s["ambient"]) < 3.0,
        SAFE,
        "Rule 7: pH < 4.2, moisture 60–68%, ΔT < 3°C — ideal preservation zone",
    ),
]


def mssi_fuse(
    sensor_probs: list | np.ndarray,
    vision_probs: list | np.ndarray,
    sensor_raw:   dict,
    w_sensor:     float = 0.55,
    w_vision:     float = 0.45,
) -> Tuple[int, str]:
    """
    Compute the fused safety decision.

    Parameters
    ----------
    sensor_probs : array-like of shape (3,)
        Class probabilities [P(safe), P(caution), P(unsafe)] from sensor model.
    vision_probs : array-like of shape (3,)
        Class probabilities [P(safe), P(caution), P(unsafe)] from vision model.
    sensor_raw   : dict with keys "ph", "moisture", "temperature", "ambient"
        Raw sensor readings used for rule-override evaluation.
    w_sensor / w_vision : fusion weights (must sum to 1.0)

    Returns
    -------
    (decision_index, reason_string)
        decision_index ∈ {0, 1, 2}  → {"safe", "caution", "unsafe"}
    """
    sp = np.asarray(sensor_probs, dtype=float)
    vp = np.asarray(vision_probs, dtype=float)

    # Soft-weighted fusion
    fused    = w_sensor * sp + w_vision * vp
    decision = int(np.argmax(fused))
    reason   = f"MSSI fusion (sensor×{w_sensor} + vision×{w_vision})"

    # Rule overrides
    for condition_fn, forced_class, override_reason in RULE_OVERRIDES:
        try:
            if condition_fn(sensor_raw):
                return forced_class, override_reason
        except (KeyError, TypeError):
            continue  # skip malformed sensor_raw entries

    return decision, reason


def fuse_with_label(
    sensor_probs: list | np.ndarray,
    vision_probs: list | np.ndarray,
    sensor_raw:   dict,
    w_sensor:     float = 0.55,
    w_vision:     float = 0.45,
) -> Tuple[str, float, str]:
    """
    Convenience wrapper returning (label, confidence, reason).

    confidence is the fused probability of the winning class.
    """
    sp = np.asarray(sensor_probs, dtype=float)
    vp = np.asarray(vision_probs, dtype=float)
    fused      = w_sensor * sp + w_vision * vp
    idx, reason = mssi_fuse(sensor_probs, vision_probs, sensor_raw, w_sensor, w_vision)
    confidence  = float(fused[idx])
    label       = IDX_TO_LABEL[idx]
    return label, confidence, reason


# ── CLI smoke test ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    print("=== MSSI Fusion - Smoke Tests ===\n")

    cases = [
        {
            "desc": "Good silage (all safe)",
            "sensor": [0.80, 0.15, 0.05],
            "vision": [0.75, 0.20, 0.05],
            "raw":    {"ph": 4.0, "moisture": 63.0, "temperature": 30.0, "ambient": 28.0},
        },
        {
            "desc": "pH > 6.0 (rule override → unsafe)",
            "sensor": [0.40, 0.35, 0.25],
            "vision": [0.45, 0.35, 0.20],
            "raw":    {"ph": 6.3, "moisture": 65.0, "temperature": 34.0, "ambient": 28.0},
        },
        {
            "desc": "High delta-T (rule override → unsafe)",
            "sensor": [0.30, 0.40, 0.30],
            "vision": [0.25, 0.45, 0.30],
            "raw":    {"ph": 5.0, "moisture": 68.0, "temperature": 42.0, "ambient": 28.0},
        },
        {
            "desc": "High moisture caution",
            "sensor": [0.20, 0.50, 0.30],
            "vision": [0.20, 0.45, 0.35],
            "raw":    {"ph": 5.0, "moisture": 74.0, "temperature": 32.0, "ambient": 29.0},
        },
    ]

    for case in cases:
        label, conf, reason = fuse_with_label(
            case["sensor"], case["vision"], case["raw"]
        )
        print(f"  {case['desc']}")
        print(f"    -> {label.upper()} ({conf:.1%} confidence)")
        print(f"    -> {reason}\n")
