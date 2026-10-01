/**
 * SILAGEGUARD AI — Integration: Backend API Client
 *
 * Wraps the FastAPI backend (backend/app) for the mobile app:
 *   - OTP request / verify  -> /api/v1/auth/otp/*
 *   - token refresh         -> /api/v1/auth/refresh
 *   - batch upload (idempotent) -> /api/v1/sync/batches
 *   - batch listing         -> /api/v1/sync/batches
 *   - QR verification       -> /api/v1/qr/{token}
 *   - analytics             -> /api/v1/analytics/*
 *   - health / readiness    -> /api/v1/health, /ready
 *
 * Every call is offline-tolerant: a network failure never throws into the UI,
 * it marks the backend as unreachable so the sync queue keeps batches locally.
 */
import { API_TIMEOUT_MS, API_V1 } from "./apiConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken?: string | null;
  farmer?: { id: string; phone: string; name?: string | null } | null;
}
export interface BackendBatchPayload {
  client_batch_id: string;
  scanned_at: string;
  storage_type?: string | null;
  storage_duration_days?: number | null;
  ph?: number | null;
  moisture_pct?: number | null;
  temperature_c?: number | null;
  ambient_temp_c?: number | null;
  sensor_decision?: string | null;
  sensor_confidence?: number | null;
  vision_decision?: string | null;
  vision_confidence?: number | null;
  fused_decision?: string | null;
  fused_score?: number | null;
  rule_override?: string | null;
  advisory_text?: string | null;
  advisory_language?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  qr_token?: string | null;
  image_count?: number;
  image_urls?: string[] | null;
  device_model?: string | null;
  app_version?: string | null;
}

export interface SyncResponse {
  inserted: number;
  skipped: number;
  total: number;
  user_id: string;
}

export interface HealthStatus {
  status: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// Token storage (in-memory + AsyncStorage-free so it works everywhere)
// ---------------------------------------------------------------------------

const tokenStore = {
  access: null as string | null,
  refresh: null as string | null,
  farmer: null as TokenPair["farmer"],
};

export function setTokens(tokens: TokenPair | null): void {
  tokenStore.access = tokens?.accessToken ?? null;
  tokenStore.refresh = tokens?.refreshToken ?? null;
  tokenStore.farmer = tokens?.farmer ?? null;
}

export function getAccessToken(): string | null {
  return tokenStore.access;
}

export function isAuthenticated(): boolean {
  return Boolean(tokenStore.access);
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let backendReachable = true;
export function isBackendReachable(): boolean {
  return backendReachable;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_V1}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (authenticated && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      // Auto-refresh once on 401, then retry the original call.
      if (response.status === 401 && authenticated && tokenStore.refresh) {
        const refreshed = await refreshTokens().catch(() => null);
        if (refreshed) {
          clearTimeout(timer);
          return request<T>(path, init, authenticated);
        }
      }
      const detail =
        (body as any)?.detail ?? `Request failed (${response.status})`;
      throw new ApiError(response.status, String(detail), body);
    }

    backendReachable = true;
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    backendReachable = false;
    throw new ApiError(
      0,
      err instanceof Error ? err.message : "Network unreachable",
    );
  } finally {
    clearTimeout(timer);
  }
}

const get = <T>(path: string, auth = true) => request<T>(path, { method: "GET" }, auth);
const post = <T>(path: string, body: unknown, auth = true) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) }, auth);

// Exported for sibling modules in services/ that need raw GET access.
export { get, post };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function requestOtp(
  phone: string,
): Promise<{ status: string; expires_in: number }> {
  return post("/auth/otp/request", { phone }, false);
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<TokenPair> {
  const tokens = await post<TokenPair>(
    "/auth/otp/verify",
    { phone, otp },
    false,
  );
  setTokens(tokens);
  return tokens;
}

export async function refreshTokens(): Promise<TokenPair | null> {
  if (!tokenStore.refresh) return null;
  try {
    const tokens = await post<TokenPair>(
      "/auth/refresh",
      { refresh_token: tokenStore.refresh },
      false,
    );
    setTokens({
      ...tokens,
      refreshToken: tokens.refreshToken ?? tokenStore.refresh,
    });
    return tokens;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  if (tokenStore.refresh) {
    await post(
      "/auth/logout",
      { refresh_token: tokenStore.refresh },
      false,
    ).catch(() => undefined);
  }
  setTokens(null);
}

// ---------------------------------------------------------------------------
// Device provisioning
// ---------------------------------------------------------------------------

/**
 * The app has no login screen, so it authenticates as a device principal using
 * the shared secret from EXPO_PUBLIC_DEVICE_SECRET. If the server has device
 * provisioning disabled this fails softly and the app stays local-only.
 */
export async function authenticateDevice(
  deviceId: string,
  secret: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await post<{ access_token: string; expires_in: number }>(
    "/auth/device",
    { device_id: deviceId, secret },
    false,
  );
  setTokens({ accessToken: res.access_token });
  return { accessToken: res.access_token, expiresIn: res.expires_in };
}

/**
 * Ensure a usable access token exists, provisioning one on first use.
 * Returns false when the backend is unreachable or has provisioning disabled —
 * callers should then keep the data local rather than surface an error.
 */
export async function ensureDeviceAuthenticated(deviceId: string): Promise<boolean> {
  if (tokenStore.access) return true;
  const secret = process.env.EXPO_PUBLIC_DEVICE_SECRET;
  if (!secret) return false;
  try {
    await authenticateDevice(deviceId, secret);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Uploads batches. The backend de-duplicates on `client_batch_id`, so
 * re-sending an already-synced batch is safe (it is counted as `skipped`).
 */
export async function syncBatches(
  batches: BackendBatchPayload[],
  deviceId: string,
  appVersion: string,
): Promise<SyncResponse> {
  return post<SyncResponse>("/sync/batches", {
    device_id: deviceId,
    app_version: appVersion,
    batches,
  });
}

export async function listBatches(since?: string, limit = 100) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (since) query.set("since", since);
  return get<{ count: number; items: any[] }>(
    `/sync/batches?${query.toString()}`,
  );
}

export async function getSyncStatus(): Promise<{ status: string }> {
  return get<{ status: string }>("/sync/status");
}

// ---------------------------------------------------------------------------
// QR
// ---------------------------------------------------------------------------

export async function getQrSummary(token: string) {
  return get(`/qr/${encodeURIComponent(token)}`, false);
}

export async function getQrReport(token: string) {
  return get(`/qr/${encodeURIComponent(token)}/report`);
}

// ---------------------------------------------------------------------------
// Analytics + health
// ---------------------------------------------------------------------------

export async function getFarmerAnalytics() {
  return get("/analytics/farmer/me");
}

export async function getCooperativeAnalytics(cooperativeId: string) {
  return get(`/analytics/cooperative/${encodeURIComponent(cooperativeId)}`);
}

export async function getRegionalAnalytics(district: string) {
  return get(`/analytics/region/${encodeURIComponent(district)}`);
}

export async function getHeatmap() {
  return get("/analytics/heatmap");
}

export async function getHealth(): Promise<HealthStatus> {
  return get<HealthStatus>("/health", false);
}

export async function pingBackend(): Promise<boolean> {
  try {
    await getHealth();
    return true;
  } catch {
    return false;
  }
}
