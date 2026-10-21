"""
SILAGEGUARD AI — Deterministic Longitudinal Digital Twin Engine (Backend Python Port)
Derives continuous Digital Twin state, baseline comparison, daily drift rates,
multi-signal deterioration detection, evidence, and farmer recommendations.
100% mathematical parity with frontend/services/ai/digitalTwinEngine.js.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


VISION_SEVERITY_RANK = {
    "HEALTHY": 0,
    "SAFE": 0,
    "GOOD": 0,
    "ABNORMAL_APPEARANCE": 1,
    "FOREIGN_OBJECT": 1,
    "WATCH": 1,
    "CAUTION": 1,
    "MOULD": 2,
    "SPOILAGE": 2,
    "UNSAFE": 2,
    "HIGH RISK": 2,
    "HIGH_RISK": 2,
}


def normalize_observation(raw: dict[str, Any] | Any, index: int = 0) -> dict[str, Any]:
    if hasattr(raw, "__dict__"):
        d = raw.__dict__
    elif isinstance(raw, dict):
        d = raw
    else:
        d = {}

    raw_date = d.get("observed_at") or d.get("scanned_at") or d.get("created_at")
    dt = None
    if isinstance(raw_date, datetime):
        dt = raw_date
    elif isinstance(raw_date, str):
        try:
            dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        except Exception:
            dt = None

    ph = d.get("ph")
    ph_val = round(float(ph), 2) if ph is not None else None

    moisture = d.get("moisture_pct") if d.get("moisture_pct") is not None else d.get("moisture")
    moisture_val = round(float(moisture), 1) if moisture is not None else None

    temp = d.get("temperature_c") if d.get("temperature_c") is not None else d.get("temperature")
    temp_val = round(float(temp), 1) if temp is not None else None

    ambient = d.get("ambient_temp_c") if d.get("ambient_temp_c") is not None else d.get("ambient")
    ambient_val = round(float(ambient), 1) if ambient is not None else 25.0

    delta_temp = round(temp_val - ambient_val, 1) if temp_val is not None else None

    mssi = d.get("mssi_score")
    if mssi is None and d.get("fused_score") is not None:
        mssi = int(float(d["fused_score"]) * 100)
    mssi_val = max(0, min(100, int(mssi))) if mssi is not None else 85

    decision = str(d.get("decision") or d.get("fused_decision") or "SAFE").upper().strip()
    verdict = "GOOD" if decision == "SAFE" else "WATCH" if decision == "CAUTION" else "HIGH RISK" if decision == "UNSAFE" else decision

    vision_class = str(d.get("vision_class") or d.get("vision_decision") or ("Healthy" if verdict == "GOOD" else "Silage")).strip()

    return {
        "id": str(d.get("id") or f"OBS-{index}"),
        "client_batch_id": str(d.get("client_batch_id") or d.get("batch_id") or "BATCH-UNKNOWN"),
        "observation_number": index + 1,
        "observed_at": dt.isoformat() if dt else None,
        "dt": dt,
        "ph": ph_val,
        "moisture": moisture_val,
        "temperature": temp_val,
        "ambient": ambient_val,
        "delta_temp": delta_temp,
        "mssi_score": mssi_val,
        "decision": decision,
        "verdict": verdict,
        "vision_class": vision_class,
        "summary": d.get("advisory_text") or d.get("summary") or "Screening complete.",
        "image_urls": d.get("image_urls") or [],
    }


def derive_digital_twin(raw_observations: list[Any], batch_metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    batch_meta = batch_metadata or {}
    if not raw_observations:
        return {
            "batch_id": batch_meta.get("client_batch_id") or "EMPTY",
            "crop_type": batch_meta.get("crop_type") or "Corn Silage",
            "storage_type": batch_meta.get("storage_type") or "Bunker Pit",
            "observation_count": 0,
            "baseline": None,
            "latest": None,
            "previous": None,
            "changes": None,
            "rates_per_day": None,
            "trend_direction": "UNOBSERVED",
            "deterioration_detected": False,
            "warning_level": "STABLE",
            "warning_reasons": ["No observations recorded yet for this batch."],
            "recommended_action": "Perform initial silage probe check and photo to establish baseline.",
            "timeline": [],
            "last_updated": datetime.utcnow().isoformat(),
        }

    # 1. Normalize and sort chronologically
    normalized = [normalize_observation(obs, idx) for idx, obs in enumerate(raw_observations)]
    normalized = [n for n in normalized if n is not None]
    normalized.sort(key=lambda x: x["dt"].timestamp() if x["dt"] else 0)

    count = len(normalized)
    baseline = normalized[0]
    latest = normalized[-1]
    previous = normalized[-2] if count >= 2 else None

    # 2. Build Timeline items
    timeline = []
    for idx, obs in enumerate(normalized):
        is_baseline = (idx == 0)
        dt_str = obs["observed_at"] or f"Check #{idx + 1}"
        timeline.append({
            "step": idx + 1,
            "id": obs["id"],
            "is_baseline": is_baseline,
            "observed_at": dt_str,
            "decision": obs["verdict"],
            "mssi_score": obs["mssi_score"],
            "ph": obs["ph"],
            "temperature": obs["temperature"],
            "moisture": obs["moisture"],
            "delta_temp": obs["delta_temp"],
            "vision_class": obs["vision_class"],
            "note": "Initial Baseline Reference" if is_baseline else f"Check #{idx + 1}: MSSI {obs['mssi_score']} ({obs['verdict']})"
        })

    # 3. Single observation: Establish Baseline & Status, NEVER a trend
    if count == 1:
        is_immediate_critical = (
            latest["verdict"] == "HIGH RISK" or
            (latest["ph"] is not None and latest["ph"] >= 5.0) or
            (latest["delta_temp"] is not None and latest["delta_temp"] >= 8.0)
        )
        return {
            "batch_id": batch_meta.get("client_batch_id") or latest["client_batch_id"],
            "crop_type": batch_meta.get("crop_type") or "Corn Silage",
            "storage_type": batch_meta.get("storage_type") or "Bunker Pit",
            "observation_count": 1,
            "baseline": baseline,
            "latest": latest,
            "previous": None,
            "changes": {
                "from_baseline": {"ph": 0.0, "temperature": 0.0, "delta_temp": 0.0, "moisture": 0.0, "mssi": 0},
                "from_previous": None,
            },
            "rates_per_day": None,
            "trend_direction": "BASELINE",
            "deterioration_detected": False,
            "warning_level": "HIGH_RISK" if is_immediate_critical else "STABLE",
            "warning_reasons": (
                ["Immediate single-check alert: Core measurements crossed safety threshold."]
                if is_immediate_critical
                else ["Initial baseline established. Further checks required to detect trend."]
            ),
            "recommended_action": (
                "Review immediate physical measurements. Discard discolored face layers and consult nutritionist."
                if is_immediate_critical
                else "Initial baseline established. Conduct a second check in 2–3 days to begin monitoring longitudinal trends."
            ),
            "timeline": timeline,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    # 4. Changes from Baseline and Previous
    d_ph_base = round(latest["ph"] - baseline["ph"], 2) if (latest["ph"] is not None and baseline["ph"] is not None) else None
    d_temp_base = round(latest["temperature"] - baseline["temperature"], 1) if (latest["temperature"] is not None and baseline["temperature"] is not None) else None
    d_delta_temp_base = round(latest["delta_temp"] - baseline["delta_temp"], 1) if (latest["delta_temp"] is not None and baseline["delta_temp"] is not None) else None
    d_moisture_base = round(latest["moisture"] - baseline["moisture"], 1) if (latest["moisture"] is not None and baseline["moisture"] is not None) else None
    d_mssi_base = (latest["mssi_score"] - baseline["mssi_score"]) if (latest["mssi_score"] is not None and baseline["mssi_score"] is not None) else 0

    d_ph_prev = round(latest["ph"] - previous["ph"], 2) if (latest["ph"] is not None and previous["ph"] is not None) else None
    d_temp_prev = round(latest["temperature"] - previous["temperature"], 1) if (latest["temperature"] is not None and previous["temperature"] is not None) else None
    d_delta_temp_prev = round(latest["delta_temp"] - previous["delta_temp"], 1) if (latest["delta_temp"] is not None and previous["delta_temp"] is not None) else None
    d_moisture_prev = round(latest["moisture"] - previous["moisture"], 1) if (latest["moisture"] is not None and previous["moisture"] is not None) else None
    d_mssi_prev = (latest["mssi_score"] - previous["mssi_score"]) if (latest["mssi_score"] is not None and previous["mssi_score"] is not None) else 0

    # 5. Rates Per Day
    rates_per_day = None
    if latest["dt"] and baseline["dt"] and latest["dt"] > baseline["dt"]:
        seconds_elapsed = (latest["dt"] - baseline["dt"]).total_seconds()
        days_elapsed = seconds_elapsed / 86400.0
        if days_elapsed >= 0.05:  # at least ~1.2 hours
            rates_per_day = {
                "days_elapsed": round(days_elapsed, 1),
                "ph_per_day": round(d_ph_base / days_elapsed, 2) if d_ph_base is not None else None,
                "temp_per_day": round(d_temp_base / days_elapsed, 1) if d_temp_base is not None else None,
                "mssi_per_day": round(d_mssi_base / days_elapsed, 1),
            }

    # 6. Signals
    triggers = []
    reasons = []

    if d_ph_prev is not None and d_ph_prev >= 0.25:
        triggers.append("PH_RISING")
        reasons.append(f"Acidity shifting: pH increased by +{d_ph_prev:.2f} since previous check.")
    elif d_ph_base is not None and d_ph_base >= 0.35:
        triggers.append("PH_RISING")
        reasons.append(f"Acidity shifting: pH increased by +{d_ph_base:.2f} compared with initial baseline.")

    if d_temp_prev is not None and d_temp_prev >= 2.0:
        triggers.append("TEMP_RISING")
        reasons.append(f"Core temperature rose by +{d_temp_prev:.1f}°C since previous check.")
    elif d_temp_base is not None and d_temp_base >= 3.0:
        triggers.append("TEMP_RISING")
        reasons.append(f"Core temperature rose by +{d_temp_base:.1f}°C above initial baseline.")

    if latest["delta_temp"] is not None and latest["delta_temp"] >= 4.0:
        triggers.append("THERMAL_STRESS")
        reasons.append(f"Thermal differential is elevated at +{latest['delta_temp']:.1f}°C above ambient.")
    elif d_delta_temp_prev is not None and d_delta_temp_prev >= 1.5:
        triggers.append("THERMAL_STRESS")
        reasons.append(f"Thermal gap expanded by +{d_delta_temp_prev:.1f}°C.")

    if d_mssi_prev <= -8:
        triggers.append("MSSI_DECLINE")
        reasons.append(f"Silage Stability Index dropped by {d_mssi_prev} points since previous check.")
    elif d_mssi_base <= -15:
        triggers.append("MSSI_DECLINE")
        reasons.append(f"Silage Stability Index has dropped by {d_mssi_base} points since baseline.")

    latest_rank = VISION_SEVERITY_RANK.get(latest["vision_class"].upper(), VISION_SEVERITY_RANK.get(latest["verdict"], 0))
    prev_rank = VISION_SEVERITY_RANK.get(previous["vision_class"].upper(), VISION_SEVERITY_RANK.get(previous["verdict"], 0))
    if latest_rank > prev_rank:
        triggers.append("VISUAL_WORSENING")
        reasons.append(f"Visual surface appearance worsened ({previous['vision_class']} → {latest['vision_class']}).")

    is_immediate_critical = (
        latest["verdict"] == "HIGH RISK" or
        (latest["ph"] is not None and latest["ph"] >= 5.0) or
        (latest["delta_temp"] is not None and latest["delta_temp"] >= 8.0) or
        latest["vision_class"] in ["Mould", "Spoilage"]
    )

    if is_immediate_critical:
        warning_level = "HIGH_RISK"
        deterioration_detected = True
        trend_direction = "DETERIORATING"
        if not reasons:
            reasons.append("Critical screening threshold crossed in latest physical reading.")
    elif len(triggers) >= 2:
        warning_level = "EARLY_DETERIORATION"
        deterioration_detected = True
        trend_direction = "DETERIORATING"
    elif len(triggers) == 1:
        warning_level = "WATCH"
        deterioration_detected = False
        trend_direction = "WATCH_SHIFT"
    else:
        if d_mssi_base >= 6 and (d_ph_base is not None and d_ph_base <= -0.15):
            trend_direction = "IMPROVING"
            reasons.append("Fermentation parameters demonstrate stabilizing acidity and high MSSI.")
        else:
            trend_direction = "STABLE"
            reasons.append("Fermentation parameters remain steady across checks.")
        warning_level = "STABLE"
        deterioration_detected = False

    if warning_level == "HIGH_RISK":
        recommended_action = (
            "Do not feed visibly deteriorated sections to cattle. Scrape off and discard surface spoilage immediately. Inspect face sealing and consult a livestock nutritionist."
        )
    elif warning_level == "EARLY_DETERIORATION":
        recommended_action = (
            "Multiple deterioration indicators detected. Inspect the bunker pit face for air pockets or loose compaction. Increase daily feed-out speed and re-test within 24 hours."
        )
    elif warning_level == "WATCH":
        recommended_action = (
            "Monitor this batch again in 24–48 hours. Ensure the bunker plastic sheet is firmly secured against wind and rain."
        )
    else:
        recommended_action = (
            "Fermentation parameters remain steady. Continue standard routine feeding and maintain clean face management."
        )

    return {
        "batch_id": batch_meta.get("client_batch_id") or latest["client_batch_id"],
        "crop_type": batch_meta.get("crop_type") or "Corn Silage",
        "storage_type": batch_meta.get("storage_type") or "Bunker Pit",
        "observation_count": count,
        "baseline": baseline,
        "latest": latest,
        "previous": previous,
        "changes": {
            "from_baseline": {
                "ph": d_ph_base,
                "temperature": d_temp_base,
                "delta_temp": d_delta_temp_base,
                "moisture": d_moisture_base,
                "mssi": d_mssi_base,
            },
            "from_previous": {
                "ph": d_ph_prev,
                "temperature": d_temp_prev,
                "delta_temp": d_delta_temp_prev,
                "moisture": d_moisture_prev,
                "mssi": d_mssi_prev,
            },
        },
        "rates_per_day": rates_per_day,
        "trend_direction": trend_direction,
        "deterioration_detected": deterioration_detected,
        "warning_level": warning_level,
        "warning_reasons": reasons,
        "recommended_action": recommended_action,
        "timeline": timeline,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
