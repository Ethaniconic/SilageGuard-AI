/**
 * SCREEN 4 — GUIDED SURFACE CAMERA & QUALITY ASSURANCE
 * - Overlay reticle framing the silage pit/bunker surface
 * - On-device image quality checks: Brightness, Blur/Sharpness, Angle tilt
 * - Automatic rejection of low-quality images with actionable tips
 * - Multi-angle stack: Allows up to 3 photos
 * - Crop & pit depth parameters
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { CameraGuidanceOverlay } from "../components/CameraGuidanceOverlay";
import { checkImageQuality, ImageQualityReport } from "../ai/imageQualityChecker";
import { useAppStore } from "../features/ble/bleManager";
import { THEME_COLORS } from "../utils/constants";

export default function CameraScreen() {
  const router = useRouter();
  const {
    scanImages,
    addScanImage,
    removeScanImage,
    clearScanImages,
    cropType,
    setCropType,
    pitDepthCm,
    setPitDepthCm,
    demoPreset
  } = useAppStore();

  const [currentQuality, setCurrentQuality] = useState<ImageQualityReport>({
    isAcceptable: true,
    brightnessScore: 68,
    sharpnessScore: 78,
    tiltAngleDeg: 2,
    issues: [],
    guidanceMessage: "Camera aligned. Optimal lighting and sharpness."
  });

  const [simulatedShutterCount, setSimulatedShutterCount] = useState(0);

  const crops = [
    "Corn Silage (Zea mays)",
    "Hybrid Napier Grass",
    "Sorghum (Jowar)",
    "Lucerne / Alfalfa"
  ];

  // Capture or simulate camera snap
  const handleCapture = () => {
    if (scanImages.length >= 3) {
      Alert.alert("Stack Complete", "You have already captured the maximum 3 photos.");
      return;
    }

    // Run Image Quality Assurance check
    const report = checkImageQuality("mock_uri", 224, 224);
    setCurrentQuality(report);

    if (!report.isAcceptable) {
      Alert.alert("Image Quality Rejected", report.guidanceMessage);
      return;
    }

    const nextCount = simulatedShutterCount + 1;
    setSimulatedShutterCount(nextCount);

    // Realistic silage surface photo representation
    const sampleImageUri =
      demoPreset === "UNSAFE"
        ? `assets/images/unsafe_surface_${nextCount}.jpg`
        : demoPreset === "CAUTION"
        ? `assets/images/caution_surface_${nextCount}.jpg`
        : `assets/images/safe_surface_${nextCount}.jpg`;

    addScanImage(sampleImageUri);
  };

  const handleProceedToAI = () => {
    if (scanImages.length === 0) {
      // Capture 1 default image automatically if farmer taps directly
      const defaultImg =
        demoPreset === "UNSAFE"
          ? "assets/images/unsafe_surface_1.jpg"
          : demoPreset === "CAUTION"
          ? "assets/images/caution_surface_1.jpg"
          : "assets/images/safe_surface_1.jpg";
      addScanImage(defaultImg);
    }
    router.push("/processing" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="GUIDED CAMERA" showBack={true} />

      <View style={styles.container}>
        {/* Camera Viewfinder View */}
        <View style={styles.viewfinder}>
          {/* Simulated Silage Texture Background */}
          <View
            style={[
              styles.simulatedSilageSurface,
              demoPreset === "UNSAFE"
                ? styles.surfaceUnsafe
                : demoPreset === "CAUTION"
                ? styles.surfaceCaution
                : styles.surfaceSafe
            ]}
          >
            <Text style={styles.viewfinderWatermark}>
              {demoPreset === "UNSAFE"
                ? "⚠️ MOLD HYPHAE VISIBLE IN BUNKER FACE"
                : demoPreset === "CAUTION"
                ? "⚡ OXIDIZED CARAMELIZED SILAGE"
                : "✓ OPTIMAL GOLDEN-OLIVE CORN SILAGE"}
            </Text>
          </View>

          {/* Real-time Quality & Framing Overlay */}
          <CameraGuidanceOverlay
            qualityReport={currentQuality}
            photoCount={scanImages.length}
            maxPhotos={3}
          />
        </View>

        {/* Bottom Control & Parameter Panel */}
        <ScrollView style={styles.controlPanel} showsVerticalScrollIndicator={false}>
          {/* Crop Type Selector */}
          <Text style={styles.panelSectionTitle}>CROP & PIT DEPTH CONFIGURATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropScroll}>
            {crops.map((c) => {
              const isSelected = cropType === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.cropPill, isSelected && styles.cropPillActive]}
                  onPress={() => setCropType(c)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cropText, isSelected && styles.cropTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Pit Depth Pills */}
          <View style={styles.depthRow}>
            <Text style={styles.depthLabel}>Pit Probe Depth:</Text>
            {[20, 40, 60, 80].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.depthPill, pitDepthCm === d && styles.depthPillActive]}
                onPress={() => setPitDepthCm(d)}
              >
                <Text style={[styles.depthText, pitDepthCm === d && styles.depthTextActive]}>
                  {d} cm
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shutter / Capture Row */}
          <View style={styles.captureRow}>
            {/* Shutter Button */}
            <TouchableOpacity
              style={styles.shutterButton}
              onPress={handleCapture}
              activeOpacity={0.8}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {/* Proceed to AI Inference */}
            <TouchableOpacity
              style={[
                styles.proceedButton,
                scanImages.length === 0 && styles.proceedButtonReady
              ]}
              onPress={handleProceedToAI}
              activeOpacity={0.85}
            >
              <Text style={styles.proceedButtonText}>
                {scanImages.length > 0
                  ? `RUN AI SCAN (${scanImages.length} PHOTOS) →`
                  : "CAPTURE & RUN AI →"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thumbnail Stack Preview */}
          {scanImages.length > 0 && (
            <View style={styles.stackPreviewRow}>
              <Text style={styles.stackLabel}>Captured Stack ({scanImages.length}/3):</Text>
              <View style={styles.thumbRow}>
                {scanImages.map((uri, idx) => (
                  <View key={idx} style={styles.thumbBox}>
                    <Text style={styles.thumbIndex}>#{idx + 1}</Text>
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removeScanImage(idx)}
                    >
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {scanImages.length > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearScanImages}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background
  },
  container: {
    flex: 1
  },
  viewfinder: {
    height: 340,
    backgroundColor: "#020617",
    position: "relative",
    overflow: "hidden"
  },
  simulatedSilageSurface: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center"
  },
  surfaceSafe: {
    backgroundColor: "#164E35"
  },
  surfaceCaution: {
    backgroundColor: "#5C3A1E"
  },
  surfaceUnsafe: {
    backgroundColor: "#2E242C"
  },
  viewfinderWatermark: {
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 210
  },
  controlPanel: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
    padding: 16
  },
  panelSectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  cropScroll: {
    flexDirection: "row",
    marginBottom: 12
  },
  cropPill: {
    backgroundColor: THEME_COLORS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8
  },
  cropPillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: THEME_COLORS.primary
  },
  cropText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700"
  },
  cropTextActive: {
    color: THEME_COLORS.primary
  },
  depthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  depthLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 10
  },
  depthPill: {
    backgroundColor: THEME_COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder
  },
  depthPillActive: {
    backgroundColor: "#0284C7",
    borderColor: "#38BDF8"
  },
  depthText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800"
  },
  depthTextActive: {
    color: "#FFFFFF"
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10
  },
  shutterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center"
  },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.primary
  },
  proceedButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginLeft: 14
  },
  proceedButtonReady: {
    backgroundColor: "#10B981"
  },
  proceedButtonText: {
    color: "#090D16",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  stackPreviewRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)"
  },
  stackLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6
  },
  thumbRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  thumbBox: {
    width: 50,
    height: 50,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    position: "relative"
  },
  thumbIndex: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800"
  },
  thumbRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center"
  },
  thumbRemoveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900"
  },
  clearBtn: {
    marginLeft: 6
  },
  clearBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700"
  }
});
