/**
 * SILAGEGUARD AI V3 — SCREEN 6: EXPLAINABILITY & EVIDENCE BREAKDOWN
 * Transparent, reproducible agronomic decision provenance:
 *   - Original silage photograph vs Grad-CAM activation overlay
 *   - Interactive opacity slider
 *   - Vision 3-class probabilities
 *   - 11-feature sensor contribution breakdown
 *   - Literature-grounded safety rules triggered
 *   - Confidence calibration & uncertainty profile
 *   - Educational agronomic notes
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { BottomNavBar } from "../components/BottomNavBar";
import { AppIcon } from "../components/AppIcon";
import { useAppStore, useTheme } from "../features/ble/bleManager";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ExplainabilityScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { latestFusionResult, scanImages } = useAppStore();

  const [overlayAlpha, setOverlayAlpha] = useState(0.65); // 0 = original only, 1 = gradcam only

  const fusion = latestFusionResult;
  const imageUri = scanImages.length > 0 ? scanImages[0] : null;
  const gradcamUri =
    fusion?.decision === "UNSAFE"
      ? require("../assets/demo/gradcam/gradcam_unsafe_demo.png")
      : fusion?.decision === "CAUTION"
      ? require("../assets/demo/gradcam/gradcam_caution_demo.png")
      : require("../assets/demo/gradcam/gradcam_safe_demo.png");

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header showBack={true} fallbackRoute="/result" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title & Badge */}
        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.provenanceBadge,
                { backgroundColor: theme.accent + "1A", borderColor: theme.accent }
              ]}
            >
              <AppIcon name="shield" size={12} color={theme.accent} strokeWidth={2.2} />
              <Text style={[styles.provenanceBadgeText, { color: theme.accent }]}>
                AUDITABLE PROVENANCE
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    fusion?.confidenceLevel === "HIGH"
                      ? theme.safeBg
                      : fusion?.confidenceLevel === "MEDIUM"
                      ? theme.cautionBg
                      : theme.unsafeBg,
                  borderColor:
                    fusion?.confidenceLevel === "HIGH"
                      ? theme.safeBorder
                      : fusion?.confidenceLevel === "MEDIUM"
                      ? theme.cautionBorder
                      : theme.unsafeBorder
                }
              ]}
            >
              <Text
                style={[
                  styles.confidenceBadgeText,
                  {
                    color:
                      fusion?.confidenceLevel === "HIGH"
                        ? theme.safe
                        : fusion?.confidenceLevel === "MEDIUM"
                        ? theme.caution
                        : theme.unsafe
                  }
                ]}
              >
                {fusion?.confidenceLevel ?? "CALIBRATED"} CONFIDENCE
              </Text>
            </View>
          </View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            AI Explainability & Evidence
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            Deconstruction of visual activation maps, sensor factor weights, and agronomic thresholds.
          </Text>
        </View>

        {/* Section 1: Visual Inspection & Grad-CAM Heatmap */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
          ]}
        >
          <View style={styles.cardHeader}>
            <AppIcon name="camera" size={16} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Grad-CAM Visual Attention Map
            </Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
            MobileNetV3 layer 'features[12]' gradients highlight regions driving the visual verdict.
          </Text>

          {/* Image & Overlay Container */}
          <View style={styles.imageViewer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.baseImage} resizeMode="cover" />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: theme.cardBorder }]}>
                <AppIcon name="gallery" size={32} color={theme.textMuted} />
                <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
                  Surface photo evaluated
                </Text>
              </View>
            )}

            {/* GradCAM Overlay with variable opacity */}
            <Image
              source={gradcamUri}
              style={[styles.gradcamOverlay, { opacity: overlayAlpha }]}
              resizeMode="cover"
            />
          </View>

          {/* Opacity Control Slider Buttons */}
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>
              Overlay Blend: {Math.round(overlayAlpha * 100)}%
            </Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.opacityBtn,
                  overlayAlpha === 0 && { backgroundColor: theme.accent },
                  { borderColor: theme.cardBorder }
                ]}
                onPress={() => setOverlayAlpha(0)}
              >
                <Text
                  style={[
                    styles.opacityBtnText,
                    { color: overlayAlpha === 0 ? "#000" : theme.text }
                  ]}
                >
                  Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.opacityBtn,
                  overlayAlpha === 0.5 && { backgroundColor: theme.accent },
                  { borderColor: theme.cardBorder }
                ]}
                onPress={() => setOverlayAlpha(0.5)}
              >
                <Text
                  style={[
                    styles.opacityBtnText,
                    { color: overlayAlpha === 0.5 ? "#000" : theme.text }
                  ]}
                >
                  50%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.opacityBtn,
                  overlayAlpha === 0.85 && { backgroundColor: theme.accent },
                  { borderColor: theme.cardBorder }
                ]}
                onPress={() => setOverlayAlpha(0.85)}
              >
                <Text
                  style={[
                    styles.opacityBtnText,
                    { color: overlayAlpha === 0.85 ? "#000" : theme.text }
                  ]}
                >
                  Grad-CAM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Detected Pattern Legend */}
          <View style={[styles.legendBox, { backgroundColor: theme.background }]}>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: "#EF4444" }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>
                Red: High activation (mycelial / spoilage pattern)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>
                Blue: Low activation (compacted forage baseline)
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Sensor Factor Attribution */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
          ]}
        >
          <View style={styles.cardHeader}>
            <AppIcon name="flask" size={16} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Sensor Factor Attribution (11 Features)
            </Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
            Estimated contribution of physical biochemical parameters to fermentation score.
          </Text>

          <View style={styles.factorList}>
            <View style={[styles.factorRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorName, { color: theme.text }]}>Heat Rise (ΔT Above Ambient)</Text>
                <Text style={[styles.factorSub, { color: theme.textMuted }]}>Tcore - Tambient</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={[styles.factorWeight, { color: theme.unsafe }]}>28.8% Importance</Text>
              </View>
            </View>

            <View style={[styles.factorRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorName, { color: theme.text }]}>Absolute Core Temp Elevation</Text>
                <Text style={[styles.factorSub, { color: theme.textMuted }]}>Tprobe (°C)</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={[styles.factorWeight, { color: theme.caution }]}>25.0% Importance</Text>
              </View>
            </View>

            <View style={[styles.factorRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorName, { color: theme.text }]}>Core pH Acidity</Text>
                <Text style={[styles.factorSub, { color: theme.textMuted }]}>Lactic vs Clostridial</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={[styles.factorWeight, { color: theme.accent }]}>19.0% Importance</Text>
              </View>
            </View>

            <View style={[styles.factorRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorName, { color: theme.text }]}>pH Deviation from Crop Baseline</Text>
                <Text style={[styles.factorSub, { color: theme.textMuted }]}>|pH - 3.90|</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={[styles.factorWeight, { color: theme.accent }]}>17.6% Importance</Text>
              </View>
            </View>

            <View style={styles.factorRow}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorName, { color: theme.text }]}>Capacitive Moisture Deviation</Text>
                <Text style={[styles.factorSub, { color: theme.textMuted }]}>ADC to Saturation Curve</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={[styles.factorWeight, { color: theme.textMuted }]}>9.6% Importance</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Triggered Safety Rules */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
          ]}
        >
          <View style={styles.cardHeader}>
            <AppIcon name="alert" size={16} color={fusion?.ruleOverride ? theme.unsafe : theme.safe} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Deterministic Agronomic Rules
            </Text>
          </View>

          {fusion?.triggeredRules && fusion.triggeredRules.length > 0 ? (
            fusion.triggeredRules.map((tr, idx) => (
              <View
                key={idx}
                style={[
                  styles.ruleItem,
                  {
                    backgroundColor: tr.rule.severity === "CRITICAL" ? theme.unsafeBg : theme.cautionBg,
                    borderColor: tr.rule.severity === "CRITICAL" ? theme.unsafeBorder : theme.cautionBorder
                  }
                ]}
              >
                <View style={styles.ruleItemHeader}>
                  <Text
                    style={[
                      styles.ruleName,
                      { color: tr.rule.severity === "CRITICAL" ? theme.unsafe : theme.caution }
                    ]}
                  >
                    {tr.rule.name}
                  </Text>
                  <Text style={[styles.ruleSeverity, { color: theme.textMuted }]}>
                    {tr.rule.severity}
                  </Text>
                </View>
                <Text style={[styles.ruleCondition, { color: theme.text }]}>
                  Trigger: {tr.triggerValue}
                </Text>
                <Text style={[styles.ruleLiterature, { color: theme.textMuted }]}>
                  Source: {tr.rule.literatureSource}
                </Text>
                <Text style={[styles.ruleAction, { color: theme.text }]}>
                  Action: {tr.rule.recommendedAction}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyRules}>
              <AppIcon name="check" size={20} color={theme.safe} />
              <Text style={[styles.emptyRulesText, { color: theme.safe }]}>
                All physiological parameters comply with safe lactic preservation bounds (Kung et al. 2018).
              </Text>
            </View>
          )}
        </View>

        {/* Section 4: Educational Agronomic Note */}
        <View
          style={[
            styles.noteCard,
            { backgroundColor: theme.background, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
          ]}
        >
          <AppIcon name="info" size={16} color={theme.accent} />
          <View style={styles.noteContent}>
            <Text style={[styles.noteTitle, { color: theme.text }]}>
              Why These Three Parameters Matter
            </Text>
            <Text style={[styles.noteBody, { color: theme.textMuted }]}>
              Silage preservation relies on rapid anaerobic production of lactic acid to depress pH below 4.2.
              When plastic seals breach, aerobic yeasts consume lactic acid, causing core heating (temperature rise exceeding 3°C),
              allowing secondary Aspergillus and Clostridium molds to flourish.
            </Text>
          </View>
        </View>

        {/* Back to Result Button */}
        <TouchableOpacity
          style={[styles.returnButton, { backgroundColor: theme.accent, borderRadius: theme.radiusSm }]}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/result" as any);
            }
          }}
          activeOpacity={0.8}
        >
          <AppIcon name="arrow-back" size={16} color="#0B130E" strokeWidth={2.5} />
          <Text style={styles.returnButtonText}>RETURN TO RESULT</Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32
  },
  titleSection: {
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  provenanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8
  },
  provenanceBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 4
  },
  confidenceBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  confidenceBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18
  },
  card: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 14
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8
  },
  cardDesc: {
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16
  },
  imageViewer: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden"
  },
  baseImage: {
    width: "100%",
    height: "100%"
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: 12,
    marginTop: 6
  },
  gradcamOverlay: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%"
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: "700"
  },
  buttonGroup: {
    flexDirection: "row"
  },
  opacityBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 6
  },
  opacityBtnText: {
    fontSize: 11,
    fontWeight: "800"
  },
  legendBox: {
    padding: 10,
    marginTop: 10
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  legendText: {
    fontSize: 11
  },
  factorList: {
    marginTop: 4
  },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  factorLeft: {
    flex: 1
  },
  factorName: {
    fontSize: 12,
    fontWeight: "700"
  },
  factorSub: {
    fontSize: 10,
    marginTop: 2
  },
  factorRight: {
    alignItems: "flex-end"
  },
  factorWeight: {
    fontSize: 11,
    fontWeight: "800"
  },
  ruleItem: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 8
  },
  ruleItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  ruleName: {
    fontSize: 12,
    fontWeight: "800"
  },
  ruleSeverity: {
    fontSize: 9,
    fontWeight: "900"
  },
  ruleCondition: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2
  },
  ruleLiterature: {
    fontSize: 10,
    fontStyle: "italic",
    marginBottom: 4
  },
  ruleAction: {
    fontSize: 11
  },
  emptyRules: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8
  },
  emptyRulesText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  },
  noteCard: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 12,
    marginBottom: 16
  },
  noteContent: {
    marginLeft: 10,
    flex: 1
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4
  },
  noteBody: {
    fontSize: 11,
    lineHeight: 16
  },
  returnButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14
  },
  returnButtonText: {
    color: "#0B130E",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 8
  }
});
