/**
 * SILAGEGUARD AI V4 — LoadingSkeleton Component
 * Prevents layout shift with smooth shimmer pulses for offline database loading.
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS } from "../theme";

export interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const { theme } = useAppStore();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.cardBorder,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useAppStore();
  return (
    <View
      style={[
        styles.cardSkeleton,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        style,
      ]}
    >
      <LoadingSkeleton width="40%" height={14} style={{ marginBottom: 12 }} />
      <LoadingSkeleton width="75%" height={24} style={{ marginBottom: 10 }} />
      <LoadingSkeleton width="100%" height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  cardSkeleton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
});
