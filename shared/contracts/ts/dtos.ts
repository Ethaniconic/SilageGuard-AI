/**
 * SILAGEGUARD AI V3 — Shared Backend-Ready DTOs & API Contracts (TypeScript)
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 *
 * NOTE: These are strictly type contracts for future cloud synchronization.
 * Per V3 architecture rules, NO backend server code is executed in production;
 * all inference and storage run 100% locally on-device.
 */

export type DecisionVerdict = "SAFE" | "CAUTION" | "UNSAFE";
export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "RETAKE_REQUIRED";
export type SilageStorageType = "BUNKER_PIT" | "BAG_SILO" | "TOWER_SILO" | "ROUND_BALE_WRAP" | "OPEN_CLAMP";
export type ForageCropType =
  | "CORN_SILAGE"
  | "SORGHUM_JOWAR"
  | "HYBRID_NAPIER"
  | "ALFALFA_LUCERNE"
  | "GRASS_CLOVER"
  | "OTHER_FORAGE";

export interface SensorTelemetryDTO {
  probe_id: string;
  firmware_version: string;
  ph: number | null;
  moisture: number | null;
  core_temperature: number | null;
  ambient_temperature: number | null;
  delta_temperature: number | null;
  battery_percentage: number | null;
  rssi_dbm: number | null;
  calibration_status: "CALIBRATED" | "UNVERIFIED" | "FACTORY_DEFAULT";
  captured_at: string; // ISO 8601
}

export interface VisionInferenceDTO {
  model_id: string;
  model_version: string;
  image_hash_sha256: string;
  image_quality_passed: boolean;
  laplacian_blur_score: number;
  probabilities: {
    safe: number;
    caution: number;
    unsafe: number;
  };
  predicted_class: DecisionVerdict;
  gradcam_heatmap_b64?: string;
  inferred_at: string; // ISO 8601
}

export interface ExplainabilityPointDTO {
  factor: string;
  contribution_percent: number; // e.g. +23, -8
  agronomic_rationale: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface TriggeredSafetyRuleDTO {
  rule_id: string;
  rule_name: string;
  literature_reference: string;
  trigger_condition: string;
  action_enforced: DecisionVerdict;
}

export interface BatchUploadDTO {
  batch_id: string; // e.g. BATCH-20260926-001
  farmer_id?: string;
  farm_location?: {
    latitude?: number;
    longitude?: number;
    region?: string;
  };
  crop_type: ForageCropType;
  storage_type: SilageStorageType;
  pit_depth_cm: number;
  timestamp: string; // ISO 8601
  is_demo: boolean;

  telemetry: SensorTelemetryDTO;
  vision: VisionInferenceDTO;

  fusion_result: {
    mssi_score: number; // 0 to 100
    decision: DecisionVerdict;
    confidence_tier: ConfidenceTier;
    calibrated_confidence_score: number; // 0 to 100
    rule_override_applied: boolean;
    rule_override_reason: string | null;
    top_explainability_factors: ExplainabilityPointDTO[];
    triggered_rules: TriggeredSafetyRuleDTO[];
  };

  advisory: {
    language: string; // "en" | "hi" | "mr" | "kn" | "te"
    immediate_action: string;
    feeding_recommendation: string;
    long_term_prevention: string;
  };

  qr_certificate_payload: string;
}

export interface PredictionDTO {
  batch_id: string;
  decision: DecisionVerdict;
  mssi_score: number;
  confidence_tier: ConfidenceTier;
  confidence_score: number;
  rule_override: boolean;
  explainability: ExplainabilityPointDTO[];
  generated_at: string;
}

export interface CalibrationDTO {
  probe_id: string;
  operator_id?: string;
  calibrated_at: string;
  ph_neutral_voltage: number;   // Measured V at pH 7.00
  ph_acid_voltage: number;      // Measured V at pH 4.01
  calculated_slope_mv_per_ph: number;
  calculated_offset_v: number;
  moisture_air_raw: number;     // Capacitive raw reading dry air
  moisture_water_raw: number;   // Capacitive raw reading immersed in water
  temperature_offset_c: number;
  is_valid: boolean;
}

export interface HistoryDTO {
  batches: BatchUploadDTO[];
  total_records: number;
  page: number;
  page_size: number;
  exported_at: string;
}

export interface HealthDTO {
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  version: string;
  model_registry: {
    vision_model_version: string;
    sensor_model_version: string;
    fusion_engine_version: string;
  };
  edge_ready: boolean;
  database_ready: boolean;
  uptime_seconds: number;
}
