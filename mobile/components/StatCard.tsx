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
  iconName?: IconName;
  icon?: string;
  accentColor?: string;
}

export const StatCard: React.FC<Props> = ({
  label,
  value,
  subtext,
  iconName,
  icon,
  accentColor
}) => {
  const { theme } = useTheme();
  const activeColor = accentColor || theme.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderRadius: theme.radiusMd
        }
      ]}
    >
      <View style={styles.topRow}>
        {iconName ? (
          <View style={styles.iconWrapper}>
            <AppIcon name={iconName} size={13} color={activeColor} />
          </View>
        ) : icon ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : null}
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      </View>

      <Text style={[styles.value, { color: activeColor }]}>{value}</Text>
      {subtext && <Text style={[styles.subtext, { color: theme.textMuted }]}>{subtext}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 12,
    flex: 1,
    marginHorizontal: 3,
    marginVertical: 4,
    minWidth: 130
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  iconWrapper: {
    marginRight: 6
  },
  iconText: {
    fontSize: 14,
    marginRight: 6
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
  value: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  subtext: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2
  }
});
