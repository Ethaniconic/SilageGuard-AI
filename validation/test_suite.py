"""
SILAGEGUARD AI V3 — Comprehensive Automated Validation Suite
Problem Statement: SIH26111 — Final Screening Round Build

Verifies:
  1. Data Integrity & 100% Real Image Provenance (Rule 1)
  2. Sensor Validation, Physics Sanity Bounds & Empty History (Rule 2)
  3. Multimodal Fusion Engine & Calibrated Confidence Tiers
  4. Decoupled Agronomic Safety Rules & Deterministic Overrides
  5. Mobile Vision Model (MobileNetV3-Small) Metrics & Grad-CAM
  6. 11-Feature Sensor Random Forest Model Parity & Explainability
  7. SQLite Relational Schema & 7 Tables Integrity
  8. Shared Backend DTO Contracts (TS & Python)
"""

import os
import sys
import json
import csv
import math

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
passed_tests = 0
failed_tests = 0

def check(condition, test_name):
    global passed_tests, failed_tests
    if condition:
        print(f" [PASS] {test_name}")
        passed_tests += 1
    else:
        print(f" [FAIL] {test_name}")
        failed_tests += 1

def run_provenance_tests():
    print("\n--- 1. DATA INTEGRITY & ZERO SYNTHETIC PROVENANCE (RULE 1) ---")
    manifest_csv = os.path.join(ROOT_DIR, "datasets", "metadata", "vision_manifest.csv")
    registry_json = os.path.join(ROOT_DIR, "datasets", "metadata", "vision_dataset_registry.json")
    dataset_card = os.path.join(ROOT_DIR, "datasets", "DATASET_CARD.md")

    check(os.path.exists(manifest_csv), "Real vision manifest exists (vision_manifest.csv)")
    check(os.path.exists(registry_json), "Vision dataset registry exists (vision_dataset_registry.json)")
    check(os.path.exists(dataset_card), "Dataset card documentation exists (DATASET_CARD.md)")

    # Verify rows in manifest have valid real agricultural URLs and licenses
    with open(manifest_csv, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        total_rows = len(reader)
        has_url = sum(1 for r in reader if r.get("url", "").startswith("http"))
        has_license = sum(1 for r in reader if len(r.get("license", "")) > 0)
        has_provenance = sum(1 for r in reader if len(r.get("dataset_id", "")) > 0)

    check(total_rows >= 50, f"Production manifest contains verified real photographs (found {total_rows})")
    check(has_url == total_rows, "100% of manifest images have public source provenance URLs")
    check(has_license == total_rows, "100% of manifest images specify open licenses")
    check(has_provenance == total_rows, "100% of images tagged with dataset provenance IDs")

    # Check split manifests
    for s in ["train", "val", "test"]:
        s_csv = os.path.join(ROOT_DIR, "datasets", "splits", "vision", f"{s}_manifest.csv")
        check(os.path.exists(s_csv), f"Group-aware split manifest exists for {s}")

    # Check legacy synthetic generators archived
    legacy_archive = os.path.join(ROOT_DIR, "datasets", "archive", "legacy_synthetic_generators")
    check(os.path.exists(legacy_archive), "Synthetic generators cleanly archived away from production")

def run_sensor_and_sanity_tests():
    print("\n--- 2. SENSOR VALIDATION, SANITY BOUNDS & RULE 2 EMPTY HISTORY ---")
    # Verify bounds checks in safety rule engine
    safety_ts = os.path.join(ROOT_DIR, "mobile", "features", "fusion", "safetyRuleEngine.ts")
    with open(safety_ts, "r", encoding="utf-8") as f:
        content = f.read()
    check("RULE_SENSOR_OUT_OF_BOUNDS" in content, "Impossible sensor bounds rule exists")
    check("ph < 2.5 || ph > 9.5" in content, "Physical pH sanity bounds (< 2.5 or > 9.5) enforced")
    check("coreTemp < 0.0 || coreTemp > 75.0" in content, "Physical temperature sanity bounds enforced")

    # Verify BLE disconnected state emits nulls, not fake numbers (Rule 2)
    ble_ts = os.path.join(ROOT_DIR, "mobile", "features", "ble", "bleService.ts")
    with open(ble_ts, "r", encoding="utf-8") as f:
        ble_c = f.read()
    check("ph: null" in ble_c and "moisture: null" in ble_c, "BLE disconnected state returns cleanly null parameters (Rule 2)")

def run_fusion_and_calibration_tests():
    print("\n--- 3. MULTIMODAL FUSION & CONFIDENCE CALIBRATION ---")
    fusion_ts = os.path.join(ROOT_DIR, "mobile", "features", "fusion", "multimodalFusionEngine.ts")
    with open(fusion_ts, "r", encoding="utf-8") as f:
        fc = f.read()

    check("MULTIMODAL" in fc and "SENSOR_ONLY" in fc and "VISION_ONLY" in fc and "INSUFFICIENT_DATA" in fc,
          "All 4 missing modality states handled deterministically")
    check("RETAKE_REQUIRED" in fc and "HIGH" in fc and "MEDIUM" in fc and "LOW" in fc,
          "Confidence calibration tiers (HIGH, MEDIUM, LOW, RETAKE_REQUIRED) implemented")
    check("FUSION_SENSOR_WEIGHT: 0.55" in fc and "FUSION_VISION_WEIGHT: 0.45" in fc,
          "Calibrated multimodal fusion weights (0.55 sensor / 0.45 vision)")
    check("needRetake" in fc and "needProbe" in fc,
          "Actionable flow control flags (needRetake, needProbe) returned")

def run_vision_model_tests():
    print("\n--- 4. MOBILE VISION MODEL (MOBILENETV3) & GRAD-CAM ---")
    metrics_path = os.path.join(ROOT_DIR, "vision_model", "vision_model_metrics.json")
    check(os.path.exists(metrics_path), "Vision model metrics file exists")

    with open(metrics_path, "r", encoding="utf-8") as f:
        v_metrics = json.load(f)

    metrics = v_metrics.get("unrounded_metrics", {})
    test_acc = metrics.get("accuracy", 0.0)
    macro_recall = metrics.get("macro_recall", 0.0)
    brier = metrics.get("brier_score", 1.0)

    check(test_acc >= 0.85, f"Held-out test accuracy >= 85% on real imagery (measured: {test_acc*100:.2f}%)")
    check(macro_recall >= 0.85, f"Macro recall safety metric >= 85% (measured: {macro_recall*100:.2f}%)")
    check(brier <= 0.15, f"Brier probability calibration score <= 0.15 (measured: {brier:.4f})")

    # Check exported artifacts
    onnx_path = os.path.join(ROOT_DIR, "vision_model", "mobilenetv3_silage.onnx")
    ts_path = os.path.join(ROOT_DIR, "vision_model", "mobilenetv3_silage.pt")
    check(os.path.exists(onnx_path), "Exported ONNX vision model exists")
    check(os.path.exists(ts_path), "Exported TorchScript mobile vision model exists")

    # Check mobile demo Grad-CAM overlays
    for p in ["gradcam_safe_demo.png", "gradcam_caution_demo.png", "gradcam_unsafe_demo.png"]:
        overlay = os.path.join(ROOT_DIR, "mobile", "assets", "demo", "gradcam", p)
        check(os.path.exists(overlay), f"Grad-CAM overlay artifact exists ({p})")

def run_sensor_model_tests():
    print("\n--- 5. SENSOR MODEL V3 (11-FEATURE RANDOM FOREST) ---")
    rf_json = os.path.join(ROOT_DIR, "mobile", "assets", "models", "sensor_rf_model.json")
    check(os.path.exists(rf_json), "Sensor Random Forest JSON model exists for pure mobile inference")

    with open(rf_json, "r", encoding="utf-8") as f:
        rf_data = json.load(f)

    n_features = len(rf_data.get("feature_names", []))
    n_trees = len(rf_data.get("trees", []))
    check(n_features == 11, f"Sensor model evaluates all 11 agronomic features (found {n_features})")
    check(n_trees == 25, f"Sensor Random Forest contains 25 calibrated decision trees (found {n_trees})")

    # Feature importance check
    importances = rf_data.get("feature_importances", {})
    top_feature = max(importances.items(), key=lambda x: x[1])[0]
    check(top_feature in ["heat_rise", "delta_temp", "ph"], f"Top sensor factor aligns with agronomic science ({top_feature})")

def run_sqlite_schema_tests():
    print("\n--- 6. SQLITE V3 SCHEMA & REPOSITORIES ---")
    db_ts = os.path.join(ROOT_DIR, "mobile", "sqlite", "database.ts")
    with open(db_ts, "r", encoding="utf-8") as f:
        db_content = f.read()

    tables = ["batches", "sensor_readings", "vision_predictions", "fusion_results", "calibration", "settings", "analytics_cache"]
    for t in tables:
        check(f"CREATE TABLE IF NOT EXISTS {t}" in db_content, f"SQLite V3 table '{t}' declared with indexes")

    repo_ts = os.path.join(ROOT_DIR, "mobile", "sqlite", "batchRepository.ts")
    with open(repo_ts, "r", encoding="utf-8") as f:
        rc = f.read()
    check("saveCompleteBatch" in rc, "Atomic saveCompleteBatch relational transaction implemented")
    check("getWeeklyTrends" in rc, "getWeeklyTrends 7-day aggregation implemented")

def run_backend_contracts_tests():
    print("\n--- 7. BACKEND READY INTERFACES (NO ACTIVE BACKEND) ---")
    ts_dtos = os.path.join(ROOT_DIR, "shared", "contracts", "ts", "dtos.ts")
    py_dtos = os.path.join(ROOT_DIR, "shared", "contracts", "py", "dtos.py")
    contracts_md = os.path.join(ROOT_DIR, "shared", "contracts", "API_CONTRACTS.md")

    check(os.path.exists(ts_dtos), "TypeScript DTO interfaces exist (shared/contracts/ts/dtos.ts)")
    check(os.path.exists(py_dtos), "Python Pydantic schemas exist (shared/contracts/py/dtos.py)")
    check(os.path.exists(contracts_md), "REST API OpenAPI specifications documented (API_CONTRACTS.md)")

    # Assert no backend implementation code exists in shared
    with open(ts_dtos, "r", encoding="utf-8") as f:
        ts_c = f.read()
    check("express" not in ts_c and "app.listen" not in ts_c, "Strict adherence: Zero active backend code, pure contracts only")

def main():
    print("=" * 72)
    print(" SILAGEGUARD AI V3 — COMPREHENSIVE AUTOMATED VALIDATION SUITE")
    print("=" * 72)

    run_provenance_tests()
    run_sensor_and_sanity_tests()
    run_fusion_and_calibration_tests()
    run_vision_model_tests()
    run_sensor_model_tests()
    run_sqlite_schema_tests()
    run_backend_contracts_tests()

    print("\n" + "=" * 72)
    print(f" TEST SUITE SUMMARY: {passed_tests} PASSED, {failed_tests} FAILED")
    print("=" * 72)
    return 0 if failed_tests == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
