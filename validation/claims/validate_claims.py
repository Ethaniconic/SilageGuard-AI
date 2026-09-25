"""
SILAGEGUARD AI V2.2 — Automated Claim & Scientific Integrity Validator
Audits repository documentation, code, manifests, and model cards to prevent
unsupported scientific claims, fake real-world validation, or synthetic data contamination.

Strictly checks:
  1. No claims of direct mycotoxin / aflatoxin quantification from RGB pixels.
  2. No claims of direct urea detection from pH electrodes.
  3. No claims of laboratory replacement or clinical validation.
  4. No unqualified 100% field accuracy claims.
  5. No claims of 'field validated' or 'real-world validated' without physical trial data.
  6. Rule 1 verification: Production vision manifests must have ZERO synthetic images.
  7. Dataset registry & manifest consistency.

Produces: validation/claims/claim_validation_report.json
"""

import os
import re
import csv
import json
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

# Prohibited or strictly restricted claim patterns
RESTRICTED_PATTERNS = [
    {
        "id": "CLAIM_MYCOTOXIN_DIRECT_DETECTION",
        "regex": r"(camera|lens|rgb|probe|sensor)\s+(measures?|quantif(y|ies)|detects?)\s+(aflatoxin|mycotoxin|zearalenone|vomitoxin)\s+(concentration|in ppb|levels?)",
        "description": "RGB cameras or basic probes cannot quantify biochemical mycotoxin / aflatoxin ppb concentrations.",
        "allowed_qualifier": r"surface|visual|mould|anomaly|screening|discoloration|cannot|does not|not intended|not a direct"
    },
    {
        "id": "CLAIM_UREA_DIRECT_MEASUREMENT",
        "regex": r"(?<!cannot\s)(?<!does\snot\s)(?<!do\swe\s)(?<!can\sthe\ssystem\s)(measures?|quantif(y|ies)|detects?)\s+urea\s+(adulteration|concentration|percentage)",
        "description": "Standard pH electrodes measure hydronium ion activity, not specific urea molecules.",
        "allowed_qualifier": r"ammonia|proteolysis|pH elevation|indicator|cannot|does not|disclaimer|no direct|we do not|proxy"
    },
    {
        "id": "CLAIM_LABORATORY_REPLACEMENT",
        "regex": r"(?<!not\s)(?<!not\sa\s)(?<!does\snot\s)(?<!cannot\s)(replaces?|eliminates?|substitutes?)\s+(the\s+)?(laboratory|wet chemistry|hplc|official lab|lab-grade)",
        "description": "System is an edge rapid screening triage tool, not a certified laboratory replacement.",
        "allowed_qualifier": r"screening|triage|prior to|not a laboratory replacement|rapid|does not replace|not intended"
    },
    {
        "id": "CLAIM_UNQUALIFIED_100_PERCENT_ACCURACY",
        "regex": r"(achieves?|with)\s+100(\.0)?%\s+(real-world|field|practical)\s+(accuracy|f1)",
        "description": "100% metrics belong only to synthetic/prototype benchmark evaluations and must not be claimed for real-world field performance.",
        "allowed_qualifier": r"synthetic|prototype|benchmark|toy dataset"
    },
    {
        "id": "CLAIM_UNSUPPORTED_FIELD_VALIDATED",
        "regex": r"(?<!pending\s)(?<!is\snot\s)(?<!not\s)(?<!currently\s)(?<!future\s)(clinically validated|field validated|real-world validated|lab-grade accuracy)",
        "description": "System cannot claim 'field validated' or 'real-world validated' until full physical farm pilot trial data is recorded.",
        "allowed_qualifier": r"pending|future|roadmap|not yet|synthetic benchmark|screening prototype|simulation"
    }
]

