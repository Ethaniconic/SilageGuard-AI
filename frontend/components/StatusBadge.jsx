import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";

export function StatusBadge({ status = "GOOD", label, size = "medium" }) {
  const { theme, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  const getColors = () => {
    const s = String(status).toUpperCase();
    if (s === "GOOD" || s === "SAFE") {
      return {
        bg: theme.goodBg,
        border: theme.goodBorder,
        text: theme.good,
        icon: "✓",
        defaultLabel: t("good"),
      };
    }
    if (s === "WATCH" || s === "CAUTION") {
      return {
        bg: theme.watchBg,
        border: theme.watchBorder,
        text: theme.watch,
        icon: "⚠",
        defaultLabel: t("watch"),
      };
    }
    if (s === "HIGH RISK" || s === "HIGH_RISK" || s === "UNSAFE" || s === "ALERT") {
      return {
        bg: theme.highRiskBg,
        border: theme.highRiskBorder,
        text: theme.highRisk,
        icon: "!",
        defaultLabel: t("highRisk"),
      };
    }
    return {
      bg: theme.surfaceSoft,
      border: theme.border,
      text: theme.textSecondary,
      icon: "●",
      defaultLabel: status,
    };
  };

  const c = getColors();
  const displayLabel = label ? (t(label) !== label ? t(label) : label) : c.defaultLabel;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderRadius: radius.small,
          paddingVertical: size === "large" ? spacing.sm : 4,
          paddingHorizontal: size === "large" ? spacing.md : spacing.sm,
        },
      ]}
    >
      <Text style={[styles.icon, { color: c.text }]}>{c.icon}</Text>
      <Text
        style={[
          size === "large" ? typography.bodyBold : typography.caption,
          { color: c.text, fontWeight: "700", marginLeft: 4 },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  icon: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
