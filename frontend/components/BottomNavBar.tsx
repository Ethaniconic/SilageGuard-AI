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
import { useTheme } from "../features/ble/bleManager";
import { AppIcon, IconName } from "./AppIcon";

interface TabItem {
  key: string;
  label: string;
  route: string;
  icon: IconName;
  isPrimary?: boolean;
}

const TABS: TabItem[] = [
  { key: "home", label: "Home", route: "/home", icon: "home" },
  { key: "history", label: "History", route: "/history", icon: "history" },
  { key: "scan", label: "Scan", route: "/camera", icon: "camera", isPrimary: true },
  { key: "insights", label: "Insights", route: "/insights", icon: "analytics" },
  { key: "settings", label: "Settings", route: "/settings", icon: "settings" }
];

export const BottomNavBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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
                if (pathname !== tab.route) {
                  router.push(tab.route as any);
                }
              }}
              activeOpacity={0.8}
            >
              <AppIcon name={tab.icon} size={20} color="#0B130E" strokeWidth={2.5} />
              <Text style={styles.primaryLabel}>SCAN</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              if (pathname !== tab.route) {
                router.push(tab.route as any);
              }
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
              {tab.label}
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
