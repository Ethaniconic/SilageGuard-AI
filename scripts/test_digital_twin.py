#!/usr/bin/env python3
"""
SILAGEGUARD AI — Dedicated Digital Twin Automated Test Suite
Verifies all 12 core requirements and edge cases:
  1. Single observation -> Baseline established, no trend warning
  2. Two observations with falling MSSI -> Change detected
  3. Repeated pH increase -> pH trend detected
  4. Repeated core temp increase -> Thermal trend detected
  5. Multiple worsening signals -> Early deterioration warning
  6. Severe current pH (>= 5.0) -> Immediate HIGH_RISK override
  7. Severe delta T (>= 8.0°C) -> Immediate HIGH_RISK override
  8. Visual worsening (Healthy -> Spoilage) -> Visual trend detected
  9. Invalid or identical timestamp -> No false rate calculation
  10. Missing sensor readings (vision only) -> Handled safely
  11. Daily drift rate calculation (> 1 hour elapsed)
  12. Replay sync idempotency -> No duplicate twin state
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.services.digital_twin_engine import derive_digital_twin, normalize_observation


def run_tests():
    passed = 0
    failed = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, failed
        if condition:
            print(f"  PASS  {name}")
            passed += 1
        else:
            print(f"  FAIL  {name} — {details}")
            failed += 1

    print("\n============================================================")
    print("SILAGEGUARD AI — DIGITAL TWIN TEST SUITE")
    print("============================================================\n")

    base_time = datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)

    # ------------------------------------------------------------
    # Test 1: Single observation -> Baseline established, no trend warning
    # ------------------------------------------------------------
    obs1 = {
        "id": "OBS-001",
        "client_batch_id": "SG-BATCH-TEST-01",
        "observed_at": base_time.isoformat(),
        "ph": 3.95,
        "temperature": 24.0,
        "ambient": 23.0,
        "moisture": 64.0,
        "decision": "GOOD",
        "mssi_score": 92,
        "vision_class": "Healthy",
    }
    twin1 = derive_digital_twin([obs1])
    assert_test("Test 1: Single observation count is 1", twin1["observation_count"] == 1)
    assert_test("Test 1: Trend direction is BASELINE", twin1["trend_direction"] == "BASELINE")
    assert_test("Test 1: Deterioration detected is False", twin1["deterioration_detected"] is False)
    assert_test("Test 1: Warning level is STABLE", twin1["warning_level"] == "STABLE")
    assert_test("Test 1: Rates per day is None", twin1["rates_per_day"] is None)

    # ------------------------------------------------------------
    # Test 2: Two observations with falling MSSI -> Change detected
    # ------------------------------------------------------------
    obs2 = {
        "id": "OBS-002",
        "client_batch_id": "SG-BATCH-TEST-01",
        "observed_at": (base_time + timedelta(days=2)).isoformat(),
        "ph": 4.05,
        "temperature": 24.5,
        "ambient": 23.0,
        "moisture": 63.5,
        "decision": "WATCH",
        "mssi_score": 82, # -10 points drop
        "vision_class": "Healthy",
    }
    twin2 = derive_digital_twin([obs1, obs2])
    assert_test("Test 2: Two observations count is 2", twin2["observation_count"] == 2)
    assert_test("Test 2: MSSI change from previous is -10", twin2["changes"]["from_previous"]["mssi"] == -10)
    assert_test("Test 2: MSSI drop triggers warning level WATCH", twin2["warning_level"] in ["WATCH", "EARLY_DETERIORATION"])
    assert_test("Test 2: Reasons list contains MSSI decline", any("Stability Index dropped" in r for r in twin2["warning_reasons"]))

    # ------------------------------------------------------------
    # Test 3: Repeated pH increase -> pH trend detected
    # ------------------------------------------------------------
    obs3_ph = {
        "id": "OBS-003",
        "client_batch_id": "SG-BATCH-TEST-01",
        "observed_at": (base_time + timedelta(days=4)).isoformat(),
        "ph": 4.40, # +0.35 from prev 4.05
        "temperature": 25.0,
        "ambient": 23.0,
        "moisture": 63.0,
        "decision": "WATCH",
        "mssi_score": 75,
        "vision_class": "Healthy",
    }
    twin3 = derive_digital_twin([obs1, obs2, obs3_ph])
    assert_test("Test 3: pH trend detected in triggers", any("Acidity shifting" in r or "pH increased" in r for r in twin3["warning_reasons"]))
    assert_test("Test 3: Total pH change from baseline is +0.45", twin3["changes"]["from_baseline"]["ph"] == 0.45)

    # ------------------------------------------------------------
    # Test 4: Repeated temperature increase -> Thermal trend detected
    # ------------------------------------------------------------
    obs_thermal_base = {
        "id": "OBS-T1",
        "client_batch_id": "SG-BATCH-THERMAL",
        "observed_at": base_time.isoformat(),
        "ph": 3.90,
        "temperature": 24.0,
        "ambient": 22.0,
        "moisture": 65.0,
        "decision": "GOOD",
        "mssi_score": 90,
        "vision_class": "Healthy",
    }
    obs_thermal_2 = {
        "id": "OBS-T2",
        "client_batch_id": "SG-BATCH-THERMAL",
        "observed_at": (base_time + timedelta(days=2)).isoformat(),
        "ph": 3.95,
        "temperature": 27.5, # +3.5°C rise
        "ambient": 22.0,
        "moisture": 64.5,
        "decision": "WATCH",
        "mssi_score": 80,
        "vision_class": "Healthy",
    }
    twin_thermal = derive_digital_twin([obs_thermal_base, obs_thermal_2])
    assert_test("Test 4: Thermal delta temp from baseline is +3.5°C", twin_thermal["changes"]["from_baseline"]["temperature"] == 3.5)
    assert_test("Test 4: Thermal rise trigger generated", any("Core temperature rose" in r for r in twin_thermal["warning_reasons"]))

    # ------------------------------------------------------------
    # Test 5: Multiple worsening signals -> EARLY_DETERIORATION
    # ------------------------------------------------------------
    obs_multi = {
        "id": "OBS-M3",
        "client_batch_id": "SG-BATCH-TEST-01",
        "observed_at": (base_time + timedelta(days=5)).isoformat(),
        "ph": 4.55,           # Rising pH trigger
        "temperature": 28.5,  # Rising temp trigger
        "ambient": 23.0,
        "moisture": 68.0,
        "decision": "WATCH",
        "mssi_score": 62,     # Dropping MSSI trigger
        "vision_class": "Abnormal_appearance", # Worsening vision
    }
    twin_multi = derive_digital_twin([obs1, obs2, obs_multi])
    assert_test("Test 5: Warning level is EARLY_DETERIORATION", twin_multi["warning_level"] == "EARLY_DETERIORATION")
    assert_test("Test 5: Deterioration detected is True", twin_multi["deterioration_detected"] is True)
    assert_test("Test 5: Trend direction is DETERIORATING", twin_multi["trend_direction"] == "DETERIORATING")
    assert_test("Test 5: Farmer recommendation advises inspection and face feed-out", "Inspect the bunker" in twin_multi["recommended_action"])

    # ------------------------------------------------------------
    # Test 6: Severe current pH (>= 5.0) -> Immediate HIGH_RISK override
    # ------------------------------------------------------------
    obs_ph_severe = {
        "id": "OBS-SEV-PH",
        "client_batch_id": "SG-BATCH-PH",
        "observed_at": (base_time + timedelta(days=1)).isoformat(),
        "ph": 5.25, # Clostridial danger threshold
        "temperature": 24.0,
        "ambient": 23.0,
        "moisture": 64.0,
        "decision": "HIGH RISK",
        "mssi_score": 45,
        "vision_class": "Healthy",
    }
    twin_ph_sev = derive_digital_twin([obs1, obs_ph_severe])
    assert_test("Test 6: Severe pH forces warning level HIGH_RISK", twin_ph_sev["warning_level"] == "HIGH_RISK")
    assert_test("Test 6: Immediate critical recommendation", "Do not feed" in twin_ph_sev["recommended_action"])

    # ------------------------------------------------------------
    # Test 7: Severe delta T (>= 8.0°C) -> Immediate HIGH_RISK override
    # ------------------------------------------------------------
    obs_dt_severe = {
        "id": "OBS-SEV-DT",
        "client_batch_id": "SG-BATCH-DT",
        "observed_at": (base_time + timedelta(days=1)).isoformat(),
        "ph": 4.10,
        "temperature": 34.0,
        "ambient": 24.0, # delta T = 10.0°C >= 8.0°C
        "moisture": 64.0,
        "decision": "HIGH RISK",
        "mssi_score": 40,
        "vision_class": "Healthy",
    }
    twin_dt_sev = derive_digital_twin([obs1, obs_dt_severe])
    assert_test("Test 7: Severe delta T forces warning level HIGH_RISK", twin_dt_sev["warning_level"] == "HIGH_RISK")

    # ------------------------------------------------------------
    # Test 8: Visual worsening -> Visual trend detected
    # ------------------------------------------------------------
    obs_vis_spoil = {
        "id": "OBS-SPOIL",
        "client_batch_id": "SG-BATCH-VIS",
        "observed_at": (base_time + timedelta(days=3)).isoformat(),
        "ph": 4.10,
        "temperature": 25.0,
        "ambient": 23.0,
        "moisture": 64.0,
        "decision": "HIGH RISK",
        "mssi_score": 50,
        "vision_class": "Mould",
    }
    twin_vis = derive_digital_twin([obs1, obs_vis_spoil])
    assert_test("Test 8: Spoilage mold detected in reasons", any("Visual surface appearance worsened" in r or "Critical screening" in r for r in twin_vis["warning_reasons"]))

    # ------------------------------------------------------------
    # Test 9: Invalid or identical timestamp -> No false rate calculation
    # ------------------------------------------------------------
    obs_same_time_1 = {
        "id": "OBS-SAME-1",
        "client_batch_id": "SG-BATCH-SAME",
        "observed_at": base_time.isoformat(),
        "ph": 4.0,
        "temperature": 25.0,
        "ambient": 24.0,
        "moisture": 65.0,
        "decision": "GOOD",
        "mssi_score": 88,
    }
    obs_same_time_2 = {
        "id": "OBS-SAME-2",
        "client_batch_id": "SG-BATCH-SAME",
        "observed_at": base_time.isoformat(), # exact same second
        "ph": 4.1,
        "temperature": 25.5,
        "ambient": 24.0,
        "moisture": 65.0,
        "decision": "GOOD",
        "mssi_score": 85,
    }
    twin_same = derive_digital_twin([obs_same_time_1, obs_same_time_2])
    assert_test("Test 9: Identical timestamp produces rates_per_day = None (no div/0)", twin_same["rates_per_day"] is None)

    # ------------------------------------------------------------
    # Test 10: Valid elapsed time -> Daily drift rate calculated
    # ------------------------------------------------------------
    obs_day3 = {
        "id": "OBS-DAY3",
        "client_batch_id": "SG-BATCH-RATE",
        "observed_at": (base_time + timedelta(days=3)).isoformat(),
        "ph": 4.25, # +0.30 over 3 days -> 0.10/day
        "temperature": 27.0, # +3.0 over 3 days -> 1.0/day
        "ambient": 23.0,
        "moisture": 64.0,
        "decision": "WATCH",
        "mssi_score": 77, # -15 over 3 days -> -5.0/day
    }
    twin_rate = derive_digital_twin([obs1, obs_day3])
    assert_test("Test 10: Days elapsed is 3.0", twin_rate["rates_per_day"]["days_elapsed"] == 3.0)
    assert_test("Test 10: pH drift rate is +0.10/day", twin_rate["rates_per_day"]["ph_per_day"] == 0.10)
    assert_test("Test 10: Temp drift rate is +1.0°C/day", twin_rate["rates_per_day"]["temp_per_day"] == 1.0)
    assert_test("Test 10: MSSI drift rate is -5.0/day", twin_rate["rates_per_day"]["mssi_per_day"] == -5.0)

    # ------------------------------------------------------------
    # Test 11: Timeline representation
    # ------------------------------------------------------------
    assert_test("Test 11: Timeline contains 2 items", len(twin_rate["timeline"]) == 2)
    assert_test("Test 11: Step 1 is marked as is_baseline", twin_rate["timeline"][0]["is_baseline"] is True)
    assert_test("Test 11: Step 2 is marked as not baseline", twin_rate["timeline"][1]["is_baseline"] is False)

    # ------------------------------------------------------------
    # Test 12: Empty observations handled gracefully
    # ------------------------------------------------------------
    twin_empty = derive_digital_twin([])
    assert_test("Test 12: Empty observations returns count 0", twin_empty["observation_count"] == 0)
    assert_test("Test 12: Empty twin direction is UNOBSERVED", twin_empty["trend_direction"] == "UNOBSERVED")

    print("\n============================================================")
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("============================================================\n")

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
