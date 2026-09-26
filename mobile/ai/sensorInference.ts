/**
 * SILAGEGUARD AI V3 — On-Device Sensor AI Inference Engine
 * Pure TypeScript execution of 11-feature trained Random Forest Classifier.
 * Zero cloud dependency. Sub-millisecond execution (< 5 ms) on mobile CPU.
 */

import rfModelJson from "../assets/models/sensor_rf_model.json";

export interface SensorTelemetryInput {
  ph: number | null;
  moisture: number | null;
  temperature: number | null;
  ambient: number | null;
  storageType?: number;
  cropType?: number;
  depthBucket?: number;
}

export interface SensorExplainabilityFactor {
  factor: string;
  contributionPercent: number;
  rationale: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface SensorInferenceResult {
  prediction: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  probabilities: {
    safe: number;
    caution: number;
    unsafe: number;
  };
  features: {
    ph: number;
    moisture_adc: number;
    temperature: number;
    ambient: number;
    delta_temp: number;
    ph_dev: number;
    moisture_dev: number;
    heat_rise: number;
    storage_type: number;
    crop_type: number;
    depth_bucket: number;
  };
  explainability: SensorExplainabilityFactor[];
  latencyMs: number;
}

interface TreeNode {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  value: number[][];
}

interface ForestSchema {
  model_type: string;
  n_estimators: number;
  n_classes: number;
  classes: string[];
  feature_names: string[];
  trees: TreeNode[];
}

const forest = rfModelJson as ForestSchema;
const OPTIMAL_PH = 4.0;
const OPTIMAL_MOISTURE = 64.0;

function moistureToAdc(moistPct: number): number {
  return Math.round(Math.max(1100, Math.min(3300, 3200 - (moistPct / 100.0) * 2000)));
}

export function runSensorInference(telemetry: SensorTelemetryInput): SensorInferenceResult | null {
  if (
    telemetry.ph === null ||
    telemetry.moisture === null ||
    telemetry.temperature === null ||
    telemetry.ambient === null
  ) {
    return null;
  }

  const startTime = Date.now();

  const ph = telemetry.ph;
  const moisture = telemetry.moisture;
  const temp = telemetry.temperature;
  const ambient = telemetry.ambient;

  const moisture_adc = moistureToAdc(moisture);
  const delta_temp = Number((temp - ambient).toFixed(2));
  const ph_dev = Number(Math.abs(ph - OPTIMAL_PH).toFixed(2));
  const moisture_dev = Number(Math.abs(moisture - OPTIMAL_MOISTURE).toFixed(2));
  const heat_rise = Math.max(0, delta_temp);
  const storage_type = telemetry.storageType ?? 0;
  const crop_type = telemetry.cropType ?? 0;
  const depth_bucket = telemetry.depthBucket ?? 1;

  // Feature vector in exact schema order
  const featureVector: number[] = [
    ph,
    moisture_adc,
    temp,
    ambient,
    delta_temp,
    ph_dev,
    moisture_dev,
    heat_rise,
    storage_type,
    crop_type,
    depth_bucket
  ];

  const classProbSums = [0, 0, 0];

  for (const tree of forest.trees) {
    let nodeIdx = 0;
    while (tree.feature[nodeIdx] !== -2) {
      const featIdx = tree.feature[nodeIdx];
      const threshold = tree.threshold[nodeIdx];
      const val = featureVector[featIdx];

      if (val <= threshold) {
        nodeIdx = tree.children_left[nodeIdx];
      } else {
        nodeIdx = tree.children_right[nodeIdx];
      }
    }

    const leafValues = tree.value[nodeIdx];
    const totalLeafSamples = leafValues.reduce((a, b) => a + b, 0);

    if (totalLeafSamples > 0) {
      for (let c = 0; c < 3; c++) {
        classProbSums[c] += leafValues[c] / totalLeafSamples;
      }
    }
  }

  const nTrees = forest.trees.length;
  const probs = classProbSums.map((sum) => sum / nTrees);

  let maxIdx = 0;
  let maxProb = probs[0];
  for (let c = 1; c < 3; c++) {
    if (probs[c] > maxProb) {
      maxProb = probs[c];
      maxIdx = c;
    }
  }

  const prediction = (forest.classes[maxIdx] || "SAFE") as "SAFE" | "CAUTION" | "UNSAFE";
  const confidence = Math.round(maxProb * 100);

  // Compute explainability factors
  const explainability: SensorExplainabilityFactor[] = [];

  if (ph > 4.6) {
    explainability.push({
      factor: `High pH Acidity (${ph.toFixed(2)})`,
      contributionPercent: Math.min(Math.round(((ph - 4.0) / 1.5) * 45), 45),
      rationale: "Elevated pH indicates incomplete lactic acidification and clostridial risk.",
      severity: "CRITICAL"
    });
  } else if (ph <= 4.2) {
    explainability.push({
      factor: `Optimal Lactic pH (${ph.toFixed(2)})`,
      contributionPercent: -15,
      rationale: "Lactic preservation threshold met; actively inhibits spoilage bacteria.",
      severity: "INFO"
    });
  }

  if (delta_temp > 3.0) {
    explainability.push({
      factor: `Core Heat Rise (+${delta_temp.toFixed(1)}°C)`,
      contributionPercent: Math.min(Math.round((delta_temp / 8.0) * 38), 38),
      rationale: "Aerobic microbial respiration is actively generating heat and degrading sugars.",
      severity: delta_temp > 8.0 ? "CRITICAL" : "WARNING"
    });
  } else {
    explainability.push({
      factor: `Thermal Stability (+${delta_temp.toFixed(1)}°C)`,
      contributionPercent: -10,
      rationale: "Core temperature is in equilibrium with ambient surroundings.",
      severity: "INFO"
    });
  }

  if (moisture_dev > 6.0) {
    explainability.push({
      factor: `Moisture Imbalance (${moisture.toFixed(1)}%)`,
      contributionPercent: 18,
      rationale: "Moisture deviation from 60-68% safe window increases effluent or fungal risk.",
      severity: "WARNING"
    });
  } else {
    explainability.push({
      factor: `Optimal Bunker Moisture (${moisture.toFixed(1)}%)`,
      contributionPercent: -8,
      rationale: "Ideal moisture band for compaction and anaerobic fermentation.",
      severity: "INFO"
    });
  }

  explainability.sort((a, b) => Math.abs(b.contributionPercent) - Math.abs(a.contributionPercent));

  const latencyMs = Math.max(1, Date.now() - startTime);

  return {
    prediction,
    confidence,
    probabilities: {
      safe: Number(probs[0].toFixed(4)),
      caution: Number(probs[1].toFixed(4)),
      unsafe: Number(probs[2].toFixed(4))
    },
    features: {
      ph,
      moisture_adc,
      temperature: temp,
      ambient,
      delta_temp,
      ph_dev,
      moisture_dev,
      heat_rise,
      storage_type,
      crop_type,
      depth_bucket
    },
    explainability,
    latencyMs
  };
}
