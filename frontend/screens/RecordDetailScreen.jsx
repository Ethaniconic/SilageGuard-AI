import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { MetricCard } from "../components/MetricCard";
import { localDb } from "../services/db/localDb";

export function RecordDetailScreen({ batch, onBack }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();
  const [historyObs, setHistoryObs] = useState([]);

  const b = batch || {};
  const batchId = b.client_batch_id || b.id || b.batchId;

  useEffect(() => {
    if (batchId) {
      localDb.getObservations(batchId).then((records) => {
        setHistoryObs(records || []);
      });
    }
  }, [batchId]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={batchId || "Silage Batch"}
        subtitle={b.crop_type || b.cropType || "Silage Record"}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* CURRENT STATE OVERVIEW */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={[typography.caption, { color: theme.textMuted }]}>{t("healthState")}</Text>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginTop: 2 }]}>
                {b.decision || "GOOD"}
              </Text>
            </View>
            <StatusBadge status={b.decision || "GOOD"} size="large" />
          </View>

          <View style={styles.metricsGridRow}>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("phLevel")}
                value={b.ph !== null && b.ph !== undefined ? b.ph : "--"}
                status={b.ph == null ? "NORMAL" : b.ph <= 4.2 ? "NORMAL" : b.ph <= 4.8 ? "WARNING" : "ALERT"}
                hint={b.ph == null ? t("noPhSensor") : b.ph <= 4.2 ? t("optimalAcidity") : t("elevatedPh")}
              />
            </View>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("moisture")}
                value={b.moisture !== null && b.moisture !== undefined ? b.moisture : "--"}
                unit={b.moisture != null ? "%" : ""}
                status={b.moisture == null ? "NORMAL" : (b.moisture >= 60 && b.moisture <= 68) ? "NORMAL" : "WARNING"}
                hint={b.moisture == null ? t("awaitingSensorReading") : (b.moisture >= 60 && b.moisture <= 68) ? t("safeMoistureBand") : t("outsideTargetBand")}
              />
            </View>
          </View>
          <View style={styles.metricsGridRow}>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("coreTemp")}
                value={b.temperature !== null && b.temperature !== undefined ? b.temperature : "--"}
                unit={b.temperature != null ? "°C" : ""}
                status={b.temperature == null ? "NORMAL" : b.temperature <= 30 ? "NORMAL" : b.temperature <= 38 ? "WARNING" : "ALERT"}
                hint={b.temperature == null ? t("awaitingSensorReading") : b.temperature <= 30 ? t("stableAnaerobicCore") : t("aerobicHeatingDetected")}
              />
            </View>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("healthScore")}
                value={b.mssi_score !== null && b.mssi_score !== undefined ? b.mssi_score : (b.mssiScore !== null && b.mssiScore !== undefined ? b.mssiScore : "--")}
                unit={b.mssi_score != null || b.mssiScore != null ? "/100" : ""}
                status={b.decision === "HIGH RISK" ? "ALERT" : b.decision === "WATCH" ? "WARNING" : "NORMAL"}
                hint={t("mssiIndex")}
              />
            </View>
          </View>
        </View>

        {/* SILAGE HEALTH TWIN TIMELINE */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
            {t("healthTwinTimeline")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary, marginBottom: 12 }]}>
            {t("timelineSub")}
          </Text>

          <Timeline events={historyObs} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  summaryCard: {
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsGridRow: {
    flexDirection: "row",
    marginHorizontal: -3,
    marginTop: 4,
  },
  metricCol: {
    flex: 1,
  },
});
