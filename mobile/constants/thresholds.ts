/**
 * SILAGEGUARD AI V4 — Agronomic Thresholds & Safety Rules
 * Grounded in peer-reviewed dairy and forage preservation science.
 * Citations: Kung et al. (2018), Borreani et al. (2018), Moran (2005), Pitt (1990).
 */

import { TriggeredRuleResult } from "../types/batch";

export const AGRONOMIC_THRESHOLDS = {
  // Lactic Acid Preservation (Kung et al. 2018)
  PH: {
    OPTIMAL_MIN: 3.80,
    OPTIMAL_MAX: 4.20,
    BORDERLINE_MAX: 4.80,
    CLOSTRIDIAL_DANGER: 4.80,
    CRITICAL_FAILURE: 5.80,
    PHYSICAL_MIN: 2.50,
    PHYSICAL_MAX: 9.50
  },

  // Capacitive Moisture Percentage (Moran 2005, Kung et al. 2018)
  MOISTURE: {
    DRY_DEFICIT_MAX: 55.0,
    OPTIMAL_MIN: 60.0,
    OPTIMAL_MAX: 68.0,
    ELEVATED_MAX: 72.0,
    CRITICAL_WET: 72.0, // Effluent runoff and clostridial danger
    PHYSICAL_MIN: 0.0,
    PHYSICAL_MAX: 100.0
  },

  // Aerobic Core Heat Rise (Borreani et al. 2018)
  THERMAL: {
    STABLE_DELTA_MAX: 3.0,     // ΔT <= 3.0°C above ambient indicates anaerobic dormancy
    HEATING_DELTA_MAX: 8.0,    // ΔT > 3.0°C indicates yeast/mold respiration
    RUNAWAY_DELTA_MIN: 8.0,    // ΔT > 8.0°C indicates severe aerobic spoilage
    CRITICAL_DELTA_MIN: 10.0,  // ΔT > 10.0°C indicates runaway biological breakdown
    MAX_VALID_CORE_TEMP: 80.0
  },

  // Surface Mold Colony Probability (Pitt 1990)
  VISION_MOLD: {
    TRACE_THRESHOLD: 0.15,
    WARNING_THRESHOLD: 0.30,
    CRITICAL_THRESHOLD: 0.40   // Visible fungal colony override
  }
};

export interface AgronomicRuleDefinition {
  ruleId: string;
  ruleTitle: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  enforcedVerdict?: "UNSAFE" | "CAUTION";
  citation: string;
  agronomicRationale: string;
  recommendedAction: string;
}

