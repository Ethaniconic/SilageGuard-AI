/**
 * SILAGEGUARD AI V4 — Vision Prediction & Camera IQA Type Definitions
 * Strict types for 3-photo ingestion, quality assessment, and MobileNetV3 inference.
 */

export type CaptureAngle = "SURFACE" | "SIDE" | "DEEP_POCKET";

export interface CapturedPhoto {
  id: string;
  uri: string;
  angle: CaptureAngle;
  timestamp: number;
  iqaScore?: number;
  iqaPassed?: boolean;
}

export interface IQAQualityReport {
  isAcceptable: boolean;
  passed?: boolean;
  blurScore: number;
  exposureScore?: number;
  brightness?: number;
  isBlurry?: boolean;
  isDark?: boolean;
  isOverexposed?: boolean;
  glareDetected?: boolean;
  shadowDetected?: boolean;
  tiltAngleDeg?: number;
  tiltAngle?: number;
  coverageScore?: number;
  silageCoveragePercent?: number;
  shadowScore?: number;
  glareScore?: number;
  reasons?: string[];
  actionableFeedback?: string;
  instructions?: string[];
  guidanceMessage?: string;
}

export interface VisionPrediction {
  photoId?: string;
  angle?: CaptureAngle;
  label?: "SAFE" | "CAUTION" | "UNSAFE";
  prediction?: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  mouldProbability?: number;
  mouldProb?: number;
  probabilities: {
    safe: number;
    caution: number;
    unsafe: number;
  };
  gradcamUri?: string;
  disagreementScore?: number;
  iqaPassed?: boolean;
}

export interface VisionInferenceResult {
  prediction: "SAFE" | "CAUTION" | "UNSAFE";
  aggregatePrediction?: "SAFE" | "CAUTION" | "UNSAFE";
  confidence: number;
  mouldProbability: number;
  probabilities: {
    safe: number;
    caution: number;
    unsafe: number;
  };
  disagreementScore: number;
  requiresRecapture: boolean;
  photoPredictions?: VisionPrediction[];
  individualFrames?: any[];
  individualScores?: {
    surface?: number;
    side?: number;
    deepPocket?: number;
  };
  gradcamMap?: {
    generated: boolean;
    heatmapUri?: string;
    highlightRegions: string[];
    interpretation: string;
  };
  gradcamUri?: string;
  latencyMs: number;
  modelVersion?: string;
  scientificDisclaimer?: string;
  aggregationMethod?: string;
  heatmapAvailable?: boolean;
}
