/**
 * SILAGEGUARD AI — Guided Camera Reticle & QA Overlay
 * Guides farmers to frame silage bunker faces properly:
 * Checks Brightness, Blur/Sharpness, and Angle in real-time.
 */

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { THEME_COLORS } from "../utils/constants";
import { ImageQualityReport } from "../ai/imageQualityChecker";

interface Props {
  qualityReport: ImageQualityReport;
  photoCount: number;
  maxPhotos?: number;
}

export const CameraGuidanceOverlay: React.FC<Props> = ({
  qualityReport,
  photoCount,
  maxPhotos = 3
}) => {
  const isOptimal = qualityReport.isAcceptable;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* Top Banner with Instruction */}
      <View style={styles.topBanner}>
        <Text style={styles.instructionTitle}>ALIGN SILAGE FACE INSIDE FRAME</Text>
        <Text style={styles.guidanceMessage}>{qualityReport.guidanceMessage}</Text>
      </View>

      {/* Center Target Box */}
      <View style={[styles.targetBox, isOptimal ? styles.boxOptimal : styles.boxWarning]}>
        {/* Corner Reticles */}
        <View style={[styles.corner, styles.topLeft, isOptimal ? styles.cornerOptimal : styles.cornerWarning]} />
        <View style={[styles.corner, styles.topRight, isOptimal ? styles.cornerOptimal : styles.cornerWarning]} />
        <View style={[styles.corner, styles.bottomLeft, isOptimal ? styles.cornerOptimal : styles.cornerWarning]} />
        <View style={[styles.corner, styles.bottomRight, isOptimal ? styles.cornerOptimal : styles.cornerWarning]} />

        {/* Center Crosshair */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      {/* Real-time Quality Indicators */}
      <View style={styles.qaPillsRow}>
        <View style={[styles.qaPill, qualityReport.brightnessScore >= 35 && qualityReport.brightnessScore <= 85 ? styles.pillGood : styles.pillBad]}>
          <Text style={styles.pillText}>
            ☀️ Light: {qualityReport.brightnessScore}%
          </Text>
        </View>

        <View style={[styles.qaPill, qualityReport.sharpnessScore >= 50 ? styles.pillGood : styles.pillBad]}>
          <Text style={styles.pillText}>
            🔍 Sharpness: {qualityReport.sharpnessScore}%
          </Text>
        </View>

        <View style={[styles.qaPill, Math.abs(qualityReport.tiltAngleDeg) <= 15 ? styles.pillGood : styles.pillBad]}>
          <Text style={styles.pillText}>
            📐 Angle: {qualityReport.tiltAngleDeg}°
          </Text>
        </View>
      </View>

      {/* Photo Stack Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          Captured: {photoCount}/{maxPhotos} Photos (Multi-angle Stack)
        </Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");
const boxSize = Math.min(width * 0.78, 300);

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 50
  },
  topBanner: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    maxWidth: "90%"
  },
  instructionTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  guidanceMessage: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4
  },
  targetBox: {
    width: boxSize,
    height: boxSize,
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  boxOptimal: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1
  },
  boxWarning: {
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderWidth: 1
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: THEME_COLORS.primary
  },
  cornerOptimal: {
    borderColor: THEME_COLORS.primary
  },
  cornerWarning: {
    borderColor: THEME_COLORS.caution
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  crosshairH: {
    width: 24,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)"
  },
  crosshairV: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    position: "absolute"
  },
  qaPillsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155"
  },
  qaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4
  },
  pillGood: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  pillBad: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  pillText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700"
  },
  counterRow: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  },
  counterText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800"
  }
});
