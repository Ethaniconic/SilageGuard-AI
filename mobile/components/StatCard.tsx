/**
 * SILAGEGUARD AI — Metric Statistic Card
 * Clean agricultural dashboard tile with theme support and sharp modern corners.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../features/ble/bleManager";

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  accentColor?: string;
}

export const StatCard: React.FC<Props> = ({
  label,
  value,
  subtext,
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
        <Text style={styles.icon}>{icon}</Text>
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
    marginBottom: 4
  },
  icon: {
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
