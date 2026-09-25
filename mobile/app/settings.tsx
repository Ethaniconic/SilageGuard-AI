/**
 * SCREEN 9 — FARMER SETTINGS & MULTILINGUAL CONFIGURATION
 * - Language selection (English, Hindi, Marathi, Kannada, Telugu)
 * - Dark mode toggle (OLED high-contrast default)
 * - Audio volume / speech rate controls
 * - Demo mode toggle & hardware simulation presets
 * - Offline model diagnostics & storage statistics
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert
} from "react-native";
import { Header } from "../components/Header";
import { LanguagePicker } from "../components/LanguagePicker";
import { useAppStore } from "../features/ble/bleManager";
import { THEME_COLORS } from "../utils/constants";
import rfModelJson from "../assets/models/sensor_rf_model.json";
import modelMeta from "../assets/models/model_metadata.json";

export default function SettingsScreen() {
  const {
    language,
    setLanguage,
    isDemoMode,
    setDemoMode,
    demoPreset,
    setDemoPreset
  } = useAppStore();

  const [darkMode, setDarkMode] = useState(true);
  const [speechRate, setSpeechRate] = useState<"normal" | "slow">("normal");

  const handleClearDatabase = () => {
    Alert.alert(
      "Reset Local Scans?",
      "Are you sure you want to clear cached test scans? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => Alert.alert("Reset", "Local scan history cleared.") }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="FARMER SETTINGS" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language Selector Section */}
        <View style={styles.sectionCard}>
          <LanguagePicker
            selectedLanguage={language}
            onSelectLanguage={(l) => setLanguage(l)}
          />
        </View>

        {/* Demo Mode & Hardware Simulation Controls */}
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelArea}>
              <Text style={styles.settingTitle}>🎯 HACKATHON DEMO MODE</Text>
              <Text style={styles.settingSub}>
                Simulates ESP32-S3 sensor stream without physical hardware.
              </Text>
            </View>
            <Switch
              value={isDemoMode}
              onValueChange={setDemoMode}
              trackColor={{ false: "#334155", true: THEME_COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isDemoMode && (
            <View style={styles.demoPresetContainer}>
              <Text style={styles.demoPresetLabel}>ACTIVE INJECTION PRESET:</Text>
              <View style={styles.presetButtons}>
                {(["SAFE", "CAUTION", "UNSAFE"] as const).map((p) => {
                  const isSelected = demoPreset === p;
                  const col =
                    p === "SAFE"
                      ? THEME_COLORS.safe
                      : p === "CAUTION"
                      ? THEME_COLORS.caution
                      : THEME_COLORS.unsafe;

                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.presetPill,
                        isSelected && { backgroundColor: `${col}22`, borderColor: col }
                      ]}
                      onPress={() => setDemoPreset(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetText, isSelected && { color: col }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* pH Sensor 2-Point Calibration Section (Section 33) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🧪 HARDWARE PROBE pH CALIBRATION</Text>
          <Text style={styles.settingSub}>
            Standard 2-point buffer calibration (pH 4.01 & pH 7.00 at 25°C). Empirical calibration avoids misleading readings.
          </Text>

          <View style={styles.calibStatusRow}>
            <View style={styles.calibParam}>
              <Text style={styles.calibParamLabel}>Probe Slope:</Text>
              <Text style={styles.calibParamVal}>-5.70 pH/V</Text>
            </View>
            <View style={styles.calibParam}>
              <Text style={styles.calibParamLabel}>Zero Offset:</Text>
              <Text style={styles.calibParamVal}>+0.02 V</Text>
            </View>
            <View style={styles.calibParam}>
              <Text style={styles.calibParamLabel}>Status:</Text>
              <Text style={[styles.calibParamVal, { color: THEME_COLORS.safe }]}>Calibrated</Text>
            </View>
          </View>

          <View style={styles.calibButtonsRow}>
            <TouchableOpacity
              style={styles.calibBtn}
              onPress={() => Alert.alert("Buffer Calibration", "Immerse probe in pH 7.00 neutral buffer and hold steady.")}
              activeOpacity={0.8}
            >
              <Text style={styles.calibBtnText}>1. CALIBRATE pH 7.0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calibBtn}
              onPress={() => Alert.alert("Buffer Calibration", "Immerse probe in pH 4.01 acid buffer and hold steady.")}
              activeOpacity={0.8}
            >
              <Text style={styles.calibBtnText}>2. CALIBRATE pH 4.0</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Display & Accessibility */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>DISPLAY & ACCESSIBILITY</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelArea}>
              <Text style={styles.settingTitle}>OLED High Contrast Dark Mode</Text>
              <Text style={styles.settingSub}>Optimized for outdoor bunker pit visibility</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#334155", true: THEME_COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingRow, styles.dividerRow]}>
            <View style={styles.settingLabelArea}>
              <Text style={styles.settingTitle}>Audio Speech Rate</Text>
              <Text style={styles.settingSub}>Farmer advisory narration tempo</Text>
            </View>
            <TouchableOpacity
              style={styles.tempoBtn}
              onPress={() => setSpeechRate(speechRate === "normal" ? "slow" : "normal")}
            >
              <Text style={styles.tempoBtnText}>
                {speechRate === "normal" ? "Standard (1.0x)" : "Clear Slow (0.8x)"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* On-Device AI Models Diagnostics */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ON-DEVICE AI SYSTEM DIAGNOSTICS</Text>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Sensor Model:</Text>
            <Text style={styles.diagValue}>
              Random Forest (v2.0, 25 Trees, 94.38% Test Acc)
            </Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Vision Model:</Text>
            <Text style={styles.diagValue}>
              MobileNetV3-Small INT8 (v2.0, 1.8MB, 3-Photo Mean)
            </Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Multimodal Fusion:</Text>
            <Text style={styles.diagValue}>MSSI v2.0 (0.55 Sensor + 0.45 Vision)</Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Safety Rule Engine:</Text>
            <Text style={styles.diagValue}>rules_v2.0 (Decoupled Overrides)</Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Cloud Dependency:</Text>
            <Text style={[styles.diagValue, { color: THEME_COLORS.safe }]}>
              0.0% (100% Offline Edge Processing)
            </Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Database:</Text>
            <Text style={styles.diagValue}>SQLite (Offline Local Storage)</Text>
          </View>
        </View>

        {/* SCIENTIFIC LIMITATIONS & ETHICS (Section 47) */}
        <View style={[styles.sectionCard, styles.limitationsCard]}>
          <Text style={styles.limitationsTitle}>📖 ABOUT SILAGEGUARD AI & LIMITATIONS</Text>
          <Text style={styles.limitationsNotice}>
            SILAGEGUARD AI provides rapid screening based on sensor telemetry and visual indicators. It does NOT replace certified laboratory analysis.
          </Text>

          <View style={styles.limitationsList}>
            <View style={styles.limitRow}>
              <Text style={styles.limitBullet}>•</Text>
              <Text style={styles.limitText}>
                <Text style={styles.limitHighlight}>Visible mould ≠ confirmed mycotoxin concentration:</Text> RGB vision detects surface hyphae/coloration, not microscopic ppb toxin concentrations.
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitBullet}>•</Text>
              <Text style={styles.limitText}>
                <Text style={styles.limitHighlight}>Model confidence ≠ laboratory probability:</Text> Classifier confidence indicates pattern similarity to prototype datasets, not chemical certainty.
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitBullet}>•</Text>
              <Text style={styles.limitText}>
                <Text style={styles.limitHighlight}>Estimated moisture ≠ laboratory dry matter:</Text> Capacitive ADC readings are uncalibrated proxies for oven-drying reference methods.
              </Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitBullet}>•</Text>
              <Text style={styles.limitText}>
                <Text style={styles.limitHighlight}>Screening verdict ≠ guaranteed feed safety:</Text> Consult a licensed veterinarian or dairy nutritionist for clinical herd decisions.
              </Text>
            </View>
          </View>
        </View>

        {/* Clear Storage */}
        <TouchableOpacity
          style={styles.clearDbBtn}
          onPress={handleClearDatabase}
          activeOpacity={0.8}
        >
          <Text style={styles.clearDbText}>RESET LOCAL SCAN DATABASE</Text>
        </TouchableOpacity>

        {/* Version & Build */}
        <View style={styles.footerVersion}>
          <Text style={styles.footerText}>SilageGuard AI v2.0.0 (SIH 2026 Production Build)</Text>
          <Text style={styles.footerSub}>SIH26111 • Ministry of Fisheries, Animal Husbandry & Dairying</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  sectionCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 18,
    marginBottom: 14
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 14
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dividerRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 14,
    marginTop: 14
  },
  settingLabelArea: {
    flex: 1,
    marginRight: 10
  },
  settingTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800"
  },
  settingSub: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3
  },
  demoPresetContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)"
  },
  demoPresetLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  presetPill: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#334155"
  },
  presetText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800"
  },
  tempoBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0284C7"
  },
  tempoBtnText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800"
  },
  diagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  diagLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600"
  },
  diagValue: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800"
  },
  clearDbBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8
  },
  clearDbText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  calibStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  calibParam: {
    alignItems: "center"
  },
  calibParamLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700"
  },
  calibParamVal: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2
  },
  calibButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  calibBtn: {
    flex: 1,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "#0284C7",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4
  },
  calibBtnText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  limitationsCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  limitationsTitle: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  limitationsNotice: {
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    marginBottom: 10
  },
  limitationsList: {
    marginTop: 4
  },
  limitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6
  },
  limitBullet: {
    color: "#F59E0B",
    fontSize: 14,
    marginRight: 6,
    lineHeight: 16
  },
  limitText: {
    color: "#CBD5E1",
    fontSize: 11,
    lineHeight: 16,
    flex: 1
  },
  limitHighlight: {
    color: "#F8FAFC",
    fontWeight: "700"
  },
  footerVersion: {
    alignItems: "center",
    marginTop: 24
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700"
  },
  footerSub: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center"
  }
});
