/**
 * SILAGEGUARD AI V4 — Sensor & Hardware Telemetry Type Definitions
 * Strict types for physical probe ingestion, calibration profiles, and sensor AI features.
 */

export type BLEConnectionStatus = 
  | "DISCONNECTED" 
  | "SCANNING" 
  | "CONNECTING" 
  | "CONNECTED" 
  | "ERROR";

export type SensorOperatingMode = "REAL_SENSOR" | "WOKWI_SIMULATION";

export interface ProbeTelemetryData {
  ph: number | null;
  moisture: number | null;
  temp: number | null;
  ambient: number | null;
  battery: number | null;
  batteryPct?: number;
  probe_id: string;
  seq: number;
  rssi?: number;
  timestamp: number;
  is_valid: boolean;
  validation_error?: string;
  is_demo: boolean;
  mode?: SensorOperatingMode;
  calibrated?: boolean;
}

export interface CalibrationProfile {
  sensor_id?: string;
  last_calibrated?: string;
  calibrated_at?: string;
  expires_at?: string;
  health_status?: "HEALTHY" | "RECALIBRATION_RECOMMENDED" | "EXPIRED";
  ph_offset: number;         // Zero-point offset adjustment (pH 7.00 buffer)
  ph_slope: number;          // Sensitivity scaling (pH 4.01 buffer)
  moisture_dry_adc: number;  // In-air ADC reading (~3100-3300)
  moisture_wet_adc: number;  // Water-saturated ADC reading (~1200-1400)
  temp_offset: number;       // Calibration offset in °C
  expiry_date?: string;
}

export interface CalibrationHealth {
  isCalibrated: boolean;
  daysRemaining: number;
  isExpired: boolean;
  statusText: string;
}

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

export type ConfidenceBand = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

export interface SensorInferenceResult {
  prediction: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  confidenceBand: ConfidenceBand;
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
