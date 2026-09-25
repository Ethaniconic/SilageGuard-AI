/**
 * SILAGEGUARD AI — Traffic Light Safety Result Card
 * Large high-contrast visual display designed for field farmers.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SilageDecision } from "../features/fusion/multimodalFusionEngine";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  decision: SilageDecision;
  confidence: number;
  mssiScore: number;
}

export const TrafficLightCard: React.FC<Props> = ({ decision, confidence, mssiScore }) => {
  const isSafe = decision === "SAFE";
  const isCaution = decision === "CAUTION";
  const isUnsafe = decision === "UNSAFE";

  const mainColor = isSafe ? THEME_COLORS.safe : isCaution ? THEME_COLORS.caution : THEME_COLORS.unsafe;
  const bgColor = isSafe ? THEME_COLORS.safeBg : isCaution ? THEME_COLORS.cautionBg : THEME_COLORS.unsafeBg;
  const borderColor = isSafe ? THEME_COLORS.safeBorder : isCaution ? THEME_COLORS.cautionBorder : THEME_COLORS.unsafeBorder;

  const decisionLabel = isSafe ? "SAFE TO FEED" : isCaution ? "FEED WITH CAUTION" : "UNSAFE / SPOILED";
  const decisionSubtext = isSafe
    ? "Optimal Fermentation • High Palatability"
    : isCaution
    ? "Aerobic Heating • Feed Within 6 Hours"
    : "Toxic Spoilage • Discard Spoiled Silage";

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {/* 3-Dot Traffic Light Indicator Bar */}
      <View style={styles.trafficLightRow}>
        <View style={[styles.lightCircle, isUnsafe ? styles.activeRed : styles.dimRed]}>
          <Text style={styles.lightIcon}>{isUnsafe ? "!" : ""}</Text>
        </View>
        <View style={[styles.lightCircle, isCaution ? styles.activeYellow : styles.dimYellow]}>
          <Text style={styles.lightIcon}>{isCaution ? "!" : ""}</Text>
        </View>
        <View style={[styles.lightCircle, isSafe ? styles.activeGreen : styles.dimGreen]}>
          <Text style={styles.lightIcon}>{isSafe ? "✓" : ""}</Text>
        </View>
      </View>

      <Text style={[styles.decisionText, { color: mainColor }]}>{decisionLabel}</Text>
      <Text style={styles.subtext}>{decisionSubtext}</Text>

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>MSSI SAFETY INDEX</Text>
          <Text style={[styles.badgeValue, { color: mainColor }]}>{mssiScore}/100</Text>
        </View>
        <View style={styles.badgeDivider} />
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>AI CONFIDENCE</Text>
          <Text style={styles.badgeValue}>{confidence}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  trafficLightRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155"
  },
  lightCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  activeRed: { backgroundColor: "#EF4444", shadowColor: "#EF4444", shadowRadius: 10, shadowOpacity: 0.8 },
  dimRed: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  activeYellow: { backgroundColor: "#F59E0B", shadowColor: "#F59E0B", shadowRadius: 10, shadowOpacity: 0.8 },
  dimYellow: { backgroundColor: "rgba(245, 158, 11, 0.2)" },
  activeGreen: { backgroundColor: "#10B981", shadowColor: "#10B981", shadowRadius: 10, shadowOpacity: 0.8 },
  dimGreen: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  lightIcon: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  decisionText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  subtext: {
    color: "#E2E8F0",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    width: "100%",
    justifyContent: "space-around"
  },
  badge: {
    alignItems: "center"
  },
  badgeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.5
  },
  badgeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    marginTop: 2
  },
  badgeDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.15)"
  }
});
