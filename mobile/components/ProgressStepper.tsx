/**
 * SILAGEGUARD AI V4 — ProgressStepper Component
 * Visual step indicator for the 3-step rapid screening wizard:
 * 1: Surface Imaging -> 2: Physical Probe -> 3: Multimodal Analysis
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

export interface StepItem {
  number: number;
  label: string;
}

export interface ProgressStepperProps {
  currentStep: number;
  steps?: StepItem[];
}

const DEFAULT_STEPS: StepItem[] = [
  { number: 1, label: "1. Capture" },
  { number: 2, label: "2. Probe" },
  { number: 3, label: "3. Analyze" },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
}) => {
  const { theme, largeTypography } = useAppStore();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;

        let badgeBg = theme.surfaceElevated;
        let badgeBorder = theme.cardBorder;
        let textColor = theme.textMuted;

        if (isCompleted) {
          badgeBg = theme.safe;
          badgeBorder = theme.safe;
          textColor = "#042F2E";
        } else if (isActive) {
          badgeBg = theme.primary;
          badgeBorder = theme.primaryLight;
          textColor = theme.textInverse;
        }

        return (
          <React.Fragment key={step.number}>
            {/* Step Node */}
            <View style={styles.stepNode}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                  },
                ]}
              >
                <Text style={[styles.circleText, { color: textColor }]}>
                  {isCompleted ? "✓" : step.number}
                </Text>
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? theme.primary : isCompleted ? theme.textSecondary : theme.textMuted,
                    fontWeight: isActive ? "700" : "500",
                    fontSize: largeTypography ? 13 : 11,
                  },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: currentStep > step.number ? theme.safe : theme.cardBorder,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  stepNode: {
    alignItems: "center",
    minWidth: 70,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  circleText: {
    fontSize: 12,
    fontWeight: "800",
  },
  label: {
    letterSpacing: 0.2,
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: SPACING.xs,
    marginBottom: 16,
  },
});
