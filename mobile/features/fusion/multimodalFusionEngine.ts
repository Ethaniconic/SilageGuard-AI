/**
 * SILAGEGUARD AI V2 — Multimodal Evidence Fusion Engine
 * 
 * Design Architecture:
 *   1. Calculate Sensor Evidence Score (0–100) & Model Confidence
 *   2. Calculate Vision Evidence Score (0–100) & Model Confidence
 *   3. Combine into continuous Multimodal Screening Score (MSSI) using prototype weights
 *   4. Pass through decoupled Safety Rule Engine
 *   5. Build transparent Explainability Chain ("WHY THIS RESULT?")
 * 
 * ⚠️ SCIENTIFIC NOTE:
 * The default weights (Sensor: 0.55, Vision: 0.45) are PROTOTYPE DESIGN PARAMETERS,
 * not clinically or agronomically established coefficients.
 */

import { SensorInferenceResult } from "../../ai/sensorInference";
import { VisionInferenceResult } from "../../ai/visionInference";
import { evaluateSafetyRules, RuleEvaluationResult } from "./safetyRuleEngine";

// Configurable prototype fusion weights
export const FUSION_CONFIG = {
  FUSION_SENSOR_WEIGHT: 0.55,
  FUSION_VISION_WEIGHT: 0.45,
  VERSION: "mssi_v2.0",
  WEIGHT_DISCLAIMER: "Prototype heuristic weights for field triage screening."
};

export type SilageVerdict = "SAFE TO FEED" | "FEED WITH CAUTION" | "UNSAFE" | "DO NOT FEED";
export type SilageDecision = "SAFE" | "CAUTION" | "UNSAFE";

export interface ExplainabilityPoint {
  parameter: string;
  measuredValue: string;
  status: "NORMAL" | "BORDERLINE" | "ALERT";
  assessment: string;
}

export interface MultimodalFusionOutput {
  sensor_score: number;             // 0 to 100
  vision_score: number;             // 0 to 100
  fusion_score: number;             // 0 to 100 (Continuous MSSI)
  sensor_confidence: number;        // 0 to 100%
  vision_confidence: number;        // 0 to 100%
  final_confidence: number;         // 0 to 100%
  confidence_level: "HIGH" | "MODERATE" | "LOW_UNCERTAIN";
  rule_override: boolean;
  rule_id: string | null;
  rule_reason: string | null;
  rule_designation: string | null;
  final_verdict: SilageVerdict;
  explainability_chain: ExplainabilityPoint[];
  summary_reason: string;
  metadata: {
    sensor_model_version: string;
    vision_model_version: string;
    fusion_version: string;
    rule_version: string;
  };

  // Backward-compatible properties for UI components
  decision: SilageDecision;
  mssiScore: number;
  confidence: number;
  explanations: string[];
  breakdown: {
    sensorSafetyScore: number;
    visionSafetyScore: number;
    mouldProbability: number;
  };
}

export type FusionResult = MultimodalFusionOutput;

export interface FusionInputV2 {
  sensorResult: SensorInferenceResult;
  visionResult: VisionInferenceResult;
}

