/**
 * SILAGEGUARD AI V3 — Bottom Navigation Bar
 * Industrial agricultural bottom navigation tabs:
 *   - Home (/home)
 *   - Scan (/camera)
 *   - History (/history)
 *   - Insights (/insights)
 *   - Settings (/settings)
 * 
 * Includes outdoor high-contrast active states, sharp industrial styling, and safe-area insets.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { AppIcon, IconName } from "./AppIcon";
import { safeNavigate } from "../utils/navigation";
import { t, TranslationKey } from "../utils/i18n";

interface TabItem {
  key: string;
  labelKey: TranslationKey;
  route: string;
  icon: IconName;
  isPrimary?: boolean;
}

const TABS: TabItem[] = [
  { key: "home", labelKey: "home", route: "/home", icon: "home" },
  { key: "history", labelKey: "history", route: "/history", icon: "history" },
  { key: "scan", labelKey: "scan", route: "/camera", icon: "camera", isPrimary: true },
  { key: "settings", labelKey: "settings", route: "/settings", icon: "settings" }
];

export const BottomNavBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language } = useAppStore();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
          paddingBottom: Math.max(insets.bottom, 8) + 4
        }
      ]}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.route;

        if (tab.isPrimary) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.primaryTab,
                {
                  backgroundColor: theme.accent,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={() => {
                safeNavigate(router, tab.route, pathname, false);
              }}
              activeOpacity={0.8}
            >
              <AppIcon name={tab.icon} size={20} color="#0B130E" strokeWidth={2.5} />
              <Text style={styles.primaryLabel}>{t(tab.labelKey, language).toUpperCase()}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              safeNavigate(router, tab.route, pathname, true);
            }}
            activeOpacity={0.7}
          >
            <AppIcon
              name={tab.icon}
              size={18}
              color={isActive ? theme.accent : theme.textMuted}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? theme.accent : theme.textMuted,
                  fontWeight: isActive ? "800" : "600"
                }
              ]}
            >
              {t(tab.labelKey, language)}
            </Text>
            {isActive && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: theme.accent }
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative"
  },
  primaryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    minWidth: 64,
    borderWidth: 1,
    borderColor: "#10B981"
  },
  primaryLabel: {
    color: "#0B130E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 1
  }
});
