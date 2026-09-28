/**
 * SILAGEGUARD AI V4 — Global Error Boundary & Crash Recovery
 * Catches unhandled runtime exceptions, BLE disconnects, SQLite failures,
 * and renders an industrial diagnostic recovery console.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { DARK_THEME } from "../constants/colors";
import { RADIUS, SPACING } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SilageGuard Crash Protection]", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SYSTEM RECOVERY CONSOLE</Text>
            </View>

            <Text style={styles.title}>SilageGuard AI Safeguard</Text>
            <Text style={styles.subtitle}>
              An isolated subsystem encounter was intercepted. Offline local scan logs and databases remain protected.
            </Text>

            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Interception Signature:</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || "Unknown hardware/software fault"}
              </Text>
              {this.state.error?.stack ? (
                <Text style={styles.stackTrace} numberOfLines={6}>
                  {this.state.error.stack}
                </Text>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton
                title="Recover & Continue Scan"
                onPress={this.handleReset}
                size="lg"
                fullWidth
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  content: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  badge: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderColor: DARK_THEME.unsafe,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  badgeText: {
    color: DARK_THEME.unsafe,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: DARK_THEME.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: DARK_THEME.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  errorCard: {
    backgroundColor: DARK_THEME.surface,
    borderColor: DARK_THEME.cardBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: "100%",
    marginBottom: SPACING.xl,
  },
  errorTitle: {
    color: DARK_THEME.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  errorMessage: {
    color: DARK_THEME.unsafe,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  stackTrace: {
    color: DARK_THEME.textMuted,
    fontSize: 10,
    fontFamily: "monospace",
    marginTop: 8,
  },
  actionRow: {
    width: "100%",
  },
});
