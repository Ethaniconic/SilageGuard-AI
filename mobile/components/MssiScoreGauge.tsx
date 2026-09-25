/**
 * SILAGEGUARD AI — MSSI Radial Safety Score Gauge
 * Renders circular SVG arc displaying Multimodal Silage Safety Index (0-100).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  score: number; // 0 to 100
  size?: number;
}

export const MssiScoreGauge: React.FC<Props> = ({ score = 85, size = 160 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color =
    score >= 75
      ? THEME_COLORS.safe
      : score >= 45
      ? THEME_COLORS.caution
      : THEME_COLORS.unsafe;

  const verdict = score >= 75 ? "EXCELLENT" : score >= 45 ? "MODERATE" : "CRITICAL";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Score & Verdict */}
      <View style={styles.centerContent}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreUnit}>MSSI / 100</Text>
        <Text style={[styles.verdictText, { color }]}>{verdict}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1
  },
  scoreUnit: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: -2
  },
  verdictText: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 1
  }
});
