/**
 * SILAGEGUARD AI — Global Agronomic & System Constants
 * SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 */

export const BLE_CONFIG = {
  DEVICE_NAME: "SilageGuard-Probe",
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  SCAN_TIMEOUT_MS: 10000,
  HEARTBEAT_INTERVAL_MS: 1000
};

export const AGRONOMIC_THRESHOLDS = {
  SAFE: {
    PH_MIN: 3.8,
    PH_MAX: 4.2,
    MOISTURE_MIN: 60.0,
    MOISTURE_MAX: 68.0,
    TEMP_RISE_MAX: 3.0,
    MOULD_PROB_MAX: 0.15
  },
  CAUTION: {
    PH_MIN: 4.3,
    PH_MAX: 4.8,
    MOISTURE_BAND_1: [55.0, 60.0],
    MOISTURE_BAND_2: [68.0, 72.0],
    TEMP_RISE_BAND: [4.0, 8.0]
  },
  UNSAFE: {
    PH_OVERRIDE: 6.0,
    TEMP_RISE_OVERRIDE: 10.0,
    MOULD_PROB_OVERRIDE: 0.60,
    MOISTURE_CRITICAL: 75.0
  }
};

export const THEME_COLORS = {
  background: "#090D16",
  card: "#131C2E",
  cardBorder: "#1E293B",
  surface: "#1E293B",
  primary: "#10B981", // Emerald Green
  primaryDark: "#047857",
  accent: "#38BDF8", // Sky Blue
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  
  // Traffic-Light Status Palettes
  safe: "#10B981", // Emerald
  safeBg: "rgba(16, 185, 129, 0.15)",
  safeBorder: "#059669",
  
  caution: "#F59E0B", // Amber
  cautionBg: "rgba(245, 158, 11, 0.15)",
  cautionBorder: "#D97706",
  
  unsafe: "#EF4444", // Crimson
  unsafeBg: "rgba(239, 68, 68, 0.15)",
  unsafeBorder: "#DC2626"
};

export type LanguageCode = "en" | "hi" | "mr" | "kn" | "te";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" }
];

export const DEMO_PRESETS = {
  SAFE: {
    name: "Safe Fermented Corn Silage",
    ph: 3.96,
    moisture: 63.8,
    temp: 24.8,
    ambient: 23.5,
    mouldProb: 0.04,
    battery: 95
  },
  CAUTION: {
    name: "Sub-Optimal Aerobic Heating",
    ph: 4.52,
    moisture: 69.5,
    temp: 31.8,
    ambient: 25.2,
    mouldProb: 0.28,
    battery: 88
  },
  UNSAFE: {
    name: "Severe Clostridial Spoilage & Mould",
    ph: 6.35,
    moisture: 78.4,
    temp: 42.5,
    ambient: 26.8,
    mouldProb: 0.88,
    battery: 74
  }
};
