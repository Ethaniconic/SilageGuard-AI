/**
 * SCREEN 6 — SCAN RESULT & MULTIMODAL VERDICT
 * - Big traffic-light result (SAFE, CAUTION, UNSAFE)
 * - MSSI safety score & Confidence
 * - Sensor & Vision telemetry metrics breakdown
 * - Agronomic explanation reasons
 * - Multilingual actionable advisory card with voice playback
 * - Silage verification QR code
 * - Action buttons: New Scan, View SQLite History
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { TrafficLightCard } from "../components/TrafficLightCard";
import { AdvisoryCard } from "../components/AdvisoryCard";
import { MssiScoreGauge } from "../components/MssiScoreGauge";
import { useAppStore } from "../features/ble/bleManager";
import { generateSilageQRPayload } from "../utils/qrGenerator";
import { THEME_COLORS } from "../utils/constants";

export default function ResultScreen() {
  const router = useRouter();
  const {
    latestFusionResult,
    latestAdvisory,
    telemetry,
    cropType,
    pitDepthCm,
    clearScanImages
  } = useAppStore();

  const [showQRModal, setShowQRModal] = useState(false);

  // Fallback defaults if accessed directly
  const decision = latestFusionResult?.decision || "SAFE";
  const confidence = latestFusionResult?.confidence || 94;
  const mssiScore = latestFusionResult?.mssiScore || 88;
  const explanations = latestFusionResult?.explanations || [
    "Optimal lactic acid fermentation maintained.",
    "No fungal mould detected."
  ];

  const handleVoicePlay = (text: string) => {
    try {
      // Dynamic import of expo-speech or browser speech
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utter);
      } else {
        const Speech = require("expo-speech");
        Speech.speak(text, { language: latestAdvisory?.language || "en" });
      }
    } catch (e) {
      console.log("Voice TTS notice:", e);
    }
  };

  const handleScanAnother = () => {
    clearScanImages();
    router.replace("/camera" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="QUALITY ASSESSMENT" showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BIG TRAFFIC LIGHT RESULT */}
        <TrafficLightCard
          decision={decision}
          confidence={confidence}
          mssiScore={mssiScore}
        />

        {/* Radial MSSI Score Centerpiece */}
        <View style={styles.gaugeContainer}>
          <MssiScoreGauge score={mssiScore} size={150} />
          <View style={styles.gaugeInfo}>
            <Text style={styles.gaugeTitle}>MULTIMODAL SILAGE SAFETY INDEX</Text>
            <Text style={styles.gaugeSub}>
              Sensor Weight: 55% • Vision Weight: 45%
            </Text>
            <Text style={styles.cropBadge}>
              🌾 {cropType} • Depth: {pitDepthCm} cm
            </Text>
          </View>
        </View>

        {/* Telemetry Breakdown Cards */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>PHYSICAL SENSOR & VISION METRICS</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Silage pH</Text>
              <Text style={[styles.metricVal, { color: telemetry.ph <= 4.2 ? THEME_COLORS.safe : THEME_COLORS.caution }]}>
                {telemetry.ph.toFixed(2)}
              </Text>
              <Text style={styles.metricTarget}>Target: 3.8 - 4.2</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Moisture %</Text>
              <Text style={styles.metricVal}>{telemetry.moisture.toFixed(1)}%</Text>
              <Text style={styles.metricTarget}>Target: 60 - 68%</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Thermal Rise (ΔT)</Text>
              <Text style={styles.metricVal}>
                +{(telemetry.temp - telemetry.ambient).toFixed(1)}°C
              </Text>
              <Text style={styles.metricTarget}>Target: &lt; 3.0°C</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Mould Probability</Text>
              <Text style={[styles.metricVal, { color: latestFusionResult?.breakdown.mouldProbability && latestFusionResult.breakdown.mouldProbability > 0.4 ? THEME_COLORS.unsafe : THEME_COLORS.safe }]}>
                {((latestFusionResult?.breakdown.mouldProbability ?? 0.05) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.metricTarget}>Target: &lt; 15%</Text>
            </View>
          </View>
        </View>

        {/* Agronomic Reasons List */}
        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>🔍 DIAGNOSTIC INFERENCE EXPLANATIONS</Text>
          {explanations.map((reason, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* Farmer Multilingual Actionable Advisory Card */}
        {latestAdvisory && (
          <AdvisoryCard advisory={latestAdvisory} onPlayVoice={handleVoicePlay} />
        )}

        {/* QR Verification Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrIcon}>📱</Text>
            <View style={styles.qrHeaderText}>
              <Text style={styles.qrTitle}>DIGITAL BATCH CERTIFICATE</Text>
              <Text style={styles.qrSub}>
                Verifiable QR for Dairy Co-operatives & Milk Unions
              </Text>
            </View>
          </View>

          {/* QR Code Matrix Display */}
          <View style={styles.qrContainer}>
            <View style={styles.qrMockBox}>
              <Text style={styles.qrMockCode}>■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</Text>
              <Text style={styles.qrMockCode}>■   ■   ■   ■   ■   ■</Text>
              <Text style={styles.qrMockCode}>■ ■   SILAGEGUARD  ■ ■</Text>
              <Text style={styles.qrMockCode}>■   ■   {decision}   ■   ■</Text>
              <Text style={styles.qrMockCode}>■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</Text>
            </View>
            <Text style={styles.qrHash}>
              {generateSilageQRPayload({
                batchId: "BATCH-CURR",
                decision,
                mssiScore,
                ph: telemetry.ph,
                moisture: telemetry.moisture,
                temp: telemetry.temp,
                cropType,
                timestamp: new Date().toISOString()
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push("/history" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.historyBtnText}>VIEW PAST BATCHES</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newScanBtn}
            onPress={handleScanAnother}
            activeOpacity={0.85}
          >
            <Text style={styles.newScanBtnText}>+ TEST NEXT BATCH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 40
  },
  gaugeContainer: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10
  },
  gaugeInfo: {
    flex: 1,
    marginLeft: 16
  },
  gaugeTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  gaugeSub: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4
  },
  cropBadge: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start"
  },
  metricsBox: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  boxTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  metricItem: {
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700"
  },
  metricVal: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 4
  },
  metricTarget: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600"
  },
  reasonsCard: {
    backgroundColor: "rgba(19, 28, 46, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  reasonsTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 10
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8
  },
  reasonBullet: {
    color: THEME_COLORS.primary,
    fontSize: 16,
    marginRight: 8,
    lineHeight: 18
  },
  reasonText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    flex: 1
  },
  qrCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 18,
    marginVertical: 12
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },
  qrIcon: {
    fontSize: 24,
    marginRight: 10
  },
  qrHeaderText: {
    flex: 1
  },
  qrTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800"
  },
  qrSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center"
  },
  qrMockBox: {
    alignItems: "center",
    paddingVertical: 10
  },
  qrMockCode: {
    color: "#0F172A",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 12
  },
  qrHash: {
    color: "#475569",
    fontSize: 9,
    fontFamily: "monospace",
    marginTop: 10,
    textAlign: "center"
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  historyBtn: {
    flex: 1,
    backgroundColor: THEME_COLORS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginRight: 8
  },
  historyBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800"
  },
  newScanBtn: {
    flex: 1,
    backgroundColor: THEME_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginLeft: 8
  },
  newScanBtnText: {
    color: "#090D16",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
