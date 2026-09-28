/**
 * SILAGEGUARD AI - Traffic Light Safety Result Card
 * Large high-contrast visual display designed for field farmers.
 * Vector icons for indicators, sharp industrial corners, and theme support.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SilageDecision } from "../features/fusion/multimodalFusionEngine";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";

interface Props {
  decision: SilageDecision;
  confidence: number;
  mssiScore: number;
  cropType?: string;
  pitDepthCm?: number;
}

export const TrafficLightCard: React.FC<Props> = ({
  decision,
  confidence,
  mssiScore,
  cropType,
  pitDepthCm
}) => {
  const { theme } = useTheme();

  const isSafe = decision === "SAFE";
  const isCaution = decision === "CAUTION";
  const isUnsafe = decision === "UNSAFE";

  const mainColor = isSafe ? theme.safe : isCaution ? theme.caution : theme.unsafe;
  const bgColor = isSafe ? theme.safeBg : isCaution ? theme.cautionBg : theme.unsafeBg;
  const borderColor = isSafe ? theme.safeBorder : isCaution ? theme.cautionBorder : theme.unsafeBorder;

  const decisionLabel = isSafe
    ? "LOW SCREENING RISK"
    : isCaution
    ? "FEED WITH CAUTION"
    : "UNSAFE / SPOILED";

  const decisionSubtext = isSafe
    ? "Safe to feed - Optimal preservation criteria met"
    : isCaution
    ? "Aerobic Heating Signal - Monitor closely / Feed within 6h"
    : "Elevated Spoilage Signal - Do not feed suspect forage";

  const normalizedConfidence = Math.min(100, Math.max(0, Math.round(confidence > 100 ? confidence / 100 : confidence)));
  const normalizedScore = Math.min(100, Math.max(0, Math.round(mssiScore)));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: theme.radiusMd
        }
      ]}
    >
      {/* 3-Dot Traffic Light Indicator Bar */}
      <View
        style={[
          styles.trafficLightRow,
          {
            backgroundColor: theme.surface,
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <View style={[styles.lightCircle, isUnsafe ? styles.activeRed : styles.dimRed]}>
          {isUnsafe && <AppIcon name="alert" size={14} color="#FFFFFF" strokeWidth={2.4} />}
        </View>
        <View style={[styles.lightCircle, isCaution ? styles.activeYellow : styles.dimYellow]}>
          {isCaution && <AppIcon name="alert" size={14} color="#FFFFFF" strokeWidth={2.4} />}
        </View>
        <View style={[styles.lightCircle, isSafe ? styles.activeGreen : styles.dimGreen]}>
          {isSafe && <AppIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />}
        </View>
      </View>

      <Text style={[styles.decisionText, { color: mainColor }]}>{decisionLabel}</Text>
      <Text style={[styles.subtext, { color: theme.text }]}>{decisionSubtext}</Text>

      {cropType && (
        <View style={styles.cropBadge}>
          <AppIcon name="leaf" size={12} color={theme.textMuted} />
          <Text style={[styles.cropBadgeText, { color: theme.textMuted }]}>
            {cropType.split(" ")[0]} {pitDepthCm ? `(${pitDepthCm}cm depth)` : ""}
          </Text>
        </View>
      )}

      <View style={[styles.metaRow, { borderTopColor: borderColor + "44" }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>MSSI SAFETY INDEX</Text>
          <Text style={[styles.badgeValue, { color: mainColor }]}>{normalizedScore}/100</Text>
        </View>
        <View style={[styles.badgeDivider, { backgroundColor: borderColor + "44" }]} />
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>AI CONFIDENCE</Text>
          <Text style={[styles.badgeValue, { color: theme.text }]}>{normalizedConfidence}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    marginVertical: 10
  },
  trafficLightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1
  },
  lightCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 6,
    justifyContent: "center",
    alignItems: "center"
  },
  activeRed: { backgroundColor: "#EF4444" },
  dimRed: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  activeYellow: { backgroundColor: "#F59E0B" },
  dimYellow: { backgroundColor: "rgba(245, 158, 11, 0.2)" },
  activeGreen: { backgroundColor: "#10B981" },
  dimGreen: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  decisionText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  subtext: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center"
  },
  cropBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  cropBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    width: "100%",
    justifyContent: "space-around"
  },
  badge: {
    alignItems: "center"
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  badgeValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  badgeDivider: {
    width: 1,
    height: 24
  }
});
