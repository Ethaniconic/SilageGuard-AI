/**
 * SCREEN 2 — HOME DASHBOARD
 * Main farmer landing interface:
 * - Large primary "Start New Scan" trigger
 * - Live Connected Probe / Battery status
 * - Today's Scan Count & Summary metrics
 * - Quality Trend Graph (7-scan trajectory)
 * - Previous Reports shortcut
 * - Farmer-friendly large touch targets & FAB
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { QualityTrendChart } from "../components/QualityTrendChart";
import { useAppStore } from "../features/ble/bleManager";
import { batchRepository } from "../sqlite/batchRepository";
import { THEME_COLORS } from "../utils/constants";

export default function HomeScreen() {
  const router = useRouter();
  const { bleStatus, telemetry, language, isDemoMode } = useAppStore();
  const [stats, setStats] = useState({
    total: 3,
    safeCount: 1,
    cautionCount: 1,
    unsafeCount: 1,
    avgMssi: 72
  });

  useEffect(() => {
    async function loadStats() {
      const s = await batchRepository.getSummaryStats();
      setStats(s);
    }
    loadStats();
  }, []);

  const isConnected = bleStatus === "CONNECTED";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="SILAGEGUARD AI" showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hardware Status Banner */}
        <TouchableOpacity
          style={[styles.probeBanner, isConnected ? styles.probeBannerOnline : styles.probeBannerOffline]}
          onPress={() => router.push("/ble" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.probeLeft}>
            <View style={[styles.probeStatusDot, { backgroundColor: isConnected ? THEME_COLORS.primary : "#EF4444" }]} />
            <View>
              <Text style={styles.probeTitle}>
                {isConnected ? "ESP32-S3 Silage Probe Connected" : "Probe Disconnected • Tap to Pair"}
              </Text>
              <Text style={styles.probeSubtitle}>
                {isConnected
                  ? `Telemetry Active • ${telemetry.battery}% Battery • pH ${telemetry.ph} • ${telemetry.temp}°C`
                  : "Using Offline Simulation Engine"}
              </Text>
            </View>
          </View>
          <Text style={styles.probeAction}>{isConnected ? "LIVE →" : "CONNECT →"}</Text>
        </TouchableOpacity>

        {/* PRIMARY BIG SCAN BUTTON (Farmer-Friendly) */}
        <TouchableOpacity
          style={styles.primaryScanCard}
          onPress={() => router.push("/camera" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.scanGlow} />
          <View style={styles.scanIconBadge}>
            <Text style={styles.scanIconText}>📸</Text>
          </View>
          <View style={styles.scanTextContainer}>
            <Text style={styles.scanTitle}>START SILAGE SCAN</Text>
            <Text style={styles.scanSubtitle}>
              Guided Surface Camera + Probe Sensor AI Fusion
            </Text>
          </View>
          <View style={styles.scanArrowBadge}>
            <Text style={styles.scanArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Metrics Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="TODAY'S SCANS"
            value={stats.total}
            subtext="Saved locally"
            icon="📋"
            accentColor="#38BDF8"
          />
          <StatCard
            label="SAFE BATCHES"
            value={`${stats.safeCount}/${stats.total}`}
            subtext={`${Math.round((stats.safeCount / Math.max(1, stats.total)) * 100)}% Pass Rate`}
            icon="🌾"
            accentColor={THEME_COLORS.safe}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="AVG MSSI INDEX"
            value={`${stats.avgMssi}/100`}
            subtext="Safety benchmark"
            icon="🛡️"
            accentColor={THEME_COLORS.primary}
          />
          <StatCard
            label="PROBE BATTERY"
            value={`${telemetry.battery}%`}
            subtext="Li-Ion 3.7V"
            icon="🔋"
            accentColor="#F59E0B"
          />
        </View>

        {/* Quality Trend Graph */}
        <QualityTrendChart dataPoints={[94, 91, 88, 85, 78, 62, 72]} />

        {/* Previous Reports & History Button */}
        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => router.push("/history" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.historyLeft}>
            <Text style={styles.historyIcon}>📂</Text>
            <View>
              <Text style={styles.historyTitle}>BATCH SCAN HISTORY</Text>
              <Text style={styles.historySubtitle}>
                Inspect previous reports, QR certificates, and SQLite records
              </Text>
            </View>
          </View>
          <Text style={styles.historyArrow}>→</Text>
        </TouchableOpacity>

        {/* Quick Settings & Mode Banner */}
        <TouchableOpacity
          style={styles.settingsBanner}
          onPress={() => router.push("/settings" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
          <View style={styles.settingsTextArea}>
            <Text style={styles.settingsTitle}>SETTINGS & MULTILINGUAL ADVISORY</Text>
            <Text style={styles.settingsSubtitle}>
              Current: {language.toUpperCase()} • Demo Mode: {isDemoMode ? "ON" : "OFF"}
            </Text>
          </View>
          <Text style={styles.settingsArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/camera" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>⚡ SCAN</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90
  },
  probeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  probeBannerOnline: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "#059669"
  },
  probeBannerOffline: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderColor: "#334155"
  },
  probeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  probeStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10
  },
  probeTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800"
  },
  probeSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2
  },
  probeAction: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8
  },
  primaryScanCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME_COLORS.primary,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
    shadowColor: THEME_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  scanGlow: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(16, 185, 129, 0.15)"
  },
  scanIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  scanIconText: {
    fontSize: 28
  },
  scanTextContainer: {
    flex: 1
  },
  scanTitle: {
    color: "#F8FAFC",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  scanSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3
  },
  scanArrowBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8
  },
  scanArrow: {
    color: "#090D16",
    fontSize: 18,
    fontWeight: "900"
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: -4
  },
  historyCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  historyIcon: {
    fontSize: 24,
    marginRight: 14
  },
  historyTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800"
  },
  historySubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500"
  },
  historyArrow: {
    color: "#94A3B8",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8
  },
  settingsBanner: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: 12
  },
  settingsTextArea: {
    flex: 1
  },
  settingsTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800"
  },
  settingsSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600"
  },
  settingsArrow: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "800"
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: THEME_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: THEME_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10
  },
  fabIcon: {
    color: "#090D16",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
