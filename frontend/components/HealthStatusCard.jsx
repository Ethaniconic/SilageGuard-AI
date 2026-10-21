import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function HealthStatusCard({
  batchId = "SG-BATCH-01",
  cropType = "Corn Silage",
  healthState = "GOOD",
  lastChecked = "Today, 10:30 AM",
  trend = "Stable",
  observationsCount = 1,
  warningMessage = null,
  mssiScore = 85,
  twin = null,
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
    if (trendStr === "Improving") return t("trendImproving");
    return trendStr;
  };

  const effectiveMssi = twin?.latest?.mssiScore ?? mssiScore ?? 85;
  const effectiveState = twin?.warningLevel === "HIGH_RISK" ? "HIGH RISK" : twin?.warningLevel === "EARLY_DETERIORATION" || twin?.warningLevel === "WATCH" ? "WATCH" : healthState;
  const effectiveObsCount = twin?.observationCount ?? observationsCount;
  const effectiveWarning = twin?.warningLevel !== "STABLE" && twin?.warningReasons?.length > 0 ? twin.warningReasons[0] : warningMessage;
  const recommendedAction = twin?.recommendedAction;

  const dMssi = twin?.changes?.fromPrevious?.mssi ?? twin?.changes?.fromBaseline?.mssi ?? null;
  const dPh = twin?.changes?.fromPrevious?.ph ?? twin?.changes?.fromBaseline?.ph ?? null;
  const dTemp = twin?.changes?.fromPrevious?.temperature ?? twin?.changes?.fromBaseline?.temperature ?? null;

  const mssiColor = effectiveMssi >= 80 ? theme.good : effectiveMssi >= 65 ? theme.watch : theme.highRisk;
  const mssiBg = effectiveMssi >= 80 ? theme.goodBg : effectiveMssi >= 65 ? theme.watchBg : theme.highRiskBg;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
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
      {/* HEADER ROW */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }]}>
            {t("activeSilageBatch")} • {t("digitalTwinState")}
          </Text>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginTop: 4, marginBottom: 2 }]}>
            {batchId}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary }]}>
            {getTranslatedCrop(cropType)}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <StatusBadge status={effectiveState} size="large" />
          <View style={[styles.mssiPill, { backgroundColor: mssiBg, borderColor: mssiColor, marginTop: 6 }]}>
            <Text style={[typography.caption, { color: mssiColor, fontWeight: "800", fontSize: 11 }]}>
              MSSI {effectiveMssi}
            </Text>
          </View>
        </View>
      </View>

      {/* LONGITUDINAL TREND SIGNALS (When 2+ observations exist) */}
      {effectiveObsCount >= 2 && (dMssi !== null || dPh !== null || dTemp !== null) && (
        <View style={[styles.trendPillsRow, { backgroundColor: theme.surfaceSoft, borderColor: theme.borderSubtle, borderRadius: radius.medium, marginTop: spacing.md, padding: spacing.sm }]}>
          <Text style={[typography.caption, { color: theme.textMuted, marginRight: 6, fontWeight: "700" }]}>
            {t("trend")}:
          </Text>
          {dMssi !== null && (
            <View style={styles.miniPill}>
              <Text style={[styles.miniPillText, { color: dMssi < 0 ? theme.highRisk : theme.good }]}>
                {dMssi > 0 ? "↑" : dMssi < 0 ? "↓" : "~"} MSSI {dMssi > 0 ? `+${dMssi}` : dMssi}
              </Text>
            </View>
          )}
          {dPh !== null && (
            <View style={styles.miniPill}>
              <Text style={[styles.miniPillText, { color: dPh > 0 ? theme.watch : theme.good }]}>
                {dPh > 0 ? "↑" : dPh < 0 ? "↓" : "~"} pH {dPh > 0 ? `+${dPh.toFixed(2)}` : dPh.toFixed(2)}
              </Text>
            </View>
          )}
          {dTemp !== null && (
            <View style={styles.miniPill}>
              <Text style={[styles.miniPillText, { color: dTemp > 0 ? theme.highRisk : theme.good }]}>
                {dTemp > 0 ? "↑" : dTemp < 0 ? "↓" : "~"} {dTemp > 0 ? `+${dTemp.toFixed(1)}` : dTemp.toFixed(1)}°C
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TWIN INSIGHT / WARNING BOX */}
      {effectiveWarning ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: twin?.warningLevel === "HIGH_RISK" ? theme.highRiskBg : theme.watchBg,
              borderColor: twin?.warningLevel === "HIGH_RISK" ? theme.highRiskBorder : theme.watchBorder,
              borderRadius: radius.medium,
              marginTop: spacing.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.bodyBold, { color: twin?.warningLevel === "HIGH_RISK" ? theme.highRisk : theme.watch }]}>
            ⚠ {t("twinInsight")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textPrimary, marginTop: 4 }]}>
            {effectiveWarning}
          </Text>
        </View>
      ) : null}

      {/* RECOMMENDED FARMER ACTION */}
      {recommendedAction ? (
        <View
          style={[
            styles.actionBox,
            {
              backgroundColor: theme.goodBg,
              borderColor: theme.goodBorder,
              borderRadius: radius.medium,
              marginTop: spacing.sm,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.caption, { color: theme.good, fontWeight: "800", textTransform: "uppercase" }]}>
            💡 {t("recommendedAction")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textPrimary, marginTop: 3, fontSize: 13 }]}>
            {recommendedAction}
          </Text>
        </View>
      ) : null}

      {/* BOTTOM STATS ROW */}
      <View style={[styles.statsRow, { borderTopColor: theme.borderSubtle, marginTop: spacing.md, paddingTop: spacing.md }]}>
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
            {effectiveObsCount}
          </Text>
        </View>
      </View>
    </CardWrapper>
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
  mssiPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  trendPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    borderWidth: 1,
    gap: 6,
  },
  miniPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  warningBox: {
    borderWidth: 1,
  },
  actionBox: {
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
