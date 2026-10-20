"""
SILAGEGUARD AI — Deterministic Agronomic Safety Rule Engine
Enforces peer-reviewed agronomic overrides (Kung et al. 2018, Borreani et al. 2018).
Statistical ML predictions must NEVER override deterministic safety rules.
"""
from __future__ import annotations

from typing import Any


def evaluate_safety_rules(
    ph: float | None = None,
    moisture: float | None = None,
    temperature: float | None = None,
    ambient: float | None = 25.0,
    vision_prediction: str | None = None,
    detected_class: str | None = None,
) -> dict[str, Any]:
    """
    Evaluates physical sensor telemetry and vision predictions against deterministic
    dairy science thresholds.
    Returns:
        triggered: bool
        override_verdict: str | None ("CAUTION" | "UNSAFE")
        reasons: list[str]
        severity: str ("NORMAL" | "CAUTION" | "UNSAFE")
    """
    reasons: list[str] = []
    override_verdict: str | None = None

    # Rule 1: High pH Spoilage Threshold
    if ph is not None:
        if ph >= 5.0:
            override_verdict = "UNSAFE"
            reasons.append(f"Silage pH ({ph:.2f}) exceeds clostridial danger threshold (≥ 5.0). Risk of clostridial fermentation and butyric acid.")
        elif ph >= 4.5:
            if override_verdict != "UNSAFE":
                override_verdict = "CAUTION"
            reasons.append(f"Silage pH ({ph:.2f}) indicates suboptimal lactic acidification (target 3.8–4.2).")

    # Rule 2: Heat Rise / Delta Temp Spoilage Threshold
    if temperature is not None:
        amb = ambient if ambient is not None else 25.0
        delta_temp = temperature - amb
        if delta_temp >= 8.0:
            override_verdict = "UNSAFE"
            reasons.append(f"Core heating (+{delta_temp:.1f}°C above ambient) indicates severe aerobic runaway heating.")
        elif delta_temp >= 4.0:
            if override_verdict != "UNSAFE":
                override_verdict = "CAUTION"
            reasons.append(f"Elevated heat rise (+{delta_temp:.1f}°C above ambient) indicates early aerobic instability.")

    # Rule 3: High Moisture Clostridial Vulnerability
    if moisture is not None:
        if moisture > 72.0:
            if override_verdict != "UNSAFE":
                override_verdict = "CAUTION"
            reasons.append(f"High moisture content ({moisture:.1f}% > 72%) creates clostridial fermentation risk.")

    # Rule 4: Visual Pathogen / Mould / Foreign Object Contamination
    if vision_prediction == "UNSAFE" or detected_class in ("Mould", "Spoilage", "Foreign_object"):
        override_verdict = "UNSAFE"
        reasons.append(f"Visual screening identified physical contamination or fungal growth: {detected_class or 'Mould/Spoilage'}.")

    triggered = override_verdict is not None
    return {
        "triggered": triggered,
        "override_verdict": override_verdict,
        "reasons": reasons,
        "severity": override_verdict or "NORMAL",
    }
