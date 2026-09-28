/**
 * SILAGEGUARD AI — Global Theme System
 * High-readability Dark Theme and Outdoor High-Visibility Light Theme
 * Sharp industrial border radii for professional hardware screening tool aesthetic.
 */

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryDark: string;
  accent: string;
  text: string;
  textMuted: string;
  subtle: string;

  // Status colors
  safe: string;
  safeBg: string;
  safeBorder: string;
  caution: string;
  cautionBg: string;
  cautionBorder: string;
  unsafe: string;
  unsafeBg: string;
  unsafeBorder: string;

  // Sharp industrial border radii (Less rounded, professional)
  radiusSm: number; // 4px
  radiusMd: number; // 8px
  radiusLg: number; // 10px
}

export const DARK_THEME: ThemeColors = {
  isDark: true,
  background: "#090D16",
  surface: "#111827",
  card: "#131C2E",
  cardBorder: "#1E293B",
  primary: "#10B981",
  primaryDark: "#047857",
  accent: "#38BDF8",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  subtle: "#1E293B",

  safe: "#10B981",
  safeBg: "rgba(16, 185, 129, 0.15)",
  safeBorder: "#059669",

  caution: "#F59E0B",
  cautionBg: "rgba(245, 158, 11, 0.15)",
  cautionBorder: "#D97706",

  unsafe: "#EF4444",
  unsafeBg: "rgba(239, 68, 68, 0.15)",
  unsafeBorder: "#DC2626",

  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 10
};

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  primary: "#059669",
  primaryDark: "#047857",
  accent: "#0284C7",
  text: "#0F172A",
  textMuted: "#475569",
  subtle: "#F1F5F9",

  safe: "#059669",
  safeBg: "rgba(5, 150, 105, 0.12)",
  safeBorder: "#059669",

  caution: "#D97706",
  cautionBg: "rgba(217, 119, 6, 0.12)",
  cautionBorder: "#D97706",

  unsafe: "#DC2626",
  unsafeBg: "rgba(220, 38, 38, 0.12)",
  unsafeBorder: "#DC2626",

  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 10
};

export const getTheme = (isDark: boolean): ThemeColors => (isDark ? DARK_THEME : LIGHT_THEME);
