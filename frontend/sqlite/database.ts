/**
 * SILAGEGUARD AI V4 — Relational SQLite Database Architecture
 * Offline-first local relational persistence with cascade deletes,
 * foreign keys, WAL mode, and sync queue for backend eventual consistency.
 * 
 * ⚠️ ABSOLUTE RULE 4:
 * Fresh install starts completely EMPTY. ZERO synthetic or fake seed data.
 */

import { Platform } from "react-native";
import { openDatabaseAsync } from "./sqliteDriver";

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

export interface BatchMediaRecord {
  id: string;
  batch_id: string;
  capture_angle: "SURFACE" | "SIDE" | "DEEP_POCKET";
  image_uri: string;
  blur_score: number;
  exposure_score: number;
  tilt_angle: number;
  iqa_passed: boolean;
  created_at?: string;
}

export interface CalibrationRecord {
  id: string;
  probe_id: string;
  ph_buffer_4: number;
  ph_buffer_7: number;
  ph_slope: number;
  ph_offset: number;
  moisture_air_adc: number;
  moisture_water_adc: number;
  temp_offset: number;
  calibrated_at: string;
  expires_at: string;
  health_status: "HEALTHY" | "RECALIBRATION_RECOMMENDED" | "EXPIRED";
}

export interface SyncQueueRecord {
  id: string;
  batch_id: string;
  endpoint: string;
  payload_json: string;
  status: "PENDING" | "UPLOADING" | "SYNCED" | "FAILED";
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceInfoRecord {
  device_id: string;
  name: string;
  mac_address: string;
  firmware_version: string;
  battery_level: number;
  last_connected_at: string;
  is_physical: boolean;
}

export interface ModelVersionRecord {
  model_name: string;
  version: string;
  checksum: string;
  quantization: string;
  updated_at: string;
}

export interface UserPreferenceRecord {
  key: string;
  value: string;
  updated_at: string;
}

// In-Memory store for Web & Testing — EMPTY ON FRESH INSTALL (RULE 4)
class InMemoryStore {
  batches: BatchRecord[] = [];
  sensorReadings: SensorReadingRecord[] = [];
  visionPredictions: VisionPredictionRecord[] = [];
  fusionResults: FusionResultRecord[] = [];
  batchMedia: BatchMediaRecord[] = [];
  calibrations: CalibrationRecord[] = [];
  syncQueue: SyncQueueRecord[] = [];
  deviceInfo: DeviceInfoRecord[] = [];
  modelVersions: ModelVersionRecord[] = [];
  userPreferences: Record<string, string> = {
    theme_mode: "dark",
    language: "en",
    high_contrast: "false",
    large_typography: "false",
    voice_speed: "1.0",
  };
}

export const dbInstance = new InMemoryStore();

let nativeDb: any = null;

export async function initDatabase(): Promise<boolean> {
  try {
    if (Platform.OS !== "web") {
      try {
        nativeDb = await openDatabaseAsync("silageguard_v4.db");
        
        await nativeDb.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;

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

          CREATE TABLE IF NOT EXISTS batch_media (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            capture_angle TEXT NOT NULL,
            image_uri TEXT NOT NULL,
            blur_score REAL DEFAULT 0,
            exposure_score REAL DEFAULT 0,
            tilt_angle REAL DEFAULT 0,
            iqa_passed INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS calibration (
            id TEXT PRIMARY KEY NOT NULL,
            probe_id TEXT NOT NULL,
            ph_buffer_4 REAL NOT NULL,
            ph_buffer_7 REAL NOT NULL,
            ph_slope REAL NOT NULL,
            ph_offset REAL NOT NULL,
            moisture_air_adc REAL NOT NULL,
            moisture_water_adc REAL NOT NULL,
            temp_offset REAL NOT NULL,
            calibrated_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            health_status TEXT DEFAULT 'HEALTHY'
          );

          CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            batch_id TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            retry_count INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS device_info (
            device_id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            mac_address TEXT,
            firmware_version TEXT,
            battery_level INTEGER DEFAULT 100,
            last_connected_at TEXT,
            is_physical INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS model_versions (
            model_name TEXT PRIMARY KEY NOT NULL,
            version TEXT NOT NULL,
            checksum TEXT,
            quantization TEXT DEFAULT 'INT8',
            updated_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
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

          -- Performance Indexes
          CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_batches_decision ON batches(decision);
          CREATE INDEX IF NOT EXISTS idx_batches_crop ON batches(crop_type);
          CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
          CREATE INDEX IF NOT EXISTS idx_batch_media_batch ON batch_media(batch_id);
        `);
        console.log("[SilageGuard SQLite] V4 schema initialized successfully with WAL & indexes.");
      } catch (e) {
        console.warn("[SilageGuard SQLite] Native DB error, operating in memory-driver:", e);
      }
    }
    return true;
  } catch (err) {
    console.error("[SilageGuard SQLite] Initialization fault:", err);
    return false;
  }
}

export function getNativeDb(): any {
  return nativeDb;
}
