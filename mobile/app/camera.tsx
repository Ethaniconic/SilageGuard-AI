/**
 * SCREEN 4 — GUIDED SURFACE CAMERA & SCAN PIPELINE
 * Redesigned for Dairy Farmers:
 * - Un-crowded, step-by-step intuitive flow
 * - Live real hardware camera with expo-camera (CameraView)
 * - Gallery upload & sample demo fallbacks
 * - Honest sensor telemetry card (no dummy data if probe disconnected)
 * - Sharp industrial corners & full viewport width
 * - Light & Dark theme support
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { CameraGuidanceOverlay } from "../components/CameraGuidanceOverlay";
import { useAppStore, useTheme } from "../features/ble/bleManager";

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    scanImages,
    addScanImage,
    removeScanImage,
    clearScanImages,
    cropType,
    setCropType,
    pitDepthCm,
    setPitDepthCm,
    bleStatus,
    telemetry,
    demoPreset
  } = useAppStore();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  const isConnected = bleStatus === "CONNECTED";

  const crops = [
    "Corn Silage (Zea mays)",
    "Hybrid Napier Grass",
    "Sorghum (Jowar)",
    "Lucerne / Alfalfa"
  ];

  // Shutter action using active CameraView
  const handleSnapPhoto = async () => {
    if (cameraRef.current) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8
        });
        if (photo && photo.uri) {
          addScanImage(photo.uri);
        }
      } catch (err) {
        console.warn("Camera snap notice, using demo sample:", err);
        useFallbackSample();
      } finally {
        setIsCapturing(false);
      }
    } else {
      useFallbackSample();
    }
  };

  // Pick from device photo gallery
  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        addScanImage(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Gallery", "Could not open photo gallery.");
    }
  };

  // Demo fallback image
  const useFallbackSample = () => {
    const nextCount = scanImages.length + 1;
    const sampleImageUri =
      demoPreset === "UNSAFE"
        ? `assets/images/unsafe_surface_${nextCount}.jpg`
        : demoPreset === "CAUTION"
        ? `assets/images/caution_surface_${nextCount}.jpg`
        : `assets/images/safe_surface_${nextCount}.jpg`;
    addScanImage(sampleImageUri);
  };

  // Proceed to multimodal inference
  const handleProceedToAI = () => {
    if (scanImages.length === 0) {
      useFallbackSample();
    }
    router.push("/processing" as any);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="SILAGE SCANNER" showBack={true} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: SURFACE CAMERA VIEWFINDER */}
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary, borderRadius: theme.radiusSm }]}>
            <Text style={styles.stepNumber}>STEP 1</Text>
          </View>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Capture Silage Bunker Face
          </Text>
        </View>

        {/* Camera / Captured Viewport */}
        <View
          style={[
            styles.viewfinderContainer,
            {
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusMd,
              backgroundColor: "#020617"
            }
          ]}
        >
          {scanImages.length > 0 ? (
            // PREVIEW OF CAPTURED PHOTO
            <View style={styles.previewWrapper}>
              <Image
                source={
                  scanImages[scanImages.length - 1].startsWith("assets/")
                    ? require("../assets/images/icon.png")
                    : { uri: scanImages[scanImages.length - 1] }
                }
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.previewSuccessBadge,
                  { backgroundColor: theme.safeBg, borderColor: theme.safeBorder, borderRadius: theme.radiusSm }
                ]}
              >
                <Text style={[styles.previewSuccessText, { color: theme.safe }]}>
                  ? Photo Captured Ready for AI
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.retakeButton, { backgroundColor: "rgba(0,0,0,0.75)", borderRadius: theme.radiusSm }]}
                onPress={() => clearScanImages()}
              >
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : permission?.granted ? (
            // LIVE REAL HARDWARE CAMERA
            <View style={StyleSheet.absoluteFill}>
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
              />
              <CameraGuidanceOverlay photoCount={scanImages.length} maxPhotos={3} />
            </View>
          ) : (
            // CAMERA PERMISSION REQUEST CARD
            <View style={styles.permissionCard}>
              <Text style={styles.cameraIcon}>??</Text>
              <Text style={[styles.permissionTitle, { color: "#FFFFFF" }]}>
                Camera Access Needed
              </Text>
              <Text style={[styles.permissionSubtitle, { color: "#94A3B8" }]}>
                To scan the silage bunker face for mould, moisture staining, and discoloration.
              </Text>
              <TouchableOpacity
                style={[styles.grantButton, { backgroundColor: theme.primary, borderRadius: theme.radiusSm }]}
                onPress={requestPermission}
              >
                <Text style={styles.grantButtonText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SHUTTER / ACTION BUTTONS (Un-crowded, clear targets) */}
        {scanImages.length === 0 ? (
          <View style={styles.shutterRow}>
            {/* Gallery Upload */}
            <TouchableOpacity
              style={[
                styles.auxButton,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
              ]}
              onPress={handlePickGallery}
              activeOpacity={0.8}
            >
              <Text style={styles.auxIcon}>???</Text>
              <Text style={[styles.auxText, { color: theme.text }]}>Gallery</Text>
            </TouchableOpacity>

            {/* Primary Center Big Shutter Button */}
            <TouchableOpacity
              style={[styles.mainShutterBtn, { borderColor: theme.primary }]}
              onPress={handleSnapPhoto}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              {isCapturing ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View style={[styles.mainShutterInner, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>

            {/* Demo Sample Image */}
            <TouchableOpacity
              style={[
                styles.auxButton,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }
              ]}
              onPress={useFallbackSample}
              activeOpacity={0.8}
            >
              <Text style={styles.auxIcon}>??</Text>
              <Text style={[styles.auxText, { color: theme.text }]}>Sample</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* STEP 2: SENSOR PROBE STATUS CARD (Transparent, No Dummy Data) */}
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: isConnected ? theme.safe : theme.cardBorder, borderRadius: theme.radiusSm }]}>
            <Text style={styles.stepNumber}>STEP 2</Text>
          </View>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Probe Telemetry Reading
          </Text>
        </View>

        <View
          style={[
            styles.probeStatusCard,
            {
              backgroundColor: theme.card,
              borderColor: isConnected ? theme.safeBorder : theme.cardBorder,
              borderRadius: theme.radiusMd
            }
          ]}
        >
          <View style={styles.probeCardHeader}>
            <View style={styles.probeIndicatorRow}>
              <View
                style={[
                  styles.probeDot,
                  { backgroundColor: isConnected ? theme.safe : theme.unsafe }
                ]}
              />
              <Text style={[styles.probeCardTitle, { color: theme.text }]}>
                {isConnected ? "Probe Connected" : "Probe Disconnected"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.probePairBtn,
                {
                  backgroundColor: isConnected ? theme.accent + "1A" : theme.primary + "1A",
                  borderColor: isConnected ? theme.accent : theme.primary,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={() => router.push("/ble" as any)}
            >
              <Text style={[styles.probePairBtnText, { color: isConnected ? theme.accent : theme.primary }]}>
                {isConnected ? "Settings ?" : "Connect Probe ?"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Telemetry Readings (Honest: "--" if disconnected, no fake numbers!) */}
          <View style={styles.telemetryGrid}>
            <View style={[styles.telemetryCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>pH ACIDITY</Text>
              <Text style={[styles.telemetryVal, { color: isConnected && telemetry.ph !== null ? theme.safe : theme.textMuted }]}>
                {isConnected && telemetry.ph !== null ? telemetry.ph.toFixed(2) : "--"}
              </Text>
            </View>
            <View style={[styles.telemetryCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>MOISTURE</Text>
              <Text style={[styles.telemetryVal, { color: isConnected && telemetry.moisture !== null ? theme.accent : theme.textMuted }]}>
                {isConnected && telemetry.moisture !== null ? `${telemetry.moisture.toFixed(1)}%` : "--"}
              </Text>
            </View>
            <View style={[styles.telemetryCell, { backgroundColor: theme.surface, borderRadius: theme.radiusSm }]}>
              <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>CORE TEMP</Text>
              <Text style={[styles.telemetryVal, { color: isConnected && telemetry.temp !== null ? theme.caution : theme.textMuted }]}>
                {isConnected && telemetry.temp !== null ? `${telemetry.temp.toFixed(1)}°C` : "--"}
              </Text>
            </View>
          </View>

          {!isConnected && (
            <Text style={[styles.probeHintText, { color: theme.textMuted }]}>
              ?? Tip: You can scan right now using Vision-Only AI, or connect probe for multimodal fusion.
            </Text>
          )}
        </View>

        {/* OPTIONAL SILAGE PARAMETERS (Collapsible to keep screen simple) */}
        <TouchableOpacity
          style={[
            styles.accordionHeader,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusSm
            }
          ]}
          onPress={() => setShowAdvancedParams(!showAdvancedParams)}
          activeOpacity={0.8}
        >
          <Text style={[styles.accordionTitle, { color: theme.text }]}>
            ?? Silage Type & Depth: {cropType.split(" ")[0]} • {pitDepthCm}cm
          </Text>
          <Text style={[styles.accordionArrow, { color: theme.textMuted }]}>
            {showAdvancedParams ? "?" : "?"}
          </Text>
        </TouchableOpacity>

        {showAdvancedParams && (
          <View style={[styles.accordionContent, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderRadius: theme.radiusSm }]}>
            <Text style={[styles.paramsLabel, { color: theme.textMuted }]}>Select Forage Crop:</Text>
            <View style={styles.cropWrap}>
              {crops.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cropPill,
                    { borderRadius: theme.radiusSm },
                    cropType === c
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surface, borderColor: theme.cardBorder }
                  ]}
                  onPress={() => setCropType(c)}
                >
                  <Text
                    style={[
                      styles.cropPillText,
                      { color: cropType === c ? "#090D16" : theme.text }
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.paramsLabel, { color: theme.textMuted, marginTop: 10 }]}>
              Bunker Depth:
            </Text>
            <View style={styles.depthRow}>
              {[20, 40, 60, 80].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.depthPill,
                    { borderRadius: theme.radiusSm },
                    pitDepthCm === d
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { backgroundColor: theme.surface, borderColor: theme.cardBorder }
                  ]}
                  onPress={() => setPitDepthCm(d)}
                >
                  <Text
                    style={[
                      styles.depthPillText,
                      { color: pitDepthCm === d ? "#FFFFFF" : theme.text }
                    ]}
                  >
                    {d} cm
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* PRIMARY ACTION BUTTON (Large, Farmer-Friendly Target) */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            {
              backgroundColor: theme.primary,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={handleProceedToAI}
          activeOpacity={0.85}
        >
          <Text style={styles.analyzeButtonText}>
            RUN AI QUALITY EVALUATION ?
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8
  },
  stepBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8
  },
  stepNumber: {
    color: "#090D16",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  viewfinderContainer: {
    height: 270,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  previewWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewSuccessBadge: {
    position: "absolute",
    top: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  previewSuccessText: {
    fontSize: 12,
    fontWeight: "800"
  },
  retakeButton: {
    position: "absolute",
    bottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  retakeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  permissionCard: {
    alignItems: "center",
    padding: 20
  },
  cameraIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4
  },
  permissionSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 16
  },
  grantButton: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  grantButtonText: {
    color: "#090D16",
    fontSize: 13,
    fontWeight: "900"
  },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 12
  },
  auxButton: {
    borderWidth: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80
  },
  auxIcon: {
    fontSize: 18,
    marginBottom: 2
  },
  auxText: {
    fontSize: 11,
    fontWeight: "700"
  },
  mainShutterBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center"
  },
  mainShutterInner: {
    width: 46,
    height: 46,
    borderRadius: 23
  },
  probeStatusCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  probeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  probeIndicatorRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  probeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  probeCardTitle: {
    fontSize: 13,
    fontWeight: "800"
  },
  probePairBtn: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  probePairBtnText: {
    fontSize: 11,
    fontWeight: "800"
  },
  telemetryGrid: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  telemetryCell: {
    flex: 1,
    marginHorizontal: 3,
    padding: 8,
    alignItems: "center"
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 2
  },
  telemetryVal: {
    fontSize: 16,
    fontWeight: "900"
  },
  probeHintText: {
    fontSize: 10,
    marginTop: 8,
    lineHeight: 14
  },
  accordionHeader: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4
  },
  accordionTitle: {
    fontSize: 12,
    fontWeight: "700"
  },
  accordionArrow: {
    fontSize: 10
  },
  accordionContent: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 8
  },
  paramsLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6
  },
  cropWrap: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  cropPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6
  },
  cropPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  depthRow: {
    flexDirection: "row"
  },
  depthPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  depthPillText: {
    fontSize: 11,
    fontWeight: "800"
  },
  analyzeButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  analyzeButtonText: {
    color: "#090D16",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  }
});
