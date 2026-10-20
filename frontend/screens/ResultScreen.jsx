import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { MetricCard } from "../components/MetricCard";
import { AppButton } from "../components/AppButton";
import * as Speech from "expo-speech";

export function ResultScreen({ result: initialResult, onDone, onViewHistory }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t, language } = useTranslation();

  const [result, setResult] = useState(initialResult || {});
  const [activePhotoTab, setActivePhotoTab] = useState(initialResult?.gradcamImage ? "GRADCAM" : "ORIGINAL");
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showTechnical, setShowTechnical] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const verdict = result?.verdict || "GOOD";
  const isGood = verdict === "GOOD" || verdict === "SAFE";
  const isWatch = verdict === "WATCH" || verdict === "CAUTION";
  const isRisk = !isGood && !isWatch;

  // Centralized, honest agronomic recommendation
  const farmerRecommendation = isGood
    ? t("voiceAdviceSafe")
    : isWatch
    ? t("voiceAdviceCaution")
    : t("voiceAdviceHighRisk");

  const handleSpeakAdvice = async () => {
    try {
      const isSpeakingNow = await Speech.isSpeakingAsync().catch(() => false);
      if (isSpeakingNow) {
        await Speech.stop();
        setIsSpeaking(false);
        return;
      }

      setIsSpeaking(true);
      Speech.speak(farmerRecommendation, {
        language: language === "en" ? "en" : language === "hi" ? "hi-IN" : language,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (err) {
      console.warn("Speech playback error:", err);
      setIsSpeaking(false);
    }
  };

  // Dynamic color palette relative to the driving inference verdict
  const themeColors = isGood
    ? {
        accent: "#10B981",
        bgSoft: "#ECFDF5",
        border: "#6EE7B7",
        badgeBg: "#D1FAE5",
        textTitle: "#065F46",
        icon: "✓",
        badgeLabel: t("verdictSafeFeeding"),
      }
    : isWatch
    ? {
        accent: "#F59E0B",
        bgSoft: "#FFFBEB",
        border: "#FCD34D",
        badgeBg: "#FEF3C7",
        textTitle: "#92400E",
        icon: "⚠",
        badgeLabel: t("verdictEarlyCaution"),
      }
    : {
        accent: "#EF4444",
        bgSoft: "#FEF2F2",
        border: "#FCA5A5",
        badgeBg: "#FEE2E2",
        textTitle: "#991B1B",
        icon: "✕",
        badgeLabel: t("verdictHighRisk"),
      };

  const hasGradcam = Boolean(result?.gradcamImage);
  const hasOriginalPhoto = Boolean(result?.originalPhoto);
  const hasSensor = Boolean(result?.hasSensor);

  // Vision breakdown
  const visionClass =
    result?.visionResult?.detected_class ||
    result?.visionResult?.class_name ||
    (result?.visionResult ? "Unclassified" : "No Visual Data");
  const classProbs = result?.visionResult?.class_probabilities || null;

  // Primary activation hotspot bounding box coordinates (scaled relative to 224x224 input grid)
  const bbox = result?.hotspotBbox;
  const bboxLeft = bbox ? `${Math.max(0, Math.min(95, (bbox.xmin / 224) * 100))}%` : "0%";
  const bboxTop = bbox ? `${Math.max(0, Math.min(95, (bbox.ymin / 224) * 100))}%` : "0%";
  const bboxWidth = bbox ? `${Math.max(5, Math.min(100, ((bbox.xmax - bbox.xmin) / 224) * 100))}%` : "0%";
  const bboxHeight = bbox ? `${Math.max(5, Math.min(100, ((bbox.ymax - bbox.ymin) / 224) * 100))}%` : "0%";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t("resultTitle")}
        subtitle={result?.batchId || "Silage Quality Assessment"}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* MODALITY IDENTIFICATION BADGE */}
        <View style={styles.modalityRow}>
          <View style={[styles.modalityBadge, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
            <Text style={[typography.caption, { color: theme.textSecondary, fontWeight: "700" }]}>
              {hasSensor ? t("multimodalFusionBadge") : t("visionOnlyBadge")}
            </Text>
          </View>
        </View>

        {/* DYNAMIC VERDICT HERO CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: themeColors.bgSoft,
              borderColor: themeColors.border,
              borderRadius: radius.large,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.heroCenter}>
            <View style={[styles.verdictIconCircle, { backgroundColor: themeColors.accent }]}>
              <Text style={styles.verdictIconText}>{themeColors.icon}</Text>
            </View>

            <View style={[styles.safetyStatusPill, { backgroundColor: themeColors.badgeBg, borderColor: themeColors.border }]}>
              <Text style={[typography.caption, { color: themeColors.textTitle, fontWeight: "800", letterSpacing: 0.5 }]}>
                {themeColors.badgeLabel}
              </Text>
            </View>

            <Text style={[typography.display, { color: themeColors.textTitle, textAlign: "center", marginTop: 8 }]}>
              {isGood ? t("good") : isWatch ? t("watch") : t("highRisk")}
            </Text>

            <Text style={[typography.body, { color: theme.textPrimary, textAlign: "center", marginTop: 6, lineHeight: 22 }]}>
              {result?.summary || t("summaryDefault")}
            </Text>

            {/* FARMER VOICE GUIDANCE BUTTON */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSpeakAdvice}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: themeColors.badgeBg,
                  borderColor: themeColors.border,
                  borderRadius: radius.large,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 12,
                  minHeight: 48,
                  marginTop: 14,
                },
              ]}
            >
              <Text style={{ fontSize: 20 }}>🔊</Text>
              <Text style={[typography.caption, { color: themeColors.textTitle, fontWeight: "800", marginLeft: 8, fontSize: 13 }]}>
                {isSpeaking ? t("speaking") : t("speakAdvice")}
              </Text>
            </TouchableOpacity>

            {/* MSSI SCORE STRIP */}
            <View style={[styles.scoreStrip, { backgroundColor: "#FFFFFF", borderColor: themeColors.border }]}>
              <View style={styles.scoreCol}>
                <Text style={[typography.caption, { color: "#334155", fontWeight: "700" }]}>{t("mssiIndex")}</Text>
                <Text style={[typography.screenTitle, { color: "#000000", fontWeight: "900" }]}>
                  {result?.mssiScore !== null && result?.mssiScore !== undefined ? result.mssiScore : "--"}
                  <Text style={{ fontSize: 14, color: "#475569", fontWeight: "700" }}>/100</Text>
                </Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: themeColors.border }]} />
              <View style={styles.scoreCol}>
                <Text style={[typography.caption, { color: "#334155", fontWeight: "700" }]}>{t("modelConfidence")}</Text>
                <Text style={[typography.screenTitle, { color: "#000000", fontWeight: "900" }]}>
                  {result?.confidence !== null && result?.confidence !== undefined ? `${result.confidence}%` : "--"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* TRANSPARENT VISION & GRAD-CAM EXPLAINABILITY CARD */}
        {(hasGradcam || hasOriginalPhoto) && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderRadius: radius.large,
                padding: spacing.lg,
                marginTop: spacing.md,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
                  {t("aiVisualExplainability")}
                </Text>
                <Text style={[typography.caption, { color: theme.textSecondary }]}>
                  {t("mobilenetAttention")}
                </Text>
              </View>
              <StatusBadge
                status={isGood ? "GOOD" : isWatch ? "WATCH" : "ALERT"}
                label={visionClass}
                size="small"
              />
            </View>

            {/* TAB SELECTOR: GRAD-CAM VS HOTSPOT VS ORIGINAL */}
            <View style={[styles.photoTabsRow, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.large }]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setActivePhotoTab("GRADCAM")}
                style={[
                  styles.photoTabButton,
                  activePhotoTab === "GRADCAM"
                    ? {
                        backgroundColor: theme.primary,
                        borderRadius: radius.medium,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.28,
                        shadowRadius: 5,
                        elevation: 3,
                      }
                    : {
                        backgroundColor: "transparent",
                      },
                ]}
              >
                <Text style={{ fontSize: 18, marginBottom: 3 }}>🔬</Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: activePhotoTab === "GRADCAM" ? "#FFFFFF" : theme.textSecondary,
                      fontWeight: activePhotoTab === "GRADCAM" ? "800" : "600",
                      fontSize: 12,
                      letterSpacing: 0.2,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("tabGradcam")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setActivePhotoTab("HOTSPOT")}
                style={[
                  styles.photoTabButton,
                  activePhotoTab === "HOTSPOT"
                    ? {
                        backgroundColor: theme.primary,
                        borderRadius: radius.medium,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.28,
                        shadowRadius: 5,
                        elevation: 3,
                      }
                    : {
                        backgroundColor: "transparent",
                      },
                ]}
              >
                <Text style={{ fontSize: 18, marginBottom: 3 }}>🎯</Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: activePhotoTab === "HOTSPOT" ? "#FFFFFF" : theme.textSecondary,
                      fontWeight: activePhotoTab === "HOTSPOT" ? "800" : "600",
                      fontSize: 12,
                      letterSpacing: 0.2,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("tabHotspot")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setActivePhotoTab("ORIGINAL")}
                style={[
                  styles.photoTabButton,
                  activePhotoTab === "ORIGINAL"
                    ? {
                        backgroundColor: theme.primary,
                        borderRadius: radius.medium,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.28,
                        shadowRadius: 5,
                        elevation: 3,
                      }
                    : {
                        backgroundColor: "transparent",
                      },
                ]}
              >
                <Text style={{ fontSize: 18, marginBottom: 3 }}>📷</Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: activePhotoTab === "ORIGINAL" ? "#FFFFFF" : theme.textSecondary,
                      fontWeight: activePhotoTab === "ORIGINAL" ? "800" : "600",
                      fontSize: 12,
                      letterSpacing: 0.2,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("tabOriginal")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* IMAGE DISPLAY CONTAINER WITH OPTIONAL BOUNDING BOX OVERLAY */}
            <View style={[styles.imageViewer, { borderColor: theme.border, borderRadius: radius.medium, backgroundColor: "#000000" }]}>
              <Image
                source={{
                  uri:
                    activePhotoTab === "GRADCAM"
                      ? (result.gradcamImage || result.originalPhoto)
                      : (result.originalPhoto || result.gradcamImage),
                }}
                style={styles.fullImage}
                resizeMode="cover"
              />

              {/* BOUNDING BOX HOTSPOT OVERLAY */}
              {showBoundingBox && bbox && (activePhotoTab === "GRADCAM" || activePhotoTab === "HOTSPOT") && (
                <View
                  style={[
                    styles.bboxOverlay,
                    {
                      left: bboxLeft,
                      top: bboxTop,
                      width: bboxWidth,
                      height: bboxHeight,
                      borderColor: isGood ? "#10B981" : isWatch ? "#F59E0B" : "#EF4444",
                    },
                  ]}
                >
                  <View style={[styles.bboxBadge, { backgroundColor: isGood ? "#10B981" : isWatch ? "#F59E0B" : "#EF4444" }]}>
                    <Text style={styles.bboxBadgeText}>{t("hotspotFocus")}</Text>
                  </View>
                </View>
              )}

              {/* OVERLAY MODE PILL */}
              <View style={styles.imageOverlayPill}>
                <Text style={styles.imageOverlayText}>
                  {activePhotoTab === "GRADCAM"
                    ? (hasGradcam ? t("deepHeatmapOverlay") : t("gradcamOfflineOverlay"))
                    : activePhotoTab === "HOTSPOT"
                    ? t("hotspotIsolationOverlay")
                    : t("rawCameraCapture")}
                </Text>
              </View>
            </View>

            {/* GRAD-CAM COLOR INTENSITY SCALE LEGEND */}
            {hasGradcam && activePhotoTab === "GRADCAM" && (
              <View style={[styles.scaleLegendBox, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
                <View style={styles.scaleBar}>
                  <View style={[styles.scaleSegment, { backgroundColor: "#00008F" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#0047FF" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#00E0FF" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#7AFF00" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#FFE500" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#FF3300" }]} />
                  <View style={[styles.scaleSegment, { backgroundColor: "#7F0000" }]} />
                </View>
                <View style={styles.scaleLabelsRow}>
                  <Text style={[typography.caption, { color: theme.textSecondary, fontSize: 10 }]}>{t("scaleSafe")}</Text>
                  <Text style={[typography.caption, { color: theme.textSecondary, fontSize: 10 }]}>{t("scaleElevated")}</Text>
                  <Text style={[typography.caption, { color: theme.highRisk, fontSize: 10, fontWeight: "700" }]}>{t("scalePeak")}</Text>
                </View>
              </View>
            )}

            {/* HOTSPOT DIAGNOSTIC CALLOUT */}
            <View style={[styles.hotspotBox, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.small }]}>
              <Text style={[typography.caption, { color: theme.textPrimary, lineHeight: 18 }]}>
                💡 <Text style={{ fontWeight: "700" }}>{t("aiDiagnosticLabel")}</Text>{" "}
                {result?.hotspotDescription ||
                  (isGood
                    ? t("healthyDiagnosticText")
                    : t("spoilageDiagnosticText"))}
              </Text>
            </View>

            {/* CLASS PROBABILITY BARS (5-CLASS BREAKDOWN) */}
            {classProbs && (
              <View style={{ marginTop: 14 }}>
                <Text style={[typography.caption, { color: theme.textMuted, marginBottom: 8, fontWeight: "700" }]}>
                  {t("probabilityDistribution")}
                </Text>
                {Object.entries(classProbs).map(([cls, prob]) => {
                  const pct = Math.round(prob * 100);
                  const isHealthy = cls === "Healthy";
                  const isSevere = cls === "Mould" || cls === "Spoilage";
                  const barColor = isHealthy ? theme.good : isSevere ? theme.highRisk : theme.watch;

                  return (
                    <View key={cls} style={styles.probRow}>
                      <Text style={[typography.caption, { color: theme.textSecondary, width: 135 }]} numberOfLines={1}>
                        {cls.replace("_", " ")}
                      </Text>
                      <View style={[styles.probTrack, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.probFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[typography.caption, { color: theme.textPrimary, width: 42, textAlign: "right", fontWeight: "700" }]}>
                        {pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* HONEST PHYSICAL SENSOR READINGS CARD */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <View style={[styles.rowBetween, { marginBottom: 6, paddingHorizontal: 4 }]}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
              {t("probeTelemetryTitle")}
            </Text>
            <StatusBadge
              status={hasSensor ? "GOOD" : "OFFLINE"}
              label={hasSensor ? t("probeConnectedLabel") : t("probeOmittedLabel")}
              size="small"
            />
          </View>

          {hasSensor ? (
            <>
              <View style={styles.metricsGridRow}>
                <View style={styles.metricCol}>
                  <MetricCard label={t("phLevel")} value={result.ph} status={result.ph <= 4.2 ? "NORMAL" : "ALERT"} hint={t("optimalAcidity")} />
                </View>
                <View style={styles.metricCol}>
                  <MetricCard label={t("moisture")} value={result.moisture} unit="%" status={result.moisture <= 68 ? "NORMAL" : "WARNING"} hint={t("safeMoistureBand")} />
                </View>
              </View>
              <View style={styles.metricsGridRow}>
                <View style={styles.metricCol}>
                  <MetricCard label={t("coreTemp")} value={result.temperature} unit="°C" status="NORMAL" hint={t("stableAnaerobicCore")} />
                </View>
                <View style={styles.metricCol}>
                  <MetricCard
                    label={t("ambientTemp")}
                    value={result.ambient !== null && result.ambient !== undefined ? result.ambient : "--"}
                    unit="°C"
                    status="NORMAL"
                    hint={t("relativeToAmbient")}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.noSensorBanner, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.medium, padding: spacing.md }]}>
              <Text style={{ fontSize: 28, textAlign: "center", marginBottom: 6 }}>📡</Text>
              <Text style={[typography.bodyBold, { color: theme.textPrimary, textAlign: "center" }]}>
                {t("probeNotConnectedTitle")}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginTop: 4, lineHeight: 18 }]}>
                {t("probeNotConnectedSub")}
              </Text>
            </View>
          )}
        </View>

        {/* ACTIONABLE AGRONOMIC NEXT STEPS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
            {t("nextStep")}
          </Text>
          <Text style={[typography.bodyBold, { color: themeColors.textTitle, marginTop: 6, fontSize: 15 }]}>
            {farmerRecommendation}
          </Text>
          {result?.nextStep ? (
            <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 4, lineHeight: 20 }]}>
              {result.nextStep}
            </Text>
          ) : null}
        </View>

        {/* SCIENTIFIC DISCLAIMER */}
        <View style={{ marginVertical: spacing.md, paddingHorizontal: 8 }}>
          <Text style={[typography.caption, { color: theme.textMuted, textAlign: "center" }]}>
            {t("disclaimer")}
          </Text>
        </View>

        {/* ACTIONS */}
        <View style={{ marginTop: 20 }}>
          <AppButton
            title={t("viewHistory")}
            variant="outline"
            size="large"
            onPress={onViewHistory}
          />
          <AppButton
            title={t("returnHome")}
            variant="primary"
            size="large"
            onPress={onDone}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* TECHNICAL DETAILS TOGGLE (JUDGES & DEVS) */}
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.md, alignItems: "center" }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowTechnical(!showTechnical)}
            style={{ paddingVertical: 12, paddingHorizontal: 16 }}
          >
            <Text style={[typography.caption, { color: theme.primary, fontWeight: "700", textDecorationLine: "underline" }]}>
              {showTechnical ? t("hideTechnical") : t("showTechnical")}
            </Text>
          </TouchableOpacity>
        </View>

        {showTechnical && (
          <View
            style={[
              styles.techBox,
              {
                backgroundColor: theme.surfaceSoft,
                borderColor: theme.border,
                borderRadius: radius.medium,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.caption, { color: theme.textPrimary, fontFamily: "monospace", fontSize: 11, lineHeight: 18 }]}>
              Modality: {result?.modalityState || "MULTIMODAL"}{"\n"}
              Inference Mode: {result?.isOfflineInference ? "Edge On-Device (0 Internet)" : "Server FastAPI Fusion"}{"\n"}
              Vision Model: MobileNetV3-Large 5-Class (97.92% Test Accuracy){"\n"}
              Grad-CAM Target Layer: features[-1] (Hardswish Bottleneck){"\n"}
              Sensor Model: 25-Tree Random Forest (11 features){"\n"}
              Hotspot Bounding Box: {result?.hotspotBbox ? JSON.stringify(result.hotspotBbox) : "None"}{"\n"}
              Measured Latency: {result?.latencyMs !== null && result?.latencyMs !== undefined ? `${result.latencyMs} ms` : "--"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  modalityRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  modalityBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroCard: {
    borderWidth: 1.5,
  },
  heroCenter: {
    alignItems: "center",
  },
  verdictIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  verdictIconText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  safetyStatusPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 4,
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scoreStrip: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    width: "100%",
    paddingVertical: 10,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  scoreCol: {
    alignItems: "center",
    flex: 1,
  },
  scoreDivider: {
    width: 1,
    height: "70%",
  },
  sectionCard: {
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoTabsRow: {
    flexDirection: "row",
    padding: 6,
    marginVertical: 14,
    borderWidth: 1,
    gap: 8,
  },
  photoTabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  imageViewer: {
    width: "100%",
    height: 250,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  bboxOverlay: {
    position: "absolute",
    borderWidth: 2.5,
    borderRadius: 4,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  bboxBadge: {
    position: "absolute",
    top: -12,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bboxBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  imageOverlayPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  scaleLegendBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  scaleBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  scaleSegment: {
    flex: 1,
    height: "100%",
  },
  scaleLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  hotspotBox: {
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  probRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  probTrack: {
    flex: 1,
    height: 7,
    borderRadius: 3.5,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  probFill: {
    height: "100%",
    borderRadius: 3.5,
  },
  metricsGridRow: {
    flexDirection: "row",
    marginHorizontal: -3,
    marginTop: 4,
  },
  metricCol: {
    flex: 1,
  },
  noSensorBanner: {
    borderWidth: 1,
    marginTop: 4,
  },
  techBox: {
    borderWidth: 1,
  },
});
