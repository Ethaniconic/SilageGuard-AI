import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { AppButton } from "./AppButton";
import { StatusBadge } from "./StatusBadge";
import { bleManager } from "../services/ble/bleManager";

export function ProbeConnectionGateway({
  isConnected,
  telemetry,
  onDeviceConnected,
  onDisconnect,
  onProceedToSensors,
  onProceedToVisionOnly,
}) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();

  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleStartBleScan = async () => {
    setIsScanning(true);
    setErrorMessage(null);

    const res = await bleManager.connect();
    setIsScanning(false);

    if (res.success) {
      if (onDeviceConnected) onDeviceConnected();
    } else {
      setErrorMessage(res.error || "No physical ESP32 probe paired.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.lg }]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
            {t("connectProbeTitle")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
            {t("probeSubtitle")}
          </Text>
        </View>
        <StatusBadge
          status={isConnected ? "GOOD" : isScanning ? "WATCH" : "OFFLINE"}
          label={isConnected ? t("hardwareConnected") : isScanning ? t("scanning") : t("noProbe")}
          size="medium"
        />
      </View>

      {/* CONNECTED REAL HARDWARE VIEW */}
      {isConnected ? (
        <View style={[styles.connectedCard, { backgroundColor: theme.goodBg, borderColor: theme.goodBorder, borderRadius: radius.medium, marginTop: spacing.md, padding: spacing.md }]}>
          <View style={styles.topRow}>
            <Text style={{ fontSize: 26, marginRight: 10 }}>📡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: theme.good }]}>
                {t("realProbeConnected")}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>
                {t("deviceIdLabel")}: {telemetry?.probeId || "SILAGE-ESP32-PROBE"} • {t("liveTelemetry")}
              </Text>
            </View>
          </View>

          {/* REAL TELEMETRY DISPLAY */}
          <View style={[styles.streamStrip, { backgroundColor: theme.surface, borderColor: theme.goodBorder, borderRadius: radius.small, marginTop: 10, padding: 10 }]}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary, textAlign: "center" }]}>
              {telemetry?.ph !== null && telemetry?.ph !== undefined
                ? `pH: ${telemetry.ph}  |  Moisture: ${telemetry.moisture}%  |  Temp: ${telemetry.temperature}°C`
                : `Moisture: ${telemetry?.moisture ?? "--"}%  |  Temp: ${telemetry?.temperature ?? "--"}°C`}
            </Text>
            <Text style={[typography.caption, { color: theme.good, textAlign: "center", marginTop: 2, fontWeight: "600" }]}>
              {t("receivingPackets")}
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <AppButton
              title={t("nextReviewSensors")}
              variant="primary"
              size="medium"
              onPress={onProceedToSensors}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDisconnect}
              style={{ marginTop: 12, paddingVertical: 8, alignItems: "center" }}
            >
              <Text style={[typography.caption, { color: theme.highRisk, fontWeight: "700" }]}>
                {t("disconnectRealEsp32")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* DISCONNECTED / REAL SCAN VIEW — DIRECT BLE HARDWARE PROBE */
        <View style={{ marginTop: spacing.md }}>
          <View style={[styles.radarBox, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.medium, padding: spacing.lg, alignItems: "center" }]}>
            {isScanning ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 10 }} />
            ) : (
              <Text style={{ fontSize: 42, marginBottom: 8 }}>📡</Text>
            )}
            <Text style={[typography.bodyBold, { color: theme.textPrimary, textAlign: "center" }]}>
              {isScanning ? t("waitingEsp32Selection") : t("connectRealEsp32Title")}
            </Text>
            <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginTop: 4, lineHeight: 18 }]}>
              {t("genuineEsp32OnlyNotice")}
            </Text>
          </View>

          <AppButton
            title={isScanning ? t("connectingGatt") : t("pairBleProbe")}
            loading={isScanning}
            variant="primary"
            size="large"
            style={{ marginTop: spacing.md }}
            onPress={handleStartBleScan}
          />

          {/* REAL ERROR BANNER (SHOWN WHEN HARDWARE CANNOT BE FOUND) */}
          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: theme.highRiskBg, borderColor: theme.highRiskBorder, borderRadius: radius.small, marginTop: 10, padding: 10 }]}>
              <Text style={[typography.caption, { color: theme.highRisk, textAlign: "center", fontWeight: "600" }]}>
                ⚠️ {errorMessage}
              </Text>
            </View>
          )}

          {/* VISION-ONLY SCREENING OPTION */}
          <View style={[styles.visionOnlyCard, { borderTopColor: theme.borderSubtle, borderTopWidth: 1, marginTop: spacing.xl, paddingTop: spacing.lg }]}>
            <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginBottom: 12 }]}>
              {t("noProbePrompt")}
            </Text>
            <AppButton
              title={t("continueVisionOnly")}
              variant="outline"
              size="medium"
              onPress={onProceedToVisionOnly}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  connectedCard: {
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streamStrip: {
    borderWidth: 1,
  },
  radarBox: {
    borderWidth: 1,
  },
  errorBox: {
    borderWidth: 1,
  },
  visionOnlyCard: {
    alignItems: "center",
  },
});

