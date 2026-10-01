/**
 * SILAGEGUARD AI V4 — Hardware Probe Beacon Animation
 * Renders an energetic pulsing beacon with rhythmic ripple waves.
 * Provides immediate visual feedback of hardware probe telemetry streaming.
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

interface Props {
  isConnected: boolean;
  size?: number;
  color?: string;
}

export const ProbeBeacon: React.FC<Props> = ({
  isConnected,
  size = 12,
  color
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: isConnected ? 1800 : 2600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [isConnected]);

  const activeColor = color || (isConnected ? "#10B981" : "#EF4444");

  const rippleScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const rippleOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.7, 0.35, 0],
  });

  return (
    <View style={[styles.container, { width: size * 2.4, height: size * 2.4 }]}>
      {/* Expanding Ripple Ring */}
      <Animated.View
        style={[
          styles.ripple,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: activeColor,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />

      {/* Solid Center Core */}
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: activeColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  ripple: {
    position: "absolute",
  },
  core: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
