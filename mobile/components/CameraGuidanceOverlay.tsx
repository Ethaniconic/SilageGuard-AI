/**
 * SILAGEGUARD AI — Guided Camera Reticle & Framing Overlay
 * Clean, farmer-friendly visual framing guide for silage surface inspection.
 */

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../features/ble/bleManager";

interface Props {
  photoCount: number;
  maxPhotos?: number;
  message?: string;
}

export const CameraGuidanceOverlay: React.FC<Props> = ({
  photoCount,
  maxPhotos = 3,
  message = "Align silage bunker face within reticle"
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* Top Banner with Instruction */}
      <View
        style={[
          styles.topBanner,
          {
            backgroundColor: "rgba(9, 13, 22, 0.85)",
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <Text style={[styles.instructionTitle, { color: theme.accent }]}>
          SURFACE RETICLE
        </Text>
        <Text style={[styles.guidanceMessage, { color: "#FFFFFF" }]}>{message}</Text>
      </View>

      {/* Center Target Box with Sharp Reticle Corners */}
      <View style={styles.targetBox}>
        <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      {/* Bottom Counter Badge */}
      <View
        style={[
          styles.counterRow,
          {
            backgroundColor: "rgba(9, 13, 22, 0.85)",
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <Text style={styles.counterText}>
          {photoCount > 0 ? `Captured: ${photoCount} of ${maxPhotos} Photos` : "Ready to snap"}
        </Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");
const boxSize = Math.min(width * 0.72, 260);

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16
  },
  topBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: "center",
    maxWidth: "92%"
  },
  instructionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  guidanceMessage: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2
  },
  targetBox: {
    width: boxSize,
    height: boxSize,
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  crosshairH: {
    width: 20,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)"
  },
  crosshairV: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    position: "absolute"
  },
  counterRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1
  },
  counterText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800"
  }
});
