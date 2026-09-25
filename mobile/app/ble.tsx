/**
 * SCREEN 3 — BLE PROBE CONNECTION & LIVE SENSOR TELEMETRY STREAM
 * - Scans and pairs with ESP32-S3 Silage Probe (UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b)
 * - Shows signal strength (RSSI) and connection state
 * - Live 1 Hz sensor stream: pH, Moisture, Core Temp, Ambient Temp, Delta T, Battery
 * - Built-in Simulation Presets (Safe, Caution, Unsafe) for judge testing
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import { Header } from "../components/Header";
import { SensorGauge } from "../components/SensorGauge";
import { useAppStore } from "../features/ble/bleManager";
import { THEME_COLORS, DEMO_PRESETS } from "../utils/constants";

export default function BleScreen() {
  const {
    bleStatus,
    statusMessage,
    telemetry,
    connectProbe,
    disconnectProbe,
    demoPreset,
    setDemoPreset
  } = useAppStore();

  const isConnected = bleStatus === "CONNECTED";
  const isScanning = bleStatus === "SCANNING" || bleStatus === "CONNECTING";

  const deltaTemp = Number((telemetry.temp - telemetry.ambient).toFixed(1));

  // Determine agronomic status badges for gauges
  const phStatus =
    telemetry.ph >= 3.8 && telemetry.ph <= 4.2
      ? "safe"
      : telemetry.ph <= 4.8
      ? "caution"
      : "unsafe";

  const moistStatus =
    telemetry.moisture >= 60.0 && telemetry.moisture <= 68.0
      ? "safe"
      : telemetry.moisture <= 72.0
      ? "caution"
      : "unsafe";

  const tempStatus =
    deltaTemp <= 3.0 ? "safe" : deltaTemp <= 8.0 ? "caution" : "unsafe";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="ESP32-S3 PROBE" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Device Status Card */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceIconBadge}>
                <Text style={styles.deviceIconText}>📡</Text>
              </View>
              <View>
                <Text style={styles.deviceName}>SilageGuard-Probe</Text>
                <Text style={styles.deviceSub}>
                  UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
                </Text>
              </View>
            </View>

            <View style={styles.rssiBadge}>
              <Text style={styles.rssiIcon}>📶</Text>
              <Text style={styles.rssiText}>{telemetry.rssi || -58} dBm</Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>{statusMessage}</Text>

          {/* Connect / Disconnect Action */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isConnected ? styles.disconnectBtn : styles.connectBtn,
              isScanning && styles.scanningBtn
            ]}
            onPress={isConnected ? disconnectProbe : connectProbe}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator color="#090D16" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>
                {isConnected ? "DISCONNECT PROBE" : "PAIR & CONNECT ESP32-S3"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo Mode Preset Switcher */}
        <View style={styles.simulationCard}>
          <Text style={styles.simTitle}>🎯 HARDWARE DEMO STREAM INJECTOR</Text>
          <Text style={styles.simSubtitle}>
            Simulate realistic agronomic sensor telemetry kinetics instantly:
          </Text>

          <View style={styles.presetRow}>
            {(["SAFE", "CAUTION", "UNSAFE"] as const).map((preset) => {
              const isSelected = demoPreset === preset;
              const accent =
                preset === "SAFE"
                  ? THEME_COLORS.safe
                  : preset === "CAUTION"
                  ? THEME_COLORS.caution
                  : THEME_COLORS.unsafe;

              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetBtn,
                    isSelected && { borderColor: accent, backgroundColor: "rgba(255, 255, 255, 0.08)" }
                  ]}
                  onPress={() => setDemoPreset(preset)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetBtnText, isSelected && { color: accent }]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Live Telemetry Display */}
        <View style={styles.telemetrySection}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>LIVE SENSOR STREAM (1 Hz)</Text>
            <View style={styles.livePulse}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>STREAMING</Text>
            </View>
          </View>

          <View style={styles.gaugeGrid}>
            <View style={styles.gaugeRow}>
              <SensorGauge
                label="Acidity (pH)"
                value={telemetry.ph}
                unit="pH"
                targetRange="3.8 – 4.2"
                status={phStatus}
                iconText="🧪"
              />
              <SensorGauge
                label="Moisture"
                value={telemetry.moisture}
                unit="%"
                targetRange="60 – 68%"
                status={moistStatus}
                iconText="💧"
              />
            </View>

            <View style={styles.gaugeRow}>
              <SensorGauge
                label="Core Temp"
                value={telemetry.temp}
                unit="°C"
                targetRange="< 30°C"
                status={tempStatus}
                iconText="🌡️"
              />
              <SensorGauge
                label="Ambient Temp"
                value={telemetry.ambient}
                unit="°C"
                targetRange="Ref"
                status="safe"
                iconText="☀️"
              />
            </View>

            <View style={styles.gaugeRow}>
              <SensorGauge
                label="Delta Temp (ΔT)"
                value={deltaTemp}
                unit="°C Rise"
                targetRange="< 3.0°C"
                status={tempStatus}
                iconText="🔥"
              />
              <SensorGauge
                label="Probe Battery"
                value={telemetry.battery}
                unit="%"
                targetRange="> 20%"
                status={telemetry.battery > 20 ? "safe" : "unsafe"}
                iconText="🔋"
              />
            </View>
          </View>
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
  deviceCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 18,
    marginBottom: 16
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  deviceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  deviceIconText: {
    fontSize: 22
  },
  deviceName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800"
  },
  deviceSub: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2
  },
  rssiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155"
  },
  rssiIcon: {
    fontSize: 11,
    marginRight: 4
  },
  rssiText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700"
  },
  statusDescription: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    marginVertical: 14
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  connectBtn: {
    backgroundColor: THEME_COLORS.primary
  },
  disconnectBtn: {
    backgroundColor: "#EF4444"
  },
  scanningBtn: {
    backgroundColor: "#64748B"
  },
  actionBtnText: {
    color: "#090D16",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  simulationCard: {
    backgroundColor: "rgba(19, 28, 46, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 16
  },
  simTitle: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  simSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  presetBtn: {
    flex: 1,
    backgroundColor: THEME_COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: "center"
  },
  presetBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800"
  },
  telemetrySection: {
    marginTop: 8
  },
  telemetryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4
  },
  telemetryTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  livePulse: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME_COLORS.safe,
    marginRight: 6
  },
  liveText: {
    color: THEME_COLORS.safe,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  gaugeGrid: {
    marginHorizontal: -4
  },
  gaugeRow: {
    flexDirection: "row",
    marginBottom: 4
  }
});
