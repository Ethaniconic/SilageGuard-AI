/**
 * SILAGEGUARD AI V4 — Industrial Button Suite
 * High-contrast, tactile haptic feedback, loading state, and accessible touch targets.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

interface ButtonBaseProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

function triggerHaptic() {
  if (Platform.OS !== "web") {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore if not supported
    }
  }
}

export const PrimaryButton: React.FC<ButtonBaseProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = "md",
  fullWidth = true,
}) => {
  const { theme, largeTypography } = useAppStore();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic();
    onPress();
  };

  const padV = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const padH = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const fontSize = largeTypography
    ? size === "sm" ? 14 : size === "lg" ? 18 : 16
    : size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? theme.cardBorder : theme.primary,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: RADIUS.md,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.textInverse} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: disabled ? theme.textMuted : theme.textInverse,
                fontSize,
                marginLeft: icon ? SPACING.sm : 0,
              },
              textStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<ButtonBaseProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = "md",
  fullWidth = true,
}) => {
  const { theme, largeTypography } = useAppStore();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic();
    onPress();
  };

  const padV = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const padH = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const fontSize = largeTypography
    ? size === "sm" ? 14 : size === "lg" ? 18 : 16
    : size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: theme.surfaceElevated,
          borderWidth: 1,
          borderColor: theme.cardBorderHover,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: RADIUS.md,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: disabled ? theme.textMuted : theme.text,
                fontSize,
                marginLeft: icon ? SPACING.sm : 0,
              },
              textStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const DangerButton: React.FC<ButtonBaseProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = "md",
  fullWidth = true,
}) => {
  const { theme, largeTypography } = useAppStore();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic();
    onPress();
  };

  const padV = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const padH = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const fontSize = largeTypography
    ? size === "sm" ? 14 : size === "lg" ? 18 : 16
    : size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: theme.unsafe,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: RADIUS.md,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: "#FFFFFF",
                fontSize,
                marginLeft: icon ? SPACING.sm : 0,
              },
              textStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const SuccessButton: React.FC<ButtonBaseProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = "md",
  fullWidth = true,
}) => {
  const { theme, largeTypography } = useAppStore();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic();
    onPress();
  };

  const padV = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const padH = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const fontSize = largeTypography
    ? size === "sm" ? 14 : size === "lg" ? 18 : 16
    : size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: theme.safe,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: RADIUS.md,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#042F2E" size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: "#042F2E",
                fontSize,
                marginLeft: icon ? SPACING.sm : 0,
              },
              textStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48, // Accessible touch target size
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
    textAlign: "center",
  },
});
