/**
 * SILAGEGUARD AI V3 — Agronomic Safety Rule Engine
 * Completely decoupled from ML models and probabilistic heuristics.
 *
 * Literature Foundation:
 *   - Kung et al. (2018), Journal of Dairy Science, 101(5), 4020-4033
 *   - Borreani et al. (2018), Journal of Dairy Science, 101(5), 3952-3979
 *   - Moran (2005), Tropical Dairy Farming: Feeding Management for Smallholder Dairying
 *   - Pitt (1990), Silage and Hay Preservation, NRAES-5
 *
 * Enforces hard deterministic overrides when physical or biological safety thresholds are breached.
 */

export type RuleSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AgronomicRule {
  ruleId: string;
  name: string;
  conditionDescription: string;
  enforcedVerdict: "SAFE" | "CAUTION" | "UNSAFE" | "INVALID_READING";
  severity: RuleSeverity;
  literatureSource: string;
  agronomicRationale: string;
  recommendedAction: string;
}

export const AGRONOMIC_RULES: Record<string, AgronomicRule> = {
  CRITICAL_HIGH_PH: {
    ruleId: "RULE_PH_CRITICAL_HIGH",
    name: "Clostridial Putrefaction Spoilage Override",
    conditionDescription: "Silage core pH > 4.80 (Normal optimal: 3.80 - 4.20)",
    enforcedVerdict: "UNSAFE",
    severity: "CRITICAL",
    literatureSource: "Kung et al. (2018), J. Dairy Sci. 101:4020-4033",
    agronomicRationale: "pH above 4.8 indicates failure of lactic acid fermentation and proliferation of proteolytic Clostridium tyrobutyricum producing butyric acid and ammonia-N.",
    recommendedAction: "Discard spoiled layer. Do NOT feed to lactating dairy cows or pregnant heifers."
  },
  MILD_HIGH_PH: {
    ruleId: "RULE_PH_MILD_HIGH",
    name: "Sub-Optimal Acidification Warning",
    conditionDescription: "Silage core pH between 4.30 and 4.80",
    enforcedVerdict: "CAUTION",
    severity: "WARNING",
    literatureSource: "Kung et al. (2018), J. Dairy Sci. 101:4020-4033",
    agronomicRationale: "Acidification has stalled above optimal lactic preservation band (3.8-4.2), leaving silage vulnerable to secondary aerobic spoilage upon bunker exposure.",
    recommendedAction: "Feed within 6 hours. Minimize exposure of bunker face to air."
  },
  SEVERE_THERMAL_RUNAWAY: {
    ruleId: "RULE_THERMAL_RUNAWAY",
    name: "Severe Aerobic Heat Runaway Override",
    conditionDescription: "Core temperature rise > 8.0°C above ambient baseline",
    enforcedVerdict: "UNSAFE",
    severity: "CRITICAL",
    literatureSource: "Borreani et al. (2018), J. Dairy Sci. 101:3952-3979",
    agronomicRationale: "Temperature rise exceeding ambient by > 8°C indicates runaway respiration by aerobic yeasts, molds, and thermophilic bacteria destroying soluble carbs.",
    recommendedAction: "Immediately remove heated outer face. Tightly reseal plastic covering with heavy tire/sandbag weighting."
  },
  MODERATE_AEROBIC_HEATING: {
    ruleId: "RULE_MODERATE_HEATING",
    name: "Early Aerobic Microbial Heating Alert",
    conditionDescription: "Core temperature rise > 3.0°C above ambient baseline",
    enforcedVerdict: "CAUTION",
    severity: "WARNING",
    literatureSource: "Borreani et al. (2018), J. Dairy Sci. 101:3952-3979",
    agronomicRationale: "Heat rise between 3°C and 8°C signifies active yeast respiration consuming lactic acid at the bunker face.",
    recommendedAction: "Increase feedout rate. Advance the bunker face by at least 15-20 cm daily to outrun aerobic deterioration."
  },
  VISIBLE_FUNGAL_COLONIES: {
    ruleId: "RULE_VISIBLE_FUNGAL_GROWTH",
    name: "Macroscopic Fungal Mycelium Domination Override",
    conditionDescription: "Vision AI visual mold probability > 0.40 (40%)",
    enforcedVerdict: "UNSAFE",
    severity: "CRITICAL",
    literatureSource: "Pitt (1990), Silage and Hay Preservation (NRAES-5)",
    agronomicRationale: "Macroscopic visual fungal mats (Aspergillus, Penicillium, Mucor) signal severe degradation of feed dry matter and high mycotoxin risk.",
    recommendedAction: "Mechanically pitchfork and discard moldy patches. Never blend moldy forage into total mixed ration (TMR)."
  },
  EXTREME_MOISTURE_EXCESS: {
    ruleId: "RULE_EXCESS_MOISTURE",
    name: "Extreme Moisture & Effluent Loss Risk",
    conditionDescription: "Estimated moisture content > 72.0%",
    enforcedVerdict: "CAUTION",
    severity: "WARNING",
    literatureSource: "Moran (2005), Tropical Dairy Farming, CSIRO Publishing",
    agronomicRationale: "Moisture > 72% creates anaerobic conditions prone to clostridial fermentation, excessive bunker seepage, and foul butyric odor.",
    recommendedAction: "Feed in limited proportions with dry chopped hay or straw to balance rumen moisture."
  },
  IMPOSSIBLE_SENSOR_TELEMETRY: {
    ruleId: "RULE_SENSOR_OUT_OF_BOUNDS",
    name: "Impossible Sensor Physics Rejection",
    conditionDescription: "pH < 2.5, pH > 9.5, or Temperature > 75°C / < 0°C",
    enforcedVerdict: "INVALID_READING",
    severity: "CRITICAL",
    literatureSource: "Instrumentation Validation Standard (ISO 10523)",
    agronomicRationale: "Measured physical parameter lies outside biological limits of plant fermentation; indicates damaged probe electrode or uncalibrated sensor.",
    recommendedAction: "Clean probe glass bulb with distilled water and execute 2-point buffer calibration in Settings."
  },
  CONFLICTING_EVIDENCE_DIVERGENCE: {
    ruleId: "RULE_EVIDENCE_CONFLICT",
    name: "Sub-Surface Aerobic Hotspot Divergence",
    conditionDescription: "Surface optical AI reports SAFE, but probe reveals severe core thermal rise (> 5.0°C)",
    enforcedVerdict: "CAUTION",
    severity: "WARNING",
    literatureSource: "Borreani et al. (2018), J. Dairy Sci. 101:3952-3979",
    agronomicRationale: "The bunker surface appears visually normal, but internal heat rise reveals an ongoing subsurface aerobic fermentation pocket.",
    recommendedAction: "Inspect pit depth; probe 60cm deeper to map extent of thermal hotspot."
  }
};

