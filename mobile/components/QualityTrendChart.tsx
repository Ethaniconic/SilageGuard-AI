/**
 * SILAGEGUARD AI — Quality Trend Line Chart
 * Visualizes the 7-scan Multimodal Silage Safety Index (MSSI) trajectory.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  dataPoints: number[]; // e.g. [94, 91, 88, 85, 78, 62, 70]
  labels?: string[];
}

export const QualityTrendChart: React.FC<Props> = ({
  dataPoints = [94, 92, 89, 85, 76, 68, 88],
  labels = ["M", "T", "W", "T", "F", "S", "Sun"]
}) => {
  const chartHeight = 120;
  const chartWidth = 320;
  const paddingX = 24;
  const paddingY = 20;

  const widthAvailable = chartWidth - paddingX * 2;
  const heightAvailable = chartHeight - paddingY * 2;

  const minVal = 0;
  const maxVal = 100;

  const points = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * widthAvailable;
    const y = paddingY + heightAvailable - ((val - minVal) / (maxVal - minVal)) * heightAvailable;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>QUALITY TREND TRAJECTORY</Text>
        <Text style={styles.subtitle}>7-Scan MSSI Index</Text>
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={THEME_COLORS.primary} stopOpacity="0.4" />
              <Stop offset="1" stopColor={THEME_COLORS.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Safe threshold guide line (MSSI = 75) */}
          <Line
            x1={paddingX}
            y1={paddingY + heightAvailable - (75 / 100) * heightAvailable}
            x2={chartWidth - paddingX}
            y2={paddingY + heightAvailable - (75 / 100) * heightAvailable}
            stroke="rgba(16, 185, 129, 0.3)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Caution threshold guide line (MSSI = 45) */}
          <Line
            x1={paddingX}
            y1={paddingY + heightAvailable - (45 / 100) * heightAvailable}
            x2={chartWidth - paddingX}
            y2={paddingY + heightAvailable - (45 / 100) * heightAvailable}
            stroke="rgba(239, 68, 68, 0.3)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Area fill */}
          <Path d={areaD} fill="url(#trendGradient)" />

          {/* Line */}
          <Path d={pathD} fill="none" stroke={THEME_COLORS.primary} strokeWidth="3" strokeLinecap="round" />

          {/* Data Circles */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? "5" : "3.5"}
              fill={i === points.length - 1 ? "#38BDF8" : THEME_COLORS.primary}
              stroke="#090D16"
              strokeWidth="2"
            />
          ))}
        </Svg>
      </View>

      <View style={styles.labelsRow}>
        {labels.map((lbl, idx) => (
          <Text key={idx} style={styles.dayLabel}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginVertical: 12
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8
  },
  title: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  subtitle: {
    color: THEME_COLORS.primary,
    fontSize: 11,
    fontWeight: "700"
  },
  svgContainer: {
    alignItems: "center"
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 4
  },
  dayLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700"
  }
});
