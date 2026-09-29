/**
 * SILAGEGUARD AI V3 — Multimodal Fusion Engine
 * 
 * Fusion Architecture:
 *   1. Vision Ingestion (MobileNetV3-Small): 3-class probabilities (SAFE, CAUTION, UNSAFE)
 *   2. Sensor Ingestion (11-Feature Random Forest): 3-class probabilities + agronomic features
 *   3. Missing Modality Handling:
 *      - MULTIMODAL: Sensor + Vision weighted fusion (0.55 sensor / 0.45 vision)
 *      - SENSOR_ONLY: Telemetry-driven screening (Flags needProbe = false, needRetake = false)
 *      - VISION_ONLY: Optical surface screening (Flags needProbe = true when caution/unsafe)
 *      - INSUFFICIENT_DATA: No telemetry, no photo (Flags needRetake = true, needProbe = true)
 *   4. Safety Rule Engine Decoupled Pass (Kung et al. 2018, Borreani et al. 2018, Moran 2005, Pitt 1990)
 *   5. Calibrated Categorical Confidence: HIGH (>= 80%), MEDIUM (60-79%), LOW (< 60%), RETAKE_REQUIRED
 *   6. Explainability Chain ("WHY THIS RESULT?")
 */

import { SensorInferenceResult } from "../../ai/sensorInference";
import { VisionInferenceResult } from "../../ai/visionInference";
import { evaluateSafetyRules, SafetyEvaluationResult, TriggeredRuleResult } from "./safetyRuleEngine";

export const FUSION_CONFIG = {
  FUSION_SENSOR_WEIGHT: 0.55,
  FUSION_VISION_WEIGHT: 0.45,
  VERSION: "mssi_v3.0",
  DISCLAIMER: "Screening triage assessment based on calibrated empirical models. Not a replacement for accredited laboratory wet chemistry."
};

export type SilageVerdict =
  | "SAFE TO FEED (LOW SCREENING RISK)"
  | "FEED WITH CAUTION"
  | "UNSAFE"
  | "DO NOT FEED"
  | "INSUFFICIENT DATA";

export type SilageDecision = "SAFE" | "CAUTION" | "UNSAFE";
export type ModalityState = "MULTIMODAL" | "SENSOR_ONLY" | "VISION_ONLY" | "INSUFFICIENT_DATA";
export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "RETAKE_REQUIRED";

export interface ExplainabilityPoint {
  parameter: string;
  measuredValue: string;
  status: "NORMAL" | "BORDERLINE" | "ALERT" | "UNAVAILABLE";
  assessment: string;
}

export interface MultimodalFusionOutput {
  // Decision & Scoring
  decision: SilageDecision;
  finalVerdict: SilageVerdict;
  fusionScore: number;                 // 0 to 100 continuous MSSI
  sensorScore: number | null;          // 0 to 100 or null if unavailable
  visionScore: number | null;          // 0 to 100 or null if unavailable
  
  // Confidence & Calibration
  finalConfidence: number;             // 0 to 100 continuous
  confidenceLevel: ConfidenceTier;     // Calibrated tier (HIGH, MEDIUM, LOW, RETAKE_REQUIRED)
  sensorConfidence: number | null;
  visionConfidence: number | null;
  
  // Modality & Flow Control
  modalityState: ModalityState;
  needRetake: boolean;                 // Flag if image or probe retake is required
  needProbe: boolean;                  // Flag if farmer should insert physical probe

  // Rule Overrides & Reasons
  ruleOverride: boolean;
  ruleId: string | null;
  ruleReason: string | null;
  triggeredRules: TriggeredRuleResult[];
  summaryReason: string;
  reasons: string[];
  evidenceList: string[];
  explainabilityChain: ExplainabilityPoint[];

  // Breakdown & Metadata
  breakdown: {
    sensorSafetyScore: number;
    visionSafetyScore: number;
    mouldProbability: number;
  };
  metadata: {
    sensorModelVersion: string;
    visionModelVersion: string;
    fusionVersion: string;
    ruleVersion: string;
    advisoryVersion: string;
    modalityState: ModalityState;
    disclaimer: string;
  };

  // Backward compatibility aliases
  mssiScore: number;
  confidence: number;
  explanations: string[];
  sensor_score: number | null;
  vision_score: number | null;
  fusion_score: number;
  sensor_confidence: number | null;
  vision_confidence: number | null;
  final_confidence: number;
  confidence_level: ConfidenceTier;
  modality_state: ModalityState;
  rule_override: boolean;
  rule_id: string | null;
  rule_reason: string | null;
  final_verdict: SilageVerdict;
  summary_reason: string;
  explainability_chain: ExplainabilityPoint[];
}

