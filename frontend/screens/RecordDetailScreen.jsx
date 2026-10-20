import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { MetricCard } from "../components/MetricCard";
import { localDb } from "../services/db/localDb";

export function RecordDetailScreen({ batch, onBack }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();
  const [historyObs, setHistoryObs] = useState([]);
  const [activePhotoTab, setActivePhotoTab] = useState("GRADCAM"); // "GRADCAM" | "HOTSPOT" | "ORIGINAL"

  const b = batch || {};
  const batchId = b.client_batch_id || b.id || b.batchId;

  useEffect(() => {
    if (batchId) {
      localDb.getObservations(batchId).then((records) => {
        setHistoryObs(records || []);
      });
    }
  }, [batchId]);

  const latestObs = historyObs[0] || b;
  const originalPhoto = latestObs.originalPhoto || latestObs.image_base64 || latestObs.imageBase64 || b.originalPhoto || b.image_base64;
  const gradcamImage = latestObs.gradcamImage || latestObs.gradcam_image || b.gradcamImage || b.gradcam_image;
  const rawBbox = latestObs.hotspotBbox || latestObs.hotspot_bbox || b.hotspotBbox || b.hotspot_bbox;
  let hotspotBbox = null;
  if (rawBbox) {
    try {
      hotspotBbox = typeof rawBbox === "string" ? JSON.parse(rawBbox) : rawBbox;
    } catch (_) {
      hotspotBbox = null;
    }
  }
  const hotspotDesc = latestObs.hotspotDescription || latestObs.hotspot_description || b.hotspotDescription || b.hotspot_description;
  const visionClass = latestObs.visionClass || latestObs.vision_class || b.vision_class || b.decision || "SAFE";

  const isGood = b.decision === "GOOD" || b.decision === "SAFE" || latestObs.decision === "GOOD" || latestObs.decision === "SAFE";
  const isWatch = b.decision === "WATCH" || b.decision === "CAUTION" || latestObs.decision === "WATCH" || latestObs.decision === "CAUTION";
  const statusColor = isGood ? "#10B981" : isWatch ? "#F59E0B" : "#EF4444";

  const bboxLeft = hotspotBbox ? `${Math.max(0, Math.min(95, (hotspotBbox.xmin / 224) * 100))}%` : "0%";
  const bboxTop = hotspotBbox ? `${Math.max(0, Math.min(95, (hotspotBbox.ymin / 224) * 100))}%` : "0%";
  const bboxWidth = hotspotBbox ? `${Math.max(5, Math.min(100, ((hotspotBbox.xmax - hotspotBbox.xmin) / 224) * 100))}%` : "0%";
  const bboxHeight = hotspotBbox ? `${Math.max(5, Math.min(100, ((hotspotBbox.ymax - hotspotBbox.ymin) / 224) * 100))}%` : "0%";

  const hasAnyPhoto = Boolean(originalPhoto || gradcamImage);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={batchId || "Silage Batch"}
        subtitle={b.crop_type || b.cropType || "Silage Record"}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* CURRENT STATE OVERVIEW */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={[typography.caption, { color: theme.textMuted }]}>{t("healthState")}</Text>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginTop: 2 }]}>
                {b.decision || "GOOD"}
              </Text>
            </View>
            <StatusBadge status={b.decision || "GOOD"} size="large" />
          </View>

          <View style={styles.metricsGridRow}>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("phLevel")}
                value={b.ph !== null && b.ph !== undefined ? b.ph : "--"}
                status={b.ph == null ? "NORMAL" : b.ph <= 4.2 ? "NORMAL" : b.ph <= 4.8 ? "WARNING" : "ALERT"}
                hint={b.ph == null ? t("noPhSensor") : b.ph <= 4.2 ? t("optimalAcidity") : t("elevatedPh")}
              />
            </View>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("moisture")}
                value={b.moisture !== null && b.moisture !== undefined ? b.moisture : "--"}
                unit={b.moisture != null ? "%" : ""}
                status={b.moisture == null ? "NORMAL" : (b.moisture >= 60 && b.moisture <= 68) ? "NORMAL" : "WARNING"}
                hint={b.moisture == null ? t("awaitingSensorReading") : (b.moisture >= 60 && b.moisture <= 68) ? t("safeMoistureBand") : t("outsideTargetBand")}
              />
            </View>
          </View>
          <View style={styles.metricsGridRow}>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("coreTemp")}
                value={b.temperature !== null && b.temperature !== undefined ? b.temperature : "--"}
                unit={b.temperature != null ? "°C" : ""}
                status={b.temperature == null ? "NORMAL" : b.temperature <= 30 ? "NORMAL" : b.temperature <= 38 ? "WARNING" : "ALERT"}
                hint={b.temperature == null ? t("awaitingSensorReading") : b.temperature <= 30 ? t("stableAnaerobicCore") : t("aerobicHeatingDetected")}
              />
            </View>
            <View style={styles.metricCol}>
              <MetricCard
                label={t("healthScore")}
                value={b.mssi_score !== null && b.mssi_score !== undefined ? b.mssi_score : (b.mssiScore !== null && b.mssiScore !== undefined ? b.mssiScore : "--")}
                unit={b.mssi_score != null || b.mssiScore != null ? "/100" : ""}
                status={b.decision === "HIGH RISK" ? "ALERT" : b.decision === "WATCH" ? "WARNING" : "NORMAL"}
                hint={t("mssiIndex")}
              />
            </View>
          </View>
        </View>

        {/* SILAGE FEED INSPECTION PHOTO & MODEL EXPLAINABILITY CARD */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginTop: spacing.lg,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
                {t("inspectionFeedPhoto")}
              </Text>
              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {t("feedPhotoSub")}
              </Text>
            </View>
            <StatusBadge
              status={isGood ? "GOOD" : isWatch ? "WATCH" : "ALERT"}
              label={visionClass}
              size="small"
            />
          </View>

          {hasAnyPhoto ? (
            <View style={{ marginTop: spacing.md }}>
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
                          elevation: 3,
                        }
                      : { backgroundColor: "transparent" },
                  ]}
                >
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>🔬</Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: activePhotoTab === "GRADCAM" ? "#FFFFFF" : theme.textSecondary,
                        fontWeight: activePhotoTab === "GRADCAM" ? "800" : "600",
                        fontSize: 11,
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
                          elevation: 3,
                        }
                      : { backgroundColor: "transparent" },
                  ]}
                >
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>🎯</Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: activePhotoTab === "HOTSPOT" ? "#FFFFFF" : theme.textSecondary,
                        fontWeight: activePhotoTab === "HOTSPOT" ? "800" : "600",
                        fontSize: 11,
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
                          elevation: 3,
                        }
                      : { backgroundColor: "transparent" },
                  ]}
                >
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>📷</Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: activePhotoTab === "ORIGINAL" ? "#FFFFFF" : theme.textSecondary,
                        fontWeight: activePhotoTab === "ORIGINAL" ? "800" : "600",
                        fontSize: 11,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {t("tabOriginal")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* IMAGE VIEWER CONTAINER WITH BOUNDING BOX OVERLAY */}
              <View style={[styles.imageViewer, { borderColor: theme.border, borderRadius: radius.medium, backgroundColor: "#000000" }]}>
                <Image
                  source={{
                    uri:
                      activePhotoTab === "GRADCAM"
                        ? (gradcamImage || originalPhoto)
                        : (originalPhoto || gradcamImage),
                  }}
                  style={styles.fullImage}
                  resizeMode="cover"
                />

                {/* BOUNDING BOX HOTSPOT OVERLAY */}
                {hotspotBbox && (activePhotoTab === "GRADCAM" || activePhotoTab === "HOTSPOT") && (
                  <View
                    style={[
                      styles.bboxOverlay,
                      {
                        left: bboxLeft,
                        top: bboxTop,
                        width: bboxWidth,
                        height: bboxHeight,
                        borderColor: statusColor,
                      },
                    ]}
                  >
                    <View style={[styles.bboxBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.bboxBadgeText}>{t("hotspotFocus")}</Text>
                    </View>
                  </View>
                )}

                {/* OVERLAY MODE PILL */}
                <View style={styles.imageOverlayPill}>
                  <Text style={styles.imageOverlayText}>
                    {activePhotoTab === "GRADCAM"
                      ? (gradcamImage ? t("deepHeatmapOverlay") : t("gradcamOfflineOverlay"))
                      : activePhotoTab === "HOTSPOT"
                      ? t("hotspotIsolationOverlay")
                      : t("rawCameraCapture")}
                  </Text>
                </View>
              </View>

              {/* GRAD-CAM COLOR INTENSITY SCALE LEGEND */}
              {gradcamImage && activePhotoTab === "GRADCAM" && (
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
                    <View style={styles.scaleMarkerLeft}>
                      <Text style={[typography.caption, { color: theme.textSecondary, fontSize: 11, fontWeight: "700" }]}>0.0</Text>
                      <Text style={[typography.caption, { color: theme.textMuted, fontSize: 9 }]} numberOfLines={1}>
                        {t("scaleSafeShort") || "Safe"}
                      </Text>
                    </View>
                    <View style={styles.scaleMarkerCenter}>
                      <Text style={[typography.caption, { color: theme.textSecondary, fontSize: 11, fontWeight: "700" }]}>0.5</Text>
                      <Text style={[typography.caption, { color: theme.textMuted, fontSize: 9 }]} numberOfLines={1}>
                        {t("scaleElevatedShort") || "Elevated"}
                      </Text>
                    </View>
                    <View style={styles.scaleMarkerRight}>
                      <Text style={[typography.caption, { color: theme.highRisk, fontSize: 11, fontWeight: "800" }]}>1.0</Text>
                      <Text style={[typography.caption, { color: theme.highRisk, fontSize: 9, fontWeight: "700" }]} numberOfLines={1} ellipsizeMode="tail">
                        {t("scalePeakShort") || "Peak Focus"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* HOTSPOT DIAGNOSTIC CALLOUT */}
              <View style={[styles.hotspotBox, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.small }]}>
                <Text style={[typography.caption, { color: theme.textPrimary, lineHeight: 18 }]}>
                  💡 <Text style={{ fontWeight: "700" }}>{t("aiDiagnosticLabel")}</Text>{" "}
                  {hotspotDesc ||
                    (isGood
                      ? t("healthyDiagnosticText")
                      : t("spoilageDiagnosticText"))}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyPhotoBox, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.medium, marginTop: spacing.md }]}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>📷</Text>
              <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                {t("noImageCaptured")}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted, textAlign: "center", marginTop: 4 }]}>
                This check was completed with sensor probe data only.
              </Text>
            </View>
          )}
        </View>

        {/* SILAGE HEALTH TWIN TIMELINE */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
            {t("healthTwinTimeline")}
          </Text>
          <Text style={[typography.secondary, { color: theme.textSecondary, marginBottom: 12 }]}>
            {t("timelineSub")}
          </Text>

          <Timeline events={historyObs} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  summaryCard: {
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsGridRow: {
    flexDirection: "row",
    marginHorizontal: -3,
    marginTop: 4,
  },
  metricCol: {
    flex: 1,
  },
  photoTabsRow: {
    flexDirection: "row",
    padding: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  photoTabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewer: {
    width: "100%",
    height: 240,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  bboxOverlay: {
    position: "absolute",
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderRadius: 4,
  },
  bboxBadge: {
    position: "absolute",
    top: -18,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  bboxBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  imageOverlayPill: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  scaleLegendBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 6,
  },
  scaleMarkerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  scaleMarkerCenter: {
    flex: 1,
    alignItems: "center",
  },
  scaleMarkerRight: {
    flex: 1.2,
    alignItems: "flex-end",
  },
  hotspotBox: {
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  emptyPhotoBox: {
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

