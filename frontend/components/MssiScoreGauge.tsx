/**
 * SILAGEGUARD AI - MSSI Radial Safety Score Gauge
 * Renders circular SVG arc displaying Multimodal Silage Safety Index (0-100).
 * Dynamic theme integration and optional decision/confidence support.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../features/ble/bleManager";

interface Props {
  score: number; // 0 to 100
  size?: number;
  decision?: string;
  confidence?: number;
}

export const MssiScoreGauge: React.FC<Props> = ({
  score = 85,
  size = 160,
  decision,
  confidence
}) => {
  const { theme } = useTheme();

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const color =
    score >= 75
      ? theme.safe
      : score >= 45
      ? theme.caution
      : theme.unsafe;

  const verdict = decision || (score >= 75 ? "EXCELLENT" : score >= 45 ? "MODERATE" : "CRITICAL");

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.cardBorder}
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
        <Text style={[styles.scoreUnit, { color: theme.textMuted }]}>MSSI / 100</Text>
        <Text style={[styles.verdictText, { color }]}>{verdict}</Text>
        {confidence !== undefined && (
          <Text style={[styles.confidenceText, { color: theme.textMuted }]}>
            {Math.min(100, Math.max(0, Math.round(confidence > 100 ? confidence / 100 : confidence)))}% conf
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 10,
    alignSelf: "center"
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  scoreNumber: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1
  },
  scoreUnit: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: -2
  },
  verdictText: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: 1
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1
  }
});
