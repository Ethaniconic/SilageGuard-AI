/**
 * SCREEN 3 - BLE PROBE TELEMETRY & HARDWARE CONTROL
 * Connects to ESP32-S3 Agricultural Probe via BLE GATT (UUID: 4fafc201...)
 * Displays live sensor telemetry gauges with agronomic status bands.
 * Clean empty state when disconnected (No dummy values!)
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { SensorGauge } from "../components/SensorGauge";
import { AppIcon } from "../components/AppIcon";
import { useAppStore, useTheme } from "../features/ble/bleManager";

export default function BleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    bleStatus,
    statusMessage,
    telemetry,
    connectProbe,
    disconnectProbe,
    isDemoMode,
    setDemoMode,
    demoPreset,
    setDemoPreset
  } = useAppStore();

  const isConnected = bleStatus === "CONNECTED";
  const isScanning = bleStatus === "SCANNING" || bleStatus === "CONNECTING";

  const deltaTemp =
    telemetry.temp !== null && telemetry.ambient !== null
      ? Number((telemetry.temp - telemetry.ambient).toFixed(1))
      : null;

  // Determine agronomic status badges for gauges
  const phStatus =
    telemetry.ph === null
      ? "disconnected"
      : telemetry.ph >= 3.8 && telemetry.ph <= 4.2
      ? "safe"
      : telemetry.ph <= 4.8
      ? "caution"
      : "unsafe";

  const moistStatus =
    telemetry.moisture === null
      ? "disconnected"
      : telemetry.moisture >= 60.0 && telemetry.moisture <= 68.0
      ? "safe"
      : telemetry.moisture <= 72.0
      ? "caution"
      : "unsafe";

  const tempStatus =
    deltaTemp === null
      ? "disconnected"
      : deltaTemp <= 3.0
      ? "safe"
      : deltaTemp <= 8.0
      ? "caution"
      : "unsafe";

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={true} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Status Card */}
        <View
          style={[
            styles.deviceCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <View
                style={[
                  styles.deviceIconBadge,
                  { backgroundColor: theme.primary + "1A", borderRadius: theme.radiusSm }
                ]}
              >
                <AppIcon name="probe" size={24} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.deviceName, { color: theme.text }]}>
                  SilageGuard-Probe
                </Text>
                <Text style={[styles.deviceSub, { color: theme.textMuted }]}>
                  UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
                </Text>
                <View
                  style={[
                    styles.modeBadge,
                    { borderRadius: theme.radiusSm },
                    telemetry.mode === "REAL_SENSOR"
                      ? { backgroundColor: theme.safeBg, borderColor: theme.safeBorder }
                      : { backgroundColor: theme.surface, borderColor: theme.cardBorder }
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      {
                        color:
                          telemetry.mode === "REAL_SENSOR"
                            ? theme.safe
                            : theme.textMuted
                      }
                    ]}
                  >
                    MODE: {telemetry.mode}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.statusIndicator,
                {
                  borderRadius: theme.radiusSm,
                  backgroundColor: isConnected ? theme.safeBg : theme.surface,
                  borderWidth: 1,
                  borderColor: isConnected ? theme.safeBorder : theme.cardBorder
                }
              ]}
            >
              <Text
                style={[
                  styles.statusIndicatorText,
                  { color: isConnected ? theme.safe : theme.textMuted }
                ]}
              >
                {bleStatus}
              </Text>
            </View>
          </View>

          {/* Connect / Disconnect Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isConnected ? theme.unsafe : theme.primary,
                borderRadius: theme.radiusSm
              }
            ]}
            onPress={isConnected ? disconnectProbe : () => connectProbe()}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator color="#090D16" />
            ) : (
              <View style={styles.actionBtnRow}>
                <AppIcon
                  name={isConnected ? "close" : "bluetooth"}
                  size={15}
                  color="#090D16"
                  strokeWidth={2.4}
                />
                <Text style={styles.actionButtonText}>
                  {isConnected ? "DISCONNECT PROBE" : "PAIR & CONNECT VIA BLE"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.statusMsg, { color: theme.textMuted }]}>
            {statusMessage}
          </Text>
        </View>

        {/* Demo Preset Selector */}
        <View
          style={[
            styles.demoSection,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <View style={styles.demoHeaderRow}>
            <Text style={[styles.demoTitle, { color: theme.text }]}>
              SIMULATION / DEMO BENCHMARK PRESETS
            </Text>
            <TouchableOpacity
              style={[
                styles.demoTogglePill,
                { borderRadius: theme.radiusSm },
                isDemoMode
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.surface, borderColor: theme.cardBorder }
              ]}
              onPress={() => setDemoMode(!isDemoMode)}
            >
              <Text
                style={[
                  styles.demoToggleText,
                  { color: isDemoMode ? "#FFFFFF" : theme.textMuted }
                ]}
              >
                {isDemoMode ? "DEMO ACTIVE" : "REAL HARDWARE"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetsRow}>
            {(["SAFE", "CAUTION", "UNSAFE"] as const).map((preset) => {
              const isActive = demoPreset === preset;
              const color =
                preset === "SAFE"
                  ? theme.safe
                  : preset === "CAUTION"
                  ? theme.caution
                  : theme.unsafe;

              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetBtn,
                    {
                      borderRadius: theme.radiusSm,
                      backgroundColor: isActive ? color + "22" : theme.surface,
                      borderColor: isActive ? color : theme.cardBorder
                    }
                  ]}
                  onPress={() => setDemoPreset(preset)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      { color: isActive ? color : theme.textMuted }
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Live Gauges Section */}
        <View
          style={[
            styles.gaugesContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.gaugesSectionTitle, { color: theme.text }]}>
            LIVE SENSOR STREAM
          </Text>

          <View style={styles.gaugesGrid}>
            <View style={styles.gaugeRow}>
              <SensorGauge
                label="pH Acidity"
                value={telemetry.ph}
                unit="pH"
                targetRange="3.8 - 4.2"
                status={phStatus}
                iconName="ph"
              />
              <SensorGauge
                label="Moisture"
                value={telemetry.moisture}
                unit="%"
                targetRange="60 - 68%"
                status={moistStatus}
                iconName="water"
              />
            </View>

            <View style={styles.gaugeRow}>
              <SensorGauge
                label="Core Temp"
                value={telemetry.temp}
                unit="C"
                targetRange="< 30C"
                status={tempStatus}
                iconName="thermometer"
              />
              <SensorGauge
                label="Ambient Temp"
                value={telemetry.ambient}
                unit="C"
                targetRange="Ref"
                status={isConnected ? "safe" : "disconnected"}
                iconName="thermometer"
              />
            </View>

            <View style={styles.gaugeRow}>
              <SensorGauge
                label="Delta Temp"
                value={deltaTemp}
                unit="C Rise"
                targetRange="< 3.0C"
                status={tempStatus}
                iconName="trending-up"
              />
              <SensorGauge
                label="Probe Battery"
                value={telemetry.battery}
                unit="%"
                targetRange="> 20%"
                status={
                  telemetry.battery === null
                    ? "disconnected"
                    : telemetry.battery > 20
                    ? "safe"
                    : "unsafe"
                }
                iconName="battery"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10
  },
  deviceCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 10
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  deviceIconBadge: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "900"
  },
  deviceSub: {
    fontSize: 9,
    fontFamily: "monospace",
    marginTop: 2
  },
  modeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start"
  },
  modeText: {
    fontSize: 9,
    fontWeight: "800"
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  statusIndicatorText: {
    fontSize: 10,
    fontWeight: "800"
  },
  actionButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginVertical: 4
  },
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  actionButtonText: {
    color: "#090D16",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 6
  },
  statusMsg: {
    fontSize: 10,
    marginTop: 6,
    textAlign: "center"
  },
  demoSection: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  demoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: "900"
  },
  demoTogglePill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  demoToggleText: {
    fontSize: 9,
    fontWeight: "800"
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center"
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: "900"
  },
  gaugesContainer: {
    borderWidth: 1,
    padding: 12
  },
  gaugesSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  gaugesGrid: {
    width: "100%"
  },
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
