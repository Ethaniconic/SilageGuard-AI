import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function HealthStatusCard({
  batchId = "SG-BATCH-01",
  cropType = "Corn Silage",
  healthState = "GOOD",
  lastChecked = "Today, 10:30 AM",
  trend = "Stable",
  observationsCount = 4,
  warningMessage = null,
  onPress,
}) {
  const { theme, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  const getTranslatedCrop = (crop) => {
    if (!crop) return t("cropCorn");
    const lower = String(crop).toLowerCase();
    if (lower.includes("corn") || lower.includes("maize")) return t("cropCorn");
    if (lower.includes("alfalfa") || lower.includes("lucerne")) return t("cropAlfalfa");
    if (lower.includes("grass")) return t("cropGrass");
    if (lower.includes("mixed")) return t("cropMixed");
    if (lower.includes("sorghum") || lower.includes("jowar")) return t("cropSorghum");
    return crop;
  };

  const getTranslatedTrend = (trendStr) => {
    if (!trendStr) return t("trendStable");
    if (trendStr === "Baseline established") return t("trendBaseline");
    if (trendStr === "Stable") return t("trendStable");
    if (trendStr === "Deteriorating") return t("trendDeteriorating");
    if (trendStr === "Watch Shift") return t("trendWatchShift");
    return trendStr;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: radius.large,
          padding: spacing.lg,
          marginHorizontal: spacing.lg,
          marginVertical: spacing.sm,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }]}>
            {t("activeSilageBatch")}
          </Text>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginTop: 4, marginBottom: 2 }]}>
            {batchId}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary }]}>
            {getTranslatedCrop(cropType)}
          </Text>
        </View>
        <StatusBadge status={healthState} size="large" />
      </View>

      {warningMessage ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.watchBg,
              borderColor: theme.watchBorder,
              borderRadius: radius.medium,
              marginTop: spacing.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.bodyBold, { color: theme.watch }]}>
            ⚠ {t("earlyWarning")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textPrimary, marginTop: 4 }]}>
            {warningMessage}
          </Text>
        </View>
      ) : null}

      <View style={[styles.statsRow, { borderTopColor: theme.borderSubtle, marginTop: spacing.md + 4, paddingTop: spacing.md }]}>
        <View style={styles.statItem}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>{t("lastChecked")}</Text>
          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginTop: 4 }]}>
            {lastChecked}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>{t("trend")}</Text>
          <Text style={[typography.bodyBold, { color: theme.good, marginTop: 4 }]}>
            {getTranslatedTrend(trend)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[typography.caption, { color: theme.textMuted }]}>{t("observations")}</Text>
          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginTop: 4 }]}>
            {observationsCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  warningBox: {
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    flexWrap: "nowrap",
  },
  statItem: {
    flex: 1,
    paddingRight: 6,
  },
});
