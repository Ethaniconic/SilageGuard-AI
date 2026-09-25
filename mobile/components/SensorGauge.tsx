/**
 * SILAGEGUARD AI — Sensor Telemetry Gauge & Metric Tile
 * Displays pH, Moisture, Core Temp, and Delta T with agronomic safe-band indicators.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  label: string;
  value: number;
  unit: string;
  targetRange: string;
  status: "safe" | "caution" | "unsafe";
  iconText: string;
}

export const SensorGauge: React.FC<Props> = ({
  label,
  value,
  unit,
  targetRange,
  status,
  iconText
}) => {
  const statusColor =
    status === "safe"
      ? THEME_COLORS.safe
      : status === "caution"
      ? THEME_COLORS.caution
      : THEME_COLORS.unsafe;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.icon}>{iconText}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: statusColor }]}>{value.toFixed(1)}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.targetLabel}>Target: {targetRange}</Text>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {status.toUpperCase()}
        </Text>
      </View>
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
    marginVertical: 6,
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  icon: {
    fontSize: 16,
    marginRight: 6
  },
  label: {
    color: THEME_COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 8
  },
  value: {
    fontSize: 26,
    fontWeight: "900"
  },
  unit: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.07)",
    paddingTop: 6,
    marginTop: 2
  },
  targetLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600"
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  }
});
