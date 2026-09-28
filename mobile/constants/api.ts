/**
 * SILAGEGUARD AI V4 — REST API Endpoints & Network Constants
 * Pure client configuration for consuming the FastAPI cloud/cooperative backend.
 */

export const API_CONFIG = {
  DEFAULT_BASE_URL: "http://localhost:8000",
  TIMEOUT_MS: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1500,

  ENDPOINTS: {
    // Health & System
    HEALTH: "/health",
    ROOT: "/",

    // Authentication
    AUTH_REGISTER: "/api/v1/auth/register",
    AUTH_LOGIN: "/api/v1/auth/login",
    AUTH_REFRESH: "/api/v1/auth/refresh",
    AUTH_ME: "/api/v1/auth/me",

    // Batch Ingestion & Sync
    BATCH_SYNC: "/api/v1/batches/sync",
    BATCH_SYNC_BULK: "/api/v1/batches/sync/bulk",
    BATCHES_LIST: "/api/v1/batches/",
    BATCH_DETAIL: (id: string) => `/api/v1/batches/${id}`,

    // QR Verification & Reports
    QR_SIGN: "/api/v1/qr/sign",
    QR_VERIFY: (token: string) => `/api/v1/qr/${token}`,
    QR_DETAILED_VERIFY: (token: string) => `/api/v1/qr/${token}/verify`,
    QR_REPORT: (token: string) => `/api/v1/qr/${token}/report`,

    // Analytics & Heatmaps
    ANALYTICS_OVERVIEW: "/api/v1/analytics/overview",
    ANALYTICS_TRENDS: "/api/v1/analytics/trends",
    ANALYTICS_COOPERATIVE: (id: string) => `/api/v1/analytics/cooperative/${id}`,
    ANALYTICS_REGION: (district: string) => `/api/v1/analytics/region/${district}`,

    // Dynamic Model Registry
    MODELS_REGISTRY: "/api/v1/models/registry/",
    MODELS_FAMILY: (family: string) => `/api/v1/models/registry/${family}`,
    MODELS_METRICS: (family: string) => `/api/v1/models/registry/${family}/metrics`,
    MODELS_READY: (family: string) => `/api/v1/models/registry/${family}/ready`
  },

  STORAGE_KEYS: {
    AUTH_TOKEN: "@silageguard_access_token",
    REFRESH_TOKEN: "@silageguard_refresh_token",
    USER_PROFILE: "@silageguard_user_profile",
    PENDING_SYNC_QUEUE: "@silageguard_pending_sync_queue",
    SAVED_PROBE_ID: "@silageguard_saved_probe_id",
    THEME_PREFERENCE: "@silageguard_theme_pref",
    LANGUAGE_PREFERENCE: "@silageguard_lang_pref",
    ACCESSIBILITY_HIGH_CONTRAST: "@silageguard_access_high_contrast",
    ACCESSIBILITY_LARGE_FONT: "@silageguard_access_large_font"
  }
};
