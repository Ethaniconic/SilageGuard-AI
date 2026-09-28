/**
 * SILAGEGUARD AI V4 — Root Application Layout & Navigation
 * SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 * Includes ErrorBoundary protection, Toast alerts, SQLite initialization,
 * and background sync manager watcher.
 */

import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "../sqlite/database";
import { syncManager } from "../services/sync/syncManager";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Toast } from "../components/Toast";
import { useAppStore } from "../store/useAppStore";

export default function RootLayout() {
  const { theme } = useAppStore();

  useEffect(() => {
    initDatabase();
    syncManager.startWatcher(30000);
    return () => {
      syncManager.stopWatcher();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <StatusBar style={theme.isDark ? "light" : "dark"} />
          <Toast />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="home" />
            <Stack.Screen name="ble" />
            <Stack.Screen name="camera" />
            <Stack.Screen name="processing" />
            <Stack.Screen name="result" />
            <Stack.Screen name="explainability" />
            <Stack.Screen name="history" />
            <Stack.Screen name="details" />
            <Stack.Screen name="insights" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="calibration" />
            <Stack.Screen name="education" />
          </Stack>
        </View>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
