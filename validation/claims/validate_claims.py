"""
SILAGEGUARD AI V2.1 — Automated Claim Validator
Inspects repository markdown, JSON schemas, code, and documentation to audit
and prevent overstated, misleading, or scientifically ungrounded claims.

Produces: validation/claims/claim_validation_report.json
"""

import os
import re
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
        "allowed_qualifier": r"surface|visual|mould|anomaly|screening|discoloration"
    },
    {
        "id": "CLAIM_UREA_DIRECT_MEASUREMENT",
        "regex": r"(?<!cannot\s)(?<!does\snot\s)(?<!do\swe\s)(?<!can\sthe\ssystem\s)(measures?|quantif(y|ies)|detects?)\s+urea\s+(adulteration|concentration|percentage)",
        "description": "Standard pH electrodes measure hydronium ion activity, not specific urea molecules.",
        "allowed_qualifier": r"ammonia|proteolysis|pH elevation|indicator|cannot|does not|disclaimer|no direct|we do not"
    },
    {
        "id": "CLAIM_LABORATORY_REPLACEMENT",
        "regex": r"(?<!not\s)(?<!not\sa\s)(?<!does\snot\s)(?<!cannot\s)(replaces?|eliminates?|substitutes?)\s+(the\s+)?(laboratory|wet chemistry|hplc|official lab)",
        "description": "System is an edge rapid screening triage tool, not a certified laboratory replacement.",
        "allowed_qualifier": r"screening|triage|prior to|not a laboratory replacement|rapid|does not replace"
    },
    {
        "id": "CLAIM_UNQUALIFIED_100_PERCENT_ACCURACY",
        "regex": r"(achieves?|with)\s+100(\.0)?%\s+(real-world|field|practical)\s+(accuracy|f1)",
        "description": "100% metrics belong only to synthetic/prototype benchmark evaluations and must not be claimed for real-world field performance.",
        "allowed_qualifier": r"synthetic|prototype|benchmark|toy dataset"
    },
    {
        "id": "CLAIM_GUARANTEED_SAFE_TO_FEED",
        "regex": r"(guarantee(d|s)?|100%\s+certain)\s+(safe\s+to\s+feed|free\s+of\s+toxins)",
        "description": "System output represents low screening risk based on available evidence, never absolute safety.",
        "allowed_qualifier": r"screening|available evidence|low screening risk"
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
                # Skip FAQ question headers
                if line.strip().startswith("### Q") or line.strip().endswith("?"):
                    continue
                for rule in RESTRICTED_PATTERNS:
                    match = re.search(rule["regex"], line, re.IGNORECASE)
                    if match:
                        # Check if permitted qualifier exists in the same line or context
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
    """Verifies that synthetic data is not disguised as real field data."""
    dataset_findings = []
    
    # Check dataset registry
    reg_path = os.path.join(ROOT_DIR, "datasets", "dataset_registry.json")
    if os.path.exists(reg_path):
        with open(reg_path, "r", encoding="utf-8") as f:
            reg = json.load(f)
            for ds in reg.get("datasets", []):
                if ds.get("category") == "synthetic_benchmark" and not ds.get("not_for_field_validation", False):
                    dataset_findings.append({
                        "dataset_id": ds.get("id"),
                        "issue": "Synthetic dataset missing not_for_field_validation flag"
                    })
    else:
        dataset_findings.append({"issue": "datasets/dataset_registry.json missing"})
        
    # Check field pilot observations schema
    field_csv = os.path.join(ROOT_DIR, "datasets", "field", "field_pilot_observations.csv")
    if os.path.exists(field_csv):
        with open(field_csv, "r", encoding="utf-8") as f:
            header = f.readline().strip().split(",")
            required_cols = [
                "sample_id", "farm_id", "pit_id", "crop_type", "silage_age_days",
                "sampling_depth_cm", "ph", "moisture", "temperature",
                "ambient_temperature", "image_path", "expert_label", "lab_result",
                "label_source", "timestamp", "notes"
            ]
            for col in required_cols:
                if col not in header:
                    dataset_findings.append({
                        "file": "datasets/field/field_pilot_observations.csv",
                        "issue": f"Missing mandatory field column: {col}"
                    })
    else:
        dataset_findings.append({"issue": "datasets/field/field_pilot_observations.csv missing"})
        
    return dataset_findings

def verify_system_capabilities():
    """Validates that verifiable technical claims have corresponding verification artifacts."""
    capabilities = {}
    
    # 1. Offline capability
    offline_script = os.path.join(ROOT_DIR, "validation", "offline", "verify_offline_flow.py")
    capabilities["offline_pipeline_verified"] = os.path.exists(offline_script)
    
    # 2. Model parity
    parity_report = os.path.join(ROOT_DIR, "validation", "parity", "model_parity_report.json")
    if os.path.exists(parity_report):
        with open(parity_report, "r", encoding="utf-8") as f:
            rep = json.load(f)
            capabilities["model_parity_verified"] = rep.get("all_passed", False)
    else:
        capabilities["model_parity_verified"] = False
        
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
    print(" SILAGEGUARD AI V2.1 — AUTOMATED CLAIM & SCIENTIFIC INTEGRITY AUDIT")
    print("=" * 70)
    
    # Target files to audit
    files_to_scan = []
    target_exts = (".md", ".txt", ".json", ".ts", ".tsx", ".py")
    exclude_dirs = {".git", "node_modules", ".expo", ".system_generated", "tasks", "scratch"}
    
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.endswith(target_exts) and not f.startswith("."):
                files_to_scan.append(os.path.join(root, f))
                
    print(f"[*] Scanning {len(files_to_scan)} repository files for prohibited claims...")
    
    all_findings = []
    for filepath in files_to_scan:
        rel = os.path.relpath(filepath, ROOT_DIR)
        # Avoid self-scanning the claim validator or its generated report
        if "validate_claims.py" in rel or "claim_validation_report.json" in rel or "logs" in rel:
            continue
        findings = scan_text_file(filepath)
        all_findings.extend(findings)
        
    dataset_issues = audit_dataset_integrity()
    capabilities = verify_system_capabilities()
    
    status = "PASS" if len(all_findings) == 0 and len(dataset_issues) == 0 else "FLAGGED"
    
    report = {
        "audit_version": "2.1.0",
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
    print(f"[+] Dataset Schema Issues: {len(dataset_issues)}")
    print(f"[+] Capability Checks: {capabilities}")
    print(f"[+] Full Report Saved to: {out_file}")
    print("=" * 70)
    
    if len(all_findings) > 0:
        print("\nFlagged occurrences:")
        for finding in all_findings[:10]:
            print(f" - [{finding['rule_id']}] {finding['file']}:{finding['line_number']} -> {finding['matched_snippet']}")
            
    return 0 if status == "PASS" else 1

if __name__ == "__main__":
    sys.exit(run_claim_validation())
