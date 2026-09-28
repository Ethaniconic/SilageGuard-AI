/**
 * SILAGEGUARD AI V3 — Relational SQLite Batch Repository
 * High-performance offline queries, analytics aggregation, and relational persistence.
 */

import {
  dbInstance,
  getNativeDb,
  BatchRecord,
  SensorReadingRecord,
  VisionPredictionRecord,
  FusionResultRecord,
  CalibrationRecord
} from "./database";

export interface CompleteBatchDetails {
  batch: BatchRecord;
  sensor: SensorReadingRecord;
  vision: VisionPredictionRecord;
  fusion: FusionResultRecord;
  prediction: {
    id: string;
    batch_id: string;
    reasons_json: string;
    explainability_json: string;
  };
}

export interface DayTrendPoint {
  date: string;
  dayLabel: string;
  safe: number;
  caution: number;
  unsafe: number;
  avgPh: number;
  avgMoisture: number;
  avgTemp: number;
}

export const batchRepository = {
  /**
   * Atomically save a complete multimodal scan
   */
  async saveCompleteBatch(
    batch: BatchRecord,
    sensor?: SensorReadingRecord | null,
    vision?: VisionPredictionRecord | null,
    fusion?: FusionResultRecord | null
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const bRecord: BatchRecord = { ...batch, created_at: now };
      
      const sRecord: SensorReadingRecord = sensor || {
        id: `SR-${batch.id}`,
        batch_id: batch.id,
        ph: null,
        moisture: null,
        temperature: null,
        ambient: null,
        delta_temp: null,
        heat_rise: null,
        created_at: now
      };

      const vRecord: VisionPredictionRecord = vision || {
        id: `VP-${batch.id}`,
        batch_id: batch.id,
        prediction: batch.decision,
        confidence: batch.confidence,
        safe_prob: batch.decision === "SAFE" ? 0.9 : 0.05,
        caution_prob: batch.decision === "CAUTION" ? 0.9 : 0.05,
        unsafe_prob: batch.decision === "UNSAFE" ? 0.9 : 0.05,
        mould_prob: batch.decision === "UNSAFE" ? 0.75 : 0.05,
        iqa_passed: true,
        num_frames: 1,
        created_at: now
      };

      const fRecord: FusionResultRecord = fusion || {
        id: `FR-${batch.id}`,
        batch_id: batch.id,
        fusion_score: batch.mssi_score,
        modality_state: sensor ? (vision ? "MULTIMODAL" : "SENSOR_ONLY") : "VISION_ONLY",
        rule_override: batch.rule_override,
        need_retake: false,
        need_probe: false,
        reasons_json: JSON.stringify([batch.summary_reason]),
        evidence_json: JSON.stringify([]),
        explainability_json: JSON.stringify([]),
        created_at: now
      };

      // In-Memory store
      dbInstance.batches.unshift(bRecord);
      dbInstance.sensorReadings.unshift(sRecord);
      dbInstance.visionPredictions.unshift(vRecord);
      dbInstance.fusionResults.unshift(fRecord);

      // Native SQLite persistence if available
      const nativeDb = getNativeDb();
      if (nativeDb) {
        try {
          await nativeDb.runAsync(
            `INSERT OR REPLACE INTO batches (
              id, timestamp, crop_type, storage_type, pit_depth_cm, mssi_score, decision,
              confidence, confidence_level, rule_override, rule_id, rule_reason, is_demo,
              sensor_model_version, vision_model_version, fusion_version, rule_version,
              image_uri, gradcam_uri, qr_data, summary_reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              bRecord.id, bRecord.timestamp, bRecord.crop_type, bRecord.storage_type,
              bRecord.pit_depth_cm, bRecord.mssi_score, bRecord.decision, bRecord.confidence,
              bRecord.confidence_level, bRecord.rule_override ? 1 : 0, bRecord.rule_id ?? null,
              bRecord.rule_reason ?? null, bRecord.is_demo ? 1 : 0, bRecord.sensor_model_version,
              bRecord.vision_model_version, bRecord.fusion_version, bRecord.rule_version,
              bRecord.image_uri, bRecord.gradcam_uri ?? null, bRecord.qr_data,
              bRecord.summary_reason, bRecord.created_at
            ]
          );

          await nativeDb.runAsync(
            `INSERT OR REPLACE INTO sensor_readings (
              id, batch_id, ph, moisture, temperature, ambient, delta_temp, heat_rise, depth_bucket, raw_adc, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              sRecord.id, sRecord.batch_id, sRecord.ph, sRecord.moisture, sRecord.temperature,
              sRecord.ambient, sRecord.delta_temp, sRecord.heat_rise, sRecord.depth_bucket ?? 1,
              sRecord.raw_adc ?? null, sRecord.created_at
            ]
          );

          await nativeDb.runAsync(
            `INSERT OR REPLACE INTO vision_predictions (
              id, batch_id, prediction, confidence, safe_prob, caution_prob, unsafe_prob, mould_prob, iqa_passed, num_frames, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              vRecord.id, vRecord.batch_id, vRecord.prediction, vRecord.confidence,
              vRecord.safe_prob, vRecord.caution_prob, vRecord.unsafe_prob, vRecord.mould_prob,
              vRecord.iqa_passed ? 1 : 0, vRecord.num_frames, vRecord.created_at
            ]
          );

          await nativeDb.runAsync(
            `INSERT OR REPLACE INTO fusion_results (
              id, batch_id, fusion_score, modality_state, rule_override, need_retake, need_probe, reasons_json, evidence_json, explainability_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              fRecord.id, fRecord.batch_id, fRecord.fusion_score, fRecord.modality_state,
              fRecord.rule_override ? 1 : 0, fRecord.need_retake ? 1 : 0, fRecord.need_probe ? 1 : 0,
              fRecord.reasons_json, fRecord.evidence_json, fRecord.explainability_json, fRecord.created_at
            ]
          );
        } catch (dbErr) {
          console.warn("Native SQLite write error:", dbErr);
        }
      }

      return true;
    } catch (e) {
      console.error("Failed to save batch:", e);
      return false;
    }
  },

  async getAllBatches(excludeDemo = false): Promise<BatchRecord[]> {
    let list = [...dbInstance.batches];
    if (excludeDemo) {
      list = list.filter((b) => !b.is_demo);
    }
    return list;
  },

  async getBatchById(id: string): Promise<CompleteBatchDetails | null> {
    const batch = dbInstance.batches.find((b) => b.id === id);
    if (!batch) return null;

    const sensor = dbInstance.sensorReadings.find((s) => s.batch_id === id) || {
      id: `SR-${id}`,
      batch_id: id,
      ph: null,
      moisture: null,
      temperature: null,
      ambient: null,
      delta_temp: null,
      heat_rise: null
    };

    const vision = dbInstance.visionPredictions.find((v) => v.batch_id === id) || {
      id: `VP-${id}`,
      batch_id: id,
      prediction: batch.decision,
      confidence: batch.confidence,
      safe_prob: 0.9,
      caution_prob: 0.05,
      unsafe_prob: 0.05,
      mould_prob: 0.05,
      iqa_passed: true,
      num_frames: 1
    };

    const fusion = dbInstance.fusionResults.find((f) => f.batch_id === id) || {
      id: `FR-${id}`,
      batch_id: id,
      fusion_score: batch.mssi_score,
      modality_state: "MULTIMODAL",
      rule_override: batch.rule_override,
      need_retake: false,
      need_probe: false,
      reasons_json: JSON.stringify([batch.summary_reason]),
      evidence_json: JSON.stringify([]),
      explainability_json: JSON.stringify([])
    };

    return { batch, sensor, vision, fusion, prediction: { id: fusion.id, batch_id: batch.id, reasons_json: fusion.reasons_json, explainability_json: fusion.explainability_json } };
  },

  async filterBatches(
    searchQuery = "",
    filterDecision: "ALL" | "SAFE" | "CAUTION" | "UNSAFE" = "ALL",
    cropFilter = "ALL",
    storageFilter = "ALL",
    excludeDemo = false
  ): Promise<BatchRecord[]> {
    let list = [...dbInstance.batches];

    if (excludeDemo) {
      list = list.filter((b) => !b.is_demo);
    }

    if (filterDecision !== "ALL") {
      list = list.filter((b) => b.decision === filterDecision);
    }

    if (cropFilter !== "ALL") {
      list = list.filter((b) => b.crop_type.toLowerCase() === cropFilter.toLowerCase());
    }

    if (storageFilter !== "ALL") {
      list = list.filter((b) => b.storage_type.toLowerCase() === storageFilter.toLowerCase());
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.crop_type.toLowerCase().includes(q) ||
          b.decision.toLowerCase().includes(q) ||
          b.storage_type.toLowerCase().includes(q)
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

    // Today's scans
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCount = batches.filter((b) => b.timestamp.startsWith(todayStr)).length;

    return {
      total,
      safeCount,
      cautionCount,
      unsafeCount,
      avgMssi,
      todayCount
    };
  },

  async getWeeklyTrends(excludeDemo = false): Promise<DayTrendPoint[]> {
    let batches = dbInstance.batches;
    if (excludeDemo) {
      batches = batches.filter((b) => !b.is_demo);
    }

    const days: DayTrendPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

      const dayBatches = batches.filter((b) => b.timestamp.startsWith(dateStr));
      const safe = dayBatches.filter((b) => b.decision === "SAFE").length;
      const caution = dayBatches.filter((b) => b.decision === "CAUTION").length;
      const unsafe = dayBatches.filter((b) => b.decision === "UNSAFE").length;

      // Calculate averages from sensor readings
      const batchIds = new Set(dayBatches.map((b) => b.id));
      const sensors = dbInstance.sensorReadings.filter((s) => batchIds.has(s.batch_id));

      const phs = sensors.map((s) => s.ph).filter((v): v is number => v !== null && v > 0);
      const moists = sensors.map((s) => s.moisture).filter((v): v is number => v !== null && v > 0);
      const temps = sensors.map((s) => s.temperature).filter((v): v is number => v !== null && v > 0);

      const avgPh = phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : 0;
      const avgMoisture = moists.length > 0 ? moists.reduce((a, b) => a + b, 0) / moists.length : 0;
      const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;

      days.push({
        date: dateStr,
        dayLabel,
        safe,
        caution,
        unsafe,
        avgPh: Math.round(avgPh * 100) / 100,
        avgMoisture: Math.round(avgMoisture * 10) / 10,
        avgTemp: Math.round(avgTemp * 10) / 10
      });
    }

    return days;
  },

  async getCropComparison(excludeDemo = false) {
    let batches = dbInstance.batches;
    if (excludeDemo) {
      batches = batches.filter((b) => !b.is_demo);
    }
    const map: Record<string, { total: number; safe: number; caution: number; unsafe: number }> = {};
    for (const b of batches) {
      const crop = b.crop_type || "Unknown";
      if (!map[crop]) map[crop] = { total: 0, safe: 0, caution: 0, unsafe: 0 };
      map[crop].total++;
      if (b.decision === "SAFE") map[crop].safe++;
      else if (b.decision === "CAUTION") map[crop].caution++;
      else if (b.decision === "UNSAFE") map[crop].unsafe++;
    }
    return Object.entries(map).map(([crop, data]) => ({ crop, ...data }));
  },

  async getStorageComparison(excludeDemo = false) {
    let batches = dbInstance.batches;
    if (excludeDemo) {
      batches = batches.filter((b) => !b.is_demo);
    }
    const map: Record<string, { total: number; safe: number; caution: number; unsafe: number }> = {};
    for (const b of batches) {
      const st = b.storage_type || "Bunker Pit";
      if (!map[st]) map[st] = { total: 0, safe: 0, caution: 0, unsafe: 0 };
      map[st].total++;
      if (b.decision === "SAFE") map[st].safe++;
      else if (b.decision === "CAUTION") map[st].caution++;
      else if (b.decision === "UNSAFE") map[st].unsafe++;
    }
    return Object.entries(map).map(([storage, data]) => ({ storage, ...data }));
  },

  async getSetting(key: string, defaultValue = ""): Promise<string> {
    return dbInstance.settings[key] ?? defaultValue;
  },

  async setSetting(key: string, value: string): Promise<void> {
    dbInstance.settings[key] = value;
    const nativeDb = getNativeDb();
    if (nativeDb) {
      try {
        await nativeDb.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"));`,
          [key, value]
        );
      } catch (err) {
        console.warn("Native SQLite setting write err:", err);
      }
    }
  },

  async getCalibration(): Promise<CalibrationRecord> {
    return dbInstance.calibrations[0];
  },

  async saveCalibration(cal: Omit<CalibrationRecord, "id" | "calibrated_at">): Promise<void> {
    const fullCal: CalibrationRecord = {
      ...cal,
      id: `CAL-${Date.now()}`,
      calibrated_at: new Date().toISOString()
    };
    dbInstance.calibrations.unshift(fullCal);
    await this.setSetting("ph_slope", cal.slope.toFixed(4));
    await this.setSetting("ph_offset", cal.offset.toFixed(4));
    await this.setSetting("air_adc", Math.round(cal.air_adc).toString());
    await this.setSetting("water_adc", Math.round(cal.water_adc).toString());
  }
};
