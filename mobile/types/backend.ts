/**
 * SILAGEGUARD AI V4 — Backend Integration & DTO Type Definitions
 * Exact contract schemas for FastAPI REST endpoints and PostgreSQL entities.
 */

import { SilageDecision, ConfidenceTier, SyncStatus } from "./batch";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string;
  expiresIn?: number;
}

export interface UserProfile {
  id: string;
  phoneNumber?: string;
  phone?: string;
  name?: string;
  full_name?: string;
  role: "farmer" | "veterinarian" | "coop_officer" | "admin" | "guest" | "FARMER";
  farmName?: string;
  district?: string;
  state?: string;
  cooperativeId?: string;
  isGuest?: boolean;
  is_verified?: boolean;
}

export interface BatchSyncDTO {
  client_batch_id?: string;
  batch_id?: string;
  farm_id?: string;
  device_uuid?: string;
  scanned_at?: string;
  timestamp?: string;
  crop_type?: string;
  storage_type?: string;
  pit_depth_cm?: number;
  mssi_score?: number;
  decision?: SilageDecision;
  confidence?: number;
  confidence_level?: ConfidenceTier;
  rule_override?: boolean | string | null;
  rule_id?: string | null;
  rule_reason?: string | null;
  ph?: number | null;
  moisture_pct?: number | null;
  temperature_c?: number | null;
  ambient_temp_c?: number | null;
  sensor_decision?: string | null;
  vision_decision?: string | null;
  fused_decision?: string | null;
  fused_score?: number | null;
  advisory_text?: string | null;
  qr_token?: string | null;
  telemetry?: {
    ph: number | null;
    moisture: number | null;
    temperature: number | null;
    ambient: number | null;
    delta_temp: number | null;
  };
  vision?: {
    mould_probability: number | null;
    confidence: number | null;
    iqa_passed: boolean;
  };
  fusion?: {
    modality_state: string;
    summary_reason: string;
  };
  qr_data?: string;
}

export interface SyncQueueItem {
  id: string;
  batchId: string;
  retryCount: number;
  lastAttemptAt?: string;
  error?: string;
  payloadJson: string;
  status: SyncStatus;
}

export interface ModelMetadataDTO {
  family: "vision" | "sensor";
  active_version: string;
  min_client_version: string;
  artifact_url: string;
  checksum_sha256: string;
  quantization?: string;
  accuracy: number;
  macro_recall: number;
  brier_score: number;
  published_at: string;
}

export interface VerificationReportDTO {
  batch_id: string;
  mssi_score: number;
  decision: SilageDecision;
  confidence_level: ConfidenceTier;
  crop_type: string;
  timestamp: string;
  verified_by: string;
  is_authentic: boolean;
  public_key_fingerprint: string;
  issuer: string;
}
