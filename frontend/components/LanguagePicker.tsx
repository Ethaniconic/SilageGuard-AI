/**
 * SILAGEGUARD AI - Multilingual Farmer Language Selector
 * Instant toggle between English, Hindi, Marathi, Kannada, and Telugu.
 * High-contrast theme styling with clean industrial geometry.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SUPPORTED_LANGUAGES, LanguageCode } from "../utils/constants";
import { useTheme } from "../features/ble/bleManager";
import { AppIcon } from "./AppIcon";

interface Props {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (code: LanguageCode) => void;
}

export const LanguagePicker: React.FC<Props> = ({ selectedLanguage, onSelectLanguage }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppIcon name="settings" size={14} color={theme.textMuted} />
        <Text style={[styles.headerTitle, { color: theme.textMuted }]}>
          SELECT FARMER LANGUAGE
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === selectedLanguage;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? theme.primary + "1A" : theme.card,
                  borderColor: isSelected ? theme.primary : theme.cardBorder,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={() => onSelectLanguage(lang.code)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.nativeText,
                  { color: isSelected ? theme.primary : theme.text }
                ]}
              >
                {lang.nativeLabel}
              </Text>
              <Text
                style={[
                  styles.codeText,
                  { color: isSelected ? theme.primary : theme.textMuted }
                ]}
              >
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
    marginVertical: 8
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginLeft: 6
  },
  scrollContent: {
    flexDirection: "row",
    paddingVertical: 2
  },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: "center",
    minWidth: 95
  },
  nativeText: {
    fontSize: 14,
    fontWeight: "800"
  },
  codeText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700"
  }
});