export interface SafetyRuleInput {
  ph: number | null;
  moisture: number | null;
  deltaTemp: number | null;
  coreTemp: number | null;
  mouldProbability: number | null;
  iqaPassed?: boolean;
}

export interface TriggeredRuleResult {
  rule: AgronomicRule;
  triggerValue: string;
}

export interface SafetyEvaluationResult {
  hasOverride: boolean;
  enforcedVerdict: "SAFE" | "CAUTION" | "UNSAFE" | null;
  isInvalidReading: boolean;
  triggeredRules: TriggeredRuleResult[];
  primaryReason: string | null;
  recommendedAction: string | null;
}

export function evaluateSafetyRules(input: SafetyRuleInput): SafetyEvaluationResult {
  const triggered: TriggeredRuleResult[] = [];
  const { ph, moisture, deltaTemp, coreTemp, mouldProbability } = input;

  // 1. Sanity bounds check
  if (ph !== null && (ph < 2.5 || ph > 9.5)) {
    triggered.push({
      rule: AGRONOMIC_RULES.IMPOSSIBLE_SENSOR_TELEMETRY,
      triggerValue: `pH: ${ph.toFixed(2)}`
    });
  }
  if (coreTemp !== null && (coreTemp < 0.0 || coreTemp > 75.0)) {
    triggered.push({
      rule: AGRONOMIC_RULES.IMPOSSIBLE_SENSOR_TELEMETRY,
      triggerValue: `Core Temp: ${coreTemp.toFixed(1)}°C`
    });
  }

  // 2. High pH Override (Critical UNSAFE)
  if (ph !== null && ph > 4.80) {
    triggered.push({
      rule: AGRONOMIC_RULES.CRITICAL_HIGH_PH,
      triggerValue: `pH: ${ph.toFixed(2)} (Limit: 4.80)`
    });
  } else if (ph !== null && ph > 4.30) {
    triggered.push({
      rule: AGRONOMIC_RULES.MILD_HIGH_PH,
      triggerValue: `pH: ${ph.toFixed(2)} (Safe band: 3.80-4.20)`
    });
  }

  // 3. Thermal Runaway Override
  if (deltaTemp !== null && deltaTemp > 8.0) {
    triggered.push({
      rule: AGRONOMIC_RULES.SEVERE_THERMAL_RUNAWAY,
      triggerValue: `ΔT: +${deltaTemp.toFixed(1)}°C (Limit: +8.0°C)`
    });
  } else if (deltaTemp !== null && deltaTemp > 3.0) {
    triggered.push({
      rule: AGRONOMIC_RULES.MODERATE_AEROBIC_HEATING,
      triggerValue: `ΔT: +${deltaTemp.toFixed(1)}°C (Safe band: < +3.0°C)`
    });
  }

  // 4. Visible Mold Domination Override
  if (mouldProbability !== null && mouldProbability > 0.40) {
    triggered.push({
      rule: AGRONOMIC_RULES.VISIBLE_FUNGAL_COLONIES,
      triggerValue: `Mold Signal: ${(mouldProbability * 100).toFixed(0)}% (Limit: 40%)`
    });
  }

  // 5. Moisture Excess Alert
  if (moisture !== null && moisture > 72.0) {
    triggered.push({
      rule: AGRONOMIC_RULES.EXTREME_MOISTURE_EXCESS,
      triggerValue: `Moisture: ${moisture.toFixed(1)}% (Limit: 72.0%)`
    });
  }

  // 6. Conflicting Evidence Divergence
  if (
    mouldProbability !== null &&
    mouldProbability < 0.15 &&
    deltaTemp !== null &&
    deltaTemp > 5.0
  ) {
    triggered.push({
      rule: AGRONOMIC_RULES.CONFLICTING_EVIDENCE_DIVERGENCE,
      triggerValue: `Visual Mold: ${(mouldProbability * 100).toFixed(0)}% vs Core Heat: +${deltaTemp.toFixed(1)}°C`
    });
  }

  const isInvalid = triggered.some((t) => t.rule.enforcedVerdict === "INVALID_READING");
  const hasUnsafe = triggered.some((t) => t.rule.enforcedVerdict === "UNSAFE");
  const hasCaution = triggered.some((t) => t.rule.enforcedVerdict === "CAUTION");

  let enforcedVerdict: "SAFE" | "CAUTION" | "UNSAFE" | null = null;
  if (hasUnsafe) enforcedVerdict = "UNSAFE";
  else if (hasCaution) enforcedVerdict = "CAUTION";

  const primaryTrigger = triggered.length > 0 ? triggered[0] : null;

  return {
    hasOverride: enforcedVerdict !== null,
    enforcedVerdict,
    isInvalidReading: isInvalid,
    triggeredRules: triggered,
    primaryReason: primaryTrigger ? `${primaryTrigger.rule.name}: ${primaryTrigger.rule.agronomicRationale}` : null,
    recommendedAction: primaryTrigger ? primaryTrigger.rule.recommendedAction : null
  };
}
