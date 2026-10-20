import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, TextInput } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppButton } from "../components/AppButton";
import { MetricCard } from "../components/MetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { ProbeConnectionGateway } from "../components/ProbeConnectionGateway";
import * as ImagePicker from "expo-image-picker";
import { runInference } from "../services/api";
import { bleManager } from "../services/ble/bleManager";
import { localDb } from "../services/db/localDb";
import { ImageValidator } from "../services/camera/imageValidator";

export function CheckScreen({ onBack, onComplete }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();

  // Guided Workflow Steps:
  // 1: Connect Probe -> 2: Live Measurements -> 3: Camera Capture -> 4: Processing -> Result
  const [step, setStep] = useState(1);
  const [probeConnected, setProbeConnected] = useState(false);
  const [isScanningProbe, setIsScanningProbe] = useState(false);
  const [bleStatusText, setBleStatusText] = useState("Not connected yet");

  // Real Live Telemetry (Null initially until genuine hardware packet arrives)
  const [telemetry, setTelemetry] = useState({
    ph: null,
    moisture: null,
    temperature: null,
    ambient: 25.0,
    deltaTemp: null,
    probeId: "SILAGE-ESP32-PROBE",
    isStable: false,
  });

  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoStep, setPhotoStep] = useState(1); // 1: Surface, 2: Face, 3: Core Depth
  const [analysisError, setAnalysisError] = useState(null);

  // Real Silage Batch Tracking
  const [existingBatches, setExistingBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [cropType, setCropType] = useState("Corn / Maize");
  const [storageType, setStorageType] = useState("Bunker Pit");
  const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");

  useEffect(() => {
    localDb.getBatches().then((b) => {
      if (b && b.length > 0) {
        setExistingBatches(b);
        setSelectedBatchId(b[0].client_batch_id);
        if (b[0].crop_type) setCropType(b[0].crop_type);
      } else {
        const defaultBatch = {
          client_batch_id: "SG-2026-001",
          crop_type: "Corn / Maize",
          storage_type: "Bunker Pit",
        };
        setExistingBatches([defaultBatch]);
        setSelectedBatchId(defaultBatch.client_batch_id);
      }
    });
  }, []);

  // Subscribe to real BLE hardware events
  useEffect(() => {
    const unsubscribe = bleManager.onTelemetry((evt) => {
      if (evt.type === "CONNECTED") {
        setProbeConnected(true);
        setIsScanningProbe(false);
        setBleStatusText(`Connected to ${evt.deviceName || "SilageGuard-Probe"}`);
      } else if (evt.type === "TELEMETRY" && evt.telemetry) {
        setTelemetry({
          ph: evt.telemetry.ph,
          moisture: evt.telemetry.moisture,
          temperature: evt.telemetry.coreTemp,
          ambient: evt.telemetry.ambient,
          deltaTemp: evt.telemetry.deltaTemp,
          probeId: evt.telemetry.probeId,
          isStable: true,
        });
      } else if (evt.type === "SIGNAL_LOST") {
        setBleStatusText("Probe signal lost — check battery or proximity");
      } else if (evt.type === "DISCONNECTED") {
        setProbeConnected(false);
        setBleStatusText("Probe disconnected");
        setTelemetry({
          ph: null,
          moisture: null,
          temperature: null,
          ambient: 25.0,
          deltaTemp: null,
          probeId: "SILAGE-ESP32-PROBE",
          isStable: false,
        });
      } else if (evt.type === "ERROR") {
        setIsScanningProbe(false);
        setBleStatusText(`Connection issue: ${evt.error}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSearchProbe = async () => {
    setIsScanningProbe(true);
    setBleStatusText("Scanning for SilageGuard-Probe (BLE)...");
    const res = await bleManager.connect();
    if (!res.success) {
      setIsScanningProbe(false);
      setBleStatusText(res.error || "Probe not found nearby");
    }
  };

  const handleCapturePhoto = async () => {
    try {
      // 1. Request Camera Permissions
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // Fallback to gallery if camera hardware permission not allowed
        Alert.alert(
          "Camera Permission",
          "Camera access is recommended to snap silage photos. Would you like to pick from gallery instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Choose from Gallery",
              onPress: async () => {
                const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (libPerm.granted) {
                  const res = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    base64: true,
                    quality: 0.8,
                  });
                  if (!res.canceled && res.assets && res.assets[0]) {
                    processCapturedPhoto(res.assets[0]);
                  }
                }
              },
            },
          ]
        );
        return;
      }

      // 2. Launch Camera Hardware
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        processCapturedPhoto(result.assets[0]);
      }
    } catch (err) {
      console.warn("Camera launch error:", err.message);
      // Fallback for desktop browser or emulator without camera
      const fallbackResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });
      if (!fallbackResult.canceled && fallbackResult.assets && fallbackResult.assets[0]) {
        processCapturedPhoto(fallbackResult.assets[0]);
      }
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        Alert.alert("Permission Needed", "Please grant photo library access to upload a silage photo.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        processCapturedPhoto(res.assets[0]);
      }
    } catch (err) {
      console.warn("Upload photo error:", err.message);
      Alert.alert("Upload Error", "Could not load selected photo.");
    }
  };

  const processCapturedPhoto = (asset) => {
    const rawBase64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null;
    if (!rawBase64) {
      Alert.alert("Camera Alert", "Could not read photo data. Please try again.");
      return;
    }

    const validation = ImageValidator.validate(rawBase64, {
      width: asset.width,
      height: asset.height,
    });
    if (!validation.isValid) {
      Alert.alert("Image Quality Alert", validation.reasons.join("\n"));
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoBase64(rawBase64);
    setHasPhoto(true);
  };

  const handleStartAnalysis = async () => {
    setStep(4); // Processing state
    setAnalysisError(null);

    const finalBatchId = isCreatingNewBatch && newBatchName.trim()
      ? newBatchName.trim()
      : selectedBatchId || `SG-2026-001`;

    // Persist or retrieve batch in local SQLite
    await localDb.createOrGetBatch({
      client_batch_id: finalBatchId,
      crop_type: cropType,
      storage_type: storageType,
    });

    // Pass real telemetry ONLY if probe was actually connected; otherwise null
    const response = await runInference({
      ph: probeConnected ? telemetry.ph : null,
      moisture: probeConnected ? telemetry.moisture : null,
      temperature: probeConnected ? telemetry.temperature : null,
      ambientTemp: telemetry.ambient || 25.0,
      imageBase64: photoBase64,
      batchId: finalBatchId,
    });

    if (response.success && response.result) {
      const r = {
        ...response.result,
        batchId: finalBatchId,
        client_batch_id: finalBatchId,
        cropType,
        crop_type: cropType,
        storageType,
        storage_type: storageType,
        originalPhoto: response.result?.originalPhoto || photoBase64,
        image_base64: response.result?.originalPhoto || photoBase64,
      };
      // Persist real observation atomically into local SQLite & cloud sync queue
      await localDb.saveObservation(r);
      onComplete(r);
    } else {
      setStep(3);
      setAnalysisError(response.error || "Inference failed");
      Alert.alert("Connection Alert", response.error || "Analysis failed");
    }
  };

  const cropOptions = [
    { key: "cropCorn", name: "Corn / Maize" },
    { key: "cropAlfalfa", name: "Alfalfa" },
    { key: "cropGrass", name: "Grass" },
    { key: "cropMixed", name: "Mixed Forage" },
    { key: "cropSorghum", name: "Sorghum" },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t("checkSilage")}
        subtitle={
          probeConnected
            ? t("stepIndicatorProbe").replace("{step}", String(step))
            : t("stepIndicatorVision").replace("{step}", String(step === 1 ? 1 : 2))
        }
        onBack={step > 1 ? () => setStep(step - 1) : onBack}
      />

      {/* STEP INDICATOR */}
      <View style={[styles.stepBar, { paddingHorizontal: spacing.lg, marginVertical: spacing.sm }]}>
        <View style={[styles.stepDot, { backgroundColor: step >= 1 ? theme.good : theme.border }]} />
        <View style={[styles.stepLine, { backgroundColor: step >= 2 ? theme.good : theme.border }]} />
        <View style={[styles.stepDot, { backgroundColor: step >= 2 ? theme.good : theme.border }]} />
        {probeConnected ? (
          <>
            <View style={[styles.stepLine, { backgroundColor: step >= 3 ? theme.good : theme.border }]} />
            <View style={[styles.stepDot, { backgroundColor: step >= 3 ? theme.good : theme.border }]} />
          </>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* STEP 1: BATCH SELECTION & CONNECT PROBE */}
        {step === 1 && (
          <View>
            {/* BATCH SELECTOR CARD */}
            <View style={[styles.batchSelectorCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.md, marginBottom: spacing.md }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={[typography.sectionTitle, { color: theme.textPrimary, fontSize: 15 }]}>
                  📦 {t("batchSelectionTitle")}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsCreatingNewBatch(!isCreatingNewBatch)}
                >
                  <Text style={[typography.caption, { color: theme.primary, fontWeight: "700" }]}>
                    {isCreatingNewBatch ? t("existingBatches") : t("newBatch")}
                  </Text>
                </TouchableOpacity>
              </View>

              {!isCreatingNewBatch ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {existingBatches.map((b) => {
                    const isSelected = selectedBatchId === b.client_batch_id;
                    return (
                      <TouchableOpacity
                        key={b.client_batch_id}
                        onPress={() => {
                          setSelectedBatchId(b.client_batch_id);
                          if (b.crop_type) setCropType(b.crop_type);
                        }}
                        style={[
                          styles.batchPill,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceSoft,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text style={[typography.caption, { color: isSelected ? "#FFFFFF" : theme.textPrimary, fontWeight: "700" }]}>
                          {b.client_batch_id} ({b.crop_type || "Silage"})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={{ marginTop: 4 }}>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSoft, borderRadius: radius.medium, paddingHorizontal: 12, paddingVertical: 8 }]}
                    placeholder={t("newBatchPlaceholder")}
                    placeholderTextColor={theme.textMuted}
                    value={newBatchName}
                    onChangeText={setNewBatchName}
                  />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {cropOptions.map((c) => (
                      <TouchableOpacity
                        key={c.name}
                        onPress={() => setCropType(c.name)}
                        style={[
                          styles.cropPill,
                          {
                            backgroundColor: cropType === c.name ? theme.primary : theme.surfaceSoft,
                            borderColor: cropType === c.name ? theme.primary : theme.border,
                            borderRadius: radius.small,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          },
                        ]}
                      >
                        <Text style={[typography.caption, { color: cropType === c.name ? "#FFFFFF" : theme.textSecondary }]}>
                          {t(c.key)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <ProbeConnectionGateway
            isConnected={probeConnected}
            telemetry={telemetry}
            onDeviceConnected={() => {
              setProbeConnected(true);
            }}
            onDisconnect={() => {
              bleManager.disconnect();
              setProbeConnected(false);
              setTelemetry({
                ph: null,
                moisture: null,
                temperature: null,
                ambient: 25.0,
                deltaTemp: null,
                probeId: "SILAGE-ESP32-PROBE",
                isStable: false,
              });
            }}
            onProceedToSensors={() => setStep(2)}
            onProceedToVisionOnly={() => {
              setProbeConnected(false);
              setTelemetry({
                ph: null,
                moisture: null,
                temperature: null,
                ambient: 25.0,
                deltaTemp: null,
                probeId: "SILAGE-ESP32-PROBE",
                isStable: false,
              });
              setStep(3); // Jump directly to camera
            }}
          />
        </View>
        )}

        {/* STEP 2: SENSOR MEASUREMENTS */}
        {step === 2 && (
          <View>
            <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.lg }]}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
                {t("measuringTitle")}
              </Text>
              <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 4, marginBottom: spacing.md }]}>
                {probeConnected ? `${t("liveTelemetryFrom")} ${telemetry.probeId || "ESP32-Probe"}` : t("probeDisconnected")}
              </Text>

              {/* DYNAMIC REAL METRICS */}
              <View style={styles.metricsGrid}>
                <MetricCard
                  label={t("phLevel")}
                  value={telemetry.ph}
                  status={
                    telemetry.ph === null
                      ? "NORMAL"
                      : telemetry.ph <= 4.2
                      ? "NORMAL"
                      : telemetry.ph <= 4.8
                      ? "WARNING"
                      : "ALERT"
                  }
                  hint={
                    telemetry.ph === null
                      ? t("noPhSensor")
                      : telemetry.ph <= 4.2
                      ? t("optimalAcidity")
                      : telemetry.ph <= 4.8
                      ? t("elevatedPh")
                      : t("highPhRisk")
                  }
                />
                <MetricCard
                  label={t("moisture")}
                  value={telemetry.moisture}
                  unit="%"
                  status={
                    telemetry.moisture === null
                      ? "NORMAL"
                      : telemetry.moisture >= 60 && telemetry.moisture <= 68
                      ? "NORMAL"
                      : telemetry.moisture > 68 && telemetry.moisture <= 72
                      ? "WARNING"
                      : "ALERT"
                  }
                  hint={
                    telemetry.moisture === null
                      ? t("awaitingHardwarePacket")
                      : telemetry.moisture >= 60 && telemetry.moisture <= 68
                      ? t("safeMoistureBand")
                      : telemetry.moisture > 72
                      ? t("clostridialRisk")
                      : t("outsideTargetBand")
                  }
                />
              </View>
              <View style={styles.metricsGrid}>
                <MetricCard
                  label={t("coreTemp")}
                  value={telemetry.temperature}
                  unit="°C"
                  status={
                    telemetry.temperature === null
                      ? "NORMAL"
                      : telemetry.temperature <= 30
                      ? "NORMAL"
                      : telemetry.temperature <= 38
                      ? "WARNING"
                      : "ALERT"
                  }
                  hint={
                    telemetry.temperature === null
                      ? t("awaitingSensorReading")
                      : telemetry.temperature <= 30
                      ? t("stableAnaerobicCore")
                      : telemetry.temperature <= 38
                      ? t("aerobicHeatingDetected")
                      : t("severeHeating")
                  }
                />
                <MetricCard
                  label={t("tempRise")}
                  value={telemetry.deltaTemp !== null ? (telemetry.deltaTemp >= 0 ? `+${telemetry.deltaTemp}` : `${telemetry.deltaTemp}`) : "--"}
                  unit="°C"
                  status={
                    telemetry.deltaTemp === null
                      ? "NORMAL"
                      : telemetry.deltaTemp <= 3.0
                      ? "NORMAL"
                      : telemetry.deltaTemp <= 6.0
                      ? "WARNING"
                      : "ALERT"
                  }
                  hint={
                    telemetry.deltaTemp === null
                      ? t("relativeToAmbient")
                      : telemetry.deltaTemp <= 3.0
                      ? t("minimalHeatRise")
                      : t("elevatedHeatRise")
                  }
                />
              </View>

              {/* REAL HARDWARE STREAM STATUS */}
              <View
                style={[
                  styles.readingCheck,
                  {
                    backgroundColor: probeConnected ? theme.goodBg : theme.highRiskBg,
                    borderRadius: radius.medium,
                    padding: spacing.sm,
                    marginVertical: spacing.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: probeConnected ? theme.good : theme.highRisk,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {probeConnected
                    ? t("receivingPhysicalTelemetry")
                    : t("probeDisconnectedAlert")}
                </Text>
              </View>

              <AppButton
                title={t("nextCapturePhoto")}
                variant="primary"
                size="large"
                style={{ marginTop: spacing.lg }}
                onPress={() => setStep(3)}
              />
            </View>
          </View>
        )}

        {/* STEP 3: CAMERA CAPTURE */}
        {step === 3 && (
          <View>
            <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.lg }]}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
                {t("cameraTitle")}
              </Text>
              <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 4, marginBottom: spacing.md }]}>
                {t("cameraInstructions")}
              </Text>

              {!probeConnected ? (
                <View style={[styles.visionBanner, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.medium, padding: spacing.sm, marginBottom: spacing.md }]}>
                  <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center" }]}>
                    {t("visionOnlyNotice")}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.cameraPreview, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, borderRadius: radius.large, overflow: "hidden" }]}>
                {hasPhoto && photoUri ? (
                  <View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                    <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    <View style={[styles.overlayBadge, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
                      <Text style={[typography.caption, { color: "#FFFFFF", fontWeight: "700" }]}>
                        ✓ {t("photoQualityOk")}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.photoContainer}>
                    <Text style={{ fontSize: 48 }}>📷</Text>
                    <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 8 }]}>
                      {t("aimCameraNotice")}
                    </Text>
                  </View>
                )}
              </View>

              {!hasPhoto ? (
                <View style={{ marginTop: spacing.lg }}>
                  <AppButton
                    title={`📷 ${t("takePhoto")}`}
                    variant="primary"
                    size="large"
                    onPress={handleCapturePhoto}
                  />
                  <AppButton
                    title={t("uploadFromGallery")}
                    variant="secondary"
                    size="medium"
                    style={{ marginTop: 12 }}
                    onPress={handleUploadPhoto}
                  />
                </View>
              ) : (
                <View style={{ marginTop: spacing.lg }}>
                  <AppButton
                    title={t("runHealthAnalysis")}
                    variant="primary"
                    size="large"
                    onPress={handleStartAnalysis}
                  />
                  <AppButton
                    title={t("retake")}
                    variant="outline"
                    size="medium"
                    style={{ marginTop: 12 }}
                    onPress={() => setHasPhoto(false)}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 4: PROCESSING STATE */}
        {step === 4 && (
          <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.xl, alignItems: "center" }]}>
            <Text style={{ fontSize: 44, marginBottom: 16 }}>⚙️</Text>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
              {t("analyzingSilage")}
            </Text>
            <View style={{ marginTop: 20, width: "100%" }}>
              <Text style={[typography.secondary, { color: theme.good, marginBottom: 8 }]}>
                {t("sensorVerified")}
              </Text>
              <Text style={[typography.secondary, { color: theme.good, marginBottom: 8 }]}>
                {t("photoPassedIqa")}
              </Text>
              <Text style={[typography.secondary, { color: theme.primary, marginBottom: 8 }]}>
                {t("runningFusion")}
              </Text>
              <Text style={[typography.secondary, { color: theme.textMuted }]}>
                {t("checkingRules")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
  },
  infoBox: {
    borderWidth: 1,
  },
  probeStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -3,
    marginVertical: 2,
  },
  readingCheck: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#A3D9B1",
  },
  cameraPreview: {
    height: 220,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  photoContainer: {
    alignItems: "center",
  },
  overlayBadge: {
    position: "absolute",
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  batchSelectorCard: {
    borderWidth: 1,
  },
  batchPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cropPill: {
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    fontSize: 14,
  },
});
