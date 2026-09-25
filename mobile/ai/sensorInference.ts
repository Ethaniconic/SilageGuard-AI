/**
 * SILAGEGUARD AI — On-Device Sensor AI Inference Engine
 * Pure TypeScript execution of trained Random Forest Classifier.
 * Zero cloud dependency. Sub-millisecond execution on mobile CPU.
 */

import rfModelJson from "../assets/models/sensor_rf_model.json";

export interface SensorTelemetry {
  ph: number;
  moisture: number;
  temperature: number;
  ambient: number;
}

export interface SensorInferenceResult {
  prediction: "Safe" | "Caution" | "Unsafe";
  confidence: number;
  probabilities: {
    Safe: number;
    Caution: number;
    Unsafe: number;
  };
  features: {
    ph: number;
    moisture: number;
    temperature: number;
    ambient: number;
    delta_temp: number;
    ph_deviation: number;
    moisture_deviation: number;
    temp_rise: number;
  };
  latencyMs: number;
}

interface TreeNode {
  node_count: number;
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

const OPTIMAL_PH = 4.0;
const OPTIMAL_MOISTURE = 64.0;

export function engineerSensorFeatures(telemetry: SensorTelemetry) {
  const delta_temp = telemetry.temperature - telemetry.ambient;
  const ph_deviation = Math.abs(telemetry.ph - OPTIMAL_PH);
  const moisture_deviation = Math.abs(telemetry.moisture - OPTIMAL_MOISTURE);
  const temp_rise = Math.max(0.0, delta_temp);

  const featureVector = [
    telemetry.ph,
    telemetry.moisture,
    telemetry.temperature,
    telemetry.ambient,
    delta_temp,
    ph_deviation,
    moisture_deviation,
    temp_rise
  ];

  return {
    featureVector,
    featureMap: {
      ph: telemetry.ph,
      moisture: telemetry.moisture,
      temperature: telemetry.temperature,
      ambient: telemetry.ambient,
      delta_temp: Number(delta_temp.toFixed(2)),
      ph_deviation: Number(ph_deviation.toFixed(2)),
      moisture_deviation: Number(moisture_deviation.toFixed(2)),
      temp_rise: Number(temp_rise.toFixed(2))
    }
  };
}

function evaluateTree(tree: TreeNode, features: number[]): number[] {
  let nodeId = 0;
  const { children_left, children_right, feature, threshold, value } = tree;

  while (children_left[nodeId] !== -1) {
    const fIdx = feature[nodeId];
    const featVal = features[fIdx];
    const thresh = threshold[nodeId];

    if (featVal <= thresh) {
      nodeId = children_left[nodeId];
    } else {
      nodeId = children_right[nodeId];
    }
  }

  return value[nodeId];
}

export function runSensorInference(telemetry: SensorTelemetry): SensorInferenceResult {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const forest = rfModelJson as unknown as ForestSchema;

  const { featureVector, featureMap } = engineerSensorFeatures(telemetry);

  const nClasses = forest.n_classes;
  const probSum = new Array(nClasses).fill(0.0);

  for (let i = 0; i < forest.trees.length; i++) {
    const leafProbs = evaluateTree(forest.trees[i], featureVector);
    for (let c = 0; c < nClasses; c++) {
      probSum[c] += leafProbs[c];
    }
  }

  const nTrees = forest.trees.length;
  const normalizedProbs = probSum.map((val) => Number((val / nTrees).toFixed(4)));

  let maxIdx = 0;
  let maxProb = normalizedProbs[0];
  for (let c = 1; c < nClasses; c++) {
    if (normalizedProbs[c] > maxProb) {
      maxProb = normalizedProbs[c];
      maxIdx = c;
    }
  }

  const predictedClass = forest.classes[maxIdx] as "Safe" | "Caution" | "Unsafe";
  const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    prediction: predictedClass,
    confidence: maxProb,
    probabilities: {
      Safe: normalizedProbs[0] || 0,
      Caution: normalizedProbs[1] || 0,
      Unsafe: normalizedProbs[2] || 0
    },
    features: featureMap,
    latencyMs: Number((endTime - startTime).toFixed(2))
  };
}
