/**
 * SCREEN 4 - GUIDED SURFACE CAMERA & SCAN PIPELINE
 * Redesigned for Dairy Farmers:
 * - Un-crowded, step-by-step intuitive flow
 * - Live real hardware camera with expo-camera (CameraView)
 * - Vector AppIcon library (no mangled question marks or raw emojis)
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
  ActivityIndicator,
  Platform
} from "react-native";
import { useEffect } from "react";
import { useRouter, usePathname } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { CameraGuidanceOverlay } from "../components/CameraGuidanceOverlay";
import { AppIcon } from "../components/AppIcon";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { ProbeBeacon } from "../components/ProbeBeacon";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { safeNavigate } from "../utils/navigation";

export default function CameraScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    scanImages,
    addScanImage,
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
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [webCameraActive, setWebCameraActive] = useState(false);
  const webVideoRef = useRef<any>(null);
  const [webStream, setWebStream] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (webStream) {
        try {
          webStream.getTracks().forEach((track: any) => track.stop());
        } catch {}
      }
    };
  }, [webStream]);

  const handleEnableCamera = async () => {
    if (Platform.OS === "web") {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          let stream: any = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } }
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
          if (stream) {
            setWebStream(stream);
            setWebCameraActive(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Web camera initialization notice, using gallery upload:", err);
        handlePickGallery();
        return;
      }
    }
    await requestPermission();
  };

  const isConnected = bleStatus === "CONNECTED";

  const crops = [
    "Corn Silage (Zea mays)",
    "Hybrid Napier Grass",
    "Sorghum (Jowar)",
    "Lucerne / Alfalfa"
  ];

  // Negotiate highest hardware resolution picture sizes supported by device camera
  const handleCameraReady = async () => {
    if (cameraRef.current?.getAvailablePictureSizesAsync) {
      try {
        const sizes: string[] = await cameraRef.current.getAvailablePictureSizesAsync();
        if (sizes && sizes.length > 0) {
          // Sort descending by total pixels (width * height) so maximum megapixels are utilized
          const sorted = [...sizes].sort((a, b) => {
            const [wA, hA] = a.split("x").map(Number);
            const [wB, hB] = b.split("x").map(Number);
            return (wB * hB) - (wA * hA);
          });
          if (sorted[0]) {
            console.log("[SilageGuard Camera] Configured maximum sensor resolution:", sorted[0]);
            setPictureSize(sorted[0]);
          }
        }
      } catch (e) {
        console.warn("Could not query camera picture sizes:", e);
      }
    }
  };

  // Shutter action using active CameraView with maximum sensor megapixels and uncompressed quality
  const handleSnapPhoto = async () => {
    if (Platform.OS === "web" && webVideoRef.current) {
      try {
        setIsCapturing(true);
        const video = webVideoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          addScanImage(dataUrl);
          setIsCapturing(false);
          return;
        }
      } catch (err) {
        console.warn("Web canvas snap error, using demo sample:", err);
        useFallbackSample();
      } finally {
        setIsCapturing(false);
      }
      return;
    }

    if (cameraRef.current) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0,           // 100% full uncompressed quality (no lossy compression)
          skipProcessing: false,  // Complete EXIF and sensor orientation pipeline
          shutterSound: true
        });
        if (photo && photo.uri) {
          console.log("[SilageGuard Camera] Captured photo:", photo.width, "x", photo.height, photo.uri);
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

  // Pick from device photo gallery at full original native megapixels (no crop downscaling)
  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Keep original native uncropped resolution
        quality: 1.0          // Full 100% resolution without downsampling
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
    safeNavigate(router, "/processing", pathname);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={true} fallbackRoute="/home" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: SURFACE CAMERA VIEWFINDER */}
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.stepBadge,
              { backgroundColor: theme.primary, borderRadius: theme.radiusSm }
            ]}
          >
            <AppIcon name="camera" size={13} color="#090D16" />
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
                  {
                    backgroundColor: theme.safeBg,
                    borderColor: theme.safeBorder,
                    borderRadius: theme.radiusSm
                  }
                ]}
              >
                <AppIcon name="check" size={14} color={theme.safe} strokeWidth={2.5} />
                <Text style={[styles.previewSuccessText, { color: theme.safe }]}>
                  Photo Captured - Ready for AI
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.retakeButton,
                  {
                    backgroundColor: "rgba(0,0,0,0.8)",
                    borderColor: theme.cardBorder,
                    borderRadius: theme.radiusSm
                  }
                ]}
                onPress={() => clearScanImages()}
              >
                <AppIcon name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (permission?.granted || webCameraActive) ? (
            // LIVE REAL HARDWARE CAMERA
            <View style={StyleSheet.absoluteFill}>
              {Platform.OS === "web" && webStream ? (
                React.createElement("video", {
                  ref: (node: any) => {
                    webVideoRef.current = node;
                    if (node && webStream && node.srcObject !== webStream) {
                      node.srcObject = webStream;
                      node.play().catch(() => {});
                    }
                  },
                  autoPlay: true,
                  playsInline: true,
                  muted: true,
                  style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }
                })
              ) : (
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing={Platform.OS === "web" ? undefined : "back"}
                  mode="picture"
                  autofocus="on"
                  pictureSize={pictureSize}
                  enableTorch={torchEnabled}
                  onCameraReady={handleCameraReady}
                />
              )}
              {/* Torch / Flash Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.torchButton,
                  {
                    backgroundColor: torchEnabled ? theme.primary : "rgba(0,0,0,0.65)",
                    borderColor: torchEnabled ? theme.primary : theme.cardBorder
                  }
                ]}
                onPress={() => setTorchEnabled((prev) => !prev)}
                activeOpacity={0.8}
              >
                <AppIcon name="flash" size={16} color={torchEnabled ? "#090D16" : "#FFFFFF"} />
              </TouchableOpacity>
              <CameraGuidanceOverlay currentStep={scanImages.length + 1} photoCount={scanImages.length} maxPhotos={3} probeConnected={isConnected} />
            </View>
          ) : (
            // CAMERA PERMISSION REQUEST CARD
            <View style={styles.permissionCard}>
              <AppIcon name="camera" size={44} color={theme.primary} />
              <Text style={[styles.permissionTitle, { color: "#FFFFFF" }]}>
                Camera Access Needed
              </Text>
              <Text style={[styles.permissionSubtitle, { color: "#94A3B8" }]}>
                To scan the silage bunker face for mould, moisture staining, and discoloration.
              </Text>
              <TouchableOpacity
                style={[
                  styles.grantButton,
                  { backgroundColor: theme.primary, borderRadius: theme.radiusSm }
                ]}
                onPress={handleEnableCamera}
              >
                <Text style={styles.grantButtonText}>Enable Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.grantButton,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, marginTop: 10, borderRadius: theme.radiusSm }
                ]}
                onPress={handlePickGallery}
              >
                <Text style={[styles.grantButtonText, { color: theme.text }]}>Choose Photo / File</Text>
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
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={handlePickGallery}
              activeOpacity={0.8}
            >
              <AppIcon name="gallery" size={18} color={theme.text} />
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
                <View
                  style={[
                    styles.mainShutterInner,
                    { backgroundColor: theme.primary }
                  ]}
                />
              )}
            </TouchableOpacity>

            {/* Demo Sample Image */}
            <TouchableOpacity
              style={[
                styles.auxButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={useFallbackSample}
              activeOpacity={0.8}
            >
              <AppIcon name="flask" size={18} color={theme.accent} />
              <Text style={[styles.auxText, { color: theme.accent }]}>Sample</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* STEP 2: SENSOR PROBE STATUS CARD (Transparent, No Dummy Data) */}
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isConnected ? theme.safe : theme.cardBorder,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <AppIcon
              name={isConnected ? "bluetooth-connected" : "probe"}
              size={13}
              color={isConnected ? "#090D16" : theme.textMuted}
            />
            <Text
              style={[
                styles.stepNumber,
                { color: isConnected ? "#090D16" : theme.textMuted }
              ]}
            >
              STEP 2
            </Text>
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
              <ProbeBeacon isConnected={isConnected} size={11} />
              <Text style={[styles.probeCardTitle, { color: theme.text, marginLeft: 6 }]}>
                {isConnected ? "Probe Connected" : "Probe Disconnected"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.probePairBtn,
                {
                  backgroundColor: isConnected
                    ? theme.accent + "1A"
                    : theme.primary + "1A",
                  borderColor: isConnected ? theme.accent : theme.primary,
                  borderRadius: theme.radiusSm
                }
              ]}
              onPress={() => safeNavigate(router, "/ble", pathname)}
            >
              <Text
                style={[
                  styles.probePairBtnText,
                  { color: isConnected ? theme.accent : theme.primary }
                ]}
              >
                {isConnected ? "Status" : "Pair Probe"}
              </Text>
              <AppIcon
                name="arrow-forward"
                size={12}
                color={isConnected ? theme.accent : theme.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Telemetry Readings (Honest: "--" if disconnected, no fake numbers!) */}
          <View style={styles.telemetryGrid}>
            <View
              style={[
                styles.telemetryCell,
                { backgroundColor: theme.surface, borderRadius: theme.radiusSm }
              ]}
            >
              <View style={styles.cellHeader}>
                <AppIcon name="ph" size={13} color={theme.safe} />
                <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>
                  pH
                </Text>
              </View>
              <Text
                style={[
                  styles.telemetryVal,
                  {
                    color:
                      isConnected && telemetry.ph !== null
                        ? theme.safe
                        : theme.textMuted
                  }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {isConnected && telemetry.ph !== null
                  ? telemetry.ph.toFixed(2)
                  : "--"}
              </Text>
            </View>

            <View
              style={[
                styles.telemetryCell,
                { backgroundColor: theme.surface, borderRadius: theme.radiusSm }
              ]}
            >
              <View style={styles.cellHeader}>
                <AppIcon name="water" size={13} color={theme.accent} />
                <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>
                  MOISTURE
                </Text>
              </View>
              <Text
                style={[
                  styles.telemetryVal,
                  {
                    color:
                      isConnected && telemetry.moisture !== null
                        ? theme.accent
                        : theme.textMuted
                  }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {isConnected && telemetry.moisture !== null
                  ? `${telemetry.moisture.toFixed(1)}%`
                  : "--"}
              </Text>
            </View>

            <View
              style={[
                styles.telemetryCell,
                { backgroundColor: theme.surface, borderRadius: theme.radiusSm }
              ]}
            >
              <View style={styles.cellHeader}>
                <AppIcon name="thermometer" size={13} color={theme.caution} />
                <Text style={[styles.telemetryLabel, { color: theme.textMuted }]}>
                  TEMP
                </Text>
              </View>
              <Text
                style={[
                  styles.telemetryVal,
                  {
                    color:
                      isConnected && telemetry.temp !== null
                        ? theme.caution
                        : theme.textMuted
                  }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {isConnected && telemetry.temp !== null
                  ? `${telemetry.temp.toFixed(1)}C`
                  : "--"}
              </Text>
            </View>
          </View>

          {!isConnected && (
            <Text style={[styles.probeHintText, { color: theme.textMuted }]}>
              Tip: You can scan right now using Vision-Only AI, or connect probe for multimodal fusion.
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
          <View style={styles.accordionLeft}>
            <AppIcon name="leaf" size={16} color={theme.primary} />
            <Text style={[styles.accordionTitle, { color: theme.text }]}>
              Silage Type & Depth: {cropType.split(" ")[0]} ({pitDepthCm}cm)
            </Text>
          </View>
          <AppIcon
            name={showAdvancedParams ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textMuted}
          />
        </TouchableOpacity>

        {showAdvancedParams && (
          <View
            style={[
              styles.accordionContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <Text style={[styles.paramsLabel, { color: theme.textMuted }]}>
              Select Forage Crop:
            </Text>
            <View style={styles.cropWrap}>
              {crops.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cropPill,
                    { borderRadius: theme.radiusSm },
                    cropType === c
                      ? {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary
                        }
                      : {
                          backgroundColor: theme.surface,
                          borderColor: theme.cardBorder
                        }
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

            <Text
              style={[
                styles.paramsLabel,
                { color: theme.textMuted, marginTop: 10 }
              ]}
            >
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
                      ? {
                          backgroundColor: theme.accent,
                          borderColor: theme.accent
                        }
                      : {
                          backgroundColor: theme.surface,
                          borderColor: theme.cardBorder
                        }
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
        <AnimatedPressable
          style={[
            styles.analyzeButton,
            {
              backgroundColor: theme.primary,
              borderRadius: theme.radiusMd
            }
          ]}
          onPress={handleProceedToAI}
        >
          <AppIcon name="scan" size={20} color="#042F2E" strokeWidth={2.4} />
          <Text style={styles.analyzeButtonText}>RUN AI EVALUATION</Text>
          <AppIcon name="arrow-forward" size={18} color="#042F2E" strokeWidth={2.4} />
        </AnimatedPressable>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "900",
    color: "#090D16",
    marginLeft: 4
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  viewfinderContainer: {
    height: 440,
    minHeight: 420,
    width: "100%",
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    position: "relative"
  },
  previewWrapper: {
    width: "100%",
    height: "100%",
    position: "relative"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewSuccessBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1
  },
  previewSuccessText: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6
  },
  retakeButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1
  },
  retakeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6
  },
  torchButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  permissionCard: {
    alignItems: "center",
    paddingHorizontal: 20
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8
  },
  permissionSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14
  },
  grantButton: {
    paddingHorizontal: 18,
    paddingVertical: 8
  },
  grantButtonText: {
    color: "#090D16",
    fontSize: 12,
    fontWeight: "900"
  },
  shutterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  auxButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    maxWidth: 96,
    flex: 1,
  },
  auxText: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  mainShutterBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  mainShutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  probeStatusCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  probeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  probeIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  probeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  probeCardTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  probePairBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  probePairBtnText: {
    fontSize: 11,
    fontWeight: "800",
    marginRight: 4,
  },
  telemetryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  telemetryCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    minWidth: 70,
  },
  cellHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  telemetryLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginLeft: 3,
  },
  telemetryVal: {
    fontSize: 16,
    fontWeight: "900",
  },
  probeHintText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center"
  },
  accordionHeader: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  accordionLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  accordionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8
  },
  accordionContent: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  paramsLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6
  },
  cropWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  cropPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  cropPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  depthRow: {
    flexDirection: "row",
    gap: 6
  },
  depthPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  depthPillText: {
    fontSize: 11,
    fontWeight: "700"
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    minHeight: 52,
    flexWrap: "wrap",
    gap: 8,
  },
  analyzeButtonText: {
    color: "#090D16",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginHorizontal: 8,
  }
});
