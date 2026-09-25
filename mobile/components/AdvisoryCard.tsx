/**
 * SILAGEGUARD AI — Actionable Farmer Advisory Card
 * Displays structured agronomic guidance (Problem, Reason, Immediate Action, Prevention)
 * with Voice TTS narration trigger.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FarmerAdvisory } from "../features/advisory/advisoryEngine";
import { THEME_COLORS } from "../utils/constants";

interface Props {
  advisory: FarmerAdvisory;
  onPlayVoice?: (text: string) => void;
}

export const AdvisoryCard: React.FC<Props> = ({ advisory, onPlayVoice }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVoicePress = () => {
    setIsPlaying(true);
    if (onPlayVoice) {
      onPlayVoice(advisory.speechText);
    }
    setTimeout(() => setIsPlaying(false), 4000);
  };

  const isSafe = advisory.decision === "SAFE";
  const isCaution = advisory.decision === "CAUTION";
  const headerColor = isSafe ? THEME_COLORS.safe : isCaution ? THEME_COLORS.caution : THEME_COLORS.unsafe;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: headerColor }]}>{advisory.title}</Text>
        </View>

        <TouchableOpacity
          style={[styles.voiceButton, isPlaying && styles.voiceButtonActive]}
          onPress={handleVoicePress}
          activeOpacity={0.8}
        >
          <Text style={styles.voiceButtonText}>
            {isPlaying ? "🔊 Playing..." : "🔊 Read Out Loud"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>⚠️ IDENTIFIED ISSUE</Text>
        <Text style={styles.sectionContent}>{advisory.problem}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🔬 AGRONOMIC CAUSE</Text>
        <Text style={styles.sectionContent}>{advisory.reason}</Text>
      </View>

      <View style={[styles.section, styles.actionHighlight]}>
        <Text style={[styles.sectionLabel, { color: THEME_COLORS.primary }]}>
          ⚡ IMMEDIATE ACTION REQUIRED
        </Text>
        <Text style={[styles.sectionContent, styles.actionText]}>
          {advisory.immediateAction}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🛡️ FUTURE HARVEST / PIT PREVENTION</Text>
        <Text style={styles.sectionContent}>{advisory.futurePrevention}</Text>
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
    padding: 18,
    marginVertical: 12
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)"
  },
  titleArea: {
    flex: 1,
    marginRight: 8
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22
  },
  voiceButton: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  voiceButtonActive: {
    backgroundColor: "#0284C7"
  },
  voiceButtonText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800"
  },
  section: {
    marginVertical: 6
  },
  sectionLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 3
  },
  sectionContent: {
    color: "#F1F5F9",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500"
  },
  actionHighlight: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME_COLORS.primary,
    marginVertical: 10
  },
  actionText: {
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
