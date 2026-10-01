/**
 * SILAGEGUARD AI V4 — Batch & Relational Scan Types
 * Strict contracts for batch records, multimodal fusion scoring, and verification tokens.
 */

export type SilageVerdict =
  | "SAFE TO FEED (LOW SCREENING RISK)"
  | "FEED WITH CAUTION"
  | "UNSAFE"
  | "DO NOT FEED"
  | "INSUFFICIENT DATA";

export type SilageDecision = "SAFE" | "CAUTION" | "UNSAFE";
export type ModalityState = "MULTIMODAL" | "SENSOR_ONLY" | "VISION_ONLY" | "INSUFFICIENT_DATA";
export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "RETAKE_REQUIRED";
export type SyncStatus = "PENDING" | "SYNCED" | "UPLOADING" | "FAILED";

export interface ExplainabilityPoint {
  parameter: string;
  measuredValue: string;
  status: "NORMAL" | "BORDERLINE" | "ALERT" | "UNAVAILABLE";
  assessment: string;
}

export interface TriggeredRuleResult {
  ruleId: string;
  ruleTitle: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  agronomicRationale: string;
  recommendedAction: string;
  citation: string;
  triggerValue: string;
}

export interface MultimodalFusionOutput {
  decision: SilageDecision;
  finalVerdict: SilageVerdict;
  fusionScore: number;                 // 0 to 100 continuous MSSI
  sensorScore: number | null;
  visionScore: number | null;
  
  finalConfidence: number;             // 0 to 100 continuous
  confidenceLevel: ConfidenceTier;
  sensorConfidence: number | null;
  visionConfidence: number | null;
  
  modalityState: ModalityState;
  needRetake: boolean;
  needProbe: boolean;

  ruleOverride: boolean;
  ruleId: string | null;
  ruleReason: string | null;
  triggeredRules: TriggeredRuleResult[];
  summaryReason: string;

  conflictDetected: boolean;
  conflictExplanation?: string;

  explainabilityChain: ExplainabilityPoint[];
  reasons: string[];
  evidenceList: string[];
}

export interface SilageBatchRecord {
  id: string;
  timestamp: string;
  cropType: string;
  crop_type?: string;
  storageType: string;
  storage_type?: string;
  pitDepthCm: number;
  pit_depth_cm?: number;
  mssiScore: number;
  mssi_score?: number;
  decision: SilageDecision;
  confidence: number;
  confidenceLevel: ConfidenceTier;
  confidence_level?: ConfidenceTier;
  ruleOverride: boolean;
  rule_override?: boolean;
  ruleId: string | null;
  rule_id?: string | null;
  ruleReason: string | null;
  rule_reason?: string | null;
  summary_reason?: string;
  isDemo: boolean;
  is_demo?: boolean;
  
  telemetry?: {
    ph: number | null;
    moisture: number | null;
    temperature: number | null;
    ambient: number | null;
    deltaTemp: number | null;
  };

  vision?: {
    mouldProbability: number | null;
    confidence: number | null;
    imageUri?: string;
    gradcamUri?: string;
  };

  fusion?: {
    modalityState: ModalityState;
    summaryReason: string;
  };

  qrData?: string;
  qr_data?: string;
  syncStatus?: SyncStatus;
  syncedAt?: string;
  serverId?: string;
}

export interface BatchFilterOptions {
  searchQuery?: string;
  cropType?: string;
  decision?: SilageDecision | "ALL";
  storageType?: string;
  syncStatus?: SyncStatus | "ALL";
  startDate?: string;
  endDate?: string;
}
