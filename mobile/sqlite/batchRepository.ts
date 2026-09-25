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
      id: "SR-DEFAULT",
      batch_id: id,
      ph: 4.0,
      moisture: 65.0,
      temperature: 25.0,
      ambient: 24.0,
      delta_temp: 1.0,
      temp_rise: 1.0
    };

    const prediction = dbInstance.predictions.find((p) => p.batch_id === id) || {
      id: "PR-DEFAULT",
      batch_id: id,
      sensor_decision: batch.decision,
      vision_decision: batch.decision,
      mould_prob: 0.05,
      reasons_json: JSON.stringify(["Standard evaluation"])
    };

    return { batch, sensor, prediction };
  },

  async filterBatches(searchQuery = "", filterDecision: "ALL" | "SAFE" | "CAUTION" | "UNSAFE" = "ALL"): Promise<BatchRecord[]> {
    let list = [...dbInstance.batches];

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

  async getSummaryStats() {
    const batches = dbInstance.batches;
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
  }
};
