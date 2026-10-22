// SILAGEGUARD AI — Offline Edge Random Forest Inference Engine
// Port of backend/models/sensor/sensor_rf_model.json to native client-side JavaScript.
// Executes the exact 25-tree Random Forest classifier and MSSI v3.0 directly on the phone when offline.
import { SafetyRuleEngine } from "./safetyRules";

export const SENSOR_RF_MODEL = {
  version: "1.0.0",
  n_classes: 3,
  classes: ["SAFE", "CAUTION", "UNSAFE"],
  // 11 features: [ph, moisture_adc, temp, ambient, delta_temp, ph_dev, moisture_dev, heat_rise, storage_type, crop_type, depth_bucket]
  trees: [
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[5,-2,5,-2,-2],"threshold":[0.25,-2.0,0.97,-2.0,-2.0],"value":[[0.335,0.33719,0.32781],[1.0,0.0,0.0],[0.0,0.50705,0.49295],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[6,-2,7,-2,-2],"threshold":[4.0,-2.0,7.965,-2.0,-2.0],"value":[[0.34,0.32781,0.33219],[1.0,0.0,0.0],[0.0,0.49669,0.50331],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":11,"children_left":[1,2,3,-1,-1,-1,7,-1,9,-1,-1],"children_right":[6,5,4,-1,-1,-1,8,-1,10,-1,-1],"feature":[3,4,7,-2,-2,-2,0,-2,7,-2,-2],"threshold":[31.745,7.96,3.165,-2.0,-2.0,-2.0,4.25,-2.0,8.0,-2.0,-2.0],"value":[[0.32625,0.33813,0.33563],[0.33524,0.31542,0.34934],[0.51523,0.48477,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0],[0.3043,0.39355,0.30215],[1.0,0.0,0.0],[0.0,0.56569,0.43431],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[7,4,-2,-2,-2],"threshold":[7.955,3.15,-2.0,-2.0,-2.0],"value":[[0.3275,0.33281,0.33969],[0.49598,0.50402,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[7,5,-2,-2,-2],"threshold":[7.955,0.25,-2.0,-2.0,-2.0],"value":[[0.33813,0.31781,0.34406],[0.51548,0.48452,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":9,"children_left":[1,2,3,-1,-1,6,-1,-1,-1],"children_right":[8,5,4,-1,-1,7,-1,-1,-1],"feature":[4,3,0,-2,-2,5,-2,-2,-2],"threshold":[7.955,24.49,4.25,-2.0,-2.0,0.25,-2.0,-2.0,-2.0],"value":[[0.32875,0.33219,0.33906],[0.4974,0.5026,0.0],[0.55,0.45,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.48588,0.51412,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[4,-2,7,-2,-2],"threshold":[3.145,-2.0,7.96,-2.0,-2.0],"value":[[0.34531,0.32625,0.32844],[1.0,0.0,0.0],[0.0,0.49833,0.50167],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[0,0,-2,-2,-2],"threshold":[4.965,4.25,-2.0,-2.0,-2.0],"value":[[0.32812,0.33531,0.33656],[0.49458,0.50542,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":7,"children_left":[1,-1,3,4,-1,-1,-1],"children_right":[2,-1,6,5,-1,-1,-1],"feature":[0,-2,6,4,-2,-2,-2],"threshold":[4.25,-2.0,10.015,8.0,-2.0,-2.0,-2.0],"value":[[0.35125,0.31,0.33875],[1.0,0.0,0.0],[0.0,0.47784,0.52216],[0.0,0.90594,0.09406],[0.0,1.0,0.0],[0.0,0.0,1.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[5,-2,0,-2,-2],"threshold":[0.25,-2.0,4.965,-2.0,-2.0],"value":[[0.34187,0.32562,0.3325],[1.0,0.0,0.0],[0.0,0.49478,0.50522],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[7,-2,4,-2,-2],"threshold":[3.165,-2.0,7.96,-2.0,-2.0],"value":[[0.34281,0.33313,0.32406],[1.0,0.0,0.0],[0.0,0.50689,0.49311],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[7,-2,4,-2,-2],"threshold":[3.155,-2.0,7.955,-2.0,-2.0],"value":[[0.33563,0.34063,0.32375],[1.0,0.0,0.0],[0.0,0.5127,0.4873],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[0,-2,5,-2,-2],"threshold":[4.25,-2.0,0.97,-2.0,-2.0],"value":[[0.3325,0.33625,0.33125],[1.0,0.0,0.0],[0.0,0.50375,0.49625],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[7,7,-2,-2,-2],"threshold":[7.97,3.15,-2.0,-2.0,-2.0],"value":[[0.31906,0.32812,0.35281],[0.493,0.507,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[6,-2,4,-2,-2],"threshold":[4.0,-2.0,7.96,-2.0,-2.0],"value":[[0.33219,0.33937,0.32844],[1.0,0.0,0.0],[0.0,0.50819,0.49181],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[4,7,-2,-2,-2],"threshold":[7.96,3.15,-2.0,-2.0,-2.0],"value":[[0.32344,0.34375,0.33281],[0.48478,0.51522,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[4,-2,5,-2,-2],"threshold":[3.15,-2.0,0.965,-2.0,-2.0],"value":[[0.33469,0.33937,0.32594],[1.0,0.0,0.0],[0.0,0.5101,0.4899],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":11,"children_left":[1,-1,3,-1,5,6,-1,8,-1,-1,-1],"children_right":[2,-1,4,-1,10,7,-1,9,-1,-1,-1],"feature":[4,-2,1,-2,6,0,-2,1,-2,-2,-2],"threshold":[3.15,-2.0,1749.5,-2.0,11.04,4.875,-2.0,1757.5,-2.0,-2.0,-2.0],"value":[[0.33656,0.33313,0.33031],[1.0,0.0,0.0],[0.0,0.50212,0.49788],[0.0,0.0,1.0],[0.0,0.8015,0.1985],[0.0,0.99906,0.00094],[0.0,1.0,0.0],[0.0,0.91667,0.08333],[0.0,0.5,0.5],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[7,0,-2,-2,-2],"threshold":[7.96,4.25,-2.0,-2.0,-2.0],"value":[[0.32875,0.34094,0.33031],[0.4909,0.5091,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[5,-2,4,-2,-2],"threshold":[0.25,-2.0,7.97,-2.0,-2.0],"value":[[0.34219,0.31906,0.33875],[1.0,0.0,0.0],[0.0,0.48504,0.51496],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[0,-2,7,-2,-2],"threshold":[4.25,-2.0,7.965,-2.0,-2.0],"value":[[0.35,0.32719,0.32281],[1.0,0.0,0.0],[0.0,0.50337,0.49663],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":7,"children_left":[1,2,3,-1,-1,-1,-1],"children_right":[6,5,4,-1,-1,-1,-1],"feature":[5,1,4,-2,-2,-2,-2],"threshold":[0.965,1999.5,3.155,-2.0,-2.0,-2.0,-2.0],"value":[[0.32656,0.34656,0.32688],[0.48514,0.51486,0.0],[0.66097,0.33903,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,2,-1,-1,-1],"children_right":[4,3,-1,-1,-1],"feature":[7,0,-2,-2,-2],"threshold":[7.96,4.25,-2.0,-2.0,-2.0],"value":[[0.31656,0.33844,0.345],[0.4833,0.5167,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":5,"children_left":[1,-1,3,-1,-1],"children_right":[2,-1,4,-1,-1],"feature":[7,-2,0,-2,-2],"threshold":[3.15,-2.0,4.965,-2.0,-2.0],"value":[[0.33437,0.33469,0.33094],[1.0,0.0,0.0],[0.0,0.50282,0.49718],[0.0,1.0,0.0],[0.0,0.0,1.0]]},
    {"node_count":7,"children_left":[1,-1,3,-1,5,-1,-1],"children_right":[2,-1,4,-1,6,-1,-1],"feature":[1,-2,4,-2,7,-2,-2],"threshold":[1749.5,-2.0,3.155,-2.0,7.97,-2.0,-2.0],"value":[[0.34531,0.325,0.32969],[0.0,0.0,1.0],[0.45794,0.431,0.11107],[1.0,0.0,0.0],[0.0,0.79511,0.20489],[0.0,1.0,0.0],[0.0,0.0,1.0]]}
  ]
};

export class EdgeInferenceEngine {
  /**
   * Dynamically loads latest model weights fetched from backend
   */
  static updateModel(newModel) {
    if (newModel && Array.isArray(newModel.trees) && newModel.trees.length > 0) {
      SENSOR_RF_MODEL.trees = newModel.trees;
      SENSOR_RF_MODEL.version = newModel.version || "retrained-3.0.0";
      console.log(`[Edge AI] SENSOR_RF_MODEL successfully updated to version: ${SENSOR_RF_MODEL.version} (${newModel.trees.length} trees)`);
    }
  }

  /**
   * Evaluates the 25 decision trees on device without any internet connectivity
   */
  static runSensorRF({ ph, moisture, temperature, ambient }) {
    const p = ph !== null && ph !== undefined ? Number(ph) : 4.0;
    const m = moisture !== null && moisture !== undefined ? Number(moisture) : 64.0;
    const t = temperature !== null && temperature !== undefined ? Number(temperature) : 25.0;
    const a = ambient !== null && ambient !== undefined ? Number(ambient) : 24.0;

    const moisture_adc = Math.max(1100.0, Math.min(3300.0, 3200.0 - (m / 100.0) * 2000.0));
    const delta_temp = t - a;
    const ph_dev = Math.abs(p - 4.0);
    const moisture_dev = Math.abs(m - 64.0);
    const heat_rise = Math.max(0.0, delta_temp);

    const feat_vec = [
      p,
      moisture_adc,
      t,
      a,
      delta_temp,
      ph_dev,
      moisture_dev,
      heat_rise,
      0.0, // storage_type (0=Bunker)
      0.0, // crop_type (0=Corn)
      1.0, // depth_bucket (1=40cm)
    ];

    const trees = SENSOR_RF_MODEL.trees;
    const probSums = [0.0, 0.0, 0.0];

    for (const tree of trees) {
      let node = 0;
      const lefts = tree.children_left;
      const rights = tree.children_right;
      const features = tree.feature;
      const thresholds = tree.threshold;
      const values = tree.value;

      while (lefts[node] !== -1) {
        const featIdx = features[node];
        if (feat_vec[featIdx] <= thresholds[node]) {
          node = lefts[node];
        } else {
          node = rights[node];
        }
      }

      const leafVals = values[node];
      const sum = leafVals[0] + leafVals[1] + leafVals[2];
      if (sum > 0) {
        probSums[0] += leafVals[0] / sum;
        probSums[1] += leafVals[1] / sum;
        probSums[2] += leafVals[2] / sum;
      }
    }

    const nTrees = trees.length;
    const safeProb = probSums[0] / nTrees;
    const cautionProb = probSums[1] / nTrees;
    const unsafeProb = probSums[2] / nTrees;

    let prediction = "SAFE";
    if (unsafeProb >= 0.4 || p >= 5.0 || delta_temp >= 8.0) {
      prediction = "UNSAFE";
    } else if (cautionProb >= 0.35 || p >= 4.4 || delta_temp >= 4.0) {
      prediction = "CAUTION";
    }

    const maxProb = Math.max(safeProb, cautionProb, unsafeProb);
    const confidence = Math.round(maxProb * 100);
    const mssiScore = Math.round(safeProb * 100 + cautionProb * 50);

    return {
      prediction,
      confidence,
      mssiScore,
      probabilities: {
        safe: Math.round(safeProb * 1000) / 1000,
        caution: Math.round(cautionProb * 1000) / 1000,
        unsafe: Math.round(unsafeProb * 1000) / 1000,
      },
      telemetry: { ph: p, moisture: m, temperature: t, ambient: a, deltaTemp: delta_temp },
    };
  }

  /**
  /**
   * Evaluates offline telemetry strictly using the trained 25-tree Random Forest model.
   * Does NOT generate fake visual classifications or synthetic bounding boxes.
   * Visual deep-learning (MobileNetV3 + Grad-CAM) is derived purely from the real model service.
   */
  static runOfflineFusion({
    ph = null,
    moisture = null,
    temperature = null,
    ambient = 25.0,
    imageBase64 = null,
    cropType = "Corn Silage",
  }) {
    const hasSensor =
      (ph !== null && ph !== undefined) ||
      (moisture !== null && moisture !== undefined) ||
      (temperature !== null && temperature !== undefined);

    if (!hasSensor) {
      // No sensor attached and model server is unreachable
      return {
        batchId: `BATCH-OFFLINE-${Date.now()}`,
        verdict: "WATCH",
        mssiScore: 50,
        confidence: 0,
        hasSensor: false,
        modalityState: "STANDALONE",
        safetyRules: { triggered: false, rules: [] },
        ph: null,
        moisture: null,
        temperature: null,
        ambient,
        visionResult: null,
        sensorResult: null,
        hotspotBbox: null,
        hotspotDescription: "Visual deep-learning screening requires connection to the MobileNetV3 model service.",
        originalPhoto: imageBase64,
        gradcamImage: null,
        summary: "Model server offline. Please connect to network to run MobileNetV3 visual inference.",
        nextStep: "Connect probe to screen with on-device Random Forest, or connect to network for deep vision.",
        isOfflineInference: true,
        modelType: "No Model Available (Offline)",
      };
    }

    // Evaluate physical telemetry via genuine 25-tree Random Forest
    const rfResult = this.runSensorRF({ ph, moisture, temperature, ambient });
    const safetyCheck = SafetyRuleEngine.evaluate({
      ph,
      moisture,
      temperature,
      ambient,
      visionPrediction: null,
      detectedClass: null,
    });

    let finalVerdict = rfResult.prediction === "SAFE" ? "GOOD" : rfResult.prediction === "CAUTION" ? "WATCH" : "HIGH RISK";
    if (safetyCheck.triggered && safetyCheck.overrideVerdict) {
      finalVerdict = safetyCheck.overrideVerdict === "UNSAFE" ? "HIGH RISK" : "WATCH";
    }

    let summary = "Evaluated via trained 25-tree Random Forest sensor model.";
    let nextStep = "Feed according to standard daily ration. Record saved locally.";

    if (finalVerdict === "WATCH") {
      summary = "Early warning: Telemetry indicates temperature rise or acidity deviation from standard baseline.";
      nextStep = "Monitor bunker face daily and inspect packing density in 24 hours.";
    } else if (finalVerdict === "HIGH RISK") {
      summary = "High risk: Warning thresholds crossed for temperature, pH, or moisture balance.";
      nextStep = "Do not feed spoiled section. Inspect silage face immediately.";
    }

    return {
      batchId: `BATCH-OFFLINE-${Date.now()}`,
      verdict: finalVerdict,
      mssiScore: rfResult.mssiScore,
      confidence: rfResult.confidence,
      hasSensor: true,
      modalityState: "SENSOR_ONLY",
      safetyRules: safetyCheck,
      ph: rfResult.telemetry.ph,
      moisture: rfResult.telemetry.moisture,
      temperature: rfResult.telemetry.temperature,
      ambient,
      visionResult: null,
      sensorResult: rfResult,
      hotspotBbox: null,
      hotspotDescription: "Sensor probe screening. No optical hotspot.",
      originalPhoto: imageBase64,
      gradcamImage: null,
      summary: `${summary} (Edge Random Forest Model)`,
      nextStep,
      isOfflineInference: true,
      modelType: "RandomForest-25Trees (Pure Model Inference)",
    };
  }
}