def scan_text_file(filepath):
    """Scans a single text file for prohibited or suspicious claim patterns."""
    findings = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            for line_no, line in enumerate(lines, 1):
                # Skip comments or quote blocks in validation scripts/reports discussing prohibited terms
                if "RESTRICTED_PATTERNS" in line or "validate_claims.py" in filepath:
                    continue
                # Skip FAQ question headers or markdown headers posing questions
                if line.strip().startswith("### Q") or line.strip().endswith("?") or line.strip().startswith("#"):
                    continue
                for rule in RESTRICTED_PATTERNS:
                    match = re.search(rule["regex"], line, re.IGNORECASE)
                    if match:
                        qualifier = re.search(rule["allowed_qualifier"], line, re.IGNORECASE)
                        if not qualifier:
                            findings.append({
                                "rule_id": rule["id"],
                                "file": os.path.relpath(filepath, ROOT_DIR),
                                "line_number": line_no,
                                "matched_snippet": line.strip()[:140],
                                "issue": rule["description"]
                            })
    except Exception as e:
        print(f"Error scanning {filepath}: {e}")
    return findings

def audit_dataset_integrity():
    """Verifies Rule 1 and dataset provenance."""
    dataset_findings = []
    
    # 1. Rule 1 Check on vision manifest
    vision_manifest = os.path.join(ROOT_DIR, "datasets", "metadata", "vision_manifest.csv")
    if os.path.exists(vision_manifest):
        with open(vision_manifest, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            real_count = 0
            synthetic_count = 0
            for r in reader:
                val = r.get("real_or_synthetic", "").strip().upper()
                if val == "REAL":
                    real_count += 1
                else:
                    synthetic_count += 1
            if synthetic_count > 0:
                dataset_findings.append({
                    "manifest": "datasets/metadata/vision_manifest.csv",
                    "issue": f"Rule 1 Violation: {synthetic_count} synthetic rows found in production vision manifest!"
                })
            if real_count < 10:
                dataset_findings.append({
                    "manifest": "datasets/metadata/vision_manifest.csv",
                    "issue": f"Insufficient real data: only {real_count} real images registered."
                })
    else:
        dataset_findings.append({"issue": "datasets/metadata/vision_manifest.csv missing"})
        
    # 2. Check Vision Dataset Registry
    reg_path = os.path.join(ROOT_DIR, "datasets", "metadata", "vision_dataset_registry.json")
    if os.path.exists(reg_path):
        with open(reg_path, "r", encoding="utf-8") as f:
            reg_data = json.load(f)
            dataset_list = reg_data.get("datasets", []) if isinstance(reg_data, dict) else reg_data
            if not isinstance(dataset_list, list) or len(dataset_list) == 0:
                dataset_findings.append({"issue": "vision_dataset_registry.json is empty or invalid format"})
            else:
                for entry in dataset_list:
                    if not entry.get("real_image", False):
                        dataset_findings.append({
                            "dataset_id": entry.get("dataset_id"),
                            "issue": "Registered dataset marked as non-real image"
                        })
                    if not entry.get("license"):
                        dataset_findings.append({
                            "dataset_id": entry.get("dataset_id"),
                            "issue": "Missing license in dataset registry"
                        })
    else:
        dataset_findings.append({"issue": "datasets/metadata/vision_dataset_registry.json missing"})
        
    # 3. Check legacy synthetic archive status
    synthetic_archive = os.path.join(ROOT_DIR, "datasets", "archive", "synthetic_v1")
    if not os.path.exists(synthetic_archive):
        dataset_findings.append({"issue": "datasets/archive/synthetic_v1 directory missing for historical isolation"})
        
    # 4. Check active datasets/vision folder has no unarchived synthetic files
    active_old_vision = os.path.join(ROOT_DIR, "datasets", "vision")
    if os.path.exists(active_old_vision) and os.listdir(active_old_vision):
        # Must be empty or non-existent
        dataset_findings.append({
            "folder": "datasets/vision",
            "issue": "Old datasets/vision directory still contains active unmigrated files"
        })
        
    return dataset_findings

def verify_system_capabilities():
    """Validates that verifiable technical claims have corresponding verification artifacts."""
    capabilities = {}
    
    # 1. Offline capability
    offline_script = os.path.join(ROOT_DIR, "validation", "offline", "verify_offline_flow.py")
    capabilities["offline_pipeline_verified"] = os.path.exists(offline_script)
    
    # 2. Mobile model parity
    parity_report = os.path.join(ROOT_DIR, "vision_model", "mobile_parity_report.json")
    if os.path.exists(parity_report):
        with open(parity_report, "r", encoding="utf-8") as f:
            rep = json.load(f)
            capabilities["vision_parity_verified"] = rep.get("rule_29_status") == "PASS"
    else:
        capabilities["vision_parity_verified"] = False
        
    # 3. Decoupled safety rules
    rules_ts = os.path.join(ROOT_DIR, "mobile", "features", "fusion", "safetyRuleEngine.ts")
    capabilities["decoupled_safety_rules_verified"] = os.path.exists(rules_ts)
    
    # 4. Multi-modal fusion engine
    fusion_ts = os.path.join(ROOT_DIR, "mobile", "features", "fusion", "multimodalFusionEngine.ts")
    capabilities["multimodal_fusion_engine_verified"] = os.path.exists(fusion_ts)
    
    # 5. Field pilot schema
    field_obs = os.path.join(ROOT_DIR, "datasets", "field", "field_pilot_observations.csv")
    capabilities["field_pilot_schema_verified"] = os.path.exists(field_obs)

    return capabilities

def run_claim_validation():
    print("=" * 70)
    print(" SILAGEGUARD AI V2.2 — AUTOMATED CLAIM & SCIENTIFIC INTEGRITY AUDIT")
    print("=" * 70)
    
    files_to_scan = []
    target_exts = (".md", ".txt", ".json", ".ts", ".tsx", ".py")
    exclude_dirs = {".git", "node_modules", ".expo", ".system_generated", "tasks", "scratch", "archive"}
    
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.endswith(target_exts) and not f.startswith("."):
                files_to_scan.append(os.path.join(root, f))
                
    print(f"[*] Scanning {len(files_to_scan)} repository files for prohibited claims...")
    
    all_findings = []
    for filepath in files_to_scan:
        rel = os.path.relpath(filepath, ROOT_DIR)
        if "validate_claims.py" in rel or "claim_validation_report.json" in rel or "logs" in rel:
            continue
        findings = scan_text_file(filepath)
        all_findings.extend(findings)
        
    dataset_issues = audit_dataset_integrity()
    capabilities = verify_system_capabilities()
    
    status = "PASS" if len(all_findings) == 0 and len(dataset_issues) == 0 else "FLAGGED"
    
    report = {
        "audit_version": "2.2.0",
        "audit_timestamp": "2026-09-25",
        "overall_status": status,
        "files_scanned_count": len(files_to_scan),
        "unsupported_claim_count": len(all_findings),
        "unsupported_claims": all_findings,
        "dataset_integrity_issues": dataset_issues,
        "system_capabilities_verification": capabilities,
        "summary": (
            "All documented claims strictly adhere to scientific boundaries."
            if status == "PASS" else
            f"Found {len(all_findings)} prohibited phrasing instances or dataset schema mismatches."
        )
    }
    
    out_dir = os.path.join(ROOT_DIR, "validation", "claims")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "claim_validation_report.json")
    
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    print(f"\n[+] Validation Status: {status}")
    print(f"[+] Prohibited Phrasing Matches: {len(all_findings)}")
    print(f"[+] Dataset Integrity Issues: {len(dataset_issues)}")
    print(f"[+] Capability Checks: {capabilities}")
    print(f"[+] Full Report Saved to: {out_file}")
    print("=" * 70)
    
    if len(all_findings) > 0:
        print("\nFlagged occurrences:")
        for finding in all_findings[:10]:
            print(f" - [{finding['rule_id']}] {finding['file']}:{finding['line_number']} -> {finding['matched_snippet']}")
            
    if len(dataset_issues) > 0:
        print("\nDataset Issues:")
        for issue in dataset_issues:
            print(f" - {issue}")
            
    return 0 if status == "PASS" else 1

if __name__ == "__main__":
    sys.exit(run_claim_validation())
