/**
 * SCREEN 5 — AI MULTIMODAL INFERENCE PIPELINE
 * Executes real on-device AI in sequential animated stages:
 *  1. Sensor Inference: Random Forest evaluation on probe telemetry (or Vision-only bypass if disconnected)
 *  2. Vision Inference: MobileNetV3-Small INT8 model evaluation
 *  3. Multimodal Fusion: MSSI score calculation & rule overrides
 *  4. Advisory Synthesis: Multi-lingual farmer advisory generation
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { useAppStore, useTheme } from "../features/ble/bleManager";
import { runSensorInference } from "../ai/sensorInference";
import { runVisionInference } from "../ai/visionInference";
import { computeMultimodalFusion } from "../features/fusion/multimodalFusionEngine";
import { generateFarmerAdvisory } from "../features/advisory/advisoryEngine";
import { batchRepository } from "../sqlite/batchRepository";
import { generateSilageQRPayload } from "../utils/qrGenerator";

interface PipelineStage {
  id: string;
  name: string;
  subtitle: string;
  status: "pending" | "running" | "completed";
  durationMs?: number;
}

export default function ProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    telemetry,
    scanImages,
    cropType,
    pitDepthCm,
    language,
    demoPreset,
    bleStatus,
    setLatestResult
  } = useAppStore();

  const isProbeConnected =
    bleStatus === "CONNECTED" &&
    telemetry.ph !== null &&
    telemetry.moisture !== null &&
    telemetry.temp !== null &&
    telemetry.ambient !== null;

  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: "sensor",
      name: "1. Sensor AI Model",
      subtitle: isProbeConnected
        ? "Random Forest (25 Trees) evaluating pH & thermal rise"
        : "Probe Disconnected • Bypassing (Vision-Only Screening)",
      status: "running"
    },
    {
      id: "vision",
      name: "2. Computer Vision AI",
      subtitle: "MobileNetV3-Small analyzing surface fungal hyphae",
      status: "pending"
    },
    {
      id: "fusion",
      name: "3. Multimodal Evidence Fusion",
      subtitle: isProbeConnected
        ? "Calculating MSSI (0.55 Sensor + 0.45 Vision) + Rules"
        : "Calculating Vision-Only MSSI Index + Safety Rules",
      status: "pending"
    },
    {
      id: "advisory",
      name: "4. Multilingual Advisory",
      subtitle: `Synthesizing field advice in ${language.toUpperCase()}`,
      status: "pending"
    }
  ]);

  useEffect(() => {
    async function executeAIPipeline() {
      // --- STAGE 1: Sensor AI ---
      await new Promise((r) => setTimeout(r, 500));
      let sensorRes: any = null;

      if (isProbeConnected) {
        sensorRes = runSensorInference({
          ph: telemetry.ph!,
          moisture: telemetry.moisture!,
          temperature: telemetry.temp!,
          ambient: telemetry.ambient!
        });
      }

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 0
            ? { ...s, status: "completed", durationMs: sensorRes ? sensorRes.latencyMs : 5 }
            : idx === 1
            ? { ...s, status: "running" }
            : s
        )
      );

      // --- STAGE 2: Vision AI ---
      await new Promise((r) => setTimeout(r, 600));
      const forcedQ =
        demoPreset === "UNSAFE" ? "unsafe" : demoPreset === "CAUTION" ? "caution" : "safe";
      const visionRes = await runVisionInference(scanImages, forcedQ);

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 1
            ? { ...s, status: "completed", durationMs: visionRes.latencyMs }
            : idx === 2
            ? { ...s, status: "running" }
            : s
        )
      );

      // --- STAGE 3: Multimodal Fusion ---
      await new Promise((r) => setTimeout(r, 500));
      const fusionRes = computeMultimodalFusion({
        sensorResult: sensorRes,
        visionResult: visionRes
      });

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 2 ? { ...s, status: "completed" } : idx === 3 ? { ...s, status: "running" } : s
        )
      );

      // --- STAGE 4: Farmer Advisory ---
      await new Promise((r) => setTimeout(r, 500));
      const advisory = generateFarmerAdvisory(fusionRes.decision, language);

      setStages((prev) =>
        prev.map((s) => (s.id === "advisory" ? { ...s, status: "completed" } : s))
      );

      const { isDemoMode } = useAppStore.getState();

      // Save to SQLite (Honest storage: null for disconnected sensors)
      const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();
      const qrData = generateSilageQRPayload({
        batchId,
        decision: fusionRes.decision,
        mssiScore: fusionRes.mssiScore,
        ph: telemetry.ph ?? 0,
        moisture: telemetry.moisture ?? 0,
        temp: telemetry.temp ?? 0,
        cropType,
        timestamp
      });

      await batchRepository.saveBatchReport(
        {
          id: batchId,
          timestamp,
          crop_type: cropType,
          pit_depth_cm: pitDepthCm,
          mssi_score: fusionRes.mssiScore,
          decision: fusionRes.decision,
          confidence: fusionRes.confidence,
          confidence_level: fusionRes.confidence_level,
          rule_override: fusionRes.rule_override,
          rule_reason: fusionRes.rule_reason,
          is_demo: isDemoMode,
          sensor_model_version: fusionRes.metadata.sensor_model_version,
          vision_model_version: fusionRes.metadata.vision_model_version,
          fusion_version: fusionRes.metadata.fusion_version,
          rule_version: fusionRes.metadata.rule_version,
          image_uri: scanImages[0] || "assets/images/safe_sample.jpg",
          qr_data: qrData,
          summary_reason: fusionRes.summary_reason
        },
        {
          id: `SR-${batchId}`,
          batch_id: batchId,
          ph: telemetry.ph,
          moisture: telemetry.moisture,
          temperature: telemetry.temp,
          ambient: telemetry.ambient,
          delta_temp:
            telemetry.temp !== null && telemetry.ambient !== null
              ? Number((telemetry.temp - telemetry.ambient).toFixed(2))
              : null,
          temp_rise:
            telemetry.temp !== null && telemetry.ambient !== null
              ? Number(Math.max(0, telemetry.temp - telemetry.ambient).toFixed(2))
              : null
        },
        {
          id: `PR-${batchId}`,
          batch_id: batchId,
          sensor_decision: sensorRes ? sensorRes.prediction : "DISCONNECTED",
          vision_decision: visionRes.prediction,
          mould_prob: visionRes.mouldProbability,
          reasons_json: JSON.stringify(fusionRes.explanations),
          explainability_json: JSON.stringify(fusionRes.explainability_chain)
        }
      );

      // Store in Zustand for immediate results view
      setLatestResult(fusionRes, advisory);

      // Route to Results
      setTimeout(() => {
        router.replace("/result" as any);
      }, 700);
    }

    executeAIPipeline();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="EDGE INFERENCE" showBack={false} />

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <View style={styles.topSection}>
          <Text style={[styles.title, { color: theme.text }]}>RUNNING SILAGEGUARD AI</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Executing Edge AI models 100% locally on device
          </Text>
        </View>

        {/* Pipeline Animated Stage Cards */}
        <View style={styles.stagesContainer}>
          {stages.map((stage) => {
            const isCompleted = stage.status === "completed";
            const isRunning = stage.status === "running";

            return (
              <View
                key={stage.id}
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCompleted
                      ? theme.safeBorder
                      : isRunning
                      ? theme.accent
                      : theme.cardBorder,
                    borderRadius: theme.radiusMd
                  }
                ]}
              >
                <View style={styles.stageLeft}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { borderRadius: theme.radiusSm },
                      isCompleted
                        ? { backgroundColor: theme.safe }
                        : isRunning
                        ? { backgroundColor: theme.accent }
                        : { backgroundColor: theme.cardBorder }
                    ]}
                  >
                    {isCompleted ? (
                      <Text style={styles.checkMark}>?</Text>
                    ) : isRunning ? (
                      <ActivityIndicator size="small" color="#090D16" />
                    ) : (
                      <View style={styles.pendingDot} />
                    )}
                  </View>

                  <View style={styles.stageTextContainer}>
                    <Text
                      style={[
                        styles.stageName,
                        { color: isCompleted || isRunning ? theme.text : theme.textMuted }
                      ]}
                    >
                      {stage.name}
                    </Text>
                    <Text style={[styles.stageSubtitle, { color: theme.textMuted }]}>
                      {stage.subtitle}
                    </Text>
                  </View>
                </View>

                {isCompleted && stage.durationMs !== undefined && (
                  <View
                    style={[
                      styles.latencyBadge,
                      { backgroundColor: theme.surface, borderRadius: theme.radiusSm }
                    ]}
                  >
                    <Text style={[styles.latencyText, { color: theme.safe }]}>
                      {stage.durationMs}ms
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Zero-cloud edge guarantee note */}
        <View
          style={[
            styles.edgeGuaranteeCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusSm
            }
          ]}
        >
          <Text style={styles.edgeShieldIcon}>??</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.edgeGuaranteeTitle, { color: theme.text }]}>
              ZERO CLOUD INFERENCE GUARANTEE
            </Text>
            <Text style={[styles.edgeGuaranteeSub, { color: theme.textMuted }]}>
              No sensor packets or pictures sent over internet. Fully operational offline.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
    justifyContent: "space-between"
  },
  topSection: {
    alignItems: "center",
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4
  },
  stagesContainer: {
    flex: 1,
    justifyContent: "center"
  },
  stageCard: {
    borderWidth: 1,
    padding: 14,
    marginVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stageLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  statusIndicator: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  checkMark: {
    color: "#090D16",
    fontSize: 14,
    fontWeight: "900"
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748B"
  },
  stageTextContainer: {
    flex: 1
  },
  stageName: {
    fontSize: 13,
    fontWeight: "800"
  },
  stageSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500"
  },
  latencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6
  },
  latencyText: {
    fontSize: 10,
    fontWeight: "800"
  },
  edgeGuaranteeCard: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  edgeShieldIcon: {
    fontSize: 20,
    marginRight: 10
  },
  edgeGuaranteeTitle: {
    fontSize: 11,
    fontWeight: "800"
  },
  edgeGuaranteeSub: {
    fontSize: 10,
    marginTop: 2
  }
});
