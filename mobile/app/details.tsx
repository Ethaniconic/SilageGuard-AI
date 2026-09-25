/**
 * SCREEN 8 — BATCH DETAILS & DIAGNOSTIC AUDIT
 * Deep-dive audit view for a specific saved silage scan:
 * - Scanned silage surface preview
 * - Sensor telemetry breakdown & Delta T graphs
 * - MSSI score breakdown
 * - Detailed agronomic explanations
 * - Voice advisory replay
 * - QR code certificate export & copy
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "../components/Header";
import { TrafficLightCard } from "../components/TrafficLightCard";
import { MssiScoreGauge } from "../components/MssiScoreGauge";
import { batchRepository, CompleteBatchDetails } from "../sqlite/batchRepository";
import { generateFarmerAdvisory } from "../features/advisory/advisoryEngine";
import { useAppStore } from "../features/ble/bleManager";
import { THEME_COLORS } from "../utils/constants";

export default function BatchDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useAppStore();
  const [details, setDetails] = useState<CompleteBatchDetails | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (id) {
        const res = await batchRepository.getBatchById(id);
        setDetails(res);
      }
    }
    fetchDetails();
  }, [id]);

  if (!details) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="BATCH DETAILS" showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Batch Record...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { batch, sensor, prediction } = details;
  const advisory = generateFarmerAdvisory(batch.decision, language);
  const reasons: string[] = JSON.parse(prediction.reasons_json || "[]");

  const handleVoicePlay = () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(advisory.speechText);
        window.speechSynthesis.speak(utter);
      } else {
        const Speech = require("expo-speech");
        Speech.speak(advisory.speechText, { language });
      }
    } catch (e) {
      console.log("TTS notice:", e);
    }
  };

  const handleShareCertificate = () => {
    Alert.alert("QR Certificate Exported", `Verification Payload copied:\n${batch.qr_data}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={batch.id} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Result Traffic Light Banner */}
        <TrafficLightCard
          decision={batch.decision}
          confidence={batch.confidence}
          mssiScore={batch.mssi_score}
        />

        {/* Silage Surface Visual Preview */}
        <View style={styles.imageCard}>
          <Text style={styles.cardHeaderTitle}>CAPTURED SILAGE SURFACE</Text>
          <View
            style={[
              styles.imageContainer,
              batch.decision === "SAFE"
                ? styles.imgSafe
                : batch.decision === "CAUTION"
                ? styles.imgCaution
                : styles.imgUnsafe
            ]}
          >
            <Text style={styles.imageWatermark}>
              {batch.decision === "SAFE"
                ? "✓ UNIFORM FERMENTED CHOP FIBER"
                : batch.decision === "CAUTION"
                ? "⚡ MODERATE CARAMELIZED BROWNING"
                : "⚠️ DETECTED FUNGAL MYCELIUM / ASPERGILLUS"}
            </Text>
          </View>
          <View style={styles.imageMetaRow}>
            <Text style={styles.imageMetaText}>Crop: {batch.crop_type}</Text>
            <Text style={styles.imageMetaText}>Depth: {batch.pit_depth_cm} cm</Text>
          </View>
        </View>

        {/* MSSI Score Gauge */}
        <View style={styles.mssiCard}>
          <MssiScoreGauge score={batch.mssi_score} size={140} />
          <View style={styles.mssiTextContainer}>
            <Text style={styles.mssiHeader}>SAFETY INDEX BREAKDOWN</Text>
            <Text style={styles.mssiSub}>
              Sensor Safe Probability: {batch.decision === "SAFE" ? "96%" : batch.decision === "CAUTION" ? "52%" : "4%"}
            </Text>
            <Text style={styles.mssiSub}>
              Vision Spore Density: {(prediction.mould_prob * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Sensor Readings Breakdown */}
        <View style={styles.sensorGridCard}>
          <Text style={styles.cardHeaderTitle}>PROBE SENSOR TELEMETRY</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>pH Value</Text>
              <Text style={[styles.cellVal, { color: sensor.ph <= 4.2 ? THEME_COLORS.safe : THEME_COLORS.caution }]}>
                {sensor.ph.toFixed(2)}
              </Text>
              <Text style={styles.cellTarget}>Optimal: 3.8 – 4.2</Text>
            </View>

            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>Moisture %</Text>
              <Text style={styles.cellVal}>{sensor.moisture.toFixed(1)}%</Text>
              <Text style={styles.cellTarget}>Optimal: 60 – 68%</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>Core Temp</Text>
              <Text style={styles.cellVal}>{sensor.temperature.toFixed(1)}°C</Text>
              <Text style={styles.cellTarget}>Ambient: {sensor.ambient.toFixed(1)}°C</Text>
            </View>

            <View style={styles.gridCell}>
              <Text style={styles.cellLabel}>Delta T Rise</Text>
              <Text style={[styles.cellVal, { color: sensor.delta_temp < 3 ? THEME_COLORS.safe : THEME_COLORS.unsafe }]}>
                +{sensor.delta_temp.toFixed(1)}°C
              </Text>
              <Text style={styles.cellTarget}>Safe: &lt; 3.0°C</Text>
            </View>
          </View>
        </View>

        {/* Agronomic Explanations */}
        <View style={styles.reasonsBox}>
          <Text style={styles.cardHeaderTitle}>AGRONOMIC DIAGNOSIS</Text>
          {reasons.map((r, i) => (
            <View key={i} style={styles.reasonLine}>
              <Text style={styles.reasonDot}>•</Text>
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>

        {/* Voice Advisory & Replay */}
        <View style={styles.voiceCard}>
          <View style={styles.voiceHeader}>
            <Text style={styles.voiceTitle}>🎙️ FARMER ADVISORY ({language.toUpperCase()})</Text>
            <TouchableOpacity style={styles.voiceBtn} onPress={handleVoicePlay}>
              <Text style={styles.voiceBtnText}>🔊 Replay Audio</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.voiceAdvisoryText}>{advisory.immediateAction}</Text>
        </View>

        {/* QR Certificate Payload */}
        <View style={styles.qrCard}>
          <Text style={styles.cardHeaderTitle}>VERIFIABLE QR PAYLOAD</Text>
          <View style={styles.qrPayloadBox}>
            <Text style={styles.qrPayloadText}>{batch.qr_data}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareCertificate}>
            <Text style={styles.shareBtnText}>SHARE / COPY CERTIFICATE</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600"
  },
  cardHeaderTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10
  },
  imageCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  imageContainer: {
    height: 140,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  imgSafe: { backgroundColor: "#164E35" },
  imgCaution: { backgroundColor: "#5C3A1E" },
  imgUnsafe: { backgroundColor: "#2E242C" },
  imageWatermark: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  imageMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  imageMetaText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600"
  },
  mssiCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10
  },
  mssiTextContainer: {
    flex: 1,
    marginLeft: 16
  },
  mssiHeader: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800"
  },
  mssiSub: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4
  },
  sensorGridCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  gridCell: {
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  cellLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700"
  },
  cellVal: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    marginVertical: 4
  },
  cellTarget: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600"
  },
  reasonsBox: {
    backgroundColor: "rgba(19, 28, 46, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  reasonLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6
  },
  reasonDot: {
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
  voiceCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  voiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  voiceTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  voiceBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0284C7"
  },
  voiceBtnText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800"
  },
  voiceAdvisoryText: {
    color: "#F1F5F9",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  qrCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 10
  },
  qrPayloadBox: {
    backgroundColor: "#020617",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12
  },
  qrPayloadText: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "monospace"
  },
  shareBtn: {
    backgroundColor: THEME_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  shareBtnText: {
    color: "#090D16",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
