/**
 * SILAGEGUARD AI V4 — Global Toast Notification Component
 * Animated alert notifications for offline status, scan results, sync updates, and errors.
 */

import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

export const Toast: React.FC = () => {
  const { toast, hideToast, theme, largeTypography } = useAppStore();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.spring(slideAnim, {
        toValue: 20,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.durationMs || 3000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [toast.visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      hideToast();
    });
  };

  if (!toast.visible) return null;

  const getToastColors = () => {
    switch (toast.type) {
      case "success":
        return { bg: theme.safe, text: "#042F2E", border: theme.safeBorder };
      case "error":
        return { bg: theme.unsafe, text: "#FFFFFF", border: theme.unsafeBorder };
      case "warning":
        return { bg: theme.caution, text: "#451A03", border: theme.cautionBorder };
      default:
        return { bg: theme.surfaceElevated, text: theme.text, border: theme.cardBorderHover };
    }
  };

  const colors = getToastColors();

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.message,
            {
              color: colors.text,
              fontSize: largeTypography ? 15 : 13,
            },
          ]}
        >
          {toast.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: "absolute",
    top: 40,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    width: "100%",
  },
  message: {
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
});
