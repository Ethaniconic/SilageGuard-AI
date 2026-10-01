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
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";
import { safeNavigate, safeGoBack } from "../utils/navigation";
import { LanguageCode } from "../utils/constants";
import { t } from "../utils/i18n";

const LANG_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
];

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
  const { bleStatus, telemetry, language, setLanguage } = useAppStore();
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
    safeNavigate(router, "/ble", pathname);
  };

  const cycleLanguage = () => {
    const currentIndex = LANG_OPTIONS.findIndex((l) => l.code === language);
    const nextIndex = (currentIndex + 1) % LANG_OPTIONS.length;
    setLanguage(LANG_OPTIONS[nextIndex].code);
  };

  const currentLangLabel = LANG_OPTIONS.find((l) => l.code === language)?.label || "EN";

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
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => safeNavigate(router, "/home", pathname)}
          activeOpacity={0.8}
        >
          <Image
            source={require("../assets/icon-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>SilageGuard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightRow}>
        {/* Instant Farmer Language Switcher */}
        <TouchableOpacity
          style={[
            styles.langPill,
            {
              backgroundColor: theme.primary + "1A",
              borderColor: theme.primary,
              borderRadius: theme.radiusSm
            }
          ]}
          onPress={cycleLanguage}
          activeOpacity={0.7}
          accessibilityLabel="Switch Language"
        >
          <AppIcon name="settings" size={12} color={theme.primary} />
          <Text style={[styles.langText, { color: theme.primary }]}>
            {currentLangLabel}
          </Text>
        </TouchableOpacity>

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
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    width: "100%",
    maxWidth: "100%",
    zIndex: 100
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 6
  },
  backButton: {
    marginRight: 6,
    width: 32,
    height: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
    flexShrink: 1
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0
  },
  iconButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4
  },
  probePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1
  },
  probeText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 3
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0
  },
  logoImage: {
    width: 24,
    height: 24,
    marginRight: 6,
    borderRadius: 4
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    marginRight: 4
  },
  langText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 3
  }
});
