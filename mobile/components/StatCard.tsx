/**
 * SILAGEGUARD AI — Metric Statistic Card
 * Clean agricultural dashboard tile for scan counts, quality ratios, and battery levels.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME_COLORS } from "../utils/constants";

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
  accentColor = THEME_COLORS.primary
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>

      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 14,
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 6,
    minWidth: 135
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  icon: {
    fontSize: 16,
    marginRight: 6
  },
  label: {
    color: THEME_COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  value: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  subtext: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2
  }
});
