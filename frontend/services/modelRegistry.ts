/**
 * SILAGEGUARD AI — Integration: Model registry access (backend-backed)
 *
 * Two sources, in priority order:
 *   1. GET /api/v1/models/registry — authoritative server view of the weights
 *   2. Bundled JSON in assets/models — offline fallback, always present
 */
import { get } from "./apiClient";

export type ModelFamily =
  | "vision"
  | "sensor"
  | "fusion_engine"
  | "safety_rules";

export interface ModelFamilyInfo {
  name: string;
  format?: string[];
  artifact_dir?: string;
  artifacts_present?: string[];
  classes?: string[];
  metrics?: Record<string, any>;
  location?: string;
}

export type ModelRegistry = Record<ModelFamily, ModelFamilyInfo>;

export async function fetchModelRegistry(): Promise<ModelRegistry | null> {
  try {
    return await get<ModelRegistry>("/models/registry", false);
  } catch {
    return null;
  }
}

export async function isModelReady(family: ModelFamily): Promise<boolean> {
  try {
    const res = await get<{ family: ModelFamily; ready: boolean }>(
      `/models/registry/${family}/ready`,
      false,
    );
    return res.ready;
  } catch {
    return false;
  }
}
