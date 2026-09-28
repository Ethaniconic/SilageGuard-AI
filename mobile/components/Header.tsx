/**
 * SILAGEGUARD AI — Global Top Navigation Header
 * Features:
 * - Clean industry-grade brand title: "SilageGuard AI" (No "Silage Scanning", No "SIH26111")
 * - Safe area inset padding to prevent notification bar / notch clipping
 * - Vector SVG icons for theme toggle, back navigation, offline status, and BLE
 * - Redirection guard: clicking probe option redirects once only (no multiple pushes)
 * - Sharp industrial border radii
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";
import { safeNavigate, safeGoBack } from "../utils/navigation";

interface Props {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
}

export const Header: React.FC<Props> = ({
  title,
  showBack = false,
  onBack,
  fallbackRoute = "/home"
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { bleStatus, telemetry } = useAppStore();
  const { theme, isDark, toggleTheme } = useTheme();

  const isConnected = bleStatus === "CONNECTED";
  const isOnBleScreen = pathname === "/ble";

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    safeGoBack(router, fallbackRoute);
  };

  const handleProbePress = () => {
    // Once on the probe screen, no further duplicate redirections
    safeNavigate(router, "/ble", pathname);
  };

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
                borderRadius: theme.radiusSm
              }
            ]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <AppIcon name="arrow-back" size={16} color={theme.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: theme.text }]}>SilageGuard AI</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Theme Toggle Button (Light/Dark mode) */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusSm
            }
          ]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Dark / Light Theme"
        >
          <AppIcon
            name={isDark ? "sun" : "moon"}
            size={16}
            color={isDark ? theme.caution : theme.accent}
          />
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
          <AppIcon name="cloud-offline" size={11} color={theme.safe} strokeWidth={2.2} />
          <Text style={[styles.offlineText, { color: theme.safe }]}>OFFLINE</Text>
        </View>

        {/* Probe Battery & Status */}
        <TouchableOpacity
          style={[
            styles.probePill,
            { borderRadius: theme.radiusSm },
            isConnected
              ? { backgroundColor: theme.accent + "1A", borderColor: theme.accent }
              : { backgroundColor: theme.card, borderColor: theme.cardBorder },
            isOnBleScreen && { opacity: 0.85 }
          ]}
          onPress={handleProbePress}
          activeOpacity={isOnBleScreen ? 1 : 0.8}
        >
          <AppIcon
            name={isConnected ? "bluetooth-connected" : "bluetooth"}
            size={12}
            color={isConnected ? theme.accent : theme.textMuted}
          />
          <Text
            style={[
              styles.probeText,
              { color: isConnected ? theme.accent : theme.textMuted }
            ]}
          >
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
    width: 34,
    height: 34,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 6
  },
  offlineText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 4
  },
  probePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1
  },
  probeText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4
  }
});