export function computeMultimodalFusion(input: FusionInputV2): MultimodalFusionOutput {
  const { sensorResult, visionResult } = input;
  const { ph, moisture, temp_rise, temperature, ambient } = sensorResult.features;
  const mouldProb = visionResult.mouldProbability;

  // 1. Calculate Continuous Evidence Scores (0–100)
  // Safe probability = 100 points, Caution = 50 points, Unsafe = 0 points
  const sensorScore = Math.round(
    sensorResult.probabilities.Safe * 100 + sensorResult.probabilities.Caution * 50
  );
  const visionScore = Math.round(
    visionResult.probabilities.Safe * 100 + visionResult.probabilities.Caution * 50
  );

  // 2. Continuous Weighted Fusion
  const sensorWeight = FUSION_CONFIG.FUSION_SENSOR_WEIGHT;
  const visionWeight = FUSION_CONFIG.FUSION_VISION_WEIGHT;
  const rawFusionScore = Math.round(sensorWeight * sensorScore + visionWeight * visionScore);
  const fusionScore = Math.min(100, Math.max(0, rawFusionScore));

  const sensorConfidence = Math.round(sensorResult.confidence * 100);
  const visionConfidence = Math.round(visionResult.confidence * 100);
  const finalConfidence = Math.round(sensorWeight * sensorConfidence + visionWeight * visionConfidence);

  let confidenceLevel: "HIGH" | "MODERATE" | "LOW_UNCERTAIN" = "HIGH";
  if (finalConfidence < 65) {
    confidenceLevel = "LOW_UNCERTAIN";
  } else if (finalConfidence < 85) {
    confidenceLevel = "MODERATE";
  }

  // Base verdict from continuous fusion score
  let baseVerdict: SilageVerdict = "SAFE TO FEED";
  if (fusionScore < 40) {
    baseVerdict = "UNSAFE";
  } else if (fusionScore < 72) {
    baseVerdict = "FEED WITH CAUTION";
  } else {
    baseVerdict = "SAFE TO FEED";
  }

  // 3. Decoupled Safety Rule Engine Check
  const ruleResult: RuleEvaluationResult = evaluateSafetyRules({
    ph,
    moisture,
    tempRise: temp_rise,
    mouldProbability: mouldProb
  });

  let finalVerdict = baseVerdict;
  let ruleOverride = false;
  let ruleId: string | null = null;
  let ruleReason: string | null = null;
  let ruleDesignation: string | null = null;

  if (ruleResult.overrideTriggered && ruleResult.overrideVerdict) {
    ruleOverride = true;
    ruleId = ruleResult.triggeredRuleId;
    ruleReason = ruleResult.ruleReason;
    ruleDesignation = ruleResult.designation;
    finalVerdict = ruleResult.overrideVerdict === "UNSAFE" ? "DO NOT FEED" : "SAFE TO FEED";
  }

  // 4. Construct Explainability Chain ("WHY THIS RESULT?")
  const explainabilityChain: ExplainabilityPoint[] = [];

  // (a) pH explanation
  if (ph > 5.0) {
    explainabilityChain.push({
      parameter: "pH Acidity",
      measuredValue: `${ph.toFixed(2)} pH`,
      status: "ALERT",
      assessment: "Significantly elevated above optimal threshold (3.8–4.2); signals clostridial degradation."
    });
  } else if (ph > 4.25) {
    explainabilityChain.push({
      parameter: "pH Acidity",
      measuredValue: `${ph.toFixed(2)} pH`,
      status: "BORDERLINE",
      assessment: "Slightly elevated; indicates mild buffer neutralization or delayed fermentation."
    });
  } else {
    explainabilityChain.push({
      parameter: "pH Acidity",
      measuredValue: `${ph.toFixed(2)} pH`,
      status: "NORMAL",
      assessment: "Within optimal lactic acid preservation target (3.8–4.2)."
    });
  }

  // (b) Temperature rise explanation
  if (temp_rise > 7.0) {
    explainabilityChain.push({
      parameter: "Core Heat Rise (ΔT)",
      measuredValue: `+${temp_rise.toFixed(1)}°C`,
      status: "ALERT",
      assessment: "Severe thermal spike indicates active aerobic yeast and mold respiration."
    });
  } else if (temp_rise > 3.0) {
    explainabilityChain.push({
      parameter: "Core Heat Rise (ΔT)",
      measuredValue: `+${temp_rise.toFixed(1)}°C`,
      status: "BORDERLINE",
      assessment: "Moderate temperature rise; indicates early oxygen penetration on bunker face."
    });
  } else {
    explainabilityChain.push({
      parameter: "Core Heat Rise (ΔT)",
      measuredValue: `+${temp_rise.toFixed(1)}°C`,
      status: "NORMAL",
      assessment: "Core temperature is in stable equilibrium with ambient air."
    });
  }

  // (c) Moisture explanation
  if (moisture > 72.0) {
    explainabilityChain.push({
      parameter: "Estimated Moisture",
      measuredValue: `${moisture.toFixed(1)}%`,
      status: "ALERT",
      assessment: "High moisture content increases effluent leaching and clostridial risk."
    });
  } else if (moisture < 55.0) {
    explainabilityChain.push({
      parameter: "Estimated Moisture",
      measuredValue: `${moisture.toFixed(1)}%`,
      status: "BORDERLINE",
      assessment: "Low moisture forage is difficult to compact, trapping pockets of oxygen."
    });
  } else {
    explainabilityChain.push({
      parameter: "Estimated Moisture",
      measuredValue: `${moisture.toFixed(1)}%`,
      status: "NORMAL",
      assessment: "Ideal moisture band for anaerobic pit packing (60–68%)."
    });
  }

  // (d) Visual Mould Pattern explanation
  if (mouldProb > 0.50) {
    explainabilityChain.push({
      parameter: "Visual Mould Pattern",
      measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
      status: "ALERT",
      assessment: "Visible mycelial patterns or discoloration detected; elevated spoilage risk."
    });
  } else if (mouldProb > 0.20) {
    explainabilityChain.push({
      parameter: "Visual Mould Pattern",
      measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
      status: "BORDERLINE",
      assessment: "Mild surface browning or patchy crust observed; monitor closely."
    });
  } else {
    explainabilityChain.push({
      parameter: "Visual Mould Pattern",
      measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
      status: "NORMAL",
      assessment: "No abnormal mycelium or fungal colonies observed on silage surface."
    });
  }

  // Summary reason
  let summaryReason = "All physical sensors and surface imagery reflect safe, well-compacted lactic preservation.";
  if (ruleOverride) {
    summaryReason = `SAFETY OVERRIDE: ${ruleReason}`;
  } else if (finalVerdict === "FEED WITH CAUTION") {
    summaryReason = "Secondary aerobic warming or moderate moisture deviation detected. Feed promptly within 6 hours.";
  } else if (finalVerdict === "UNSAFE" || finalVerdict === "DO NOT FEED") {
    summaryReason = "Multiple independent indicators suggest elevated spoilage risk. Do not feed suspect forage.";
  }

  const decisionAlias: SilageDecision =
    finalVerdict === "SAFE TO FEED" ? "SAFE" : finalVerdict === "FEED WITH CAUTION" ? "CAUTION" : "UNSAFE";

  return {
    sensor_score: sensorScore,
    vision_score: visionScore,
    fusion_score: fusionScore,
    sensor_confidence: sensorConfidence,
    vision_confidence: visionConfidence,
    final_confidence: finalConfidence,
    confidence_level: confidenceLevel,
    rule_override: ruleOverride,
    rule_id: ruleId,
    rule_reason: ruleReason,
    rule_designation: ruleDesignation,
    final_verdict: finalVerdict,
    explainability_chain: explainabilityChain,
    summary_reason: summaryReason,
    metadata: {
      sensor_model_version: "sensor_rf_v2.0",
      vision_model_version: "mobilenetv3_silage_v2.0",
      fusion_version: FUSION_CONFIG.VERSION,
      rule_version: "rules_v2.0"
    },
    decision: decisionAlias,
    mssiScore: fusionScore,
    confidence: finalConfidence,
    explanations: explainabilityChain.map((p) => `${p.parameter}: ${p.assessment}`),
    breakdown: {
      sensorSafetyScore: sensorScore,
      visionSafetyScore: visionScore,
      mouldProbability: mouldProb
    }
  };
}
