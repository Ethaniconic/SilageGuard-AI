/**
 * SILAGEGUARD AI V4 — Navigation & Routing Types
 * Typed parameters for Expo Router, nested scan wizard, and deep links.
 */

export type ScanWizardStep = "CAPTURE" | "PROBE" | "ANALYZE" | "RESULT";

export type TabRoutes = "home" | "scan" | "insights" | "history" | "settings";

export interface ScanRouteParams {
  step?: ScanWizardStep;
  batchId?: string;
  autoConnect?: boolean;
}

export interface DetailRouteParams {
  id: string;
}

export interface ExplainabilityRouteParams {
  batchId?: string;
  source?: "scan" | "history";
}

export interface CalibrationRouteParams {
  sensorType?: "ph" | "moisture" | "temp";
}
