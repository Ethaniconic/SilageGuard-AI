/**
 * SILAGEGUARD AI — Batch Repository (CRUD & Relational Queries)
 * Manages saving and querying scans, sensor telemetries, and predictions offline.
 */

import { dbInstance, BatchRecord, SensorReadingRecord, PredictionRecord } from "./database";

export interface CompleteBatchDetails {
  batch: BatchRecord;
  sensor: SensorReadingRecord;
  prediction: PredictionRecord;
}

export const batchRepository = {
  async saveBatchReport(
    batch: BatchRecord,
    sensor: SensorReadingRecord,
    prediction: PredictionRecord
  ): Promise<boolean> {
    try {
      dbInstance.batches.unshift(batch);
      dbInstance.sensorReadings.unshift(sensor);
      dbInstance.predictions.unshift(prediction);
      return true;
    } catch (e) {
      console.error("Failed to save batch:", e);
      return false;
    }
  },

  async getAllBatches(): Promise<BatchRecord[]> {
    return [...dbInstance.batches];
  },

  async getBatchById(id: string): Promise<CompleteBatchDetails | null> {
    const batch = dbInstance.batches.find((b) => b.id === id);
    if (!batch) return null;

    const sensor = dbInstance.sensorReadings.find((s) => s.batch_id === id) || {
      id: "SR-EMPTY",
      batch_id: id,
      ph: null,
      moisture: null,
      temperature: null,
      ambient: null,
      delta_temp: null,
      temp_rise: null
    };

    const prediction = dbInstance.predictions.find((p) => p.batch_id === id) || {
      id: "PR-EMPTY",
      batch_id: id,
      sensor_decision: batch.decision,
      vision_decision: batch.decision,
      mould_prob: 0.0,
      reasons_json: JSON.stringify(["Evaluation recorded"]),
      explainability_json: "[]"
    };

    return { batch, sensor, prediction };
  },

  async filterBatches(
    searchQuery = "",
    filterDecision: "ALL" | "SAFE" | "CAUTION" | "UNSAFE" = "ALL",
    excludeDemo = false
  ): Promise<BatchRecord[]> {
    let list = [...dbInstance.batches];

    if (excludeDemo) {
      list = list.filter((b) => !b.is_demo);
    }

    if (filterDecision !== "ALL") {
      list = list.filter((b) => b.decision.toUpperCase() === filterDecision);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.crop_type.toLowerCase().includes(q) ||
          b.decision.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async getSummaryStats(excludeDemo = false) {
    let batches = dbInstance.batches;
    if (excludeDemo) {
      batches = batches.filter((b) => !b.is_demo);
    }
    const total = batches.length;
    const safeCount = batches.filter((b) => b.decision === "SAFE").length;
    const cautionCount = batches.filter((b) => b.decision === "CAUTION").length;
    const unsafeCount = batches.filter((b) => b.decision === "UNSAFE").length;
    const avgMssi = total > 0 ? Math.round(batches.reduce((acc, b) => acc + b.mssi_score, 0) / total) : 0;

    return {
      total,
      safeCount,
      cautionCount,
      unsafeCount,
      avgMssi
    };
  },

  async getSetting(key: string, defaultValue = ""): Promise<string> {
    return dbInstance.settings[key] ?? defaultValue;
  },

  async setSetting(key: string, value: string): Promise<void> {
    dbInstance.settings[key] = value;
  },

  async getPhCalibration(): Promise<{ slope: number; offset: number }> {
    const slopeStr = await this.getSetting("ph_slope", "-5.70");
    const offsetStr = await this.getSetting("ph_offset", "0.00");
    return {
      slope: parseFloat(slopeStr) || -5.70,
      offset: parseFloat(offsetStr) || 0.00
    };
  },

  async savePhCalibration(slope: number, offset: number): Promise<void> {
    await this.setSetting("ph_slope", slope.toFixed(4));
    await this.setSetting("ph_offset", offset.toFixed(4));
  }
};
