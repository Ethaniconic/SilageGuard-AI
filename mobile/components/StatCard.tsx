/**
 * SILAGEGUARD AI — Metric Statistic Card
 * Clean agricultural dashboard tile with vector icons, theme support, and sharp modern corners.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon, IconName } from "./AppIcon";

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  subtitle?: string;
  iconName?: IconName;
  icon?: string;
  status?: "safe" | "caution" | "unsafe" | "neutral";
  accentColor?: string;
}

export const StatCard: React.FC<Props> = ({
  label,
  value,
  subtext,
  subtitle,
  iconName,
  icon,
  status,
  accentColor,
}) => {
  const { theme } = useTheme();

  let activeColor = accentColor || theme.primary;
  if (status === "safe") activeColor = theme.safe;
  else if (status === "caution") activeColor = theme.caution;
  else if (status === "unsafe") activeColor = theme.unsafe;
  else if (status === "neutral") activeColor = theme.textMuted;

  const resolvedSubtext = subtitle || subtext;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderRadius: theme.radiusMd,
        },
      ]}
    >
      <View style={styles.topRow}>
        {iconName ? (
          <View style={styles.iconWrapper}>
            <AppIcon name={iconName} size={13} color={activeColor} />
          </View>
        ) : icon && ["camera", "scan", "probe", "bluetooth", "battery", "sun", "moon", "history", "settings", "analytics", "info", "help", "file", "shield"].includes(icon) ? (
          <View style={styles.iconWrapper}>
            <AppIcon name={icon as IconName} size={13} color={activeColor} />
          </View>
        ) : icon ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : null}
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      </View>

      <Text style={[styles.value, { color: activeColor }]}>{value}</Text>
      {resolvedSubtext && (
        <Text style={[styles.subtext, { color: theme.textMuted }]}>
          {resolvedSubtext}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    padding: 14,
    minWidth: 140,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconWrapper: {
    marginRight: 6,
  },
  iconText: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "500",
  },
});
