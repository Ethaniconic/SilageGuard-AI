/**
 * SILAGEGUARD AI V4 — Central Application State Store (Zustand)
 * Manages Auth, Preferences, Hardware BLE Probe state, Scan Wizard,
 * Calibration parameters, Offline Sync queue, and Toast notifications.
 */

import { create } from "zustand";
import { ThemeMode, getTheme } from "../theme";
import { ThemeColors } from "../constants/colors";
import { LanguageCode } from "../types/advisory";
import { ProbeTelemetryData, CalibrationProfile } from "../types/sensor";
import { CapturedPhoto, IQAQualityReport } from "../types/prediction";
import { SilageBatchRecord, MultimodalFusionOutput } from "../types/batch";
import { UserProfile } from "../types/backend";

export interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info" | "warning";
  durationMs?: number;
}

export interface AppState {
  // Appearance & Preferences
  themeMode: ThemeMode;
  highContrast: boolean;
  largeTypography: boolean;
  language: LanguageCode;
  voiceSpeed: number;
  hapticsEnabled: boolean;
  theme: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  setHighContrast: (enabled: boolean) => void;
  setLargeTypography: (enabled: boolean) => void;
  setLanguage: (lang: LanguageCode) => void;
  setVoiceSpeed: (speed: number) => void;

  // Auth & Profile
  user: UserProfile | null;
  isGuest: boolean;
  setUser: (user: UserProfile | null) => void;
  setGuestMode: (isGuest: boolean) => void;

  // Hardware BLE Probe State
  isBleConnected: boolean;
  isBleScanning: boolean;
  isSimulationMode: boolean;
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  rssi: number;
  batteryPct: number;
  telemetry: ProbeTelemetryData | null;
  telemetryHistory: ProbeTelemetryData[];
  crcErrors: number;
  isCalibrated: boolean;
  calibrationProfile: CalibrationProfile;
  setBleConnected: (connected: boolean, deviceId?: string | null, name?: string | null) => void;
  setBleScanning: (scanning: boolean) => void;
  setSimulationMode: (isSim: boolean) => void;
  updateTelemetry: (data: ProbeTelemetryData) => void;
  updateCalibrationProfile: (profile: Partial<CalibrationProfile>) => void;
  incrementCrcErrors: () => void;

  // Scan Wizard Flow State
  activeStep: 1 | 2 | 3 | 4; // 1=Capture, 2=Probe, 3=Analyze, 4=Result
  capturedPhotos: CapturedPhoto[];
  iqaReports: Record<string, IQAQualityReport>;
  selectedCropType: string;
  selectedStorageType: string;
  selectedPitDepthCm: number;
  currentAnalysisResult: {
    batch: SilageBatchRecord;
    fusion: MultimodalFusionOutput;
  } | null;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  addCapturedPhoto: (photo: CapturedPhoto, iqa: IQAQualityReport) => void;
  removeCapturedPhoto: (photoId: string) => void;
  clearScanWizard: () => void;
  setCropMetadata: (crop: string, storage: string, depthCm: number) => void;
  setCurrentAnalysisResult: (result: { batch: SilageBatchRecord; fusion: MultimodalFusionOutput } | null) => void;

  // Sync Queue State
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTimestamp: string | null;
  setOnlineStatus: (online: boolean) => void;
  setSyncStatus: (syncing: boolean, pendingCount?: number) => void;
  setLastSyncTimestamp: (timestamp: string) => void;

  // Global Toast
  toast: ToastState;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", durationMs?: number) => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults
  themeMode: "dark",
  highContrast: false,
  largeTypography: false,
  language: "en",
  voiceSpeed: 1.0,
  hapticsEnabled: true,
  theme: getTheme("dark", false),

  setThemeMode: (mode: ThemeMode) => {
    const highContrast = get().highContrast;
    set({ themeMode: mode, theme: getTheme(mode, highContrast) });
  },

  setHighContrast: (enabled: boolean) => {
    const mode = get().themeMode;
    set({ highContrast: enabled, theme: getTheme(mode, enabled) });
  },

  setLargeTypography: (enabled: boolean) => {
    set({ largeTypography: enabled });
  },

