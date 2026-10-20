import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useTheme } from "../theme";

export function ScreenHeader({ title, subtitle, onBack, rightAction, showLogo = true }) {
  const { theme, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={[styles.backButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.backIcon, { color: theme.textPrimary }]}>←</Text>
          </TouchableOpacity>
        ) : showLogo ? (
          <Image
            source={require("../assets/icon-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={[typography.screenTitle, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? rightAction : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: "bold",
  },
  titleWrap: {
    flex: 1,
  },
});
