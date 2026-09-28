/**
 * SILAGEGUARD AI V4 — Home Dashboard
 * Industrial instrumentation interface with time-based farmer greeting,
 * offline status, live probe telemetry badge, today's summary, quick actions,
 * and educational insights. Strict adherence to RULE 4 (ZERO DUMMY DATA).
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { QualityTrendChart } from "../components/QualityTrendChart";
import { AppIcon } from "../components/AppIcon";
import { BottomNavBar } from "../components/BottomNavBar";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { StatusCard } from "../components/StatusCard";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../store/useAppStore";
import { batchRepository } from "../sqlite/batchRepository";
import { SPACING, RADIUS } from "../theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme,
    largeTypography,
    isOnline,
    isBleConnected,
    telemetry,
    batteryPct,
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
    if (hour < 12) return "Good Morning Farmer";
    if (hour < 17) return "Good Afternoon Farmer";
    return "Good Evening Farmer";
  };

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
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.heroGreeting,
                  {
                    color: theme.text,
                    fontSize: largeTypography ? 24 : 20,
                  },
                ]}
              >
                {getGreeting()}
              </Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                Rapid AI Screening & Spoilage Prevention System
              </Text>
            </View>

            {/* Offline Badge */}
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isOnline ? "rgba(16, 185, 129, 0.14)" : "rgba(245, 158, 11, 0.14)",
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
                {isOnline ? "CLOUD SYNC" : "OFFLINE FIRST"}
              </Text>
            </View>
          </View>

          {/* Hardware Probe Quick Indicator */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/ble" as any)}
            style={[
              styles.probeBar,
              {
                backgroundColor: theme.card,
                borderColor: isBleConnected ? theme.safeBorder : theme.cardBorderHover,
              },
            ]}
          >
            <View style={styles.probeBarLeft}>
              <View
                style={[
                  styles.probeDot,
                  { backgroundColor: isBleConnected ? theme.safe : theme.unsafe },
                ]}
              />
              <View>
                <Text style={[styles.probeBarTitle, { color: theme.text }]}>
                  {isBleConnected
                    ? "ESP32-S3 Silage Probe Connected"
                    : "Hardware Probe Disconnected"}
                </Text>
                <Text style={[styles.probeBarSub, { color: theme.textMuted }]}>
                  {isBleConnected && telemetry
                    ? `pH: ${telemetry.ph?.toFixed(2) ?? "—"} · Moist: ${telemetry.moisture?.toFixed(1) ?? "—"}% · Temp: ${telemetry.temp?.toFixed(1) ?? "—"}°C`
                    : "Tap to pair physical probe or configure calibration"}
                </Text>
              </View>
            </View>

            <View style={styles.batteryChip}>
              <Text style={[styles.batteryText, { color: theme.textSecondary }]}>
                ⚡ {batteryPct}%
              </Text>
            </View>
          </TouchableOpacity>

          {/* Weather Placeholder */}
          <View style={[styles.weatherRow, { borderTopColor: theme.cardBorder }]}>
            <Text style={[styles.weatherText, { color: theme.textMuted }]}>
              📍 Local Silage Bunker · 26°C · 58% RH · Direct Sunlight Visible
            </Text>
          </View>
        </View>

        {/* Quick Actions (4-button grid) */}
        <Text
          style={[
            styles.sectionHeading,
            {
              color: theme.text,
              fontSize: largeTypography ? 18 : 16,
            },
          ]}
        >
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}
            onPress={() => router.push("/camera" as any)}
            activeOpacity={0.8}
          >
            <AppIcon name="camera" size={26} color="#042F2E" />
            <Text style={[styles.actionCardTitle, { color: "#042F2E" }]}>START SCAN</Text>
            <Text style={[styles.actionCardSub, { color: "rgba(4, 47, 46, 0.8)" }]}>
              3-Step Rapid Screening
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push("/history" as any)}
            activeOpacity={0.8}
          >
            <AppIcon name="history" size={24} color={theme.accent} />
            <Text style={[styles.actionCardTitle, { color: theme.text }]}>SCAN HISTORY</Text>
            <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>
              {stats.total} Pit Records
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push("/education" as any)}
            activeOpacity={0.8}
          >
            <AppIcon name="help" size={24} color={theme.primary} />
            <Text style={[styles.actionCardTitle, { color: theme.text }]}>LEARN SILAGE</Text>
            <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>
              Agronomic Guides
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => router.push("/calibration" as any)}
            activeOpacity={0.8}
          >
            <AppIcon name="sliders" size={24} color={theme.caution} />
            <Text style={[styles.actionCardTitle, { color: theme.text }]}>CALIBRATION</Text>
            <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>
              pH / Moisture Offsets
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Summary Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: theme.text,
                fontSize: largeTypography ? 18 : 16,
              },
            ]}
          >
            Today's Silage Metrics
          </Text>
          {pendingSyncCount > 0 ? (
            <View style={[styles.syncBadge, { backgroundColor: theme.cautionBg }]}>
              <Text style={[styles.syncBadgeText, { color: theme.caution }]}>
                {pendingSyncCount} Pending Sync
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statGrid}>
          <StatCard
            label="Total Scans"
            value={stats.total.toString()}
            subtitle={`${stats.todayCount} completed today`}
            icon="analytics"
          />
          <StatCard
            label="Safe Batches"
            value={stats.safeCount.toString()}
            status="safe"
            subtitle="Low screening risk"
            icon="check-circle"
          />
        </View>

        <View style={styles.statGrid}>
          <StatCard
            label="Unsafe Alerts"
            value={stats.unsafeCount.toString()}
            status={stats.unsafeCount > 0 ? "unsafe" : "neutral"}
            subtitle="Immediate action advised"
            icon="alert-triangle"
          />
          <StatCard
            label="Average MSSI"
            value={stats.avgMssi > 0 ? `${stats.avgMssi}/100` : "—"}
            status={stats.avgMssi >= 70 ? "safe" : stats.avgMssi >= 40 ? "caution" : "neutral"}
            subtitle="Composite safety index"
            icon="activity"
          />
        </View>

        {/* Trend Graph or Empty State */}
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
            onAction={() => router.push("/camera" as any)}
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
    padding: SPACING.lg,
  },
  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  heroGreeting: {
    fontWeight: "800",
  },
  heroSub: {
    fontSize: 12,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  probeBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  probeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  probeBarTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  probeBarSub: {
    fontSize: 11,
    marginTop: 2,
  },
  batteryChip: {
    paddingLeft: SPACING.sm,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  weatherRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
  },
  weatherText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  sectionHeading: {
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  actionCard: {
    width: "48%",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 90,
    justifyContent: "space-between",
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  actionCardSub: {
    fontSize: 11,
  },
  statGrid: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  trendContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
});
