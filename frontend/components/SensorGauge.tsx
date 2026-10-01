/**
 * SILAGEGUARD AI - Sensor Telemetry Gauge & Metric Tile
 * Displays pH, Moisture, Core Temp with agronomic safe-band indicators.
 * Gracefully renders empty "--" state when probe is disconnected.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon, IconName } from "./AppIcon";

interface Props {
  label: string;
  value: number | null | undefined;
  unit: string;
  targetRange: string;
  status: "safe" | "caution" | "unsafe" | "disconnected";
  iconName?: IconName;
  iconText?: string;
}

export const SensorGauge: React.FC<Props> = ({
  label,
  value,
  unit,
  targetRange,
  status,
  iconName,
  iconText
}) => {
  const { theme } = useTheme();

  const isDisconnected = status === "disconnected" || value === null || value === undefined;

  const statusColor = isDisconnected
    ? theme.textMuted
    : status === "safe"
    ? theme.safe
    : status === "caution"
    ? theme.caution
    : theme.unsafe;

  const displayValue = isDisconnected ? "--" : value.toFixed(1);
  const statusLabel = isDisconnected ? "NO PROBE" : status.toUpperCase();

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
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          {iconName ? (
            <View style={styles.iconWrapper}>
              <AppIcon name={iconName} size={14} color={statusColor} />
            </View>
          ) : iconText ? (
            <Text style={styles.icon}>{iconText}</Text>
          ) : null}
          <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: statusColor }]}>{displayValue}</Text>
        <Text style={[styles.unit, { color: theme.textMuted }]}>{unit}</Text>
      </View>

      <View style={[styles.footerRow, { borderTopColor: theme.cardBorder }]}>
        <Text style={[styles.targetLabel, { color: theme.textMuted }]}>
          Target: {targetRange}
        </Text>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
    flex: 1,
    minWidth: 130,
    marginHorizontal: 3
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
  iconWrapper: {
    marginRight: 6
  },
  icon: {
    fontSize: 14,
    marginRight: 6
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 6
  },
  value: {
    fontSize: 22,
    fontWeight: "900"
  },
  unit: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2
  },
  targetLabel: {
    fontSize: 9,
    fontWeight: "600"
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5
  }
});