export type FusionResult = MultimodalFusionOutput;

export interface FusionInputV3 {
  sensorResult?: SensorInferenceResult | null;
  visionResult?: VisionInferenceResult | null;
  iqaPassed?: boolean;
}

export function computeMultimodalFusion(input: FusionInputV3): MultimodalFusionOutput {
  const { sensorResult, visionResult, iqaPassed = true } = input;
  const isVisionRetake = !!(
    visionResult &&
    (visionResult.needRetake ||
      visionResult.iqaPassed === false ||
      (visionResult.prediction as string) === "RETAKE_REQUIRED" ||
      visionResult.requiresRecapture)
  );
  const effectiveIqaPassed = iqaPassed && !isVisionRetake;

  const hasSensor = !!sensorResult;
  const hasVision = !!visionResult;

  // Case: Vision-Only and image failed quality assessment (black screen / covered lens)
  if (hasVision && isVisionRetake && !hasSensor) {
    const retakeReason =
      visionResult?.iqaReason ||
      (visionResult?.reasons && visionResult.reasons[0]) ||
      "Silage photograph is too dark, covered, or unreadable. Please capture silage under proper lighting.";

    const retakeChain: ExplainabilityPoint[] = [
      {
        parameter: "Silage Camera Photo",
        measuredValue: "RETAKE REQUIRED",
        status: "ALERT",
        assessment: retakeReason
      }
    ];

    return {
      decision: "CAUTION",
      finalVerdict: "INSUFFICIENT DATA",
      fusionScore: 0,
      sensorScore: null,
      visionScore: 0,
      finalConfidence: 0,
      confidenceLevel: "RETAKE_REQUIRED",
      sensorConfidence: null,
      visionConfidence: 0,
      modalityState: "VISION_ONLY",
      needRetake: true,
      needProbe: true,
      ruleOverride: false,
      ruleId: null,
      ruleReason: null,
      triggeredRules: [],
      summaryReason: `PHOTO RETAKE REQUIRED: ${retakeReason}`,
      reasons: [retakeReason],
      evidenceList: ["Image quality rejection: Dark frame / black screen detected."],
      explainabilityChain: retakeChain,
      breakdown: {
        sensorSafetyScore: 0,
        visionSafetyScore: 0,
        mouldProbability: 0
      },
      metadata: {
        sensorModelVersion: "sensor_rf_v3",
        visionModelVersion: "mobilenetv3_silage_v3",
        fusionVersion: FUSION_CONFIG.VERSION,
        ruleVersion: "rules_v3.0",
        advisoryVersion: "advisory_v3.0",
        modalityState: "VISION_ONLY",
        disclaimer: FUSION_CONFIG.DISCLAIMER
      },
      mssiScore: 0,
      confidence: 0,
      explanations: [retakeReason],
      sensor_score: null,
      vision_score: 0,
      fusion_score: 0,
      sensor_confidence: null,
      vision_confidence: 0,
      final_confidence: 0,
      confidence_level: "RETAKE_REQUIRED",
      modality_state: "VISION_ONLY",
      rule_override: false,
      rule_id: null,
      rule_reason: null,
      final_verdict: "INSUFFICIENT DATA",
      summary_reason: `PHOTO RETAKE REQUIRED: ${retakeReason}`,
      explainability_chain: retakeChain
    };
  }

  // 1. Determine Modality State
  let modalityState: ModalityState = "MULTIMODAL";
  if (!hasSensor && !hasVision) {
    modalityState = "INSUFFICIENT_DATA";
  } else if (hasSensor && (!hasVision || isVisionRetake)) {
    // If photo failed IQA, fallback safely to sensor-only analysis with retake flag
    modalityState = "SENSOR_ONLY";
  } else if (!hasSensor && hasVision) {
    modalityState = "VISION_ONLY";
  } else {
    modalityState = "MULTIMODAL";
  }

  // --- CASE 4: INSUFFICIENT DATA ---
  if (modalityState === "INSUFFICIENT_DATA") {
    const emptyChain: ExplainabilityPoint[] = [
      {
        parameter: "Sensors & Camera",
        measuredValue: "None",
        status: "UNAVAILABLE",
        assessment: "No probe telemetry or silage photograph was provided for evaluation."
      }
    ];

    return {
      decision: "CAUTION",
      finalVerdict: "INSUFFICIENT DATA",
      fusionScore: 0,
      sensorScore: null,
      visionScore: null,
      finalConfidence: 0,
      confidenceLevel: "RETAKE_REQUIRED",
      sensorConfidence: null,
      visionConfidence: null,
      modalityState: "INSUFFICIENT_DATA",
      needRetake: true,
      needProbe: true,
      ruleOverride: false,
      ruleId: null,
      ruleReason: null,
      triggeredRules: [],
      summaryReason: "INSUFFICIENT DATA: Insert silage probe or capture surface photos to run quality screening.",
      reasons: ["No sensor or visual data available for analysis."],
      evidenceList: ["Incomplete scan: Connect probe or snap silage photos."],
      explainabilityChain: emptyChain,
      breakdown: {
        sensorSafetyScore: 0,
        visionSafetyScore: 0,
        mouldProbability: 0
      },
      metadata: {
        sensorModelVersion: "sensor_rf_v3",
        visionModelVersion: "mobilenetv3_silage_v3",
        fusionVersion: FUSION_CONFIG.VERSION,
        ruleVersion: "rules_v3.0",
        advisoryVersion: "advisory_v3.0",
        modalityState: "INSUFFICIENT_DATA",
        disclaimer: FUSION_CONFIG.DISCLAIMER
      },
      // Aliases
      mssiScore: 0,
      confidence: 0,
      explanations: ["Incomplete scan: Connect probe or snap silage photos."],
      sensor_score: null,
      vision_score: null,
      fusion_score: 0,
      sensor_confidence: null,
      vision_confidence: null,
      final_confidence: 0,
      confidence_level: "RETAKE_REQUIRED",
      modality_state: "INSUFFICIENT_DATA",
      rule_override: false,
      rule_id: null,
      rule_reason: null,
      final_verdict: "INSUFFICIENT DATA",
      summary_reason: "INSUFFICIENT DATA: Insert silage probe or capture surface photos to run quality screening.",
      explainability_chain: emptyChain
    };
  }

  // 2. Individual Modality Scores
  // Helper to normalize confidence strictly to 0..100 percentage
  const normalizeToPercentage = (val: number | null | undefined, fallback = 82): number => {
    if (val === null || val === undefined || isNaN(val)) return fallback;
    if (val > 0 && val <= 1.0) {
      return Math.min(100, Math.max(0, Math.round(val * 100)));
    }
    if (val > 100) {
      return Math.min(100, Math.max(0, Math.round(val / 100)));
    }
    return Math.min(100, Math.max(0, Math.round(val)));
  };

  let sensorScore: number | null = null;
  let sensorConfidence: number | null = null;
  let ph = 4.0;
  let isPhReal = false;
  let moisture = 65.0;
  let deltaTemp = 0.0;
  let coreTemp = 25.0;

  if (hasSensor && sensorResult) {
    sensorScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          sensorResult.probabilities.safe * 100 + sensorResult.probabilities.caution * 50
        )
      )
    );
    sensorConfidence = normalizeToPercentage(sensorResult.confidence, 85);
    isPhReal = !sensorResult.explainability.some(e => e.factor.includes("Unmeasured"));
    ph = sensorResult.features.ph;
    moisture = sensorResult.features.moisture_adc;
    deltaTemp = sensorResult.features.delta_temp;
    coreTemp = sensorResult.features.temperature;
  }

  let visionScore: number | null = null;
  let visionConfidence: number | null = null;
  let mouldProb = 0.0;

  if (hasVision && visionResult) {
    visionScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          visionResult.probabilities.safe * 100 + visionResult.probabilities.caution * 50
        )
      )
    );
    visionConfidence = normalizeToPercentage(visionResult.confidence, 85);
    mouldProb = Math.min(1.0, Math.max(0.0, visionResult.mouldProbability));
  }

  // 3. Continuous Fusion Score & Raw Confidence
  let fusionScore = 0;
  let rawConfidence = 0;

  if (modalityState === "MULTIMODAL" && sensorScore !== null && visionScore !== null) {
    const sW = FUSION_CONFIG.FUSION_SENSOR_WEIGHT;
    const vW = FUSION_CONFIG.FUSION_VISION_WEIGHT;
    fusionScore = Math.min(100, Math.max(0, Math.round(sW * sensorScore + vW * visionScore)));
    rawConfidence = Math.min(100, Math.max(0, Math.round(sW * (sensorConfidence ?? 82) + vW * (visionConfidence ?? 82))));
  } else if (modalityState === "SENSOR_ONLY" && sensorScore !== null) {
    fusionScore = Math.min(100, Math.max(0, sensorScore));
    const baseConf = sensorConfidence ?? 82;
    rawConfidence = Math.min(100, Math.max(0, Math.round(baseConf * 0.90)));
  } else if (modalityState === "VISION_ONLY" && visionScore !== null) {
    fusionScore = Math.min(100, Math.max(0, visionScore));
    // Calibrated vision-only confidence directly reflects the vision model's genuine certainty
    const baseConf = visionConfidence ?? Math.round(Math.max(visionScore, 75));
    rawConfidence = Math.min(100, Math.max(0, Math.round(baseConf * 0.90)));
  }

  // Penalty if image quality did not cleanly pass IQA
  if (!effectiveIqaPassed || isVisionRetake) {
    rawConfidence = Math.max(20, rawConfidence - 20);
  }

  rawConfidence = Math.min(100, Math.max(0, rawConfidence));

  // 4. Calibrated Confidence Tier
  let confidenceLevel: ConfidenceTier = "HIGH";
  let needRetake = false;

  if (!effectiveIqaPassed || rawConfidence < 45 || isVisionRetake) {
    confidenceLevel = "RETAKE_REQUIRED";
    needRetake = true;
  } else if (rawConfidence < 65) {
    confidenceLevel = "LOW";
  } else if (rawConfidence < 82) {
    confidenceLevel = "MEDIUM";
  } else {
    confidenceLevel = "HIGH";
  }

  // 5. Decoupled Safety Rule Engine Check
  const ruleResult: SafetyEvaluationResult = evaluateSafetyRules({
    ph: hasSensor && isPhReal ? ph : null,
    moisture: hasSensor ? moisture : null,
    deltaTemp: hasSensor ? deltaTemp : null,
    coreTemp: hasSensor ? coreTemp : null,
    mouldProbability: hasVision && !isVisionRetake ? mouldProb : null,
    iqaPassed: effectiveIqaPassed
  });

  // Base verdict from continuous fusion score
  let baseVerdict: SilageVerdict = "SAFE TO FEED (LOW SCREENING RISK)";
  let baseDecision: SilageDecision = "SAFE";

  if (fusionScore < 40) {
    baseVerdict = "UNSAFE";
    baseDecision = "UNSAFE";
  } else if (fusionScore < 72) {
    baseVerdict = "FEED WITH CAUTION";
    baseDecision = "CAUTION";
  } else {
    baseVerdict = "SAFE TO FEED (LOW SCREENING RISK)";
    baseDecision = "SAFE";
  }

  // Apply Rule Overrides
  let finalVerdict: SilageVerdict = baseVerdict;
  let finalDecision: SilageDecision = baseDecision;
  let ruleOverride = false;
  let ruleId: string | null = null;
  let ruleReason: string | null = null;

  if (ruleResult.hasOverride && ruleResult.enforcedVerdict) {
    ruleOverride = true;
    finalDecision = ruleResult.enforcedVerdict;
    finalVerdict =
      ruleResult.enforcedVerdict === "UNSAFE"
        ? "DO NOT FEED"
        : ruleResult.enforcedVerdict === "CAUTION"
        ? "FEED WITH CAUTION"
        : "SAFE TO FEED (LOW SCREENING RISK)";
    ruleId = ruleResult.triggeredRules[0]?.rule.ruleId ?? null;
    ruleReason = ruleResult.primaryReason;
  }

  // Need probe flag: if vision only and result is not cleanly safe, advise farmer to insert probe
  const needProbe = modalityState === "VISION_ONLY" && (finalDecision !== "SAFE" || rawConfidence < 75);

  // 6. Explainability Chain Construction
  const explainabilityChain: ExplainabilityPoint[] = [];
  const reasons: string[] = [];
  const evidenceList: string[] = [];

  // (a) pH
  if (hasSensor && isPhReal) {
    if (ph > 4.80) {
      explainabilityChain.push({
        parameter: "pH Acidity",
        measuredValue: `${ph.toFixed(2)} pH`,
        status: "ALERT",
        assessment: "Severely alkaline (> 4.80); indicates clostridial putrefaction."
      });
      reasons.push(`High core pH (${ph.toFixed(2)}) indicates clostridial fermentation failure.`);
      evidenceList.push(`pH: ${ph.toFixed(2)} (Limit: 4.80)`);
    } else if (ph > 4.30) {
      explainabilityChain.push({
        parameter: "pH Acidity",
        measuredValue: `${ph.toFixed(2)} pH`,
        status: "BORDERLINE",
        assessment: "Slightly elevated (4.30–4.80); vulnerable to secondary aerobic spoilage."
      });
      reasons.push(`Borderline pH (${ph.toFixed(2)}) suggests slow acidification.`);
      evidenceList.push(`pH: ${ph.toFixed(2)} (Sub-optimal band)`);
    } else {
      explainabilityChain.push({
        parameter: "pH Acidity",
        measuredValue: `${ph.toFixed(2)} pH`,
        status: "NORMAL",
        assessment: "Optimal lactic acid fermentation preservation (3.80–4.20)."
      });
      evidenceList.push(`pH: ${ph.toFixed(2)} (Optimal)`);
    }
  } else {
    explainabilityChain.push({
      parameter: "pH Acidity",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: hasSensor
        ? "Physical pH probe not detected. Core moisture and thermal readings prioritized."
        : "Silage probe was not inserted. Core pH was not acquired."
    });
  }

  // (b) Thermal delta
  if (hasSensor) {
    if (deltaTemp > 8.0) {
      explainabilityChain.push({
        parameter: "Core Heat Rise (ΔT)",
        measuredValue: `+${deltaTemp.toFixed(1)}°C`,
        status: "ALERT",
        assessment: "Severe thermal runaway (> 8.0°C rise); active aerobic microbial respiration."
      });
      reasons.push(`Core heating (+${deltaTemp.toFixed(1)}°C) reveals aerobic yeast respiration.`);
      evidenceList.push(`ΔT: +${deltaTemp.toFixed(1)}°C (Runaway)`);
    } else if (deltaTemp > 3.0) {
      explainabilityChain.push({
        parameter: "Core Heat Rise (ΔT)",
        measuredValue: `+${deltaTemp.toFixed(1)}°C`,
        status: "BORDERLINE",
        assessment: "Moderate temperature rise (3.0–8.0°C); indicates early bunker air ingress."
      });
      reasons.push(`Moderate heat rise (+${deltaTemp.toFixed(1)}°C) detected near face.`);
      evidenceList.push(`ΔT: +${deltaTemp.toFixed(1)}°C (Warming)`);
    } else {
      explainabilityChain.push({
        parameter: "Core Heat Rise (ΔT)",
        measuredValue: `+${deltaTemp.toFixed(1)}°C`,
        status: "NORMAL",
        assessment: "Silage core is in thermal equilibrium with ambient surroundings."
      });
      evidenceList.push(`ΔT: +${deltaTemp.toFixed(1)}°C (Stable)`);
    }
  } else {
    explainabilityChain.push({
      parameter: "Core Heat Rise (ΔT)",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: "Probe disconnected. Core temperature differential was not acquired."
    });
  }

  // (c) Estimated Moisture
  if (hasSensor) {
    if (moisture > 72.0) {
      explainabilityChain.push({
        parameter: "Estimated Moisture",
        measuredValue: `${moisture.toFixed(1)}%`,
        status: "ALERT",
        assessment: "Excess moisture (> 72%) promotes clostridial butyric acid formation."
      });
      reasons.push(`High moisture (${moisture.toFixed(1)}%) promotes effluent loss.`);
      evidenceList.push(`Moisture: ${moisture.toFixed(1)}% (Excess)`);
    } else if (moisture < 55.0) {
      explainabilityChain.push({
        parameter: "Estimated Moisture",
        measuredValue: `${moisture.toFixed(1)}%`,
        status: "BORDERLINE",
        assessment: "Low moisture (< 55%) hampers anaerobic compaction; air pockets likely."
      });
      evidenceList.push(`Moisture: ${moisture.toFixed(1)}% (Low)`);
    } else {
      explainabilityChain.push({
        parameter: "Estimated Moisture",
        measuredValue: `${moisture.toFixed(1)}%`,
        status: "NORMAL",
        assessment: "Within optimal compaction and ensiling moisture band (60–68%)."
      });
      evidenceList.push(`Moisture: ${moisture.toFixed(1)}% (Optimal)`);
    }
  } else {
    explainabilityChain.push({
      parameter: "Estimated Moisture",
      measuredValue: "Not Measured",
      status: "UNAVAILABLE",
      assessment: "Moisture sensor uncalibrated or disconnected."
    });
  }

  // (d) Visual Mold Pattern
  if (hasVision) {
    if (isVisionRetake) {
      explainabilityChain.push({
        parameter: "Silage Camera Photo",
        measuredValue: "RETAKE REQUIRED",
        status: "ALERT",
        assessment:
          visionResult?.iqaReason ||
          "Silage photo was too dark or camera was covered. Surface visual quality could not be inspected."
      });
      reasons.push("Silage photo was too dark or covered; visual screening requires retake.");
      evidenceList.push("Vision: Retake required (Black or dark frame)");
    } else if (mouldProb > 0.40) {
      explainabilityChain.push({
        parameter: "Visible Fungal Colony",
        measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
        status: "ALERT",
        assessment: "Macroscopic fungal mycelium or discoloration identified on forage surface."
      });
      reasons.push(`Surface image indicates macroscopic fungal colony growth (${(mouldProb * 100).toFixed(0)}%).`);
      evidenceList.push(`Vision: ${(mouldProb * 100).toFixed(0)}% mold probability`);
    } else if (mouldProb > 0.18) {
      explainabilityChain.push({
        parameter: "Visible Fungal Colony",
        measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
        status: "BORDERLINE",
        assessment: "Slight surface browning or weathering crust observed."
      });
      evidenceList.push(`Vision: ${(mouldProb * 100).toFixed(0)}% mold signal (Borderline)`);
    } else {
      explainabilityChain.push({
        parameter: "Visible Fungal Colony",
        measuredValue: `${(mouldProb * 100).toFixed(0)}% signal`,
        status: "NORMAL",
        assessment: "Clean, well-compacted face with no macroscopic fungal colonies."
      });
      evidenceList.push("Vision: Clean surface pattern (No mold)");
    }
  } else {
    explainabilityChain.push({
      parameter: "Visible Fungal Colony",
      measuredValue: "No Photo",
      status: "UNAVAILABLE",
      assessment: "Camera capture was skipped. Surface mould risk unassessed."
    });
  }

  // Summary reason
  let summaryReason = "Low screening risk signal based on available screening evidence.";
  if (ruleOverride) {
    summaryReason = `SAFETY OVERRIDE: ${ruleReason}`;
  } else if (finalDecision === "CAUTION") {
    summaryReason = "Secondary aerobic warming or moderate moisture deviation detected. Feed promptly within 6 hours.";
  } else if (finalDecision === "UNSAFE") {
    summaryReason = "Elevated risk signals detected. Do not feed suspect forage to livestock.";
  }

  if (modalityState === "SENSOR_ONLY") {
    summaryReason += " (Sensor-only triage; photo was omitted)";
  } else if (modalityState === "VISION_ONLY") {
    summaryReason += " (Surface vision triage only; probe telemetry missing)";
  }

  if (reasons.length === 0) {
    reasons.push(summaryReason);
  }

  return {
    decision: finalDecision,
    finalVerdict,
    fusionScore,
    sensorScore,
    visionScore,
    finalConfidence: rawConfidence,
    confidenceLevel,
    sensorConfidence,
    visionConfidence,
    modalityState,
    needRetake,
    needProbe,
    ruleOverride,
    ruleId,
    ruleReason,
    triggeredRules: ruleResult.triggeredRules,
    summaryReason,
    reasons,
    evidenceList,
    explainabilityChain,
    breakdown: {
      sensorSafetyScore: sensorScore ?? 0,
      visionSafetyScore: visionScore ?? 0,
      mouldProbability: mouldProb
    },
    metadata: {
      sensorModelVersion: "sensor_rf_v3",
      visionModelVersion: "mobilenetv3_silage_v3",
      fusionVersion: FUSION_CONFIG.VERSION,
      ruleVersion: "rules_v3.0",
      advisoryVersion: "advisory_v3.0",
      modalityState,
      disclaimer: FUSION_CONFIG.DISCLAIMER
    },
    // Backward-compatible properties
    mssiScore: fusionScore,
    confidence: rawConfidence,
    explanations: explainabilityChain.map((p) => `${p.parameter}: ${p.assessment}`),
    sensor_score: sensorScore,
    vision_score: visionScore,
    fusion_score: fusionScore,
    sensor_confidence: sensorConfidence,
    vision_confidence: visionConfidence,
    final_confidence: rawConfidence,
    confidence_level: confidenceLevel,
    modality_state: modalityState,
    rule_override: ruleOverride,
    rule_id: ruleId,
    rule_reason: ruleReason,
    final_verdict: finalVerdict,
    summary_reason: summaryReason,
    explainability_chain: explainabilityChain
  };
}
