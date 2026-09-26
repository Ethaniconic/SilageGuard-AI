/**
 * SILAGEGUARD AI — Global Top Navigation Header
 * Features:
 * - Safe area inset padding to prevent notification bar / notch clipping
 * - Dark / Light theme toggle switch button
 * - Offline Status Badge
 * - Connected Probe Pill with real battery status
 * - Sharp industrial border radii
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore, useTheme } from "../features/ble/bleManager";

interface Props {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<Props> = ({ title, showBack = false }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bleStatus, telemetry } = useAppStore();
  const { theme, isDark, toggleTheme } = useTheme();

  const isConnected = bleStatus === "CONNECTED";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16) + 8,
          backgroundColor: theme.background,
          borderBottomColor: theme.cardBorder
        }
      ]}
    >
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderRadius: theme.radiusMd
              }
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.backArrow, { color: theme.text }]}>?</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.brandSubtitle, { color: theme.accent }]}>
            SILAGEGUARD AI • SIH26111
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Theme Toggle Button (Light/Dark mode) */}
        <TouchableOpacity
          style={[
            styles.themeToggle,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Dark / Light Theme"
        >
          <Text style={styles.themeIcon}>{isDark ? "??" : "??"}</Text>
        </TouchableOpacity>

        {/* Offline Badge */}
        <View
          style={[
            styles.offlineBadge,
            {
              backgroundColor: theme.safeBg,
              borderColor: theme.safeBorder,
              borderRadius: theme.radiusSm
            }
          ]}
        >
          <Text style={[styles.offlineDot, { color: theme.safe }]}>?</Text>
          <Text style={[styles.offlineText, { color: theme.safe }]}>OFFLINE</Text>
        </View>

        {/* Probe Battery & Status */}
        <TouchableOpacity
          style={[
            styles.probePill,
            { borderRadius: theme.radiusSm },
            isConnected
              ? { backgroundColor: theme.accent + "22", borderColor: theme.accent }
              : { backgroundColor: theme.subtle, borderColor: theme.cardBorder }
          ]}
          onPress={() => router.push("/ble" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.probeIcon}>{isConnected ? "?" : "?"}</Text>
          <Text style={[styles.probeText, { color: theme.text }]}>
            {isConnected && telemetry.battery !== null ? `${telemetry.battery}%` : "PROBE"}
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  backButton: {
    marginRight: 10,
    width: 36,
    height: 36,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  backArrow: {
    fontSize: 18,
    fontWeight: "900"
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  themeToggle: {
    width: 34,
    height: 34,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6
  },
  themeIcon: {
    fontSize: 14
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6
  },
  offlineDot: {
    fontSize: 8,
    marginRight: 3
  },
  offlineText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  probePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1
  },
  probeIcon: {
    fontSize: 10,
    marginRight: 3
  },
  probeText: {
    fontSize: 10,
    fontWeight: "800"
  }
});
