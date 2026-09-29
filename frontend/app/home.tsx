/**
 * SILAGEGUARD AI V4 — Farmer-Friendly Home Dashboard
 * Visual, icon-driven console designed for Indian dairy farmers.
 * Minimal text clutter, large tactile touch targets, full dynamic multilingual support.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { AppIcon } from "../components/AppIcon";
import { BottomNavBar } from "../components/BottomNavBar";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { ProbeBeacon } from "../components/ProbeBeacon";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { batchRepository } from "../sqlite/batchRepository";
import { safeNavigate } from "../utils/navigation";
import { t } from "../utils/i18n";
import { BatchRecord } from "../sqlite/database";

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    language,
    bleStatus,
    telemetry,
  } = useAppStore();

  const isConnected = bleStatus === "CONNECTED";

  const [stats, setStats] = useState({
    total: 0,
    safeCount: 0,
    cautionCount: 0,
    unsafeCount: 0,
    avgMssi: 0,
    todayCount: 0,
  });

  const [recentBatches, setRecentBatches] = useState<BatchRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const s = await batchRepository.getSummaryStats();
      setStats(s);
      const batches = await batchRepository.getAllBatches();
      setRecentBatches(batches.slice(0, 3));
    }
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greetingMorning", language);
    if (hour < 17) return t("greetingAfternoon", language);
    return t("greetingEvening", language);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard" showBack={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 84,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Farmer Greeting & Status Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroGreeting, { color: theme.text }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.heroSub, { color: theme.textMuted }]}>
                {t("bunkerScreening", language)}
              </Text>
            </View>

            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isConnected ? theme.safeBg : theme.surfaceElevated,
                  borderColor: isConnected ? theme.safeBorder : theme.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: isConnected ? theme.safe : theme.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isConnected ? theme.safe : theme.textMuted },
                ]}
              >
                {isConnected ? t("probeLive", language) : "OFFLINE"}
              </Text>
            </View>
          </View>

          {/* Sensor Probe Bar */}
          <AnimatedPressable
            onPress={() => safeNavigate(router, "/ble", pathname)}
            style={[
              styles.probeBar,
              {
                backgroundColor: theme.card,
                borderColor: isConnected ? theme.safeBorder : theme.cardBorder,
              },
            ]}
          >
            <View style={styles.probeBarLeft}>
              <View style={styles.beaconWrap}>
                <ProbeBeacon isConnected={isConnected} size={11} />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.probeBarTitle, { color: theme.text }]}>
                  {isConnected
                    ? t("probeConnected", language)
                    : t("probeDisconnected", language)}
                </Text>
                <Text style={[styles.probeBarSub, { color: theme.textMuted }]}>
                  {isConnected && telemetry && telemetry.ph !== null
                    ? `pH: ${telemetry.ph?.toFixed(2)}  ·  ${telemetry.moisture?.toFixed(0)}%  ·  ${telemetry.temp?.toFixed(0)}°C`
                    : t("tapToConnect", language)}
                </Text>
              </View>
            </View>

            <View style={styles.probeChevron}>
              <AppIcon name="arrow-forward" size={18} color={theme.textMuted} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Primary Hero Action: Giant SCAN SILAGE Button */}
        <AnimatedPressable
          style={[styles.heroScanBtn, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}
          onPress={() => safeNavigate(router, "/camera", pathname)}
        >
          <View style={styles.scanBtnLeft}>
            <View style={styles.scanIconCircle}>
              <AppIcon name="camera" size={30} color="#042F2E" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.scanBtnTitle}>{t("startNewScan", language)}</Text>
              <Text style={styles.scanBtnSub}>
                {t("scanSubText", language)}
              </Text>
            </View>
          </View>
          <View style={styles.scanActionTag}>
            <Text style={styles.scanActionText}>{t("scanNow", language)} ➔</Text>
          </View>
        </AnimatedPressable>

        {/* 3 Simple Color Quality Cards for Farmers: Green (Safe), Yellow (Check), Red (Spoiled) */}
        <View style={styles.qualitySummaryContainer}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            {t("todayQuality", language)}
          </Text>

          <View style={styles.threeCardRow}>
            {/* Green: Safe */}
            <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.safeBorder }]}>
              <View style={[styles.statusCardIconBox, { backgroundColor: theme.safeBg }]}>
                <AppIcon name="check-circle" size={20} color={theme.safe} />
              </View>
              <Text style={[styles.statusCardCount, { color: theme.safe }]}>
                {stats.safeCount}
              </Text>
              <Text style={[styles.statusCardLabel, { color: theme.text }]}>
                {t("safeBatches", language)}
              </Text>
            </View>

            {/* Yellow: Caution */}
            <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.cautionBorder }]}>
              <View style={[styles.statusCardIconBox, { backgroundColor: theme.cautionBg }]}>
                <AppIcon name="alert-triangle" size={20} color={theme.caution} />
              </View>
              <Text style={[styles.statusCardCount, { color: theme.caution }]}>
                {stats.cautionCount}
              </Text>
              <Text style={[styles.statusCardLabel, { color: theme.text }]}>
                {t("checkBatches", language)}
              </Text>
            </View>

            {/* Red: Spoiled */}
            <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.unsafeBorder }]}>
              <View style={[styles.statusCardIconBox, { backgroundColor: theme.unsafeBg }]}>
                <AppIcon name="alert" size={20} color={theme.unsafe} />
              </View>
              <Text style={[styles.statusCardCount, { color: theme.unsafe }]}>
                {stats.unsafeCount}
              </Text>
              <Text style={[styles.statusCardLabel, { color: theme.text }]}>
                {t("spoiledBatches", language)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Tiles */}
        <View style={styles.quickGrid}>
          <AnimatedPressable
            style={[styles.quickTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/history", pathname)}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: theme.accent + "1A" }]}>
              <AppIcon name="history" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.tileText, { color: theme.text }]}>
              {t("viewHistory", language)}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.quickTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/education", pathname)}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: theme.primary + "1A" }]}>
              <AppIcon name="help" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.tileText, { color: theme.text }]}>
              {t("silageGuide", language)}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.quickTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => safeNavigate(router, "/settings", pathname)}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: theme.caution + "1A" }]}>
              <AppIcon name="settings" size={22} color={theme.caution} />
            </View>
            <Text style={[styles.tileText, { color: theme.text }]}>
              {t("settings", language)}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Recent Silage Scans */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              {t("recentScans", language)}
            </Text>
            {stats.total > 0 && (
              <TouchableOpacity onPress={() => safeNavigate(router, "/history", pathname)}>
                <Text style={[styles.viewAllText, { color: theme.accent }]}>
                  {stats.total} {t("totalScans", language)} ➔
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {recentBatches.length > 0 ? (
            recentBatches.map((b) => {
              const isSafe = b.decision === "SAFE";
              const isCaution = b.decision === "CAUTION";
              const badgeColor = isSafe ? theme.safe : isCaution ? theme.caution : theme.unsafe;
              const badgeBg = isSafe ? theme.safeBg : isCaution ? theme.cautionBg : theme.unsafeBg;

              const dateStr = b.created_at || b.timestamp || "";
              const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : "";

              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.recentItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => safeNavigate(router, "/history", pathname)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.recentDecisionDot, { backgroundColor: badgeColor }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.recentCropName, { color: theme.text }]}>{b.crop_type}</Text>
                    <Text style={[styles.recentDate, { color: theme.textMuted }]}>
                      {formattedDate} · {b.id.slice(-6)}
                    </Text>
                  </View>
                  <View style={[styles.decisionPill, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
                    <Text style={[styles.decisionPillText, { color: badgeColor }]}>
                      {b.decision === "SAFE" ? t("safe", language) : b.decision === "CAUTION" ? t("caution", language) : t("unsafe", language)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <AppIcon name="camera" size={28} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {t("noScansYet", language)}
              </Text>
            </View>
          )}
        </View>
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
    padding: 14,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: "900",
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  probeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
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
  probeBarTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  probeBarSub: {
    fontSize: 11,
    marginTop: 2,
  },
  probeChevron: {
    paddingLeft: 6,
  },
  heroScanBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scanIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  scanBtnTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#042F2E",
  },
  scanBtnSub: {
    fontSize: 11,
    color: "#0F766E",
    fontWeight: "600",
    marginTop: 2,
  },
  scanActionTag: {
    backgroundColor: "#042F2E",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scanActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  qualitySummaryContainer: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  threeCardRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  statusCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statusCardCount: {
    fontSize: 20,
    fontWeight: "900",
  },
  statusCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickTile: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  tileText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  recentSection: {
    marginBottom: 16,
  },
  recentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  recentItemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  recentDecisionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recentCropName: {
    fontSize: 13,
    fontWeight: "800",
  },
  recentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  decisionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  decisionPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
});