  setLanguage: (lang: LanguageCode) => {
    set({ language: lang });
  },

  setVoiceSpeed: (speed: number) => {
    set({ voiceSpeed: speed });
  },

  // Auth
  user: null,
  isGuest: true,
  setUser: (user) => set({ user, isGuest: !user }),
  setGuestMode: (isGuest) => set({ isGuest }),

  // Hardware Probe
  isBleConnected: false,
  isBleScanning: false,
  isSimulationMode: false,
  connectedDeviceId: null,
  connectedDeviceName: null,
  rssi: -65,
  batteryPct: 92,
  telemetry: null,
  telemetryHistory: [],
  crcErrors: 0,
  isCalibrated: true,
  calibrationProfile: {
    ph_slope: -5.70,
    ph_offset: 0.0,
    moisture_dry_adc: 3200,
    moisture_wet_adc: 1450,
    temp_offset: 0.0,
    calibrated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    health_status: "HEALTHY",
  },

  setBleConnected: (connected, deviceId = null, name = null) =>
    set({
      isBleConnected: connected,
      connectedDeviceId: deviceId,
      connectedDeviceName: name,
      isBleScanning: false,
    }),

  setBleScanning: (scanning) => set({ isBleScanning: scanning }),

  setSimulationMode: (isSim) => set({ isSimulationMode: isSim }),

  updateTelemetry: (data: ProbeTelemetryData) => {
    const history = [...get().telemetryHistory, data].slice(-30); // Keep last 30 live readings
    set({
      telemetry: data,
      telemetryHistory: history,
      rssi: data.rssi ?? get().rssi,
      batteryPct: (data.batteryPct !== undefined ? data.batteryPct : data.battery) ?? get().batteryPct,
    });
  },

  updateCalibrationProfile: (profile) =>
    set((state) => ({
      calibrationProfile: { ...state.calibrationProfile, ...profile },
      isCalibrated: true,
    })),

  incrementCrcErrors: () =>
    set((state) => ({ crcErrors: state.crcErrors + 1 })),

  // Scan Wizard
  activeStep: 1,
  capturedPhotos: [],
  iqaReports: {},
  selectedCropType: "Maize Silage",
  selectedStorageType: "Bunker Pit",
  selectedPitDepthCm: 30,
  currentAnalysisResult: null,

  setActiveStep: (step) => set({ activeStep: step }),

  addCapturedPhoto: (photo, iqa) => {
    const photos = get().capturedPhotos.filter((p) => p.angle !== photo.angle);
    set({
      capturedPhotos: [...photos, photo],
      iqaReports: { ...get().iqaReports, [photo.id]: iqa },
    });
  },

  removeCapturedPhoto: (photoId) => {
    const photos = get().capturedPhotos.filter((p) => p.id !== photoId);
    const reports = { ...get().iqaReports };
    delete reports[photoId];
    set({ capturedPhotos: photos, iqaReports: reports });
  },

  clearScanWizard: () =>
    set({
      activeStep: 1,
      capturedPhotos: [],
      iqaReports: {},
      currentAnalysisResult: null,
    }),

  setCropMetadata: (crop, storage, depthCm) =>
    set({
      selectedCropType: crop,
      selectedStorageType: storage,
      selectedPitDepthCm: depthCm,
    }),

  setCurrentAnalysisResult: (result) => set({ currentAnalysisResult: result }),

  // Sync State
  isOnline: true,
  isSyncing: false,
  pendingSyncCount: 0,
  lastSyncTimestamp: null,

  setOnlineStatus: (online) => set({ isOnline: online }),
  setSyncStatus: (syncing, pendingCount) =>
    set((state) => ({
      isSyncing: syncing,
      pendingSyncCount: pendingCount !== undefined ? pendingCount : state.pendingSyncCount,
    })),
  setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),

  // Toast
  toast: {
    visible: false,
    message: "",
    type: "info",
    durationMs: 3000,
  },

  showToast: (message, type = "info", durationMs = 3000) => {
    set({
      toast: {
        visible: true,
        message,
        type,
        durationMs,
      },
    });
  },

  hideToast: () => {
    set((state) => ({
      toast: { ...state.toast, visible: false },
    }));
  },
}));
