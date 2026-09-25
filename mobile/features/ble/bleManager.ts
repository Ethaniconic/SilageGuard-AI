/**
 * SILAGEGUARD AI — Global App State (Zustand Store)
 * Synchronizes BLE Telemetry, Scan Pipeline, Language Selection, and Offline DB.
 */

import { create } from "zustand";
import { bleService, BLEConnectionStatus, ProbeTelemetryData } from "./bleService";
import { LanguageCode } from "../../utils/constants";
import { FusionResult } from "../fusion/multimodalFusionEngine";
import { FarmerAdvisory } from "../advisory/advisoryEngine";

interface AppState {
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

    isDemoMode: true,
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
      set({ latestFusionResult, latestAdvisory })
  };
});
