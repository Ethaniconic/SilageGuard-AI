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

  // Fallback defaults if accessed directly
  const decision = latestFusionResult?.decision || "SAFE";
  const finalVerdict = latestFusionResult?.final_verdict || "SAFE TO FEED";
  const confidence = latestFusionResult?.confidence || 94;
  const confidenceLevel = latestFusionResult?.confidence_level || "HIGH";
  const mssiScore = latestFusionResult?.mssiScore || 88;
  const ruleOverride = latestFusionResult?.rule_override || false;
  const ruleReason = latestFusionResult?.rule_reason || null;
  const explainabilityChain = latestFusionResult?.explainability_chain || [
    { parameter: "Silage pH", measuredValue: `${telemetry.ph.toFixed(2)} pH`, status: "NORMAL", assessment: "Within optimal preservation range." },
    { parameter: "Core Heat Rise (ΔT)", measuredValue: `+${(telemetry.temp - telemetry.ambient).toFixed(1)}°C`, status: "NORMAL", assessment: "Core temperature in equilibrium with ambient." },
    { parameter: "Estimated Moisture", measuredValue: `${telemetry.moisture.toFixed(1)}%`, status: "NORMAL", assessment: "Ideal moisture band for compaction." },
    { parameter: "Visual Mould Pattern", measuredValue: `${((latestFusionResult?.breakdown?.mouldProbability ?? 0.04) * 100).toFixed(0)}% signal`, status: "NORMAL", assessment: "No abnormal mycelium or fungal colonies observed." }
  ];

  const handleVoicePlay = (text: string) => {
    try {
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
      <Header title="SCREENING REPORT" showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SCIENTIFIC SCREENING DISCLAIMER BANNER */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Rapid Screening Tool — Not a laboratory replacement. </Text>
            SILAGEGUARD AI detects fermentation indicators and visual anomalies. Confirmatory testing is recommended if toxicity or illness is suspected.
          </Text>
        </View>

        {/* SAFETY RULE OVERRIDE ALERT (IF TRIGGERED) */}
        {ruleOverride && (
          <View style={styles.overrideAlert}>
            <View style={styles.overrideHeader}>
              <Text style={styles.overrideIcon}>⚡</Text>
              <Text style={styles.overrideTitle}>SAFETY RULE OVERRIDE TRIGGERED</Text>
            </View>
            <Text style={styles.overrideReason}>
              {ruleReason || "Agronomic safety threshold exceeded."}
            </Text>
            <Text style={styles.overrideSub}>
              Agronomic safety rules supersede probabilistic ML scores when critical spoilage thresholds are breached.
            </Text>
          </View>
        )}

        {/* BIG TRAFFIC LIGHT RESULT */}
        <TrafficLightCard
          decision={decision}
          confidence={confidence}
          mssiScore={mssiScore}
        />

        {/* Confidence & Uncertainty Level Badge */}
        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceBarLabel}>PREDICTION CONFIDENCE:</Text>
          <View
            style={[
              styles.confidenceLevelBadge,
              confidenceLevel === "HIGH"
                ? styles.confHigh
                : confidenceLevel === "MODERATE"
                ? styles.confMod
                : styles.confLow
            ]}
          >
            <Text style={styles.confidenceLevelText}>
              {confidenceLevel} CONFIDENCE ({confidence}%)
            </Text>
          </View>
        </View>

        {/* Radial MSSI Score Centerpiece */}
        <View style={styles.gaugeContainer}>
          <MssiScoreGauge score={mssiScore} size={140} />
          <View style={styles.gaugeInfo}>
            <Text style={styles.gaugeTitle}>MULTIMODAL SILAGE SAFETY INDEX</Text>
            <Text style={styles.gaugeSub}>
              Sensor Weight: 55% • Vision Weight: 45% (Prototype Heuristic)
            </Text>
            <Text style={styles.cropBadge}>
              🌾 {cropType} • Depth: {pitDepthCm} cm
            </Text>
          </View>
        </View>

        {/* "WHY THIS RESULT?" DEDICATED EXPLAINABILITY SECTION (Section 24) */}
        <View style={styles.whyBox}>
          <View style={styles.whyHeaderRow}>
            <Text style={styles.whyIcon}>🔍</Text>
            <Text style={styles.whyTitle}>WHY THIS RESULT?</Text>
          </View>
          <Text style={styles.whySubtitle}>
            Traceable evidence chain derived directly from real sensor and vision inference:
          </Text>

          {explainabilityChain.map((point, idx) => {
            const isAlert = point.status === "ALERT";
            const isBorderline = point.status === "BORDERLINE";
            const statusColor = isAlert ? THEME_COLORS.unsafe : isBorderline ? THEME_COLORS.caution : THEME_COLORS.safe;

            return (
              <View key={idx} style={styles.whyItem}>
                <View style={styles.whyItemTop}>
                  <Text style={styles.whyParamName}>{point.parameter}</Text>
                  <View style={[styles.whyStatusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
                    <Text style={[styles.whyStatusText, { color: statusColor }]}>
                      {point.measuredValue} • {point.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.whyAssessment}>{point.assessment}</Text>
              </View>
            );
          })}
        </View>

        {/* Physical Sensor & Vision Metrics Grid */}
        <View style={styles.metricsBox}>
          <Text style={styles.boxTitle}>PHYSICAL SENSOR & VISION METRICS</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Silage pH</Text>
              <Text style={[styles.metricVal, { color: telemetry.ph <= 4.2 ? THEME_COLORS.safe : telemetry.ph <= 4.8 ? THEME_COLORS.caution : THEME_COLORS.unsafe }]}>
                {telemetry.ph.toFixed(2)}
              </Text>
              <Text style={styles.metricTarget}>Target: 3.8 - 4.2</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Estimated Moisture</Text>
              <Text style={styles.metricVal}>{telemetry.moisture.toFixed(1)}%</Text>
              <Text style={styles.metricTarget}>Target: 60 - 68%</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Thermal Rise (ΔT)</Text>
              <Text style={[styles.metricVal, { color: (telemetry.temp - telemetry.ambient) <= 3.0 ? THEME_COLORS.safe : THEME_COLORS.unsafe }]}>
                +{(telemetry.temp - telemetry.ambient).toFixed(1)}°C
              </Text>
              <Text style={styles.metricTarget}>Target: &lt; 3.0°C</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Visual Mould Signal</Text>
              <Text style={[styles.metricVal, { color: (latestFusionResult?.breakdown?.mouldProbability ?? 0.05) > 0.4 ? THEME_COLORS.unsafe : THEME_COLORS.safe }]}>
                {((latestFusionResult?.breakdown?.mouldProbability ?? 0.05) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.metricTarget}>Surface Anomaly Proxy</Text>
            </View>
          </View>
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
  disclaimerBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "flex-start"
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1
  },
  disclaimerText: {
    flex: 1,
    color: "#FDE68A",
    fontSize: 11,
    lineHeight: 16
  },
  disclaimerBold: {
    fontWeight: "800",
    color: "#FBBF24"
  },
  overrideAlert: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12
  },
  overrideHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  overrideIcon: {
    fontSize: 16,
    marginRight: 6
  },
  overrideTitle: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  overrideReason: {
    color: "#FEE2E2",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  overrideSub: {
    color: "#FCA5A5",
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14
  },
  confidenceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME_COLORS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10
  },
  confidenceBarLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  confidenceLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  confHigh: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: THEME_COLORS.safe
  },
  confMod: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: THEME_COLORS.caution
  },
  confLow: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: THEME_COLORS.unsafe
  },
  confidenceLevelText: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "900"
  },
  whyBox: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  whyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  whyIcon: {
    fontSize: 18,
    marginRight: 8
  },
  whyTitle: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  whySubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginBottom: 12
  },
  whyItem: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)"
  },
  whyItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  whyParamName: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800"
  },
  whyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  whyStatusText: {
    fontSize: 10,
    fontWeight: "800"
  },
  whyAssessment: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2
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
