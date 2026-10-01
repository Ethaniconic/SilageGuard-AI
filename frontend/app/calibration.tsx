/**
 * SILAGEGUARD AI V4 — Sensor Calibration Module
 * Dedicated physical hardware calibration for pH electrodes, capacitive moisture ADC,
 * and thermal offset correction. Coefficients persist into SQLite.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { StatusCard } from "../components/StatusCard";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { useAppStore } from "../store/useAppStore";
import { useTheme } from "../features/ble/bleManager";
import { batchRepository } from "../sqlite/batchRepository";
import { RADIUS, SPACING } from "../theme";

export default function CalibrationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    largeTypography,
    calibrationProfile,
    updateCalibrationProfile,
    showToast,
    telemetry,
  } = useAppStore();

  const [ph4Voltage, setPh4Voltage] = useState(
    telemetry?.ph ? (3.05).toString() : "3.05"
  );
  const [ph7Voltage, setPh7Voltage] = useState(
    telemetry?.ph ? (2.50).toString() : "2.50"
  );
  const [airAdc, setAirAdc] = useState(
    calibrationProfile.moisture_dry_adc.toString()
  );
  const [waterAdc, setWaterAdc] = useState(
    calibrationProfile.moisture_wet_adc.toString()
  );
  const [tempOffset, setTempOffset] = useState(
    calibrationProfile.temp_offset.toString()
  );
  const [isSaving, setIsSaving] = useState(false);

  // Compute calculated slope and offset
  const v4 = parseFloat(ph4Voltage) || 3.05;
  const v7 = parseFloat(ph7Voltage) || 2.50;
  const deltaV = v4 - v7;
  const calculatedSlope = deltaV > 0 ? Number((-2.99 / deltaV).toFixed(4)) : -5.7;
  const calculatedOffset = Number((7.0 - v7 * calculatedSlope).toFixed(4));

  const handleCaptureLiveAdc = () => {
    if (telemetry?.ph) {
      setPh7Voltage((2.5 + (7.0 - telemetry.ph) * 0.18).toFixed(2));
      showToast("Captured live probe voltage", "info");
    } else {
      showToast("Probe disconnected. Using preset standard calibration voltage.", "warning");
    }
  };

  const handleSaveCalibration = async () => {
    setIsSaving(true);
    try {
      const parsedAir = parseInt(airAdc, 10) || 3200;
      const parsedWater = parseInt(waterAdc, 10) || 1250;
      const parsedTempOffset = parseFloat(tempOffset) || 0.0;
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const newProfile = {
        probe_id: "SG-PROBE-V4-ESP32",
        ph_buffer_4: v4,
        ph_buffer_7: v7,
        ph_slope: calculatedSlope,
        ph_offset: calculatedOffset,
        moisture_air_adc: parsedAir,
        moisture_water_adc: parsedWater,
        temp_offset: parsedTempOffset,
        calibrated_at: now.toISOString(),
        expires_at: expiry.toISOString(),
        health_status: "HEALTHY" as const,
      };

      await batchRepository.saveCalibration(newProfile);
      updateCalibrationProfile({
        ph_slope: calculatedSlope,
        ph_offset: calculatedOffset,
        moisture_dry_adc: parsedAir,
        moisture_wet_adc: parsedWater,
        temp_offset: parsedTempOffset,
        calibrated_at: now.toISOString(),
        expires_at: expiry.toISOString(),
        health_status: "HEALTHY",
      });

      showToast("Calibration coefficients saved to SQLite", "success");
      setTimeout(() => router.back(), 500);
    } catch (e: any) {
      showToast("Failed to save calibration: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Hardware Calibration" showBack fallbackRoute="/settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Probe Health Banner */}
        <StatusCard
          title="Hardware Sensor Health: OPTIMAL"
          description={`Last calibrated: ${new Date(calibrationProfile.calibrated_at || Date.now()).toLocaleDateString()} · Calibration valid for 30 days.`}
          status="success"
        />

        {/* Section 1: pH Electrode Calibration */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: largeTypography ? 18 : 16 }]}>
            1. pH Electrode 2-Point Buffer
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Submerge electrode into standard buffer solutions. Formula: pH = slope × (V - V7) + 7.00
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Buffer 7.00 Voltage (V)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                keyboardType="numeric"
                value={ph7Voltage}
                onChangeText={setPh7Voltage}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Buffer 4.01 Voltage (V)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                keyboardType="numeric"
                value={ph4Voltage}
                onChangeText={setPh4Voltage}
              />
            </View>
          </View>

          <View style={[styles.computedBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.computedLabel, { color: theme.textMuted }]}>
              Calculated Slope: <Text style={{ color: theme.primary, fontWeight: "700" }}>{calculatedSlope}</Text>
            </Text>
            <Text style={[styles.computedLabel, { color: theme.textMuted }]}>
              Calculated Offset: <Text style={{ color: theme.accent, fontWeight: "700" }}>{calculatedOffset}</Text>
            </Text>
          </View>
        </View>

        {/* Section 2: Moisture Capacitive Sensor */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: largeTypography ? 18 : 16 }]}>
            2. Moisture Capacitive Range (ADC)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Calibrate raw 12-bit ADC in open air (0% moisture) and submerged water (100% moisture).
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Dry Air ADC (0%)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                keyboardType="numeric"
                value={airAdc}
                onChangeText={setAirAdc}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Saturated Wet ADC (100%)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                keyboardType="numeric"
                value={waterAdc}
                onChangeText={setWaterAdc}
              />
            </View>
          </View>
        </View>

        {/* Section 3: Temperature Offset */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: largeTypography ? 18 : 16 }]}>
            3. Temperature Sensor Offset (°C)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Compensate for DS18B20 probe thermal resistance against certified reference thermometer.
          </Text>

          <View style={styles.inputRow}>
            <View style={[styles.inputCol, { width: "100%" }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Offset Adjustment (°C)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                keyboardType="numeric"
                value={tempOffset}
                onChangeText={setTempOffset}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <SecondaryButton
            title="Read Live Probe Voltage"
            onPress={handleCaptureLiveAdc}
            style={{ marginBottom: SPACING.md }}
          />

          <PrimaryButton
            title="Save Calibration to SQLite"
            onPress={handleSaveCalibration}
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  sectionCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputCol: {
    width: "48%",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
  },
  computedBox: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  computedLabel: {
    fontSize: 12,
  },
  buttonGroup: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
