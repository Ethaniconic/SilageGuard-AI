/**
 * SILAGEGUARD AI V4 — Farmer Quality Metric Card with Animated Progress Meter
 * Large high-contrast display designed for quick agronomic triage under bright outdoor sunlight.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";

interface Props {
  label: string;
  value: number | string;
  displayValue?: string;
  total?: number;
  percentage?: number;
  status?: "safe" | "caution" | "unsafe" | "neutral";
  statusText?: string;
  subtitle?: string;
  icon?: string;
}

export const QualityMeter: React.FC<Props> = ({
  label,
  value,
  displayValue,
  total = 100,
  percentage,
  status = "safe",
  statusText,
  subtitle,
  icon,
}) => {
  const { theme } = useTheme();

  const calcPercent = percentage !== undefined
    ? percentage
    : typeof value === "number"
    ? Math.min(100, Math.max(0, (value / total) * 100))
    : 75;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: calcPercent,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [calcPercent]);

  const color =
    status === "safe"
      ? theme.safe
      : status === "caution"
      ? theme.caution
      : status === "unsafe"
      ? theme.unsafe
      : theme.primary;

  const bgColor =
    status === "safe"
      ? theme.safeBg
      : status === "caution"
      ? theme.cautionBg
      : status === "unsafe"
      ? theme.unsafeBg
      : theme.surfaceElevated;

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

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
      {/* Top Row: Icon + Label + Status Pill */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          {icon && (
            <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
              <AppIcon name={icon as any} size={15} color={color} />
            </View>
          )}
          <Text
            style={[styles.label, { color: theme.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>

        {statusText && (
          <View style={[styles.statusPill, { backgroundColor: bgColor, borderColor: color }]}>
            <Text style={[styles.statusPillText, { color }]}>{statusText}</Text>
          </View>
        )}
      </View>

      {/* Main Big Metric */}
      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: theme.text }]}>
          {displayValue || value}
        </Text>
      </View>

      {/* Animated Visual Fill Bar */}
      <View style={[styles.trackBar, { backgroundColor: theme.surfaceElevated }]}>
        <Animated.View
          style={[
            styles.fillBar,
            {
              width: widthInterpolation,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {/* Subtitle / Context Note */}
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 12,
    flex: 1,
    minWidth: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 70,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    flexShrink: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "center",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  valueRow: {
    marginBottom: 8,
  },
  valueText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  trackBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  fillBar: {
    height: "100%",
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
});
