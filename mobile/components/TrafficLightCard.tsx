/**
 * SILAGEGUARD AI V4 — Farmer Traffic Light Safety Result Card
 * Large high-contrast visual display designed for field farmers.
 * Vector icons for indicators, animated active light pulse, animated score gauge, and theme support.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { SilageDecision } from "../features/fusion/multimodalFusionEngine";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";
import { t } from "../utils/i18n";

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
  const { language } = useAppStore();

  const isSafe = decision === "SAFE";
  const isCaution = decision === "CAUTION";
  const isUnsafe = decision === "UNSAFE";

  const mainColor = isSafe ? theme.safe : isCaution ? theme.caution : theme.unsafe;
  const bgColor = isSafe ? theme.safeBg : isCaution ? theme.cautionBg : theme.unsafeBg;
  const borderColor = isSafe ? theme.safeBorder : isCaution ? theme.cautionBorder : theme.unsafeBorder;

  const decisionLabel = isSafe
    ? t("safe", language)
    : isCaution
    ? t("caution", language)
    : t("unsafe", language);

  const decisionSubtext = isSafe
    ? t("goodSilage", language)
    : isCaution
    ? t("warningSilage", language)
    : t("badSilage", language);

  const thresholdText = isSafe
    ? "Optimal Fermentation (MSSI ≥ 72)"
    : isCaution
    ? "Aerobic Heating Risk (MSSI 40-71)"
    : "Severe Spoilage / Mould (MSSI < 40)";

  const normalizedConfidence = Math.min(100, Math.max(0, Math.round(confidence > 100 ? confidence / 100 : confidence)));
  const normalizedScore = Math.min(100, Math.max(0, Math.round(mssiScore)));

  // Animation values
  const entranceAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance spring
    Animated.parallel([
      Animated.spring(entranceAnim, {
        toValue: 1,
        tension: 140,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scoreBarAnim, {
        toValue: normalizedScore,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Subtle pulsing on active light
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [normalizedScore]);

  const scoreBarWidth = scoreBarAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: theme.radiusLg,
          opacity: fadeAnim,
          transform: [{ scale: entranceAnim }],
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
        {/* RED LIGHT */}
        <Animated.View
          style={[
            styles.lightCircle,
            isUnsafe ? styles.activeRed : styles.dimRed,
            isUnsafe ? { transform: [{ scale: pulseAnim }] } : null,
          ]}
        >
          {isUnsafe && <AppIcon name="alert" size={15} color="#FFFFFF" strokeWidth={2.4} />}
        </Animated.View>

        {/* YELLOW LIGHT */}
        <Animated.View
          style={[
            styles.lightCircle,
            isCaution ? styles.activeYellow : styles.dimYellow,
            isCaution ? { transform: [{ scale: pulseAnim }] } : null,
          ]}
        >
          {isCaution && <AppIcon name="alert" size={15} color="#FFFFFF" strokeWidth={2.4} />}
        </Animated.View>

        {/* GREEN LIGHT */}
        <Animated.View
          style={[
            styles.lightCircle,
            isSafe ? styles.activeGreen : styles.dimGreen,
            isSafe ? { transform: [{ scale: pulseAnim }] } : null,
          ]}
        >
          {isSafe && <AppIcon name="check" size={15} color="#FFFFFF" strokeWidth={2.8} />}
        </Animated.View>
      </View>

      <Text style={[styles.decisionText, { color: mainColor }]}>{decisionLabel}</Text>
      <Text style={[styles.subtext, { color: theme.text }]}>{decisionSubtext}</Text>

      {/* Threshold agronomic tag */}
      <View style={[styles.thresholdPill, { backgroundColor: theme.surface, borderColor }]}>
        <Text style={[styles.thresholdText, { color: mainColor }]}>{thresholdText}</Text>
      </View>

      {cropType && (
        <View style={styles.cropBadge}>
          <AppIcon name="leaf" size={12} color={theme.textMuted} />
          <Text style={[styles.cropBadgeText, { color: theme.textMuted }]}>
            {cropType.split(" ")[0]} {pitDepthCm ? `(${pitDepthCm}cm depth)` : ""}
          </Text>
        </View>
      )}

      {/* Metric Row with Animated Score Gauge */}
      <View style={[styles.metaRow, { borderTopColor: borderColor + "44" }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>{t("mssiScore", language).toUpperCase()}</Text>
          <Text
            style={[styles.badgeValue, { color: mainColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {normalizedScore}/100
          </Text>
          {/* Animated Gauge Bar */}
          <View style={[styles.gaugeTrack, { backgroundColor: theme.surfaceElevated }]}>
            <Animated.View
              style={[
                styles.gaugeFill,
                {
                  width: scoreBarWidth,
                  backgroundColor: mainColor,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.badgeDivider, { backgroundColor: borderColor + "44" }]} />

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>{t("confidence", language).toUpperCase()}</Text>
          <Text
            style={[styles.badgeValue, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {normalizedConfidence}%
          </Text>
          <Text
            style={[styles.confidenceSub, { color: theme.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {normalizedConfidence >= 80 ? "HIGH CERTAINTY" : normalizedConfidence >= 60 ? "MEDIUM TIER" : "RETAKE ADVISED"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    padding: 18,
    alignItems: "center",
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trafficLightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
  },
  lightCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  activeRed: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  dimRed: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  activeYellow: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  dimYellow: { backgroundColor: "rgba(245, 158, 11, 0.2)" },
  activeGreen: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  dimGreen: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
  decisionText: {
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtext: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  thresholdPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  thresholdText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cropBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  cropBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    width: "100%",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    alignItems: "center",
    flex: 1,
    minWidth: 100,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  badgeValue: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  gaugeTrack: {
    width: "80%",
    maxWidth: 120,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceSub: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 4,
    textAlign: "center",
  },
  badgeDivider: {
    width: 1,
    height: 38,
    flexShrink: 0,
  },
});
