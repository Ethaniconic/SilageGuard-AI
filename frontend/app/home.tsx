/**
 * SCREEN 2 - HOME DASHBOARD
 * Main farmer landing interface:
 * - High-contrast Dark/Light theme support
 * - Reduced screen padding to maximize viewport width
 * - Sharp industrial corners (less rounded)
 * - Safe area top-inset handling
 * - Zero dummy data: Starts empty until scans are performed
 * - High-definition vector AppIcons across all cards
 * - Transparent live probe connection banner
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { QualityTrendChart } from "../components/QualityTrendChart";
import { AppIcon } from "../components/AppIcon";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { batchRepository } from "../sqlite/batchRepository";
import { BottomNavBar } from "../components/BottomNavBar";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bleStatus, telemetry, language, isDemoMode } = useAppStore();
  const { theme } = useTheme();

  const [stats, setStats] = useState({
    total: 0,
    safeCount: 0,
    cautionCount: 0,
    unsafeCount: 0,
    avgMssi: 0
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

  const isConnected = bleStatus === "CONNECTED";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 80
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hardware Status Banner */}
        <TouchableOpacity
          style={[
            styles.probeBanner,
            {
              backgroundColor: isConnected ? theme.safeBg : theme.card,
              borderColor: isConnected ? theme.safeBorder : theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={() => router.push("/ble" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.probeLeft}>
            <View
              style={[
                styles.probeStatusDot,
                { backgroundColor: isConnected ? theme.primary : theme.unsafe }
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.probeTitle, { color: theme.text }]}>
                {isConnected ? "ESP32-S3 Silage Probe Connected" : "Probe Disconnected - Tap to Pair"}
              </Text>
              <Text style={[styles.probeSubtitle, { color: theme.textMuted }]}>
                {isConnected && telemetry.ph !== null
                  ? `Telemetry Active | ${telemetry.battery}% Battery | pH ${telemetry.ph} | ${telemetry.temp}C`
                  : "Tap to connect BLE hardware probe or test with demo preset"}
              </Text>
            </View>
          </View>
          <View style={styles.probeActionBadge}>
            <AppIcon
              name={isConnected ? "bluetooth-connected" : "bluetooth"}
              size={14}
              color={isConnected ? theme.safe : theme.accent}
            />
            <Text
              style={[
                styles.probeActionText,
                { color: isConnected ? theme.safe : theme.accent }
              ]}
            >
              {isConnected ? "LIVE" : "PAIR"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* PRIMARY BIG SCAN BUTTON (Farmer-Friendly, High Contrast) */}
        <TouchableOpacity
          style={[
            styles.primaryScanCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.primary,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={() => router.push("/camera" as any)}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.scanIconBadge,
              { backgroundColor: theme.primary + "22", borderRadius: theme.radiusSm }
            ]}
          >
            <AppIcon name="camera" size={24} color={theme.primary} />
          </View>
          <View style={styles.scanTextContainer}>
            <Text style={[styles.scanTitle, { color: theme.text }]}>START SILAGE SCAN</Text>
            <Text style={[styles.scanSubtitle, { color: theme.textMuted }]}>
              Camera Surface Inspection + Probe Sensor AI Fusion
            </Text>
          </View>
          <View
            style={[
              styles.scanArrowBadge,
              { backgroundColor: theme.primary, borderRadius: theme.radiusSm }
            ]}
          >
            <AppIcon name="arrow-forward" size={16} color="#090D16" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Quick Metrics Row - ZERO dummy data */}
        <View style={styles.statsRow}>
          <StatCard
            label="TODAY'S SCANS"
            value={stats.total}
            subtext={stats.total > 0 ? "Saved locally" : "No scans yet"}
            iconName="scan"
            accentColor={theme.accent}
          />
          <StatCard
            label="SAFE BATCHES"
            value={stats.total > 0 ? `${stats.safeCount}/${stats.total}` : "0/0"}
            subtext={
              stats.total > 0
                ? `${Math.round((stats.safeCount / stats.total) * 100)}% Pass Rate`
                : "Awaiting scans"
            }
            iconName="shield"
            accentColor={theme.safe}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="AVG MSSI INDEX"
            value={stats.total > 0 ? `${stats.avgMssi}/100` : "--"}
            subtext={stats.total > 0 ? "Safety benchmark" : "No data"}
            iconName="trending-up"
            accentColor={theme.primary}
          />
          <StatCard
            label="PROBE BATTERY"
            value={isConnected && telemetry.battery !== null ? `${telemetry.battery}%` : "--"}
            subtext={isConnected ? "Li-Ion Active" : "Disconnected"}
            iconName="battery"
            accentColor={theme.caution}
          />
        </View>

        {/* Quality Trend Graph */}
        <QualityTrendChart dataPoints={trendPoints} />

        {/* Previous Reports & History Button */}
        <TouchableOpacity
          style={[
            styles.historyCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={() => router.push("/history" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.historyLeft}>
            <View
              style={[
                styles.navIconBadge,
                { backgroundColor: theme.accent + "1A", borderRadius: theme.radiusSm }
              ]}
            >
              <AppIcon name="history" size={18} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>BATCH SCAN HISTORY</Text>
              <Text style={[styles.historySubtitle, { color: theme.textMuted }]}>
                {stats.total > 0
                  ? `Review ${stats.total} saved batch records and QR certificates`
                  : "View previous audit records, QR certificates, and SQLite storage"}
              </Text>
            </View>
          </View>
          <AppIcon name="arrow-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Quick Settings & Mode Banner */}
        <TouchableOpacity
          style={[
            styles.settingsBanner,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={() => router.push("/settings" as any)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.navIconBadge,
              { backgroundColor: theme.primary + "1A", borderRadius: theme.radiusSm }
            ]}
          >
            <AppIcon name="settings" size={18} color={theme.primary} />
          </View>
          <View style={styles.settingsTextArea}>
            <Text style={[styles.settingsTitle, { color: theme.text }]}>
              SETTINGS & MULTILINGUAL ADVISORY
            </Text>
            <Text style={[styles.settingsSubtitle, { color: theme.textMuted }]}>
              Language: {language.toUpperCase()} | Demo Mode: {isDemoMode ? "ON" : "OFF"}
            </Text>
          </View>
          <AppIcon name="arrow-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12
  },
  probeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  probeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  probeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  probeTitle: {
    fontSize: 12,
    fontWeight: "800"
  },
  probeSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2
  },
  probeActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6
  },
  probeActionText: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4
  },
  primaryScanCard: {
    borderWidth: 2,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  scanIconBadge: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  scanTextContainer: {
    flex: 1
  },
  scanTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  scanSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2
  },
  scanArrowBadge: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: -3
  },
  historyCard: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  navIconBadge: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "800"
  },
  historySubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500"
  },
  settingsBanner: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  settingsTextArea: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 11,
    fontWeight: "800"
  },
  settingsSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600"
  },
});
