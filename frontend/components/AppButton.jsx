import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../theme";

export function AppButton({
  title,
  onPress,
  variant = "primary", // primary, secondary, outline, danger
  size = "large",      // large, medium, small
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) {
  const { theme, radius, spacing, touchTargets, typography } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return theme.border;
    if (variant === "primary") return theme.primary;
    if (variant === "secondary") return theme.surfaceSoft;
    if (variant === "outline") return "transparent";
    if (variant === "danger") return theme.highRisk;
    return theme.primary;
  };

  const getTextColor = () => {
    if (disabled) return theme.textMuted;
    if (variant === "primary") return "#FFFFFF";
    if (variant === "secondary") return theme.textPrimary;
    if (variant === "outline") return theme.primary;
    if (variant === "danger") return "#FFFFFF";
    return "#FFFFFF";
  };

  const getMinHeight = () => {
    if (size === "large") return touchTargets.preferred; // 56px for farmers
    if (size === "medium") return touchTargets.min;       // 48px
    return 42;
  };

  const getBorderColor = () => {
    if (variant === "outline") return theme.primary;
    if (variant === "secondary") return theme.border;
    return "transparent";
  };

  const isElevated = variant === "primary" && !disabled;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          minHeight: getMinHeight(),
          borderRadius: size === "large" ? radius.large : radius.medium,
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" || variant === "secondary" ? 1.5 : 0,
          paddingHorizontal: spacing.xl,
          paddingVertical: size === "large" ? 16 : size === "medium" ? 13 : 10,
          shadowColor: isElevated ? theme.primary : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isElevated ? 0.2 : 0,
          shadowRadius: 4,
          elevation: isElevated ? 3 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? icon : null}
          <Text
            style={[
              typography.bodyBold,
              {
                color: getTextColor(),
                marginLeft: icon ? 8 : 0,
                textAlign: "center",
                letterSpacing: 0.3,
                fontSize: size === "large" ? 16 : 14,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
});
