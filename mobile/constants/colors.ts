/**
 * SILAGEGUARD AI V4 — Industrial Design System Color Tokens
 * Deep agricultural instrumentation dark theme + outdoor sunlight-readable light theme.
 * Strict WCAG AA contrast compliance for high visibility under outdoor direct sunlight.
 */

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardBorder: string;
  cardBorderHover: string;
  
  // Brand Accents
  primary: string;         // Vibrant Emerald Green (#10B981)
  primaryDark: string;     // Forest Green (#047857)
  primaryLight: string;    // Mint Green (#34D399)
  accent: string;          // Precision Instrument Sky Blue (#38BDF8)
  accentDark: string;      // Deep Sky Blue (#0284C7)
  
  // Typography
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Semantic Traffic-Light Status
  safe: string;            // Emerald Green (#10B981)
  safeBg: string;          // Translucent green tint
  safeBorder: string;      // Solid safe border
  
  caution: string;         // Warning Amber (#F59E0B)
  cautionBg: string;       // Translucent amber tint
  cautionBorder: string;   // Solid caution border
  
  unsafe: string;          // Critical Crimson (#EF4444)
  unsafeBg: string;        // Translucent red tint
  unsafeBorder: string;    // Solid unsafe border

  // Hardware Status
  bleConnected: string;
  bleScanning: string;
  bleDisconnected: string;

  // Radii & Elevation
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusFull: number;
}

export const DARK_THEME: ThemeColors = {
  isDark: true,
  background: "#080C14",       // Deep AMOLED obsidian
  surface: "#0F172A",          // Midnight slate
  surfaceElevated: "#1E293B",  // Industrial console tier
  card: "#131C2E",             // High-contrast equipment card
  cardBorder: "#1E293B",       // Precision 1px border
  cardBorderHover: "#334155",
  
  primary: "#10B981",          // Emerald Green
  primaryDark: "#059669",
  primaryLight: "#34D399",
  accent: "#38BDF8",           // Instrument Sky Blue
  accentDark: "#0284C7",
  
  text: "#F8FAFC",             // Ultra-bright slate white
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",        // Legible muted silver
  textInverse: "#090D16",

  safe: "#10B981",
  safeBg: "rgba(16, 185, 129, 0.14)",
  safeBorder: "#059669",

  caution: "#F59E0B",
  cautionBg: "rgba(245, 158, 11, 0.14)",
  cautionBorder: "#D97706",

  unsafe: "#EF4444",
  unsafeBg: "rgba(239, 68, 68, 0.14)",
  unsafeBorder: "#DC2626",

  bleConnected: "#10B981",
  bleScanning: "#38BDF8",
  bleDisconnected: "#64748B",

  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
  radiusFull: 9999
};

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  background: "#F8FAFC",       // Sunlight glare-resistant field white
  surface: "#FFFFFF",
  surfaceElevated: "#F1F5F9",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  cardBorderHover: "#CBD5E1",
  
  primary: "#059669",          // Deeper green for high sunlight contrast
  primaryDark: "#047857",
  primaryLight: "#10B981",
  accent: "#0284C7",           // Deep sky blue
  accentDark: "#0369A1",
  
  text: "#0F172A",             // Solid black-slate (15.8:1 contrast ratio)
  textSecondary: "#334155",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",

  safe: "#059669",
  safeBg: "rgba(5, 150, 105, 0.10)",
  safeBorder: "#059669",

  caution: "#D97706",
  cautionBg: "rgba(217, 119, 6, 0.10)",
  cautionBorder: "#D97706",

  unsafe: "#DC2626",
  unsafeBg: "rgba(220, 38, 38, 0.10)",
  unsafeBorder: "#DC2626",

  bleConnected: "#059669",
  bleScanning: "#0284C7",
  bleDisconnected: "#94A3B8",

  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
  radiusFull: 9999
};
