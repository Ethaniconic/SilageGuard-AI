/**
 * SILAGEGUARD AI — Actionable Farmer Advisory Card
 * Displays structured agronomic guidance (Problem, Reason, Immediate Action, Prevention)
 * with Voice TTS narration trigger, theme support, and clean industrial corners.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FarmerAdvisory } from "../features/advisory/advisoryEngine";
import { useTheme } from "../features/ble/bleManager";

interface Props {
  advisory: FarmerAdvisory;
  onPlayVoice?: (text: string) => void;
}

export const AdvisoryCard: React.FC<Props> = ({ advisory, onPlayVoice }) => {
  const { theme } = useTheme();
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
  const headerColor = isSafe ? theme.safe : isCaution ? theme.caution : theme.unsafe;

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
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: headerColor }]}>{advisory.title}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.voiceButton,
            {
              backgroundColor: theme.accent + "1A",
              borderColor: theme.accent,
              borderRadius: theme.radiusSm
            },
            isPlaying && { backgroundColor: theme.accent }
          ]}
          onPress={handleVoicePress}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.voiceButtonText,
              { color: isPlaying ? "#FFFFFF" : theme.accent }
            ]}
          >
            {isPlaying ? "?? Playing..." : "?? Read Out"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          ?? IDENTIFIED ISSUE
        </Text>
        <Text style={[styles.sectionContent, { color: theme.text }]}>
          {advisory.problem}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          ?? AGRONOMIC CAUSE
        </Text>
        <Text style={[styles.sectionContent, { color: theme.text }]}>
          {advisory.reason}
        </Text>
      </View>

      <View
        style={[
          styles.section,
          styles.actionHighlight,
          {
            backgroundColor: theme.safeBg,
            borderLeftColor: theme.primary,
            borderRadius: theme.radiusSm
          }
        ]}
      >
        <Text style={[styles.sectionLabel, { color: theme.primary }]}>
          ? IMMEDIATE ACTION REQUIRED
        </Text>
        <Text style={[styles.sectionContent, styles.actionText, { color: theme.text }]}>
          {advisory.immediateAction}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          ??? FUTURE HARVEST / PIT PREVENTION
        </Text>
        <Text style={[styles.sectionContent, { color: theme.text }]}>
          {advisory.futurePrevention}
        </Text>
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
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  titleArea: {
    flex: 1,
    marginRight: 8
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  voiceButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  voiceButtonText: {
    fontSize: 11,
    fontWeight: "800"
  },
  section: {
    marginVertical: 4
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500"
  },
  actionHighlight: {
    padding: 10,
    borderLeftWidth: 3,
    marginVertical: 8
  },
  actionText: {
    fontWeight: "700"
  }
});
