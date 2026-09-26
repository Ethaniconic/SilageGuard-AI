/**
 * SCREEN 8 - BATCH DETAILS & DIAGNOSTIC AUDIT
 * Deep-dive audit view for a specific saved silage scan:
 * - Scanned silage surface preview
 * - Sensor telemetry breakdown & Delta T graphs (handles null sensors gracefully)
 * - MSSI score breakdown
 * - Detailed agronomic explanations
 * - Voice advisory replay
 * - QR code certificate export & copy
 * - Vector AppIcons throughout
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
import { AppIcon } from "../components/AppIcon";
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
        <Header title="SilageGuard AI" showBack={true} />
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
      <Header title="SilageGuard AI" showBack={true} />

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
                borderColor: theme.unsafe,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AppIcon name="alert" size={16} color={theme.unsafe} />
              <Text style={[styles.overrideTitle, { color: theme.unsafe, marginLeft: 6 }]}>
                DETERMINISTIC OVERRIDE: {batch.rule_reason}
              </Text>
            </View>
            <Text style={[styles.overrideReason, { color: theme.unsafe }]}>
              Safety lock applied to protect cattle health.
            </Text>
          </View>
        )}

        {/* Primary Verdict Card */}
        <TrafficLightCard
          decision={batch.decision}
          confidence={batch.confidence}
          mssiScore={batch.mssi_score}
          cropType={batch.crop_type}
          pitDepthCm={batch.pit_depth_cm}
        />

        {/* Score Gauge */}
        <MssiScoreGauge
          score={batch.mssi_score}
          decision={batch.decision}
          confidence={batch.confidence}
        />

        {/* Multi-Modal Evidence Breakdown */}
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
            MULTIMODAL EVIDENCE CHAIN
          </Text>
          {explainabilityPoints.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.explainRow,
                { borderBottomColor: theme.cardBorder },
                idx === explainabilityPoints.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <View style={styles.explainHeader}>
                <Text style={[styles.explainParam, { color: theme.text }]}>
                  {item.parameter}
                </Text>
                <Text
                  style={[
                    styles.explainStatus,
                    {
                      color:
                        item.status === "NORMAL"
                          ? theme.safe
                          : item.status === "UNAVAILABLE"
                          ? theme.textMuted
                          : theme.unsafe
                    }
                  ]}
                >
                  {item.measuredValue}
                </Text>
              </View>
              <Text style={[styles.explainText, { color: theme.textMuted }]}>
                {item.assessment}
              </Text>
            </View>
          ))}
        </View>

        {/* Sensor Breakdown Grid */}
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
            SENSOR TELEMETRY ARCHIVE
          </Text>

          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.gridCellHeader}>
                <AppIcon name="ph" size={13} color={theme.safe} />
                <Text style={[styles.cellLabel, { color: theme.textMuted, marginLeft: 4 }]}>pH Acidity</Text>
              </View>
              <Text style={[styles.cellVal, { color: sensor.ph !== null ? theme.safe : theme.textMuted }]}>
                {sensor.ph !== null ? sensor.ph.toFixed(2) : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Optimal: 3.8 - 4.2</Text>
            </View>

            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.gridCellHeader}>
                <AppIcon name="water" size={13} color={theme.accent} />
                <Text style={[styles.cellLabel, { color: theme.textMuted, marginLeft: 4 }]}>Moisture</Text>
              </View>
              <Text style={[styles.cellVal, { color: sensor.moisture !== null ? theme.accent : theme.textMuted }]}>
                {sensor.moisture !== null ? `${sensor.moisture.toFixed(1)}%` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Optimal: 60 - 68%</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.gridCellHeader}>
                <AppIcon name="thermometer" size={13} color={theme.caution} />
                <Text style={[styles.cellLabel, { color: theme.textMuted, marginLeft: 4 }]}>Core Temp</Text>
              </View>
              <Text style={[styles.cellVal, { color: sensor.temperature !== null ? theme.caution : theme.textMuted }]}>
                {sensor.temperature !== null ? `${sensor.temperature.toFixed(1)}C` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>
                Ambient: {sensor.ambient !== null ? `${sensor.ambient.toFixed(1)}C` : "--"}
              </Text>
            </View>

            <View style={[styles.gridCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.gridCellHeader}>
                <AppIcon name="trending-up" size={13} color={theme.primary} />
                <Text style={[styles.cellLabel, { color: theme.textMuted, marginLeft: 4 }]}>Delta T Rise</Text>
              </View>
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
                {sensor.delta_temp !== null ? `+${sensor.delta_temp.toFixed(1)}C` : "--"}
              </Text>
              <Text style={[styles.cellTarget, { color: theme.textMuted }]}>Safe: &lt; 3.0C</Text>
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
              <AppIcon name="check" size={12} color={theme.primary} strokeWidth={2.5} />
              <Text style={[styles.reasonText, { color: theme.text, marginLeft: 6 }]}>{r}</Text>
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AppIcon name="volume" size={16} color={theme.text} />
              <Text style={[styles.voiceTitle, { color: theme.text, marginLeft: 6 }]}>
                FARMER ADVISORY ({language.toUpperCase()})
              </Text>
            </View>
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
              <AppIcon name="refresh" size={11} color={theme.accent} />
              <Text style={[styles.voiceBtnText, { color: theme.accent, marginLeft: 4 }]}>
                Replay Audio
              </Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <AppIcon name="qr-code" size={16} color={theme.text} />
            <Text style={[styles.cardHeaderTitle, { color: theme.text, marginLeft: 6, marginBottom: 0 }]}>
              VERIFIABLE QR PAYLOAD
            </Text>
          </View>
          <View
            style={[
              styles.qrPayloadBox,
              {
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <Text style={[styles.qrPayloadText, { color: theme.textMuted }]}>{batch.qr_data}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.shareBtn,
              { backgroundColor: theme.primary, borderRadius: theme.radiusSm }
            ]}
            onPress={handleShareCertificate}
          >
            <AppIcon name="share" size={15} color="#090D16" />
            <Text style={[styles.shareBtnText, { marginLeft: 6 }]}>SHARE / COPY CERTIFICATE</Text>
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
  gridCellHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
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
    alignItems: "center",
    marginVertical: 4
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4
  },
  shareBtnText: {
    color: "#090D16",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