export const AGRONOMIC_RULES: Record<string, AgronomicRuleDefinition> = {
  CRITICAL_CLOSTRIDIAL_PH: {
    ruleId: "RULE_PH_CRITICAL_HIGH",
    ruleTitle: "Clostridial Fermentation Putrefaction",
    severity: "CRITICAL",
    enforcedVerdict: "UNSAFE",
    citation: "Kung et al. (2018), J. Dairy Sci. 101:4020–4033",
    agronomicRationale: "Silage core pH exceeding 4.80 indicates failure of lactic acid bacteria to rapidly acidify the crop. Secondary Clostridium tyrobutyricum converts lactic acid to butyric acid, degrading proteins into toxic biogenic amines and ammonia.",
    recommendedAction: "DO NOT FEED to lactating dairy cows or pregnant heifers. Isolate and discard this batch layer to prevent acute bovine acidosis and milk contamination."
  },

  BORDERLINE_AEROBIC_PH: {
    ruleId: "RULE_PH_MILD_HIGH",
    ruleTitle: "Incomplete Acidification Risk",
    severity: "WARNING",
    enforcedVerdict: "CAUTION",
    citation: "Kung et al. (2018), J. Dairy Sci. 101:4020–4033",
    agronomicRationale: "pH between 4.30 and 4.80 indicates delayed lactic fermentation. The silage is biologically unstable and vulnerable to rapid aerobic heating upon air exposure.",
    recommendedAction: "Feed within 4–6 hours of face removal. Mix with high-dry-matter roughage and do not leave exposed in open feed bunks."
  },

  SEVERE_THERMAL_RUNAWAY: {
    ruleId: "RULE_THERMAL_RUNAWAY",
    ruleTitle: "Severe Aerobic Thermal Runaway",
    severity: "CRITICAL",
    enforcedVerdict: "UNSAFE",
    citation: "Borreani et al. (2018), J. Dairy Sci. 101:3980–4000",
    agronomicRationale: "Core temperature rising > 8.0°C above ambient indicates active microbial respiration by aerobic yeasts and thermophilic molds consuming soluble carbohydrates and digestible protein.",
    recommendedAction: "DO NOT FEED. Remove heated face layer immediately (at least 30 cm) until stable, cool core silage is reached."
  },

  MODERATE_AEROBIC_HEATING: {
    ruleId: "RULE_MODERATE_HEATING",
    ruleTitle: "Early Aerobic Heating",
    severity: "WARNING",
    enforcedVerdict: "CAUTION",
    citation: "Borreani et al. (2018), J. Dairy Sci. 101:3980–4000",
    agronomicRationale: "Core temperature 3.0°C–8.0°C above ambient indicates early oxygen ingress and active yeast proliferation degrading lactic acid.",
    recommendedAction: "Increase pit face feed-out rate to at least 15–20 cm per day. Compact and reseal plastic sheeting tightly after each feeding."
  },

  VISIBLE_FUNGAL_COLONIES: {
    ruleId: "RULE_VISIBLE_FUNGAL_GROWTH",
    ruleTitle: "Macroscopic Fungal Colony Infestation",
    severity: "CRITICAL",
    enforcedVerdict: "UNSAFE",
    citation: "Pitt (1990), Silage and Hay Preservation (NRAES-5)",
    agronomicRationale: "Visible mycelial mats (Aspergillus, Penicillium, Mucor) indicate fungal colonization capable of synthesizing mycotoxins. Feeding moldy silage causes ruminal dysbiosis, abortion, and milk drop.",
    recommendedAction: "DO NOT FEED mold-covered silage. Physically discard all visibly colonized patches and at least 20 cm of surrounding margin."
  },

  EXTREME_MOISTURE_EXCESS: {
    ruleId: "RULE_EXCESS_MOISTURE",
    ruleTitle: "Excess Moisture & Seepage Risk",
    severity: "WARNING",
    enforcedVerdict: "CAUTION",
    citation: "Moran (2005), Tropical Dairy Farming",
    agronomicRationale: "Moisture exceeding 72% creates anaerobic seepage, leaching water-soluble carbohydrates and promoting clostridial putrefaction with foul butyric acid odors.",
    recommendedAction: "Inspect pit base for effluent accumulation. Ensure adequate dry fodder inclusion in the total mixed ration (TMR)."
  },

  SENSOR_OUT_OF_BOUNDS: {
    ruleId: "RULE_SENSOR_OUT_OF_BOUNDS",
    ruleTitle: "Physical Sensor Anomaly / Uncalibrated Probe",
    severity: "CRITICAL",
    citation: "ISO 10523 Water Quality Standard",
    agronomicRationale: "Measured physical parameter lies outside biological limits of plant fermentation, indicating damaged probe electrode, electrical disconnection, or uncalibrated sensor.",
    recommendedAction: "Re-calibrate probe using standard pH 4.01 and 7.00 buffer solutions before relying on sensor scores."
  },

  EVIDENCE_DIVERGENCE: {
    ruleId: "RULE_EVIDENCE_CONFLICT",
    ruleTitle: "Sub-Surface Hotspot Divergence",
    severity: "WARNING",
    enforcedVerdict: "CAUTION",
    citation: "Borreani et al. (2018), J. Dairy Sci. 101:3980–4000",
    agronomicRationale: "Surface appearance looks visually acceptable, but the core probe detected elevated thermal rise or sub-surface fermentation stress.",
    recommendedAction: "Inspect deeper inside the bunker clamp. Take 2 additional probe insertions 1 meter apart to map internal heating pockets."
  }
};
