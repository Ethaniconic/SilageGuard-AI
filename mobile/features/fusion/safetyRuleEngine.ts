/**
 * SILAGEGUARD AI V2 — Agronomic Safety Rule Engine
 * Completely decoupled from ML models and probabilistic scoring.
 * 
 * Architecture:
 *   Sensor & Vision ML Evidence → Fusion Score → Safety Rule Engine → Final Screening Verdict
 * 
 * Every threshold is grounded in published literature (Kung et al., 2018; Borreani et al., 2018)
 * or explicitly designated as PROTOTYPE_HEURISTIC.
 */

export interface AgronomicThreshold {
  id: string;
  name: string;
  value: number;
  unit: string;
  comparison: "GREATER_THAN" | "LESS_THAN" | "BETWEEN";
  secondaryValue?: number;
  source: string;
  designation: "SCIENTIFICALLY_GROUNDED" | "PROTOTYPE_HEURISTIC";
  rationale: string;
}

export const AGRONOMIC_RULES: Record<string, AgronomicThreshold> = {
  CRITICAL_HIGH_PH: {
    id: "RULE_PH_CRITICAL",
    name: "Severe Clostridial Spoilage Override",
    value: 6.0,
    unit: "pH",
    comparison: "GREATER_THAN",
    source: "Kung et al. (2018), Journal of Dairy Science, 101(5), 4020-4033",
    designation: "SCIENTIFICALLY_GROUNDED",
    rationale: "Whole-plant corn or grass silage with pH > 6.0 indicates extensive protein breakdown into volatile ammonia-N, clostridial proliferation, and loss of preservation."
  },
  SEVERE_THERMAL_RISE: {
    id: "RULE_TEMP_RISE_CRITICAL",
    name: "Severe Aerobic Runaway Heat Override",
    value: 10.0,
    unit: "°C delta rise above ambient",
    comparison: "GREATER_THAN",
    source: "Borreani et al. (2018), Journal of Dairy Science, 101(5), 3952-3979",
    designation: "SCIENTIFICALLY_GROUNDED",
    rationale: "Core silage temperature exceeding ambient by > 10°C signifies intense aerobic microbial respiration, rapid destruction of soluble carbohydrates, and dangerous heat accumulation."
  },
  VISIBLE_MOULD_THRESHOLD: {
    id: "RULE_MOULD_DETECTED",
    name: "Visible Surface Mould Pattern Override",
    value: 0.60,
    unit: "probability fraction (0.0 to 1.0)",
    comparison: "GREATER_THAN",
    source: "Prototype Safety Threshold (Screening Precautionary Principle)",
    designation: "PROTOTYPE_HEURISTIC",
    rationale: "Elevated probability of visible fungal mycelium or spores signals potential mycotoxin presence. Immediate isolation is advised pending laboratory confirmation."
  },
  OPTIMAL_FERMENTATION: {
    id: "RULE_IDEAL_FERMENTATION",
    name: "Optimal Lactic Acid Preservation Invariant",
    value: 3.8,
    secondaryValue: 4.2,
    unit: "pH range",
    comparison: "BETWEEN",
    source: "Kung et al. (2018)",
    designation: "SCIENTIFICALLY_GROUNDED",
    rationale: "pH 3.8 to 4.2 with dry matter 32-40% and negligible thermal rise (< 3°C) reflects optimal anaerobic lactic acid fermentation with high nutritional preservation."
  }
};

export interface RuleEvaluationInput {
  ph: number;
  moisture: number;
  tempRise: number;
  mouldProbability: number;
}

export interface RuleEvaluationResult {
  overrideTriggered: boolean;
  overrideVerdict: "UNSAFE" | "SAFE" | null;
  triggeredRuleId: string | null;
  ruleTitle: string | null;
  ruleReason: string | null;
  sourceReference: string | null;
  designation: string | null;
  explanations: string[];
}

