/**
 * SILAGEGUARD AI — Quality Trend Line Chart
 * Visualizes the 7-scan Multimodal Silage Safety Index (MSSI) trajectory.
 * Renders an honest empty state when no historical scans exist.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { useTheme } from "../features/ble/bleManager";

interface Props {
  dataPoints: number[];
  labels?: string[];
}

export const QualityTrendChart: React.FC<Props> = ({
  dataPoints = [],
  labels = []
}) => {
  const { theme } = useTheme();

  const chartHeight = 110;
  const chartWidth = 320;
  const paddingX = 20;
  const paddingY = 16;

  // Empty state handling — DO NOT show fake graph if empty!
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusMd
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>QUALITY TREND TRAJECTORY</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>MSSI Index History</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>??</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No historical scans recorded yet.
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
            Your silage quality trend line will build up here after your first scan.
          </Text>
        </View>
      </View>
    );
  }

  const widthAvailable = chartWidth - paddingX * 2;
  const heightAvailable = chartHeight - paddingY * 2;

  const minVal = 0;
  const maxVal = 100;

  const points = dataPoints.map((val, idx) => {
    const divisor = Math.max(1, dataPoints.length - 1);
    const x = paddingX + (idx / divisor) * widthAvailable;
    const y = paddingY + heightAvailable - ((val - minVal) / (maxVal - minVal)) * heightAvailable;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderRadius: theme.radiusMd
        }
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>QUALITY TREND TRAJECTORY</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {dataPoints.length}-Scan MSSI History
        </Text>
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.primary} stopOpacity="0.4" />
              <Stop offset="1" stopColor={theme.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Safe threshold guide line (MSSI = 75) */}
          <Line
            x1={paddingX}
            y1={paddingY + heightAvailable * 0.25}
            x2={chartWidth - paddingX}
            y2={paddingY + heightAvailable * 0.25}
            stroke={theme.safe}
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Shaded Area */}
          <Path d={areaD} fill="url(#trendGradient)" />

          {/* Trajectory Stroke */}
          <Path d={pathD} stroke={theme.primary} strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* Data Nodes */}
          {points.map((p, idx) => (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={p.val >= 75 ? theme.safe : p.val >= 45 ? theme.caution : theme.unsafe}
              stroke={theme.card}
              strokeWidth="2"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    marginVertical: 8
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  title: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700"
  },
  svgContainer: {
    alignItems: "center",
    marginTop: 4
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  emptySubtext: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 3,
    paddingHorizontal: 16
  }
});
