import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { OfflineBanner } from "../components/OfflineBanner";
import { HealthStatusCard } from "../components/HealthStatusCard";
import { AppButton } from "../components/AppButton";
import { BatchCard } from "../components/BatchCard";
import { localDb } from "../services/db/localDb";
import { checkBackendHealth, fetchAndSyncModels } from "../services/api";

export function HomeScreen({ onNavigate }) {
  const { theme, spacing, radius, typography, isSmallDevice } = useTheme();
  const { t } = useTranslation();
  const [recentRecords, setRecentRecords] = useState([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [isCloudOnline, setIsCloudOnline] = useState(false);
  const [digitalTwin, setDigitalTwin] = useState(null);
  const [batchTrend, setBatchTrend] = useState({
    trendLabel: "Baseline established",
    warning: null,
  });

  useEffect(() => {
    // 1. Check cloud reachability and flush sync queue if reachable
    checkBackendHealth().then((health) => {
      setIsCloudOnline(health.isOnline);
      if (health.isOnline) {
        localDb.flushSyncQueue().then(() => {
          localDb.getPendingSyncCount().then(setPendingSync);
        });
      }
    });

    // 2. Load local batches & history
    localDb.getObservations().then((records) => {
      setRecentRecords(records || []);
      if (records && records.length > 0) {
        const targetBatch = records[0].client_batch_id || records[0].id || records[0].batchId;
        localDb.getDigitalTwin(targetBatch).then((twin) => {
          setDigitalTwin(twin);
          if (twin.observationCount >= 2) {
            setBatchTrend({
              trendLabel:
                twin.trendDirection === "DETERIORATING"
                  ? "Deteriorating"
                  : twin.trendDirection === "WATCH_SHIFT"
                  ? "Watch Shift"
                  : twin.trendDirection === "IMPROVING"
                  ? "Improving"
                  : "Stable",
              warning: twin.warningLevel !== "STABLE" && twin.warningReasons?.length > 0 ? twin.warningReasons[0] : null,
            });
          } else {
            setBatchTrend({
              trendLabel: "Baseline established",
              warning: null,
            });
          }
        });
      }
    });

    localDb.getPendingSyncCount().then(setPendingSync);

    // 3. Synchronize ML model weights OTA
    fetchAndSyncModels();

    // 4. Periodic background sync and health check every 15s
    const syncInterval = setInterval(() => {
      checkBackendHealth().then((health) => {
        setIsCloudOnline(health.isOnline);
        if (health.isOnline) {
          localDb.flushSyncQueue().then(() => {
            localDb.getPendingSyncCount().then(setPendingSync);
          });
        }
      });
    }, 15000);

    return () => clearInterval(syncInterval);
  }, []);

  const latest = recentRecords[0] || null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t("appName")}
        subtitle={t("greeting")}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <OfflineBanner isOnline={isCloudOnline} pendingCount={pendingSync} />

        {/* PRIMARY CALL TO ACTION: CHECK SILAGE */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.primarySoft,
              borderColor: theme.goodBorder,
              marginHorizontal: spacing.lg,
              borderRadius: radius.xlarge,
              padding: isSmallDevice ? spacing.md : spacing.xl,
            },
          ]}
        >
          <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
            {t("checkSilage")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 4, marginBottom: isSmallDevice ? 12 : 18 }]}>
            {t("checkSubtitle")}
          </Text>
          <AppButton
            title={`▶ ${t("checkSilage")}`}
            variant="primary"
            size="large"
            style={{ marginTop: 4 }}
            onPress={() => onNavigate("CHECK")}
          />
        </View>

        {/* CURRENT SILAGE HEALTH TWIN */}
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.sectionRow, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
              {t("currentHealth")}
            </Text>
          </View>

          {latest ? (
            <HealthStatusCard
              batchId={latest.client_batch_id || latest.id || latest.batchId}
              cropType={latest.crop_type || "Corn Silage"}
              healthState={latest.decision || latest.verdict || "GOOD"}
              lastChecked={latest.created_at ? new Date(latest.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
              trend={batchTrend.trendLabel}
              observationsCount={digitalTwin?.observationCount || recentRecords.length}
              warningMessage={batchTrend.warning}
              mssiScore={latest.mssi_score || latest.mssiScore || 85}
              twin={digitalTwin}
              onPress={() => onNavigate("RECORD_DETAIL", latest)}
            />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, marginHorizontal: spacing.lg, padding: spacing.lg, marginTop: 8 }]}>
              <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                {t("noBatchesYet")}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {t("startFirstCheck")}
              </Text>
            </View>
          )}
        </View>

        {/* RECENT RECORDS */}
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.sectionRow, { paddingHorizontal: spacing.lg, marginBottom: 8 }]}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
              {t("recentRecords")}
            </Text>
            <View style={{ width: isSmallDevice ? 130 : 150 }}>
              <AppButton
                title={t("viewAllRecords")}
                variant="outline"
                size="small"
                onPress={() => onNavigate("RECORDS")}
              />
            </View>
          </View>

          {recentRecords.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {t("noPreviousChecks")}
              </Text>
            </View>
          ) : (
            recentRecords.slice(0, 3).map((item) => (
              <BatchCard
                key={item.id}
                batch={item}
                onPress={() => onNavigate("RECORD_DETAIL", item)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroCard: {
    borderWidth: 1.5,
    marginVertical: 8,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
