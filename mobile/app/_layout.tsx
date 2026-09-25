/**
 * SILAGEGUARD AI — Root Application Layout & Navigation
 * SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 */

import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { THEME_COLORS } from "../utils/constants";
import { initDatabase } from "../sqlite/database";

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: THEME_COLORS.background },
          animation: "slide_from_right"
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="ble" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="processing" />
        <Stack.Screen name="result" />
        <Stack.Screen name="history" />
        <Stack.Screen name="details" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background
  }
});