export function evaluateSafetyRules(input: RuleEvaluationInput): RuleEvaluationResult {
  const { ph, moisture, tempRise, mouldProbability } = input;
  const explanations: string[] = [];

  // Override Rule 1: High pH (Clostridial Ammonia)
  if (ph > AGRONOMIC_RULES.CRITICAL_HIGH_PH.value) {
    const rule = AGRONOMIC_RULES.CRITICAL_HIGH_PH;
    return {
      overrideTriggered: true,
      overrideVerdict: "UNSAFE",
      triggeredRuleId: rule.id,
      ruleTitle: rule.name,
      ruleReason: `Measured pH (${ph.toFixed(2)}) exceeds critical safety threshold (${rule.value} pH).`,
      sourceReference: rule.source,
      designation: rule.designation,
      explanations: [
        `Safety rule override triggered: Critical pH spike (${ph.toFixed(2)} > ${rule.value}).`,
        rule.rationale,
        "Screening advice: Do not feed this portion. Laboratory testing for clostridial toxins/ammonia is recommended."
      ]
    };
  }

  // Override Rule 2: Runaway Heat Rise (Aerobic Respiration)
  if (tempRise > AGRONOMIC_RULES.SEVERE_THERMAL_RISE.value) {
    const rule = AGRONOMIC_RULES.SEVERE_THERMAL_RISE;
    return {
      overrideTriggered: true,
      overrideVerdict: "UNSAFE",
      triggeredRuleId: rule.id,
      ruleTitle: rule.name,
      ruleReason: `Temperature rise (+${tempRise.toFixed(1)}°C) exceeds safety limit (+${rule.value}°C).`,
      sourceReference: rule.source,
      designation: rule.designation,
      explanations: [
        `Safety rule override triggered: Biological runaway heat detected (+${tempRise.toFixed(1)}°C above ambient).`,
        rule.rationale,
        "Screening advice: Bunker face air intrusion is spoiling feed. Remove and discard heated surface layer."
      ]
    };
  }

  // Override Rule 3: Visual Fungal Mould Pattern
  if (mouldProbability > AGRONOMIC_RULES.VISIBLE_MOULD_THRESHOLD.value) {
    const rule = AGRONOMIC_RULES.VISIBLE_MOULD_THRESHOLD;
    return {
      overrideTriggered: true,
      overrideVerdict: "UNSAFE",
      triggeredRuleId: rule.id,
      ruleTitle: rule.name,
      ruleReason: `Visual mould-like mycelial pattern detected with ${(mouldProbability * 100).toFixed(0)}% signal strength.`,
      sourceReference: rule.source,
      designation: rule.designation,
      explanations: [
        `Safety rule override triggered: Visual mould pattern exceeds threshold (${(mouldProbability * 100).toFixed(0)}% > ${(rule.value * 100).toFixed(0)}%).`,
        "Visible mould-like pattern detected. This may indicate contamination risk.",
        "Laboratory testing is recommended if mycotoxin contamination is suspected."
      ]
    };
  }

  // Positive Invariant: Ideal Lactic Fermentation
  const isIdealPh = ph >= 3.8 && ph <= 4.2;
  const isIdealMoisture = moisture >= 60.0 && moisture <= 68.0;
  const isIdealTemp = tempRise < 3.0;
  const isIdealMould = mouldProbability < 0.15;

  if (isIdealPh && isIdealMoisture && isIdealTemp && isIdealMould) {
    const rule = AGRONOMIC_RULES.OPTIMAL_FERMENTATION;
    return {
      overrideTriggered: true,
      overrideVerdict: "SAFE",
      triggeredRuleId: rule.id,
      ruleTitle: rule.name,
      ruleReason: "All 4 critical preservation parameters meet gold-standard lactic acid benchmarks.",
      sourceReference: rule.source,
      designation: rule.designation,
      explanations: [
        "Optimal lactic fermentation confirmed: pH 3.8-4.2, safe moisture (60-68%), stable temperature, and clean surface.",
        "Excellent nutritional stability for dairy cattle feeding."
      ]
    };
  }

  // No override triggered
  return {
    overrideTriggered: false,
    overrideVerdict: null,
    triggeredRuleId: null,
    ruleTitle: null,
    ruleReason: null,
    sourceReference: null,
    designation: null,
    explanations: []
  };
}
