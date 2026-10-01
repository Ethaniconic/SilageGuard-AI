/**
 * SILAGEGUARD AI — Global App State (Zustand Store)
 * Synchronizes BLE Telemetry, Scan Pipeline, Language Selection, Theme, and Offline DB.
 */

import { create } from "zustand";
import { bleService, BLEConnectionStatus, ProbeTelemetryData } from "./bleService";
import { LanguageCode } from "../../utils/constants";
import { FusionResult } from "../fusion/multimodalFusionEngine";
import { FarmerAdvisory } from "../advisory/advisoryEngine";
import { useAppStore as useGlobalStore } from "../../store/useAppStore";
import { ThemeColors } from "../../constants/colors";

interface AppState {
  // Theme & Appearance
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;

  // BLE & Telemetry
  bleStatus: BLEConnectionStatus;
  statusMessage: string;
  telemetry: ProbeTelemetryData;
  connectProbe: () => Promise<void>;
  disconnectProbe: () => void;

  // Settings & Localization
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  demoPreset: "SAFE" | "CAUTION" | "UNSAFE";
  setDemoPreset: (preset: "SAFE" | "CAUTION" | "UNSAFE") => void;

  // Scan Session State
  scanImages: string[];
  addScanImage: (uri: string) => void;
  removeScanImage: (index: number) => void;
  clearScanImages: () => void;
  cropType: string;
  setCropType: (crop: string) => void;
  pitDepthCm: number;
  setPitDepthCm: (depth: number) => void;

  // Processing & Latest Result
  latestFusionResult: FusionResult | null;
  latestAdvisory: FarmerAdvisory | null;
  setLatestResult: (fusion: FusionResult, advisory: FarmerAdvisory) => void;
  clearHistory: () => void;
  clearScanWizard: () => void;
  setCurrentAnalysisResult: (result: any) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", durationMs?: number) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  // Attach BLE listeners
  bleService.onStatusChange((status, message) => {
    set({ bleStatus: status, statusMessage: message || "" });
  });

  bleService.onTelemetry((data) => {
    set({ telemetry: data });
  });

  return {
    // Theme
    isDarkMode: true,
    toggleTheme: () => {
      const nextDark = !get().isDarkMode;
      set({ isDarkMode: nextDark });
      try {
        useGlobalStore.getState().setThemeMode(nextDark ? "dark" : "light");
      } catch (e) {
        // no-op
      }
    },
    setTheme: (isDarkMode: boolean) => {
      set({ isDarkMode });
      try {
        useGlobalStore.getState().setThemeMode(isDarkMode ? "dark" : "light");
      } catch (e) {
        // no-op
      }
    },

    // Hardware BLE
    bleStatus: "DISCONNECTED",
    statusMessage: "Probe not connected. Click to pair.",
    telemetry: bleService.getCurrentTelemetry(),

    connectProbe: async () => {
      const { isDemoMode } = get();
      await bleService.startScanAndConnect(isDemoMode);
    },

    disconnectProbe: () => {
      bleService.disconnect();
    },

    language: "en",
    setLanguage: (language) => set({ language }),

    isDemoMode: false,
    setDemoMode: (isDemoMode) => set({ isDemoMode }),

    demoPreset: "SAFE",
    setDemoPreset: (demoPreset) => {
      set({ demoPreset });
      bleService.setDemoPreset(demoPreset);
    },

    scanImages: [],
    addScanImage: (uri) => {
      const current = get().scanImages;
      if (current.length < 3) {
        set({ scanImages: [...current, uri] });
      }
    },
    removeScanImage: (index) => {
      const current = get().scanImages;
      set({ scanImages: current.filter((_, i) => i !== index) });
    },
    clearScanImages: () => set({ scanImages: [] }),

    cropType: "Corn Silage (Zea mays)",
    setCropType: (cropType) => set({ cropType }),

    pitDepthCm: 50,
    setPitDepthCm: (pitDepthCm) => set({ pitDepthCm }),

    latestFusionResult: null,
    latestAdvisory: null,
    setLatestResult: (latestFusionResult, latestAdvisory) =>
      set({ latestFusionResult, latestAdvisory }),
    clearHistory: () => {
      useGlobalStore.getState().clearScanWizard();
      useGlobalStore.getState().setCurrentAnalysisResult(null);
      set({
        latestFusionResult: null,
        latestAdvisory: null,
        scanImages: []
      });
    },
    clearScanWizard: () => {
      useGlobalStore.getState().clearScanWizard();
      useGlobalStore.getState().setCurrentAnalysisResult(null);
      set({
        latestFusionResult: null,
        latestAdvisory: null,
        scanImages: []
      });
    },
    setCurrentAnalysisResult: (result: any) => {
      useGlobalStore.getState().setCurrentAnalysisResult(result);
    },
    showToast: (message: string, type: "success" | "error" | "info" | "warning" = "info", durationMs = 3000) => {
      useGlobalStore.getState().showToast(message, type, durationMs);
    }
  };
});

/**
 * Convenient React Hook to read active theme colors and toggle action
 */
export function useTheme(): { theme: ThemeColors; isDark: boolean; toggleTheme: () => void } {
  const globalTheme = useGlobalStore((state) => state.theme);
  const isDark = useGlobalStore((state) => state.isDark);

  const toggleTheme = () => {
    useGlobalStore.getState().toggleTheme();
    useAppStore.getState().setTheme(!isDark ? true : false);
  };

  return {
    theme: globalTheme,
    isDark,
    toggleTheme
  };
}
