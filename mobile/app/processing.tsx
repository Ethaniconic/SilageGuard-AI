/**
 * SCREEN 5 — AI MULTIMODAL INFERENCE PIPELINE
 * Executes real on-device AI in sequential animated stages:
 *  1. Sensor Inference: Random Forest evaluation on probe telemetry
 *  2. Vision Inference: MobileNetV3-Small INT8 model evaluation
 *  3. Multimodal Fusion: MSSI score calculation & rule overrides
 *  4. Advisory Synthesis: Multi-lingual farmer advisory generation
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { useAppStore } from "../features/ble/bleManager";
import { runSensorInference } from "../ai/sensorInference";
import { runVisionInference } from "../ai/visionInference";
import { computeMultimodalFusion } from "../features/fusion/multimodalFusionEngine";
import { generateFarmerAdvisory } from "../features/advisory/advisoryEngine";
import { batchRepository } from "../sqlite/batchRepository";
import { generateSilageQRPayload } from "../utils/qrGenerator";
import { THEME_COLORS } from "../utils/constants";

interface PipelineStage {
  id: string;
  name: string;
  subtitle: string;
  status: "pending" | "running" | "completed";
  durationMs?: number;
}

export default function ProcessingScreen() {
  const router = useRouter();
  const {
    telemetry,
    scanImages,
    cropType,
    pitDepthCm,
    language,
    demoPreset,
    setLatestResult
  } = useAppStore();

  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: "sensor",
      name: "1. Sensor AI Model",
      subtitle: "Random Forest (25 Trees) evaluating pH & thermal rise",
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
      name: "3. Multimodal Fusion Engine",
      subtitle: "Calculating MSSI (0.55 Sensor + 0.45 Vision) + Rule Overrides",
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
      await new Promise((r) => setTimeout(r, 600));
      const sensorRes = runSensorInference({
        ph: telemetry.ph,
        moisture: telemetry.moisture,
        temperature: telemetry.temp,
        ambient: telemetry.ambient
      });

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 0 ? { ...s, status: "completed", durationMs: sensorRes.latencyMs } : idx === 1 ? { ...s, status: "running" } : s
        )
      );

      // --- STAGE 2: Vision AI ---
      await new Promise((r) => setTimeout(r, 700));
      const forcedQ =
        demoPreset === "UNSAFE" ? "unsafe" : demoPreset === "CAUTION" ? "caution" : "safe";
      const visionRes = await runVisionInference(scanImages, forcedQ);

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 1 ? { ...s, status: "completed", durationMs: visionRes.latencyMs } : idx === 2 ? { ...s, status: "running" } : s
        )
      );

      // --- STAGE 3: Multimodal Fusion ---
      await new Promise((r) => setTimeout(r, 600));
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

      // Save to SQLite
      const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();
      const qrData = generateSilageQRPayload({
        batchId,
        decision: fusionRes.decision,
        mssiScore: fusionRes.mssiScore,
        ph: telemetry.ph,
        moisture: telemetry.moisture,
        temp: telemetry.temp,
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
          delta_temp: Number((telemetry.temp - telemetry.ambient).toFixed(2)),
          temp_rise: Number(Math.max(0, telemetry.temp - telemetry.ambient).toFixed(2))
        },
        {
          id: `PR-${batchId}`,
          batch_id: batchId,
          sensor_decision: sensorRes.prediction,
          vision_decision: visionRes.prediction,
          mould_prob: visionRes.mouldProbability,
          reasons_json: JSON.stringify(fusionRes.explanations),
          explainability_json: JSON.stringify(fusionRes.explainability_chain)
        }
      );

      // Store in Zustand for immediate results view
      setLatestResult(fusionRes, advisory);

      // Auto-navigate to Result
      setTimeout(() => {
        router.replace("/result" as any);
      }, 700);
    }

    executeAIPipeline();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="AI INFERENCE PIPELINE" showBack={false} />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pipelineTitle}>RUNNING ON-DEVICE INFERENCE</Text>
          <Text style={styles.pipelineSub}>
            Zero Cloud Latency • 100% Offline Edge Processing
          </Text>
        </View>

        {/* Pipeline Stage Cards */}
        <View style={styles.stageList}>
          {stages.map((stg) => {
            const isCompleted = stg.status === "completed";
            const isRunning = stg.status === "running";

            return (
              <View
                key={stg.id}
                style={[
                  styles.stageCard,
                  isCompleted && styles.cardCompleted,
                  isRunning && styles.cardRunning
                ]}
              >
                <View style={styles.stageStatusIcon}>
                  {isCompleted ? (
                    <Text style={styles.checkIcon}>✓</Text>
                  ) : isRunning ? (
                    <ActivityIndicator size="small" color={THEME_COLORS.primary} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>

                <View style={styles.stageText}>
                  <View style={styles.stageTitleRow}>
                    <Text style={[styles.stageName, isCompleted && styles.textCompleted]}>
                      {stg.name}
                    </Text>
                    {stg.durationMs !== undefined && (
                      <Text style={styles.latencyBadge}>{stg.durationMs}ms</Text>
                    )}
                  </View>
                  <Text style={styles.stageSubtitle}>{stg.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomInfo}>
          <Text style={styles.infoText}>
            🔒 All sensor and vision neural calculations execute privately inside your phone.
          </Text>
        </View>
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
    flex: 1,
    padding: 20,
    justifyContent: "space-between"
  },
  header: {
    alignItems: "center",
    marginTop: 20
  },
  pipelineTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  pipelineSub: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6
  },
  stageList: {
    marginVertical: 30
  },
  stageCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8
  },
  cardCompleted: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: "rgba(16, 185, 129, 0.08)"
  },
  cardRunning: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.08)"
  },
  stageStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14
  },
  checkIcon: {
    color: THEME_COLORS.primary,
    fontSize: 18,
    fontWeight: "900"
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#475569"
  },
  stageText: {
    flex: 1
  },
  stageTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stageName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800"
  },
  textCompleted: {
    color: THEME_COLORS.primary
  },
  latencyBadge: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  stageSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3
  },
  bottomInfo: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  infoText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center"
  }
});
