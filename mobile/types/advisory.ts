/**
 * SILAGEGUARD AI V4 — Farmer Advisory & Multilingual Types
 * Actionable recommendations, immediate feeding actions, and ensiling prevention tips.
 */

export type LanguageCode = "en" | "hi" | "mr" | "kn" | "te";

export interface ActionStep {
  title: string;
  detail: string;
  timeframe: string;
  urgency: "IMMEDIATE" | "MONITOR" | "ROUTINE";
}

export interface FarmerAdvisory {
  decision: "SAFE" | "CAUTION" | "UNSAFE";
  headline: string;
  summary: string;
  immediateAction: string;
  actionText?: string;
  preventionGuideline: string;
  audioText: string;
  feedingPlan: string;
  aerobicStabilityWarning?: string;
  steps: ActionStep[];
}

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  voiceIdentifier?: string;
}
