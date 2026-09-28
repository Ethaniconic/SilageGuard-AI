/**
 * SILAGEGUARD AI — Integration: Device identity for the backend sync contract.
 * The backend's SyncBatchRequest requires a stable `device_id`, so we derive a
 * deterministic install-scoped id (no extra native dependency required).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

const DEVICE_ID_KEY = "sg_device_id";

function hash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const SEED = [
  Constants?.expoConfig?.extra?.deviceSeed,
  Constants?.deviceId,
  Constants?.installationId,
  Constants?.platform?.ios?.identifierForVendor,
]
  .filter(Boolean)
  .join("|");

export const DEVICE_ID: string = SEED
  ? `SG-${Platform.OS}-${hash(SEED)}`
  : `SG-${Platform.OS}-${DEVICE_ID_KEY}`;

export const APP_VERSION: string =
  (Constants?.expoConfig?.version as string | undefined) ??
  (Constants?.manifest2?.extra?.expoClient?.version as string | undefined) ??
  "1.0.0";
