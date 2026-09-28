/**
 * SILAGEGUARD AI V4 — Industrial EmptyState Component
 * Adheres strictly to RULE 4: ZERO DUMMY DATA.
 * Guides farmer when no scans or telemetry exist yet.
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";
import { PrimaryButton } from "./Buttons";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
}) => {
  const { theme, largeTypography } = useAppStore();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontSize: largeTypography ? 20 : 18,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.description,
          {
            color: theme.textSecondary,
            fontSize: largeTypography ? 15 : 13,
          },
        ]}
      >
        {description}
      </Text>

      {actionTitle && onAction ? (
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title={actionTitle}
            onPress={onAction}
            size="md"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: SPACING.md,
  },
  iconWrapper: {
    marginBottom: SPACING.md,
    opacity: 0.9,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  buttonWrapper: {
    marginTop: SPACING.lg,
  },
});
