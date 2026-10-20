import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";

export function OfflineBanner({ isOnline = false, pendingCount = 0 }) {
  const { theme, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isOnline ? theme.goodBg : theme.offlineBg,
          borderColor: isOnline ? theme.goodBorder : theme.offlineBorder,
          borderRadius: radius.medium,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <View style={styles.dotRow}>
        <View
          style={[
            styles.dot,
            { backgroundColor: isOnline ? theme.good : theme.offline },
          ]}
        />
        <Text
          style={[
            typography.caption,
            { color: isOnline ? theme.good : theme.textSecondary, fontWeight: "700" },
          ]}
        >
          {isOnline ? t("cloudConnected") : t("operatingOffline")}
        </Text>
      </View>
      {pendingCount > 0 ? (
        <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
          {pendingCount} {t("queuedForSync")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
