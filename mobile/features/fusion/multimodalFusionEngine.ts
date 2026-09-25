/**
 * SILAGEGUARD AI — Multimodal Sensor-Vision Fusion Engine
 * Implements SIH26111 Edge Multimodal Fusion Architecture:
 * 
 * Formula:
 *   MSSI (Multimodal Silage Safety Index) = 0.55 * SensorSafetyScore + 0.45 * VisionSafetyScore
 * 
 * Strict Agronomic Rule Overrides:
 *   1. pH > 6.0 => UNSAFE (Severe Butyric Clostridial Spoilage Override)
 *   2. Temp rise > 10.0°C => UNSAFE (Aerobic Thermal Runaway Override)
 *   3. Visible mould probability > 0.60 => UNSAFE (Mycotoxin Contamination Override)
 *   4. Optimal fermentation (pH 3.8-4.2, Moisture 60-68%, Temp Rise < 3.0°C, Mould < 0.15) => SAFE
 */

import { SensorInferenceResult } from "../../ai/sensorInference";
import { VisionInferenceResult } from "../../ai/visionInference";
import { AGRONOMIC_THRESHOLDS } from "../../utils/constants";

export interface FusionInput {
  sensorResult: SensorInferenceResult;
  visionResult: VisionInferenceResult;
}

export type SilageDecision = "SAFE" | "CAUTION" | "UNSAFE";

export interface FusionResult {
  mssiScore: number;                // 0 to 100
  decision: SilageDecision;
  confidence: number;              // 0 to 100%
  ruleTriggered: string | null;
  explanations: string[];
  breakdown: {
    sensorSafetyScore: number;      // 0 to 100
    visionSafetyScore: number;      // 0 to 100
    sensorWeight: number;           // 0.55
    visionWeight: number;           // 0.45
    mouldProbability: number;
    ph: number;
    moisture: number;
    tempRise: number;
  };
}

export function computeMultimodalFusion(input: FusionInput): FusionResult {
  const { sensorResult, visionResult } = input;
  const { ph, moisture, temp_rise } = sensorResult.features;
  const mouldProb = visionResult.mouldProbability;

  // 1. Calculate continuous safety scores (0 to 100):
  // Safe probability counts for 100, Caution counts for 50, Unsafe counts for 0
  const sensorSafetyScore = 
    sensorResult.probabilities.Safe * 100 + 
    sensorResult.probabilities.Caution * 50;

  const visionSafetyScore = 
    visionResult.probabilities.Safe * 100 + 
    visionResult.probabilities.Caution * 50;

  // 2. Base Multimodal Fusion Formula
  const sensorWeight = 0.55;
  const visionWeight = 0.45;
  let rawMssi = sensorWeight * sensorSafetyScore + visionWeight * visionSafetyScore;
  rawMssi = Math.min(100, Math.max(0, Math.round(rawMssi)));

  // Base classification from continuous MSSI
  let decision: SilageDecision = "SAFE";
  if (rawMssi < 45) {
    decision = "UNSAFE";
  } else if (rawMssi < 75) {
    decision = "CAUTION";
  } else {
    decision = "SAFE";
  }

  let confidence = Math.round(
    (sensorResult.confidence * sensorWeight + visionResult.confidence * visionWeight) * 100
  );

  const explanations: string[] = [];
  let ruleTriggered: string | null = null;

  // 3. HARD RULE OVERRIDES (Biological & Agronomic Safety Invariants)
  
  // Rule 1: High pH (Alkalization caused by Clostridia & Proteolysis)
  if (ph > AGRONOMIC_THRESHOLDS.UNSAFE.PH_OVERRIDE) {
    decision = "UNSAFE";
    rawMssi = Math.min(rawMssi, 20);
    confidence = Math.max(confidence, 96);
    ruleTriggered = "RULE_PH_CRITICAL";
    explanations.push(`Critical pH spike (${ph.toFixed(2)} > 6.0) indicates severe Clostridial fermentation and ammonia release.`);
  }

  // Rule 2: Heat Rise (Active yeast/mold aerobic respiration)
  if (temp_rise > AGRONOMIC_THRESHOLDS.UNSAFE.TEMP_RISE_OVERRIDE) {
    decision = "UNSAFE";
    rawMssi = Math.min(rawMssi, 25);
    confidence = Math.max(confidence, 94);
    ruleTriggered = "RULE_TEMP_RISE_CRITICAL";
    explanations.push(`Intense aerobic heat rise (+${temp_rise.toFixed(1)}°C above ambient) detected. Bunker air intrusion is decomposing sugars.`);
  }

  // Rule 3: Visual Fungal Hyphae / Mould detection
  if (mouldProb > AGRONOMIC_THRESHOLDS.UNSAFE.MOULD_PROB_OVERRIDE) {
    decision = "UNSAFE";
    rawMssi = Math.min(rawMssi, 15);
    confidence = Math.max(confidence, 95);
    ruleTriggered = "RULE_MOULD_DETECTED";
    explanations.push(`High visual fungal spore density (${(mouldProb * 100).toFixed(0)}%). Severe danger of mycotoxin poisoning (Aflatoxin / DON).`);
  }

  // Rule 4: Ideal Fermentation Invariant
  const isIdealFermentation = 
    ph >= AGRONOMIC_THRESHOLDS.SAFE.PH_MIN &&
    ph <= AGRONOMIC_THRESHOLDS.SAFE.PH_MAX &&
    moisture >= AGRONOMIC_THRESHOLDS.SAFE.MOISTURE_MIN &&
    moisture <= AGRONOMIC_THRESHOLDS.SAFE.MOISTURE_MAX &&
    temp_rise < AGRONOMIC_THRESHOLDS.SAFE.TEMP_RISE_MAX &&
    mouldProb < AGRONOMIC_THRESHOLDS.SAFE.MOULD_PROB_MAX;

  if (isIdealFermentation) {
    decision = "SAFE";
    rawMssi = Math.max(rawMssi, 88);
    confidence = Math.max(confidence, 92);
    ruleTriggered = "RULE_IDEAL_FERMENTATION";
    explanations.push("Perfect lactic acid fermentation profile: optimal pH, safe dry matter, stable ambient equilibrium, and zero visible mycelium.");
  }

  // Additional context explanations if no hard override triggered
  if (explanations.length === 0) {
    if (decision === "SAFE") {
      explanations.push(`Optimal acidity (pH ${ph.toFixed(2)}) and stable temperature preserve high nutritional value.`);
      explanations.push(`Safe moisture level (${moisture.toFixed(1)}%) ensures anaerobic stability without effluent leaching.`);
    } else if (decision === "CAUTION") {
      explanations.push(`Elevated pH (${ph.toFixed(2)}) or moderate moisture deviation (${moisture.toFixed(1)}%) suggests secondary fermentation.`);
      explanations.push(`Mild heat rise (+${temp_rise.toFixed(1)}°C) indicates early air exposure on bunker face.`);
    } else {
      explanations.push(`Combined sensor-vision score indicates unsafe aerobic spoilage and feed degradation.`);
    }
  }

  return {
    mssiScore: rawMssi,
    decision,
    confidence,
    ruleTriggered,
    explanations,
    breakdown: {
      sensorSafetyScore: Math.round(sensorSafetyScore),
      visionSafetyScore: Math.round(visionSafetyScore),
      sensorWeight,
      visionWeight,
      mouldProbability: mouldProb,
      ph,
      moisture,
      tempRise: temp_rise
    }
  };
}
