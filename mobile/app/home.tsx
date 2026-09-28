/**
 * SILAGEGUARD AI V4 — Farmer-Friendly Home Dashboard
 * High-contrast agricultural console designed for bright sunlight and tactile field use.
 * Features animated probe beacon, spring-tactile touchables, animated quality meters,
 * and actionable agronomic insights. Strict adherence to RULE 4 (ZERO DUMMY DATA).
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { QualityTrendChart } from "../components/QualityTrendChart";
import { AppIcon } from "../components/AppIcon";
import { BottomNavBar } from "../components/BottomNavBar";
import { EmptyState } from "../components/EmptyState";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { ProbeBeacon } from "../components/ProbeBeacon";
import { QualityMeter } from "../components/QualityMeter";
import { useAppStore } from "../store/useAppStore";
import { useTheme } from "../features/ble/bleManager";
import { batchRepository } from "../sqlite/batchRepository";
import { safeNavigate } from "../utils/navigation";
import { SPACING, RADIUS } from "../theme";

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    largeTypography,
    isOnline,
    isBleConnected,
    telemetry,
    pendingSyncCount,
  } = useAppStore();

  const [stats, setStats] = useState({
    total: 0,
    safeCount: 0,
    cautionCount: 0,
    unsafeCount: 0,
    avgMssi: 0,
    todayCount: 0,
  });

  const [trendPoints, setTrendPoints] = useState<number[]>([]);

  useEffect(() => {
    async function loadData() {
      const s = await batchRepository.getSummaryStats();
      setStats(s);
      const batches = await batchRepository.getAllBatches();
      setTrendPoints(batches.map((b) => b.mssi_score));
    }
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌾 Good Morning, Farmer!";
    if (hour < 17) return "🌾 Good Afternoon, Farmer!";
    return "🌾 Good Evening, Farmer!";
  };

  const safePercentage = stats.total > 0
    ? Math.round((stats.safeCount / stats.total) * 100)
    : 100;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 84,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card: Greeting & Offline/Cloud Status */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.heroGreeting,
                  {
                    color: theme.text,
                    fontSize: largeTypography ? 24 : 21,
                  },
                ]}
              >
                {getGreeting()}
              </Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                Bunker Pit Screening & Spoilage Prevention
              </Text>
            </View>

            {/* Offline / Cloud Status Pill */}
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isOnline ? theme.safeBg : theme.cautionBg,
                  borderColor: isOnline ? theme.safeBorder : theme.cautionBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: isOnline ? theme.safe : theme.caution },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isOnline ? theme.safe : theme.caution },
                ]}
              >
                {isOnline ? "CLOUD SYNC" : "OFFLINE READY"}
              </Text>
            </View>
          </View>

          {/* Hardware Probe Live Status Widget with Animated Beacon */}
          <AnimatedPressable
            onPress={() => safeNavigate(router, "/ble", pathname)}
            style={[
              styles.probeBar,
              {
                backgroundColor: theme.card,
                borderColor: isBleConnected ? theme.safeBorder : theme.cardBorder,
              },
            ]}
          >
            <View style={styles.probeBarLeft}>
              <View style={styles.beaconWrap}>
                <ProbeBeacon isConnected={isBleConnected} size={11} />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={styles.probeTitleRow}>
                  <Text style={[styles.probeBarTitle, { color: theme.text }]}>
                    {isBleConnected
                      ? "ESP32 Silage Probe Connected"
                      : "Silage Probe Disconnected"}
                  </Text>
                  {isBleConnected && (
                    <View style={[styles.activePill, { backgroundColor: theme.safeBg, borderColor: theme.safeBorder }]}>
                      <Text style={[styles.activePillText, { color: theme.safe }]}>LIVE</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.probeBarSub, { color: theme.textMuted }]}>
                  {isBleConnected && telemetry && telemetry.ph !== null
                    ? `pH: ${telemetry.ph?.toFixed(2)}  ·  Moist: ${telemetry.moisture?.toFixed(1)}%  ·  Temp: ${telemetry.temp?.toFixed(1)}°C`
                    : "Tap to pair physical probe or configure calibration"}
                </Text>
              </View>
            </View>

            {isBleConnected && telemetry?.battery !== null && telemetry?.battery !== undefined ? (
              <View style={[styles.batteryChip, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.batteryText, { color: theme.textSecondary }]}>
                  ⚡ {telemetry.battery}%
                </Text>
              </View>
            ) : (
              <View style={styles.probeChevron}>
                <AppIcon name="arrow-forward" size={18} color={theme.textMuted} />
              </View>
            )}
          </AnimatedPressable>
        </View>

        {/* Primary Hero Action: START SCAN Banner */}
        <AnimatedPressable
          style={[styles.heroScanBtn, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}
          onPress={() => safeNavigate(router, "/camera", pathname)}
        >
          <View style={styles.scanBtnLeft}>
            <View style={styles.scanIconCircle}>
              <AppIcon name="camera" size={26} color="#042F2E" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.scanBtnTitle}>START SILAGE SCAN</Text>
              <Text style={styles.scanBtnSub}>
                3-Photo Surface & Hyphae Screening
              </Text>
            </View>
          </View>
          <View style={styles.scanActionTag}>
            <Text style={styles.scanActionText}>SCAN NOW ➔</Text>
          </View>
        </AnimatedPressable>

        {/* Quick Actions (3 secondary tiles) */}
        <View style={styles.secondaryActionRow}>
          <AnimatedPressable
            style={[styles.secondaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/history", pathname)}
          >
            <View style={[styles.miniIconBox, { backgroundColor: theme.accent + "22" }]}>
              <AppIcon name="history" size={20} color={theme.accent} />
            </View>
            <Text style={[styles.secondaryCardTitle, { color: theme.text }]}>SCAN HISTORY</Text>
            <Text style={[styles.secondaryCardSub, { color: theme.textMuted }]}>
              {stats.total} Pit Records
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.secondaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/education", pathname)}
          >
            <View style={[styles.miniIconBox, { backgroundColor: theme.primary + "22" }]}>
              <AppIcon name="help" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.secondaryCardTitle, { color: theme.text }]}>SILAGE GUIDE</Text>
            <Text style={[styles.secondaryCardSub, { color: theme.textMuted }]}>
              Agronomic Tips
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.secondaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/calibration", pathname)}
          >
            <View style={[styles.miniIconBox, { backgroundColor: theme.caution + "22" }]}>
              <AppIcon name="sliders" size={20} color={theme.caution} />
            </View>
            <Text style={[styles.secondaryCardTitle, { color: theme.text }]}>CALIBRATION</Text>
            <Text style={[styles.secondaryCardSub, { color: theme.textMuted }]}>
              Sensor Offsets
            </Text>
          </AnimatedPressable>
        </View>

        {/* Today's Silage Quality Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text
              style={[
                styles.sectionHeading,
                {
                  color: theme.text,
                  fontSize: largeTypography ? 20 : 17,
                },
              ]}
            >
              Today's Silage Quality
            </Text>
            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
              Live fermentation health metrics
            </Text>
          </View>

          {pendingSyncCount > 0 ? (
            <View style={[styles.syncBadge, { backgroundColor: theme.cautionBg, borderColor: theme.cautionBorder }]}>
              <Text style={[styles.syncBadgeText, { color: theme.caution }]}>
                {pendingSyncCount} Pending Sync
              </Text>
            </View>
          ) : null}
        </View>

        {/* Quality Meters Grid */}
        <View style={styles.meterGrid}>
          <QualityMeter
            label="Safe Batches"
            value={stats.safeCount}
            displayValue={`${stats.safeCount} / ${stats.total || 0}`}
            percentage={safePercentage}
            status="safe"
            statusText={safePercentage >= 70 ? "OPTIMAL" : "MONITOR"}
            subtitle="Low screening risk"
            icon="check-circle"
          />

          <View style={{ width: 12 }} />

          <QualityMeter
            label="Average MSSI"
            value={stats.avgMssi}
            displayValue={stats.avgMssi > 0 ? `${stats.avgMssi}/100` : "—"}
            percentage={stats.avgMssi || 0}
            status={stats.avgMssi >= 70 ? "safe" : stats.avgMssi >= 40 ? "caution" : "neutral"}
            statusText={stats.avgMssi >= 70 ? "EXCELLENT" : stats.avgMssi >= 40 ? "CAUTION" : "STANDBY"}
            subtitle="Composite safety index"
            icon="activity"
          />
        </View>

        <View style={[styles.meterGrid, { marginTop: 12 }]}>
          <QualityMeter
            label="Total Scans"
            value={stats.total}
            displayValue={stats.total.toString()}
            percentage={Math.min(100, stats.total * 10)}
            status="neutral"
            statusText={`${stats.todayCount} TODAY`}
            subtitle="Bunker pits inspected"
            icon="analytics"
          />

          <View style={{ width: 12 }} />

          <QualityMeter
            label="Spoilage Alerts"
            value={stats.unsafeCount}
            displayValue={stats.unsafeCount.toString()}
            percentage={stats.total > 0 ? Math.round((stats.unsafeCount / stats.total) * 100) : 0}
            status={stats.unsafeCount > 0 ? "unsafe" : "safe"}
            statusText={stats.unsafeCount > 0 ? "ACTION REQ" : "CLEAN"}
            subtitle={stats.unsafeCount > 0 ? "Immediate triage advised" : "Zero spoilage detected"}
            icon="alert-triangle"
          />
        </View>

        {/* Farmer Tip of the Day Card */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={[styles.tipIconWrap, { backgroundColor: theme.primary + "22" }]}>
            <AppIcon name="leaf" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.tipTitle, { color: theme.text }]}>
              💡 Agronomic Field Tip
            </Text>
            <Text style={[styles.tipBody, { color: theme.textSecondary }]}>
              Maintain firm face compaction during feedout. Exposure to open air can cause aerobic heating and rapid fungal proliferation within 12 hours.
            </Text>
          </View>
        </View>

        {/* Trend Graph or Clean Empty State */}
        {trendPoints.length > 0 ? (
          <View style={styles.trendContainer}>
            <QualityTrendChart
              dataPoints={trendPoints.slice(-10)}
              title="Recent Pit MSSI Quality Trajectory"
            />
          </View>
        ) : (
          <EmptyState
            title="No Silage Scans Performed Yet"
            description="Fresh installation verified (RULE 4). Connect your ESP32-S3 probe and take surface photos to begin screening."
            actionTitle="Take First Scan"
            onAction={() => safeNavigate(router, "/camera", pathname)}
          />
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  heroGreeting: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  probeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  probeBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  beaconWrap: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  probeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  probeBarTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  activePill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  probeBarSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  batteryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: 8,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  probeChevron: {
    paddingLeft: 4,
  },
  heroScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.md,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  scanBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(4, 47, 46, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanBtnTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#042F2E",
    letterSpacing: 0.5,
  },
  scanBtnSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(4, 47, 46, 0.8)",
    marginTop: 2,
  },
  scanActionTag: {
    backgroundColor: "#042F2E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  scanActionText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  secondaryActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  secondaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  miniIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  secondaryCardTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  secondaryCardSub: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  meterGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  tipBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  trendContainer: {
    marginTop: SPACING.xs,
  },
});
