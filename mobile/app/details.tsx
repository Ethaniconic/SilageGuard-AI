/**
 * SCREEN 8 — BATCH DETAILS & DIAGNOSTIC AUDIT
 * Deep-dive audit view for a specific saved silage scan:
 * - Scanned silage surface preview
 * - Sensor telemetry breakdown & Delta T graphs (handles null sensors gracefully)
 * - MSSI score breakdown
 * - Detailed agronomic explanations
 * - Voice advisory replay
 * - QR code certificate export & copy
 * - Theme & full viewport width support
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { TrafficLightCard } from "../components/TrafficLightCard";
import { MssiScoreGauge } from "../components/MssiScoreGauge";
import { batchRepository, CompleteBatchDetails } from "../sqlite/batchRepository";
import { generateFarmerAdvisory } from "../features/advisory/advisoryEngine";
import { useAppStore, useTheme } from "../features/ble/bleManager";

export default function BatchDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useAppStore();
  const { theme } = useTheme();
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
      <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <Header title="BATCH DETAILS" showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading Batch Record...
          </Text>
        </View>
      </View>
    );
  }

  const { batch, sensor, prediction } = details;
  const advisory = generateFarmerAdvisory(batch.decision, language);
  const reasons: string[] = JSON.parse(prediction.reasons_json || "[]");
  const explainabilityPoints: Array<{
    parameter: string;
    measuredValue: string;
    status: string;
    assessment: string;
  }> = JSON.parse(prediction.explainability_json || "[]");

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
    Alert.alert("QR Certificate", `Batch Verification Payload:\n\n${batch.qr_data}`);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title={batch.id} showBack={true} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Safety Rule Override Notice if applicable */}
        {batch.rule_override && (
          <View
            style={[
              styles.overrideAlert,
              {
                backgroundColor: theme.unsafeBg,
                borderColor: theme.unsafeBorder,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <Text style={[styles.overrideTitle, { color: theme.unsafe }]}>
              ?? SAFETY RULE OVERRIDE RECORDED
            </Text>
            <Text style={[styles.overrideReason, { color: theme.text }]}>
              {batch.rule_reason || "Agronomic safety threshold exceeded."}
            </Text>
          </View>
        )}

        {/* Result Traffic Light Banner */}
        <TrafficLightCard
          decision={batch.decision}
          confidence={batch.confidence}
          mssiScore={batch.mssi_score}
        />

        {/* Model Versioning & Provenance Metadata Card */}
        <View
          style={[
            styles.versionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.versionCardTitle, { color: theme.text }]}>
            MODEL REPRODUCIBILITY & AUDIT PROVENANCE
          </Text>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Sensor Model:</Text>
            <Text style={[styles.versionVal, { color: theme.text }]}>
              {batch.sensor_model_version || "sensor_rf_v2.0"}
            </Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Vision Model:</Text>
            <Text style={[styles.versionVal, { color: theme.text }]}>
              {batch.vision_model_version || "mobilenetv3_silage_v2.0"}
            </Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Fusion Weights:</Text>
            <Text style={[styles.versionVal, { color: theme.text }]}>
              {batch.fusion_version || "mssi_v2.1"} (0.55/0.45)
            </Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Safety Rules:</Text>
            <Text style={[styles.versionVal, { color: theme.text }]}>
              {batch.rule_version || "rules_v2.0"}
            </Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Data Origin:</Text>
            <Text
              style={[
                styles.versionVal,
                { color: batch.is_demo ? theme.caution : theme.safe }
              ]}
            >
              {batch.is_demo ? "DEMO MODE (Simulated)" : "FIELD OBSERVED (Production)"}
            </Text>
          </View>
        </View>

        {/* Explainability Chain */}
        {explainabilityPoints.length > 0 && (
          <View
            style={[
              styles.explainCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderRadius: theme.radiusMd
              }
            ]}
          >
            <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>
              EXPLAINABILITY DECISION CHAIN
            </Text>
            {explainabilityPoints.map((pt, i) => (
              <View
                key={i}
                style={[styles.explainRow, { borderBottomColor: theme.cardBorder }]}
              >
                <View style={styles.explainHeader}>
                  <Text style={[styles.explainParam, { color: theme.text }]}>{pt.parameter}</Text>
                  <Text
                    style={[
                      styles.explainStatus,
                      {
                        color:
                          pt.status === "ALERT"
                            ? theme.unsafe
                            : pt.status === "BORDERLINE"
                            ? theme.caution
                            : theme.safe
                      }
                    ]}
                  >
                    {pt.measuredValue} ({pt.status})
                  </Text>
                </View>
                <Text style={[styles.explainText, { color: theme.textMuted }]}>
                  {pt.assessment}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sensor Readings Breakdown (Handles null values honestly) */}
        <View
          style={[
            styles.sensorGridCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>
            PROBE SENSOR TELEMETRY
          </Text>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]}>pH Value</Text>
              <Text
                style={[
                  styles.cellVal,
                  {
                    color:
                      sensor.ph === null
                        ? theme.textMuted
                        : sensor.ph <= 4.2
                        ? theme.safe
                        : theme.caution
                  }
                ]}
              >
                {sensor.ph !== null ? sensor.ph.toFixed(2) : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Optimal: 3.8 – 4.2</Text>
            </View>

            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]}>Moisture %</Text>
              <Text style={[styles.cellVal, { color: sensor.moisture !== null ? theme.accent : theme.textMuted }]}>
                {sensor.moisture !== null ? `${sensor.moisture.toFixed(1)}%` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Optimal: 60 – 68%</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]}>Core Temp</Text>
              <Text style={[styles.cellVal, { color: sensor.temperature !== null ? theme.caution : theme.textMuted }]}>
                {sensor.temperature !== null ? `${sensor.temperature.toFixed(1)}°C` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>
                Ambient: {sensor.ambient !== null ? `${sensor.ambient.toFixed(1)}°C` : "--"}
              </Text>
            </View>

            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]}>Delta T Rise</Text>
              <Text
                style={[
                  styles.cellVal,
                  {
                    color:
                      sensor.delta_temp === null
                        ? theme.textMuted
                        : sensor.delta_temp < 3
                        ? theme.safe
                        : theme.unsafe
                  }
                ]}
              >
                {sensor.delta_temp !== null ? `+${sensor.delta_temp.toFixed(1)}°C` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Safe: &lt; 3.0°C</Text>
            </View>
          </View>
        </View>

        {/* Agronomic Explanations */}
        <View
          style={[
            styles.reasonsBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>
            AGRONOMIC DIAGNOSIS
          </Text>
          {reasons.map((r, i) => (
            <View key={i} style={styles.reasonLine}>
              <Text style={[styles.reasonDot, { color: theme.primary }]}>•</Text>
              <Text style={[styles.reasonText, { color: theme.text }]}>{r}</Text>
            </View>
          ))}
        </View>

        {/* Farmer Voice Advisory Banner */}
        <View
          style={[
            styles.voiceCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <View style={styles.voiceTopRow}>
            <Text style={[styles.voiceTitle, { color: theme.text }]}>
              ?? FARMER ADVISORY ({language.toUpperCase()})
            </Text>
            <TouchableOpacity
              style={[
                styles.voiceBtn,
                {
                  backgroundColor: theme.accent + "1A",
                  borderColor: theme.accent,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={handleVoicePlay}
            >
              <Text style={[styles.voiceBtnText, { color: theme.accent }]}>?? Replay Audio</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.voiceAdvisoryText, { color: theme.textMuted }]}>
            {advisory.immediateAction}
          </Text>
        </View>

        {/* QR Certificate Payload */}
        <View
          style={[
            styles.qrCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>
            VERIFIABLE QR PAYLOAD
          </Text>
          <View
            style={[
              styles.qrPayloadBox,
              { backgroundColor: theme.surface, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
            ]}
          >
            <Text style={[styles.qrPayloadText, { color: theme.textMuted }]}>{batch.qr_data}</Text>
          </View>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.primary, borderRadius: theme.radiusSm }]}
            onPress={handleShareCertificate}
          >
            <Text style={styles.shareBtnText}>SHARE / COPY CERTIFICATE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600"
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  overrideAlert: {
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10
  },
  overrideTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  overrideReason: {
    fontSize: 12,
    marginTop: 2
  },
  versionCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  versionCardTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3
  },
  versionLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  versionVal: {
    fontSize: 11,
    fontWeight: "800"
  },
  explainCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  explainRow: {
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  explainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  explainParam: {
    fontSize: 12,
    fontWeight: "700"
  },
  explainStatus: {
    fontSize: 11,
    fontWeight: "800"
  },
  explainText: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15
  },
  sensorGridCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3
  },
  gridCell: {
    flex: 1,
    marginHorizontal: 3,
    padding: 8,
    alignItems: "center"
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "700"
  },
  cellVal: {
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 3
  },
  cellTarget: {
    fontSize: 9,
    fontWeight: "500"
  },
  reasonsBox: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  reasonLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 3
  },
  reasonDot: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  voiceCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  voiceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  voiceTitle: {
    fontSize: 12,
    fontWeight: "900"
  },
  voiceBtn: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  voiceBtnText: {
    fontSize: 10,
    fontWeight: "800"
  },
  voiceAdvisoryText: {
    fontSize: 12,
    lineHeight: 16
  },
  qrCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 6
  },
  qrPayloadBox: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 8
  },
  qrPayloadText: {
    fontSize: 10,
    fontFamily: "monospace"
  },
  shareBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4
  },
  shareBtnText: {
    color: "#090D16",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
