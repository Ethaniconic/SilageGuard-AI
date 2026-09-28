/**
 * SILAGEGUARD AI V4 — Industrial StatusCard Component
 * Displays system status, probe health, calibration warnings, or hardware connection badges.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

export interface StatusCardProps {
  title: string;
  description?: string;
  status: "success" | "warning" | "error" | "info" | "neutral";
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  description,
  status,
  icon,
  actionText,
  onAction,
  style,
}) => {
  const { theme, largeTypography } = useAppStore();

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return theme.safe;
      case "warning":
        return theme.caution;
      case "error":
        return theme.unsafe;
      case "info":
        return theme.accent;
      default:
        return theme.textMuted;
    }
  };

  const color = getStatusColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        style,
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: color }]} />

      <View style={styles.contentRow}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontSize: largeTypography ? 16 : 14,
              },
            ]}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                styles.description,
                {
                  color: theme.textSecondary,
                  fontSize: largeTypography ? 13 : 12,
                },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {actionText && onAction ? (
          <TouchableOpacity
            onPress={onAction}
            style={[styles.actionBtn, { borderColor: color }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color }]}>{actionText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    position: "relative",
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
  },
  description: {
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginLeft: SPACING.sm,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
