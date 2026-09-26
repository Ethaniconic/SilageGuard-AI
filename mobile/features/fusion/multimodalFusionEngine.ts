/**
 * SILAGEGUARD AI V2.1 — Multimodal Evidence Fusion Engine
 * 
 * Design Architecture:
 *   1. Calculate Sensor Evidence Score (0–100) & Model Confidence (if available)
 *   2. Calculate Vision Evidence Score (0–100) & Model Confidence (if available)
 *   3. Missing Modality Handling:
 *      - Case 1: Both available -> Weighted fusion (0.55 sensor / 0.45 vision prototype weighting)
 *      - Case 2: Sensor only -> Sensor-only screening mode; vision score not invented
 *      - Case 3: Vision only -> Vision-only screening mode; sensor score not invented
 *      - Case 4: Neither -> INSUFFICIENT DATA (score 0, transparent farmer prompt)
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
  VERSION: "mssi_v2.1",
  WEIGHT_DISCLAIMER: "Prototype heuristic weights for field triage screening."
};

export type SilageVerdict =
  | "SAFE TO FEED (LOW SCREENING RISK)"
  | "FEED WITH CAUTION"
  | "UNSAFE"
  | "DO NOT FEED"
  | "INSUFFICIENT DATA";

export type SilageDecision = "SAFE" | "CAUTION" | "UNSAFE";
export type ModalityState = "MULTIMODAL" | "SENSOR_ONLY" | "VISION_ONLY" | "INSUFFICIENT_DATA";

export interface ExplainabilityPoint {
  parameter: string;
  measuredValue: string;
  status: "NORMAL" | "BORDERLINE" | "ALERT" | "UNAVAILABLE";
  assessment: string;
}

export interface MultimodalFusionOutput {
  sensor_score: number | null;        // 0 to 100 or null if unavailable
  vision_score: number | null;        // 0 to 100 or null if unavailable
  fusion_score: number;               // 0 to 100 (Continuous MSSI)
  sensor_confidence: number | null;   // 0 to 100% or null
  vision_confidence: number | null;   // 0 to 100% or null
  final_confidence: number;           // 0 to 100%
  confidence_level: "HIGH" | "MODERATE" | "LOW_UNCERTAIN";
  modality_state: ModalityState;
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
    advisory_version: string;
    modality_state: ModalityState;
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
  sensorResult?: SensorInferenceResult | null;
  visionResult?: VisionInferenceResult | null;
}

export function computeMultimodalFusion(input: FusionInputV2): MultimodalFusionOutput {
  const { sensorResult, visionResult } = input;
  const hasSensor = !!sensorResult;
  const hasVision = !!visionResult;

  // Determine Modality State
  let modalityState: ModalityState = "MULTIMODAL";
  if (!hasSensor && !hasVision) {
    modalityState = "INSUFFICIENT_DATA";
  } else if (hasSensor && !hasVision) {
    modalityState = "SENSOR_ONLY";
  } else if (!hasSensor && hasVision) {
    modalityState = "VISION_ONLY";
  } else {
    modalityState = "MULTIMODAL";
  }

  // --- CASE 4: NEITHER MODALITY AVAILABLE ---
  if (modalityState === "INSUFFICIENT_DATA") {
    return {
      sensor_score: null,
      vision_score: null,
      fusion_score: 0,
      sensor_confidence: null,
      vision_confidence: null,
      final_confidence: 0,
      confidence_level: "LOW_UNCERTAIN",
      modality_state: "INSUFFICIENT_DATA",
      rule_override: false,
      rule_id: null,
      rule_reason: null,
      rule_designation: null,
      final_verdict: "INSUFFICIENT DATA",
      explainability_chain: [
        {
          parameter: "Sensors & Camera",
          measuredValue: "None",
          status: "UNAVAILABLE",
          assessment: "No probe telemetry or silage photograph was provided for evaluation."
        }
      ],
      summary_reason: "INSUFFICIENT DATA: Insert probe or capture photos to run quality screening.",
      metadata: {
        sensor_model_version: "sensor_rf_v2.1",
        vision_model_version: "mobilenetv3_silage_v2.1",
        fusion_version: FUSION_CONFIG.VERSION,
        rule_version: "rules_v2.1",
        advisory_version: "advisory_v2.1",
        modality_state: "INSUFFICIENT_DATA"
      },
      decision: "CAUTION",
      mssiScore: 0,
      confidence: 0,
      explanations: ["Incomplete scan: Connect probe or snap silage photos."],
      breakdown: {
        sensorSafetyScore: 0,
        visionSafetyScore: 0,
        mouldProbability: 0
      }
    };
  }

  // 1. Calculate Individual Modality Scores
  let sensorScore: number | null = null;
  let sensorConfidence: number | null = null;
  let ph = 4.0;
  let moisture = 65.0;
  let temp_rise = 0.0;

  if (hasSensor && sensorResult) {
    sensorScore = Math.round(
      sensorResult.probabilities.Safe * 100 + sensorResult.probabilities.Caution * 50
    );
    sensorConfidence = Math.round(sensorResult.confidence * 100);
    ph = sensorResult.features.ph;
    moisture = sensorResult.features.moisture;
    temp_rise = sensorResult.features.temp_rise;
  }

  let visionScore: number | null = null;
  let visionConfidence: number | null = null;
  let mouldProb = 0.0;

  if (hasVision && visionResult) {
    visionScore = Math.round(
      visionResult.probabilities.Safe * 100 + visionResult.probabilities.Caution * 50
    );
    visionConfidence = Math.round(visionResult.confidence * 100);
    mouldProb = visionResult.mouldProbability;
  }

  // 2. Continuous Fusion Score Calculation
  let fusionScore = 0;
  let finalConfidence = 0;

  if (modalityState === "MULTIMODAL" && sensorScore !== null && visionScore !== null) {
    const sensorWeight = FUSION_CONFIG.FUSION_SENSOR_WEIGHT;
    const visionWeight = FUSION_CONFIG.FUSION_VISION_WEIGHT;
    fusionScore = Math.min(100, Math.max(0, Math.round(sensorWeight * sensorScore + visionWeight * visionScore)));
    finalConfidence = Math.round(sensorWeight * (sensorConfidence ?? 0) + visionWeight * (visionConfidence ?? 0));
  } else if (modalityState === "SENSOR_ONLY" && sensorScore !== null) {
    // 100% Sensor-driven screening
    fusionScore = sensorScore;
    finalConfidence = Math.round((sensorConfidence ?? 70) * 0.85); // slight penalty for single modality
  } else if (modalityState === "VISION_ONLY" && visionScore !== null) {
    // 100% Vision-driven screening
    fusionScore = visionScore;
    finalConfidence = Math.round((visionConfidence ?? 70) * 0.80); // higher uncertainty without core chemistry
  }

  let confidenceLevel: "HIGH" | "MODERATE" | "LOW_UNCERTAIN" = "HIGH";
  if (finalConfidence < 65) {
    confidenceLevel = "LOW_UNCERTAIN";
  } else if (finalConfidence < 85) {
    confidenceLevel = "MODERATE";
  }

  // Base verdict from continuous fusion score
  let baseVerdict: SilageVerdict = "SAFE TO FEED (LOW SCREENING RISK)";
  if (fusionScore < 40) {
    baseVerdict = "UNSAFE";
  } else if (fusionScore < 72) {
    baseVerdict = "FEED WITH CAUTION";
  } else {
    baseVerdict = "SAFE TO FEED (LOW SCREENING RISK)";
  }

  // 3. Decoupled Safety Rule Engine Check
  const ruleResult: RuleEvaluationResult = evaluateSafetyRules({
    ph: hasSensor ? ph : 4.0,
    moisture: hasSensor ? moisture : 64.0,
    tempRise: hasSensor ? temp_rise : 1.0,
    mouldProbability: hasVision ? mouldProb : 0.05
  });

  let finalVerdict: SilageVerdict = baseVerdict;
  let ruleOverride = false;
  let ruleId: string | null = null;
  let ruleReason: string | null = null;
  let ruleDesignation: string | null = null;

  if (ruleResult.overrideTriggered && ruleResult.overrideVerdict) {
    ruleOverride = true;
    ruleId = ruleResult.triggeredRuleId;
    ruleReason = ruleResult.ruleReason;
    ruleDesignation = ruleResult.designation;
    finalVerdict = ruleResult.overrideVerdict === "UNSAFE" ? "DO NOT FEED" : "SAFE TO FEED (LOW SCREENING RISK)";
  }

  // 4. Construct Explainability Chain ("WHY THIS RESULT?")
  const explainabilityChain: ExplainabilityPoint[] = [];

  // (a) pH explanation
  if (hasSensor) {
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
  } else {
    explainabilityChain.push({
      parameter: "pH Acidity",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: "Probe telemetry not connected. pH was not acquired."
    });
  }

  // (b) Temperature rise explanation
  if (hasSensor) {
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
  } else {
    explainabilityChain.push({
      parameter: "Core Heat Rise (ΔT)",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: "Silage probe was not inserted. Core heating relative to ambient was not acquired."
    });
  }

  // (c) Moisture explanation
  if (hasSensor) {
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
  } else {
    explainabilityChain.push({
      parameter: "Estimated Moisture",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: "Moisture sensor uncalibrated or disconnected."
    });
  }

  // (d) Visual Mould Pattern explanation
  if (hasVision) {
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
  } else {
    explainabilityChain.push({
      parameter: "Visual Mould Pattern",
      measuredValue: "No Photo",
      status: "UNAVAILABLE",
      assessment: "Camera capture was skipped. Surface mould risk unassessed."
    });
  }

  // Summary reason
  let summaryReason = "Low screening risk signal based on available screening evidence.";
  if (ruleOverride) {
    summaryReason = `SAFETY OVERRIDE: ${ruleReason}`;
  } else if (finalVerdict === "FEED WITH CAUTION") {
    summaryReason = "Secondary aerobic warming or moderate moisture deviation detected. Feed promptly within 6 hours.";
  } else if (finalVerdict === "UNSAFE" || finalVerdict === "DO NOT FEED") {
    summaryReason = "Elevated risk signals detected. Do not feed suspect forage.";
  }

  if (modalityState === "SENSOR_ONLY") {
    summaryReason += " (Sensor-only triage; photo was omitted)";
  } else if (modalityState === "VISION_ONLY") {
    summaryReason += " (Surface vision triage only; probe telemetry missing)";
  }

  const decisionAlias: SilageDecision =
    finalVerdict.startsWith("SAFE") ? "SAFE" : finalVerdict === "FEED WITH CAUTION" ? "CAUTION" : "UNSAFE";

  return {
    sensor_score: sensorScore,
    vision_score: visionScore,
    fusion_score: fusionScore,
    sensor_confidence: sensorConfidence,
    vision_confidence: visionConfidence,
    final_confidence: finalConfidence,
    confidence_level: confidenceLevel,
    modality_state: modalityState,
    rule_override: ruleOverride,
    rule_id: ruleId,
    rule_reason: ruleReason,
    rule_designation: ruleDesignation,
    final_verdict: finalVerdict,
    explainability_chain: explainabilityChain,
    summary_reason: summaryReason,
    metadata: {
      sensor_model_version: "sensor_rf_v2.1",
      vision_model_version: "mobilenetv3_silage_v2.1",
      fusion_version: FUSION_CONFIG.VERSION,
      rule_version: "rules_v2.1",
      advisory_version: "advisory_v2.1",
      modality_state: modalityState
    },
    decision: decisionAlias,
    mssiScore: fusionScore,
    confidence: finalConfidence,
    explanations: explainabilityChain.map((p) => `${p.parameter}: ${p.assessment}`),
    breakdown: {
      sensorSafetyScore: sensorScore ?? 0,
      visionSafetyScore: visionScore ?? 0,
      mouldProbability: mouldProb
    }
  };
}
