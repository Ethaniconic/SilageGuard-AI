import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

export function MetricCard({ label, value, unit, status = "NORMAL", hint }) {
  const { theme, radius, spacing, typography, isSmallDevice } = useTheme();

  const getStatusColor = () => {
    if (status === "ALERT") return theme.highRisk;
    if (status === "WARNING" || status === "BORDERLINE") return theme.watch;
    if (status === "NORMAL") return theme.good;
    return theme.textSecondary;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: radius.medium,
          padding: isSmallDevice ? spacing.xs + 3 : spacing.sm + 2,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[typography.caption, { color: theme.textMuted, fontSize: isSmallDevice ? 10 : 12 }]}
      >
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          numberOfLines={1}
          style={[
            typography.screenTitle,
            {
              color: getStatusColor(),
              fontWeight: "700",
              fontSize: isSmallDevice ? 18 : 22,
              lineHeight: isSmallDevice ? 22 : 26,
            },
          ]}
        >
          {value !== null && value !== undefined ? value : "--"}
        </Text>
        {unit ? (
          <Text
            style={[
              typography.secondary,
              {
                color: theme.textSecondary,
                marginLeft: 2,
                marginBottom: 2,
                fontSize: isSmallDevice ? 11 : 13,
              },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            typography.caption,
            { color: theme.textMuted, marginTop: 2, fontSize: isSmallDevice ? 9 : 11 },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    margin: 3,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 2,
    flexWrap: "nowrap",
  },
});
