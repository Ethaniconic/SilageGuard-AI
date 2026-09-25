/**
 * SILAGEGUARD AI — Multilingual Farmer Language Selector
 * Instant toggle between English, हिन्दी, मराठी, ಕನ್ನಡ, and తెలుగు.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SUPPORTED_LANGUAGES, LanguageCode, THEME_COLORS } from "../utils/constants";

interface Props {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (code: LanguageCode) => void;
}

export const LanguagePicker: React.FC<Props> = ({ selectedLanguage, onSelectLanguage }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>SELECT FARMER LANGUAGE / भाषा निवडा</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === selectedLanguage;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => onSelectLanguage(lang.code)}
              activeOpacity={0.8}
            >
              <Text style={[styles.nativeText, isSelected && styles.nativeTextActive]}>
                {lang.nativeLabel}
              </Text>
              <Text style={[styles.codeText, isSelected && styles.codeTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12
  },
  headerTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4
  },
  scrollContent: {
    flexDirection: "row",
    paddingVertical: 4
  },
  pill: {
    backgroundColor: THEME_COLORS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    alignItems: "center",
    minWidth: 95
  },
  pillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: THEME_COLORS.primary
  },
  nativeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E2E8F0"
  },
  nativeTextActive: {
    color: THEME_COLORS.primary
  },
  codeText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600"
  },
  codeTextActive: {
    color: "#A7F3D0"
  }
});
