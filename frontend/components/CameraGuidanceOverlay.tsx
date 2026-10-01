/**
 * SILAGEGUARD AI V3 — Live Camera AI Quality Assistant & Scan Wizard Overlay
 * Real-time image quality assessment (IQA) & guided 5-step capture wizard:
 *   - Step 1: Surface bunker face
 *   - Step 2: Second angle (oblique)
 *   - Step 3: Deep region / fractured core
 *   - Step 4: Probe insertion & BLE telemetry
 *   - Step 5: Multimodal AI inference
 *
 * Real-time checks: Blur, Lighting/Exposure, Distance (30-50cm), Level/Tilt.
 */

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";

export interface IqaStatus {
  isSharp: boolean;
  isLightingGood: boolean;
  isDistanceOptimal: boolean;
  isLevel: boolean;
  score: number; // 0 - 100
  tip: string;
}

interface Props {
  currentStep: number; // 1 to 5
  photoCount: number;
  maxPhotos?: number;
  iqaStatus?: IqaStatus;
  probeConnected?: boolean;
}

const STEP_LABELS = [
  "1. Surface Face",
  "2. Second Angle",
  "3. Deep Region",
  "4. Silage Probe",
  "5. Analyze"
];

export const CameraGuidanceOverlay: React.FC<Props> = ({
  currentStep = 1,
  photoCount = 0,
  maxPhotos = 3,
  iqaStatus = {
    isSharp: true,
    isLightingGood: true,
    isDistanceOptimal: true,
    isLevel: true,
    score: 92,
    tip: "Good illumination & sharp focus. Ready to capture."
  },
  probeConnected = false
}) => {
  const { theme } = useTheme();

  const isIqaPassing = iqaStatus.score >= 70;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* 5-Step Progress Indicator */}
      <View
        style={[
          styles.stepContainer,
          {
            backgroundColor: "rgba(9, 13, 22, 0.90)",
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <View style={styles.stepRow}>
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep || (stepNum <= 3 && photoCount >= stepNum);
            const isCurrent = stepNum === currentStep;

            return (
              <View key={idx} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepBullet,
                    isCompleted
                      ? { backgroundColor: theme.safe, borderColor: theme.safe }
                      : isCurrent
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { backgroundColor: "transparent", borderColor: "#475569" }
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBulletText,
                      { color: isCompleted || isCurrent ? "#0B130E" : "#94A3B8" }
                    ]}
                  >
                    {stepNum}
                  </Text>
                </View>
                {idx < STEP_LABELS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      { backgroundColor: isCompleted ? theme.safe : "#334155" }
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          {currentStep <= 3
            ? `STEP ${currentStep}: ${STEP_LABELS[currentStep - 1].toUpperCase()}`
            : currentStep === 4
            ? "STEP 4: INSERT PHYSICAL PROBE"
            : "STEP 5: READY FOR MULTIMODAL INFERENCE"}
        </Text>
      </View>

      {/* Center Target Box with Sharp Reticle Corners */}
      <View style={styles.targetBox}>
        <View
          style={[
            styles.corner,
            styles.topLeft,
            { borderColor: isIqaPassing ? theme.safe : theme.caution }
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.topRight,
            { borderColor: isIqaPassing ? theme.safe : theme.caution }
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.bottomLeft,
            { borderColor: isIqaPassing ? theme.safe : theme.caution }
          ]}
        />
        <View
          style={[
            styles.corner,
            styles.bottomRight,
            { borderColor: isIqaPassing ? theme.safe : theme.caution }
          ]}
        />
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Center Grid Framing Guide */}
        <View style={styles.innerGuide}>
          <Text style={[styles.guideText, { color: "rgba(255, 255, 255, 0.7)" }]}>
            Target 30–50 cm Distance
          </Text>
        </View>
      </View>

      {/* Real-time Image Quality Assistant (IQA) Live Tip Card */}
      <View
        style={[
          styles.iqaCard,
          {
            backgroundColor: "rgba(9, 13, 22, 0.92)",
            borderColor: isIqaPassing ? theme.safeBorder : theme.cautionBorder,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <View style={styles.iqaHeader}>
          <View style={styles.iqaStatusPill}>
            <View
              style={[
                styles.iqaDot,
                { backgroundColor: isIqaPassing ? theme.safe : theme.caution }
              ]}
            />
            <Text
              style={[
                styles.iqaStatusText,
                { color: isIqaPassing ? theme.safe : theme.caution }
              ]}
            >
              {isIqaPassing ? "AI QA READY (PASS)" : "ADJUSTING ALIGNMENT"}
            </Text>
          </View>
          <Text style={[styles.photoCounter, { color: theme.textMuted }]}>
            {photoCount} / {maxPhotos} Photos
          </Text>
        </View>

        <Text style={[styles.iqaTip, { color: "#FFFFFF" }]}>{iqaStatus.tip}</Text>

        {/* Live Parameter Checklist */}
        <View style={styles.checklistRow}>
          <Text
            style={[
              styles.checkItem,
              { color: iqaStatus.isSharp ? theme.safe : theme.caution }
            ]}
          >
            {iqaStatus.isSharp ? "✓ Sharp" : "! Blur"}
          </Text>
          <Text
            style={[
              styles.checkItem,
              { color: iqaStatus.isLightingGood ? theme.safe : theme.caution }
            ]}
          >
            {iqaStatus.isLightingGood ? "✓ Light" : "! Light"}
          </Text>
          <Text
            style={[
              styles.checkItem,
              { color: iqaStatus.isDistanceOptimal ? theme.safe : theme.caution }
            ]}
          >
            {iqaStatus.isDistanceOptimal ? "✓ Distance" : "! Distance"}
          </Text>
          <Text
            style={[
              styles.checkItem,
              { color: probeConnected ? theme.safe : theme.textMuted }
            ]}
          >
            {probeConnected ? "✓ Probe" : "○ Probe Optional"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");
const boxSize = Math.min(width * 0.72, 260);

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill as any,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  stepContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignItems: "center",
    width: "92%",
    maxWidth: 340,
    borderRadius: 16
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  stepBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center"
  },
  stepBulletText: {
    fontSize: 9,
    fontWeight: "900"
  },
  stepConnector: {
    width: 16,
    height: 2,
    marginHorizontal: 3
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  targetBox: {
    width: "86%",
    height: "58%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  topRight: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  crosshairH: {
    width: 16,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)"
  },
  crosshairV: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    position: "absolute"
  },
  innerGuide: {
    marginTop: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 4
  },
  guideText: {
    fontSize: 10,
    fontWeight: "700"
  },
  iqaCard: {
    width: "92%",
    maxWidth: 340,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12
  },
  iqaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  iqaStatusPill: {
    flexDirection: "row",
    alignItems: "center"
  },
  iqaDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6
  },
  iqaStatusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  photoCounter: {
    fontSize: 10,
    fontWeight: "800"
  },
  iqaTip: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    marginBottom: 6
  },
  checklistRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 4
  },
  checkItem: {
    fontSize: 10,
    fontWeight: "800"
  }
});
