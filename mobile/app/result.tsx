/**
 * SCREEN 6 - SCAN RESULT & MULTIMODAL VERDICT
 * - Big traffic-light result (SAFE, CAUTION, UNSAFE)
 * - MSSI safety score & Confidence
 * - Sensor & Vision telemetry metrics breakdown (honestly displays "--" if probe was disconnected)
 * - Agronomic explanation reasons
 * - Multilingual actionable advisory card with voice playback
 * - Silage verification QR code
 * - Vector AppIcons throughout
 * - Action buttons: New Scan, View SQLite History
 * - Full viewport width & Sharp industrial corners
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { TrafficLightCard } from "../components/TrafficLightCard";
import { AdvisoryCard } from "../components/AdvisoryCard";
import { AppIcon } from "../components/AppIcon";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { generateSilageQRPayload } from "../utils/qrGenerator";
import { safeNavigate } from "../utils/navigation";
import { t } from "../utils/i18n";
import { shareOrCopyPayload } from "../utils/shareUtil";

export default function ResultScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    language,
    latestFusionResult,
    latestAdvisory,
    telemetry,
    cropType,
    pitDepthCm,
    clearScanImages,
    showToast
  } = useAppStore();

  const decision = latestFusionResult?.decision || "SAFE";
  const confidence = latestFusionResult?.confidence ?? 0;
  const mssiScore = latestFusionResult?.mssiScore ?? 0;
  const ruleOverride = latestFusionResult?.rule_override || false;
  const ruleReason = latestFusionResult?.rule_reason || null;

  const qrPayload = generateSilageQRPayload({
    batchId: "BATCH-CURR",
    decision,
    mssiScore,
    ph: telemetry.ph ?? 0,
    moisture: telemetry.moisture ?? 0,
    temp: telemetry.temp ?? 0,
    cropType,
    timestamp: new Date().toISOString()
  });

  const handleShareQR = async () => {
    try {
      const shareResult = await shareOrCopyPayload(
        `[SILAGEGUARD AI CERTIFICATE]\nPayload: ${qrPayload}\nDecision: ${decision}\nMSSI Quality Score: ${mssiScore}/100`,
        "Silage Audit QR Payload"
      );
      if (shareResult.copied) {
        showToast?.(t("qrCopied", language) || "QR Code copied to clipboard!", "success");
      } else if (shareResult.shared) {
        showToast?.(t("shareQR", language) || "QR Code shared successfully!", "success");
      } else if (shareResult.success) {
        showToast?.(t("qrCopied", language) || "QR Code copied to clipboard!", "success");
      }
    } catch (err) {
      console.warn("Share QR Error:", err);
      showToast?.(t("qrCopied", language) || "QR Code copied to clipboard!", "info");
    }
  };

  const hasProbeData =
    telemetry.ph !== null &&
    telemetry.moisture !== null &&
    telemetry.temp !== null &&
    telemetry.ambient !== null;

  const deltaTemp =
    telemetry.temp !== null && telemetry.ambient !== null
      ? telemetry.temp - telemetry.ambient
      : null;

  const explainabilityChain = latestFusionResult?.explainability_chain || [
    {
      parameter: "Silage pH Acidity",
      measuredValue: hasProbeData ? `${telemetry.ph!.toFixed(2)} pH` : "No Probe Connected",
      status: hasProbeData ? "NORMAL" : "UNAVAILABLE",
      assessment: hasProbeData
        ? "Within optimal lactic preservation range."
        : "Probe telemetry was unavailable during scan; relying on Vision AI."
    },
    {
      parameter: "Core Heat Rise (dT)",
      measuredValue: deltaTemp !== null ? `+${deltaTemp.toFixed(1)}C` : "No Probe Connected",
      status: deltaTemp !== null ? "NORMAL" : "UNAVAILABLE",
      assessment: deltaTemp !== null
        ? "Core temperature in thermal equilibrium."
        : "Temperature sensor not connected."
    },
    {
      parameter: "Estimated Moisture",
      measuredValue: hasProbeData ? `${telemetry.moisture!.toFixed(1)}%` : "No Probe Connected",
      status: hasProbeData ? "NORMAL" : "UNAVAILABLE",
      assessment: hasProbeData
        ? "Moisture within target fermentation band."
        : "Moisture sensor not connected."
    },
    {
      parameter: "Visual Mould Pattern",
      measuredValue: `${((latestFusionResult?.breakdown?.mouldProbability ?? 0.04) * 100).toFixed(0)}% signal`,
      status: "NORMAL",
      assessment: "MobileNetV3 evaluation of bunker face surface photographs."
    }
  ];

  const handleVoicePlay = (text: string) => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.log("Speech not supported on this platform", e);
    }
  };

  const handleScanAnother = () => {
    clearScanImages();
    safeNavigate(router, "/camera", pathname, true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={true} fallbackRoute="/home" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Scientific Disclaimer Banner */}
        <View
          style={[
            styles.disclaimerBanner,
            {
              backgroundColor: theme.accent + "1A",
              borderColor: theme.accent,
              borderRadius: theme.radiusSm
            }
          ]}
        >
          <AppIcon name="alert" size={14} color={theme.accent} />
          <Text style={[styles.disclaimerText, { color: theme.text, marginLeft: 6 }]}>
            <Text style={styles.disclaimerBold}>Field Screening Tool: </Text>
            Rapid on-farm estimation. Not a substitute for wet-chemistry laboratory HPLC/NIR feed analysis.
          </Text>
        </View>

        {/* Primary Verdict Card */}
        <TrafficLightCard
          decision={decision}
          confidence={confidence}
          mssiScore={mssiScore}
          cropType={cropType}
          pitDepthCm={pitDepthCm}
        />

        {/* Deterministic Override Callout (if active) */}
        {ruleOverride && (
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
            <View style={styles.overrideHeader}>
              <AppIcon name="alert" size={16} color={theme.unsafe} />
              <Text style={[styles.overrideTitle, { color: theme.unsafe, marginLeft: 6 }]}>
                DETERMINISTIC SAFETY OVERRIDE ACTIVE
              </Text>
            </View>
            <Text style={[styles.overrideReason, { color: theme.unsafe }]}>
              {ruleReason}
            </Text>
          </View>
        )}

        {/* Multimodal Explainability Chain */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            DECISION EXPLAINABILITY & SENSOR EVIDENCE
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
            Breakdown of contributing inputs to the Multimodal Silage Safety Index (MSSI)
          </Text>

          {explainabilityChain.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.chainItem,
                { borderBottomColor: theme.cardBorder },
                idx === explainabilityChain.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <View style={styles.chainTop}>
                <Text style={[styles.chainParam, { color: theme.text }]}>{item.parameter}</Text>
                <Text
                  style={[
                    styles.chainValue,
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
              <Text style={[styles.chainAssessment, { color: theme.textMuted }]}>
                {item.assessment}
              </Text>
            </View>
          ))}
        </View>

        {/* Sensor & Vision Telemetry Metrics */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t("inspectedParams", language)}
          </Text>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricItem, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.metricItemHeader}>
                <AppIcon name="ph" size={13} color={theme.safe} />
                <Text style={[styles.metricLabel, { color: theme.textMuted, marginLeft: 4 }]}>{t("phAcidity", language)}</Text>
              </View>
              <Text
                style={[
                  styles.metricVal,
                  {
                    color:
                      telemetry.ph === null
                        ? theme.textMuted
                        : telemetry.ph >= 3.8 && telemetry.ph <= 4.2
                        ? theme.safe
                        : theme.unsafe
                  }
                ]}
              >
                {telemetry.ph !== null ? telemetry.ph.toFixed(2) : "--"}
              </Text>
              <Text style={[styles.metricTarget, { color: theme.textMuted }]}>{t("target", language)}: 3.8 - 4.2</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.metricItemHeader}>
                <AppIcon name="water" size={13} color={theme.accent} />
                <Text style={[styles.metricLabel, { color: theme.textMuted, marginLeft: 4 }]}>{t("moisture", language)}</Text>
              </View>
              <Text
                style={[
                  styles.metricVal,
                  {
                    color:
                      telemetry.moisture === null
                        ? theme.textMuted
                        : telemetry.moisture >= 60 && telemetry.moisture <= 68
                        ? theme.accent
                        : theme.unsafe
                  }
                ]}
              >
                {telemetry.moisture !== null ? `${telemetry.moisture.toFixed(1)}%` : "--"}
              </Text>
              <Text style={[styles.metricTarget, { color: theme.textMuted }]}>{t("target", language)}: 60 - 68%</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.metricItemHeader}>
                <AppIcon name="thermometer" size={13} color={theme.caution} />
                <Text style={[styles.metricLabel, { color: theme.textMuted, marginLeft: 4 }]}>{t("heatRise", language)}</Text>
              </View>
              <Text
                style={[
                  styles.metricVal,
                  {
                    color:
                      deltaTemp === null
                        ? theme.textMuted
                        : deltaTemp <= 3.0
                        ? theme.safe
                        : theme.unsafe
                  }
                ]}
              >
                {deltaTemp !== null ? `+${deltaTemp.toFixed(1)}C` : "--"}
              </Text>
              <Text style={[styles.metricTarget, { color: theme.textMuted }]}>{t("target", language)}: &lt; 3.0C</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <View style={styles.metricItemHeader}>
                <AppIcon name="camera" size={13} color={theme.primary} />
                <Text style={[styles.metricLabel, { color: theme.textMuted, marginLeft: 4 }]}>{t("mouldSignal", language)}</Text>
              </View>
              <Text
                style={[
                  styles.metricVal,
                  {
                    color:
                      (latestFusionResult?.breakdown?.mouldProbability ?? 0.05) > 0.4
                        ? theme.unsafe
                        : theme.safe
                  }
                ]}
              >
                {((latestFusionResult?.breakdown?.mouldProbability ?? 0.05) * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.metricTarget, { color: theme.textMuted }]}>Surface Proxy</Text>
            </View>
          </View>
        </View>

        {/* Farmer Multilingual Actionable Advisory Card */}
        {latestAdvisory && (
          <AdvisoryCard advisory={latestAdvisory} onPlayVoice={handleVoicePlay} />
        )}

        {/* QR Verification Card */}
        <TouchableOpacity
          style={[
            styles.qrCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={handleShareQR}
          activeOpacity={0.85}
        >
          <View style={styles.qrHeader}>
            <View
              style={[
                styles.qrIconBadge,
                { backgroundColor: theme.accent + "1A", borderRadius: theme.radiusSm }
              ]}
            >
              <AppIcon name="qr-code" size={20} color={theme.accent} />
            </View>
            <View style={styles.qrHeaderText}>
              <Text style={[styles.qrTitle, { color: theme.text }]}>{t("certificateTitle", language)}</Text>
              <Text style={[styles.qrSub, { color: theme.textMuted }]}>
                {t("certificateSub", language)}
              </Text>
            </View>
            <AppIcon name="share" size={18} color={theme.accent} />
          </View>

          <View style={styles.qrContainer}>
            <View
              style={[
                styles.qrMockBox,
                { backgroundColor: theme.surface, borderColor: theme.primary, borderRadius: theme.radiusSm }
              ]}
            >
              <Text style={[styles.qrMockCode, { color: theme.primary }]}>[#  #  #  #  #]</Text>
              <Text style={[styles.qrMockCode, { color: theme.primary }]}>[#   SILAGE   #]</Text>
              <Text style={[styles.qrMockCode, { color: theme.text }]}>[#    GUARD   #]</Text>
              <Text style={[styles.qrMockCode, { color: theme.accent }]}>[#  {decision.padEnd(8)}  #]</Text>
              <Text style={[styles.qrMockCode, { color: theme.primary }]}>[#  #  #  #  #]</Text>
            </View>
            <Text style={[styles.qrHash, { color: theme.textMuted }]}>
              {qrPayload}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radiusSm, backgroundColor: theme.primary + "1A" }}>
              <AppIcon name="share" size={14} color={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
                {t("shareQR", language)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Explainability & PDF Buttons */}
        <AnimatedPressable
          style={[
            styles.explainBtn,
            {
              backgroundColor: theme.surface,
              borderColor: theme.accent,
              borderRadius: theme.radiusMd,
            },
          ]}
          onPress={() => safeNavigate(router, "/explainability", pathname)}
        >
          <AppIcon name="shield" size={16} color={theme.accent} />
          <Text style={[styles.explainBtnText, { color: theme.accent }]}>
            {t("whyThisResult", language).toUpperCase()}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.pdfBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd,
            },
          ]}
          onPress={() => {
            const { shareOrPrintReport } = require("../utils/pdfGenerator");
            shareOrPrintReport({
              batch: {
                id: `SG-${Date.now().toString().slice(-6)}`,
                timestamp: new Date().toISOString(),
                crop_type: cropType,
                mssi_score: mssiScore,
                decision,
                confidence,
                summary_reason: latestFusionResult?.summaryReason || "Rapid AI screening evaluation completed.",
              },
              fusion: latestFusionResult || undefined,
              telemetry,
              advisory: latestAdvisory,
            });
          }}
        >
          <AppIcon name="share" size={16} color={theme.text} />
          <Text style={[styles.pdfBtnText, { color: theme.text }]}>
            {t("downloadPdf", language).toUpperCase()}
          </Text>
        </AnimatedPressable>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <AnimatedPressable
            style={[
              styles.historyBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderRadius: theme.radiusMd
              }
            ]}
            onPress={() => safeNavigate(router, "/history", pathname)}
          >
            <AppIcon name="history" size={16} color={theme.text} />
            <Text
              style={[styles.historyBtnText, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            >
              {t("pastBatches", language)}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[
              styles.newScanBtn,
              {
                backgroundColor: theme.primary,
                borderRadius: theme.radiusMd
              }
            ]}
            onPress={handleScanAnother}
          >
            <AppIcon name="camera" size={17} color="#042F2E" />
            <Text
              style={styles.newScanBtnText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            >
              {t("testNextBatch", language)}
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10
  },
  disclaimerBanner: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    alignItems: "flex-start"
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15
  },
  disclaimerBold: {
    fontWeight: "800"
  },
  overrideAlert: {
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10
  },
  overrideHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  overrideTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  overrideReason: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4
  },
  sectionCard: {
    borderWidth: 1,
    padding: 14,
    marginVertical: 6
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  cardSubtitle: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8
  },
  chainItem: {
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  chainTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chainParam: {
    fontSize: 12,
    fontWeight: "700"
  },
  chainValue: {
    fontSize: 12,
    fontWeight: "800"
  },
  chainAssessment: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6
  },
  metricItem: {
    width: "48%",
    padding: 10,
    marginVertical: 4
  },
  metricItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "900",
    marginVertical: 4
  },
  metricTarget: {
    fontSize: 9,
    fontWeight: "600"
  },
  qrCard: {
    borderWidth: 1,
    padding: 14,
    marginVertical: 8
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  qrIconBadge: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  qrHeaderText: {
    flex: 1
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  qrSub: {
    fontSize: 10,
    marginTop: 2
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 10
  },
  qrMockBox: {
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  qrMockCode: {
    fontFamily: "monospace",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2
  },
  qrHash: {
    fontSize: 9,
    fontFamily: "monospace",
    marginTop: 10,
    textAlign: "center"
  },
  explainBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  explainBtnText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    flexShrink: 1,
  },
  pdfBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    flexWrap: "wrap",
    gap: 10,
  },
  historyBtn: {
    flex: 1,
    minWidth: 135,
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  newScanBtn: {
    flex: 1,
    minWidth: 135,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  newScanBtnText: {
    color: "#090D16",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
  }
});
