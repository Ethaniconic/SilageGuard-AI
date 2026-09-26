/**
 * SILAGEGUARD AI V3 — SQLite Database Specification & Schema Architecture
 * 
 * Offline-first local relational persistence for:
 *   1. batches (metadata, decision, mssi, image, qr)
 *   2. sensor_readings (ph, moisture, temp, ambient, delta_temp, heat_rise)
 *   3. vision_predictions (class probabilities, mold %, frames)
 *   4. fusion_results (multimodal score, modality state, rule overrides, explainability)
 *   5. calibration (air, water, buffer pH 7 & 4, slope, offset)
 *   6. settings (theme, language, voice speed, demo mode toggle)
 *   7. analytics_cache (precomputed weekly/monthly aggregates)
 * 
 * ⚠️ ABSOLUTE RULE 2:
 * Fresh install starts completely EMPTY. ZERO synthetic or fake seed data.
 */

import { Platform } from "react-native";

export interface BatchRecord {
  id: string;
  timestamp: string;
  crop_type: string;
  storage_type: string;
  pit_depth_cm: number;
  mssi_score: number;
  decision: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  confidence_level: "HIGH" | "MEDIUM" | "LOW" | "RETAKE_REQUIRED";
  rule_override: boolean;
  rule_id?: string | null;
  rule_reason?: string | null;
  is_demo: boolean;
  sensor_model_version: string;
  vision_model_version: string;
  fusion_version: string;
  rule_version: string;
  image_uri: string;
  gradcam_uri?: string | null;
  qr_data: string;
  summary_reason: string;
  created_at?: string;
}

export interface SensorReadingRecord {
  id: string;
  batch_id: string;
  ph: number | null;
  moisture: number | null;
  temperature: number | null;
  ambient: number | null;
  delta_temp: number | null;
  heat_rise: number | null;
  depth_bucket?: number;
  raw_adc?: number | null;
  created_at?: string;
}

export interface VisionPredictionRecord {
  id: string;
  batch_id: string;
  prediction: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  safe_prob: number;
  caution_prob: number;
  unsafe_prob: number;
  mould_prob: number;
  iqa_passed: boolean;
  num_frames: number;
  created_at?: string;
}

export interface FusionResultRecord {
  id: string;
  batch_id: string;
  fusion_score: number;
  modality_state: "MULTIMODAL" | "SENSOR_ONLY" | "VISION_ONLY" | "INSUFFICIENT_DATA";
  rule_override: boolean;
  need_retake: boolean;
  need_probe: boolean;
  reasons_json: string;
  evidence_json: string;
  explainability_json: string;
  created_at?: string;
}

export interface CalibrationRecord {
  id: string;
  probe_id: string;
  air_adc: number;
  water_adc: number;
  ph7_voltage: number;
  ph4_voltage: number;
  slope: number;
  offset: number;
  calibrated_at: string;
}

export interface SettingRecord {
  key: string;
  value: string;
  updated_at?: string;
}

export interface AnalyticsCacheRecord {
  id: string;
  metric_key: string;
  timeframe: string;
  payload_json: string;
  updated_at: string;
}

// In-Memory store for Web & Testing
class InMemoryStore {
  batches: BatchRecord[] = [];
  sensorReadings: SensorReadingRecord[] = [];
  visionPredictions: VisionPredictionRecord[] = [];
  fusionResults: FusionResultRecord[] = [];
  calibrations: CalibrationRecord[] = [
    {
      id: "CAL-DEFAULT",
      probe_id: "SG-PROBE-01",
      air_adc: 3200,
      water_adc: 1450,
      ph7_voltage: 2.50,
      ph4_voltage: 3.05,
      slope: -5.70,
      offset: 0.00,
      calibrated_at: new Date().toISOString()
    }
  ];
  settings: Record<string, string> = {
    language: "en",
    demo_mode: "false",
    dark_mode: "true",
    voice_speed: "1.0",
    voice_volume: "1.0",
    ph_slope: "-5.70",
    ph_offset: "0.00",
    air_adc: "3200",
    water_adc: "1450"
  };
  analyticsCache: AnalyticsCacheRecord[] = [];
}

export const dbInstance = new InMemoryStore();

let nativeDb: any = null;

export async function initDatabase(): Promise<boolean> {
  try {
    if (Platform.OS !== "web") {
      try {
        const SQLite = require("expo-sqlite");
        nativeDb = await SQLite.openDatabaseAsync("silageguard_v3.db");
        
        await nativeDb.execAsync(`
          PRAGMA journal_mode = WAL;

          CREATE TABLE IF NOT EXISTS batches (
            id TEXT PRIMARY KEY NOT NULL,
            timestamp TEXT NOT NULL,
            crop_type TEXT NOT NULL,
            storage_type TEXT DEFAULT 'Bunker Pit',
            pit_depth_cm INTEGER DEFAULT 30,
            mssi_score INTEGER NOT NULL,
            decision TEXT NOT NULL,
            confidence INTEGER NOT NULL,
            confidence_level TEXT DEFAULT 'HIGH',
            rule_override INTEGER DEFAULT 0,
            rule_id TEXT,
            rule_reason TEXT,
            is_demo INTEGER DEFAULT 0,
            sensor_model_version TEXT,
            vision_model_version TEXT,
            fusion_version TEXT,
            rule_version TEXT,
            image_uri TEXT,
            gradcam_uri TEXT,
            qr_data TEXT,
            summary_reason TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS sensor_readings (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            ph REAL,
            moisture REAL,
            temperature REAL,
            ambient REAL,
            delta_temp REAL,
            heat_rise REAL,
            depth_bucket INTEGER DEFAULT 1,
            raw_adc INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS vision_predictions (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            safe_prob REAL NOT NULL,
            caution_prob REAL NOT NULL,
            unsafe_prob REAL NOT NULL,
            mould_prob REAL NOT NULL,
            iqa_passed INTEGER DEFAULT 1,
            num_frames INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS fusion_results (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            fusion_score REAL NOT NULL,
            modality_state TEXT NOT NULL,
            rule_override INTEGER DEFAULT 0,
            need_retake INTEGER DEFAULT 0,
            need_probe INTEGER DEFAULT 0,
            reasons_json TEXT,
            evidence_json TEXT,
            explainability_json TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS calibration (
            id TEXT PRIMARY KEY NOT NULL,
            probe_id TEXT NOT NULL,
            air_adc REAL NOT NULL,
            water_adc REAL NOT NULL,
            ph7_voltage REAL NOT NULL,
            ph4_voltage REAL NOT NULL,
            slope REAL NOT NULL,
            offset REAL NOT NULL,
            calibrated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS analytics_cache (
            id TEXT PRIMARY KEY NOT NULL,
            metric_key TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_batches_timestamp ON batches(timestamp);
          CREATE INDEX IF NOT EXISTS idx_batches_decision ON batches(decision);
          CREATE INDEX IF NOT EXISTS idx_sensor_batch ON sensor_readings(batch_id);
          CREATE INDEX IF NOT EXISTS idx_vision_batch ON vision_predictions(batch_id);
          CREATE INDEX IF NOT EXISTS idx_fusion_batch ON fusion_results(batch_id);
        `);
      } catch (nativeErr) {
        console.warn("Native SQLite init fallback (using resilient memory store):", nativeErr);
      }
    }
    return true;
  } catch (e) {
    console.error("Database initialization error:", e);
    return true;
  }
}

export function getNativeDb() {
  return nativeDb;
}
