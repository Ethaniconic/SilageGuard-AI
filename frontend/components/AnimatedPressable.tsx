/**
 * SILAGEGUARD AI V4 — Tactile Spring Animated Pressable
 * Provides responsive physical tactile spring scaling and haptic feedback
 * designed for farmers operating devices outdoors or wearing farm gloves.
 */

import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  Platform
} from "react-native";
import * as Haptics from "expo-haptics";

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticFeedback?: boolean;
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<Props> = ({
  style,
  scaleTo = 0.97,
  hapticFeedback = true,
  children,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (hapticFeedback && Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // no-op if unsupported
      }
    }

    Animated.spring(scale, {
      toValue: scaleTo,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start();

    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 160,
      friction: 10,
      useNativeDriver: true,
    }).start();

    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
