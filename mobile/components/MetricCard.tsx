/**
 * SILAGEGUARD AI V4 — Industrial MetricCard Component
 * Displays precision sensor telemetry with threshold status, range indicators,
 * and high contrast visibility for field inspection.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  status: "SAFE" | "CAUTION" | "UNSAFE" | "NEUTRAL";
  optimalRange?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  status,
  optimalRange,
  icon,
  subtitle,
}) => {
  const { theme, largeTypography } = useAppStore();

  const getStatusColor = () => {
    switch (status) {
      case "SAFE":
        return theme.safe;
      case "CAUTION":
        return theme.caution;
      case "UNSAFE":
        return theme.unsafe;
      default:
        return theme.textMuted;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value} ${unit}, status: ${status}`}
    >
      {/* Top Status Stripe */}
      <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />

      <View style={styles.header}>
        <View style={styles.labelContainer}>
          {icon}
          <Text
            style={[
              styles.label,
              {
                color: theme.textSecondary,
                fontSize: largeTypography ? 14 : 12,
                marginLeft: icon ? SPACING.xs : 0,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            {
              color: theme.text,
              fontSize: largeTypography ? 28 : 24,
            },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.unit,
            {
              color: theme.textMuted,
              fontSize: largeTypography ? 14 : 12,
            },
          ]}
        >
          {unit}
        </Text>
      </View>

      {optimalRange ? (
        <Text
          style={[
            styles.range,
            {
              color: theme.textMuted,
              fontSize: largeTypography ? 12 : 11,
            },
          ]}
        >
          Optimal: {optimalRange}
        </Text>
      ) : null}

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.textSecondary,
              fontSize: largeTypography ? 12 : 11,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    position: "relative",
    overflow: "hidden",
    minWidth: 130,
    flex: 1,
  },
  statusStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: SPACING.xs,
  },
  value: {
    fontWeight: "800",
  },
  unit: {
    marginLeft: 4,
    fontWeight: "600",
  },
  range: {
    marginTop: 4,
  },
  subtitle: {
    marginTop: 2,
    fontStyle: "italic",
  },
});
