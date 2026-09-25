/**
 * SILAGEGUARD AI — Global Top Navigation Header
 * Features Offline Status Badge, Connected Probe Pill, and Back Navigation.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../features/ble/bleManager";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<Props> = ({ title, showBack = false }) => {
  const router = useRouter();
  const { bleStatus, telemetry } = useAppStore();

  const isConnected = bleStatus === "CONNECTED";

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.brandSubtitle}>SILAGEGUARD AI • SIH26111</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Offline Badge */}
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineDot}>●</Text>
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>

        {/* Probe Battery & Status */}
        <TouchableOpacity
          style={[styles.probePill, isConnected ? styles.probeOnline : styles.probeOffline]}
          onPress={() => router.push("/ble" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.probeIcon}>{isConnected ? "⚡" : "✕"}</Text>
          <Text style={styles.probeText}>
            {isConnected ? `${telemetry.battery}%` : "PROBE"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: THEME_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)"
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    marginRight: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME_COLORS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center"
  },
  backArrow: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900"
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  brandSubtitle: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  offlineDot: {
    color: THEME_COLORS.safe,
    fontSize: 10,
    marginRight: 4
  },
  offlineText: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  probePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1
  },
  probeOnline: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#0284C7"
  },
  probeOffline: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderColor: "#475569"
  },
  probeIcon: {
    fontSize: 12,
    marginRight: 4
  },
  probeText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "800"
  }
});
