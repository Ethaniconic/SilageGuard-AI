/**
 * SILAGEGUARD AI V4 — Unified Design System & Theme Engine
 * Industrial instrumentation aesthetics with WCAG AA compliance,
 * AMOLED dark mode, and outdoor direct sunlight readability.
 */

import { DARK_THEME, LIGHT_THEME, ThemeColors } from "../constants/colors";

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
} as const;

export const TYPOGRAPHY = {
  // Standard Scale
  standard: {
    hero: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
    h1: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const },
    h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
    h3: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const },
    bodyLg: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
    body: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    bodySm: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
    caption: { fontSize: 11, lineHeight: 14, fontWeight: "500" as const },
    code: { fontSize: 12, lineHeight: 16, fontFamily: "monospace", fontWeight: "600" as const },
  },
  // Large Typography Mode for Elderly Farmers / High Readability in Field
  large: {
    hero: { fontSize: 32, lineHeight: 40, fontWeight: "800" as const },
    h1: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const },
    h2: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
    h3: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const },
    bodyLg: { fontSize: 18, lineHeight: 26, fontWeight: "500" as const },
    body: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const },
    bodySm: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
    code: { fontSize: 14, lineHeight: 18, fontFamily: "monospace", fontWeight: "600" as const },
  },
} as const;

export const ELEVATION = {
  flat: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  high: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export type ThemeMode = "dark" | "light" | "amoled";

export function getTheme(mode: ThemeMode, highContrast: boolean = false): ThemeColors {
  const baseTheme = mode === "light" ? { ...LIGHT_THEME } : { ...DARK_THEME };

  if (mode === "amoled") {
    baseTheme.background = "#000000";
    baseTheme.surface = "#0A0A0A";
    baseTheme.card = "#121212";
    baseTheme.cardBorder = "#222222";
  }

  if (highContrast) {
    if (mode === "light") {
      baseTheme.text = "#000000";
      baseTheme.textSecondary = "#1E293B";
      baseTheme.cardBorder = "#000000";
    } else {
      baseTheme.text = "#FFFFFF";
      baseTheme.textSecondary = "#E2E8F0";
      baseTheme.cardBorder = "#FFFFFF";
    }
  }

  return baseTheme;
}

export * from "../constants/colors";
