/**
 * SILAGEGUARD AI — Integration: Backend API Configuration
 *
 * Single source of truth for where the FastAPI backend lives.
 * Resolution order:
 *   1. process.env.EXPO_PUBLIC_API_URL
 *   2. Expo extra.apiUrl from app.json (app.config)
 *   3. Platform-appropriate localhost default
 *
 * Android emulators must use 10.0.2.2 (the host loopback alias), not localhost.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

const FALLBACK_ANDROID = "http://10.0.2.2:8000";
const FALLBACK_DEFAULT = "http://localhost:8000";

function readExtra(key: string): string | undefined {
  const extra = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra;
  const value = extra?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ||
  readExtra("apiUrl") ||
  (Platform.OS === "android" ? FALLBACK_ANDROID : FALLBACK_DEFAULT)
).replace(/\/+$/, "");

export const API_V1 = `${API_BASE_URL}/api/v1`;
export const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000);

/** How long the app keeps retrying a failed sync before falling back to offline-only. */
export const SYNC_RETRY_WINDOW_MS = Number(process.env.EXPO_PUBLIC_SYNC_RETRY_WINDOW_MS ?? 30000);

export const AuthTokens = {
  ACCESS_KEY: "sg_access_token",
  REFRESH_KEY: "sg_refresh_token",
  FARMER_KEY: "sg_farmer"
} as const;
