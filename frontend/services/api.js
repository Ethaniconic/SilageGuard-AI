import { Platform } from "react-native";
import Constants from "expo-constants";
import { EdgeInferenceEngine } from "./ai/edgeInference";

// Dynamically resolve API host:
// 1. Explicit EXPO_PUBLIC_API_URL if configured
// 2. In physical mobile device with Expo Go, extract host IP from expoConfig.hostUri
// 3. In Web, use current browser host
// 4. Default fallback: http://192.168.31.18:8000
// SilageGuard AI Dynamic Multi-Candidate Backend Endpoint Resolver
let cachedLiveBaseUrl = null;

export const getCandidateUrls = () => {
  const list = [];

  // 1. Explicit app config extra.apiUrl
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl || Constants.manifest2?.extra?.expoClient?.extra?.apiUrl;
  if (configApiUrl) {
    list.push(configApiUrl);
  }

  // 2. Explicit EXPO_PUBLIC_API_URL from environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    list.push(process.env.EXPO_PUBLIC_API_URL);
  }

  // 3. Primary production cloud endpoint (Render)
  list.push("https://silageguard-ai.onrender.com");

  // 4. In Web browsers, current origin or local port 8000
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      list.push(window.location.origin);
    }
    if (typeof window !== "undefined" && window.location?.hostname) {
      list.push(`http://${window.location.hostname}:8000`);
    }
    list.push("http://localhost:8000");
    list.push("http://127.0.0.1:8000");
  }

  // 5. Expo mobile host URI (for physical devices testing over LAN via Metro)
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      list.push(`http://${ip}:8000`);
    }
  }

  if (Platform.OS === "android") {
    list.push("http://10.0.2.2:8000");
  }

  // Local development fallbacks
  list.push("http://localhost:8000");
  list.push("http://127.0.0.1:8000");

  return Array.from(new Set(list.filter(Boolean)));
};

export const getBaseUrl = () => {
  if (cachedLiveBaseUrl) return cachedLiveBaseUrl;
  const candidates = getCandidateUrls();
  return candidates[0] || "http://localhost:8000";
};

export const API_BASE_URL = getBaseUrl();

/**
 * Probes candidates to discover the active reachable backend
 */
export async function resolveLiveApiUrl() {
  if (cachedLiveBaseUrl) {
    try {
      const probeCtrl = new AbortController();
      const probeTid = setTimeout(() => probeCtrl.abort(), 1500);
      const res = await fetch(`${cachedLiveBaseUrl}/health`, {
        method: "GET",
        signal: probeCtrl.signal,
      });
      clearTimeout(probeTid);
      if (res.ok) return cachedLiveBaseUrl;
    } catch {
      cachedLiveBaseUrl = null;
    }
  }

  const candidates = getCandidateUrls();
  for (const url of candidates) {
    try {
      const probeCtrl = new AbortController();
      const probeTid = setTimeout(() => probeCtrl.abort(), 1500);
      const res = await fetch(`${url}/health`, {
        method: "GET",
        signal: probeCtrl.signal,
      });
      clearTimeout(probeTid);
      if (res.ok) {
        cachedLiveBaseUrl = url;
        console.log(`[SilageGuard API] Connected to live backend at: ${url}`);
        return url;
      }
    } catch {
      // try next candidate
    }
  }

  return candidates[0] || "http://localhost:8000";
}


/**
 * Checks backend health and database connectivity across live candidates
 */
export async function checkBackendHealth() {
  const baseUrl = await resolveLiveApiUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    cachedLiveBaseUrl = baseUrl;
    return { isOnline: true, data, baseUrl };
  } catch (err) {
    return { isOnline: false, error: err.message, baseUrl };
  }
}

/**
 * Pre-activates and warms up the AI models (MobileNetV3 ONNX, PyTorch Grad-CAM, Sensor RF)
 * on application startup so inference is instantaneous with zero user delay.
 */
export async function activateModelsAndGradcam() {
  try {
    const baseUrl = await resolveLiveApiUrl();
    console.log(`⚡ [STARTUP ACTIVATION] Pre-activating AI models & Grad-CAM on ${baseUrl}...`);

    // 1. Warm up backend FastAPI vision + Grad-CAM pipeline
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const warmupRes = await fetch(`${baseUrl}/api/v1/inference/warmup`, {
      method: "GET",
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(tid);

    if (warmupRes && warmupRes.ok) {
      const data = await warmupRes.json();
      console.log(`✓ [STARTUP ACTIVATION] Server vision & Grad-CAM pipeline warm:`, data.message);
    }

    // 2. Pre-fetch device authentication token so sync and API access are instant
    await getDeviceAuthToken();

    // 3. Pre-warm local Edge Random Forest
    EdgeInferenceEngine.runSensorRF({ ph: 4.0, moisture: 65, temperature: 26, ambient: 25 });
    console.log("✓ [STARTUP ACTIVATION] All models, Grad-CAM, and edge engines active.");
    return { success: true, baseUrl };
  } catch (err) {
    console.warn("[STARTUP ACTIVATION] Notice during model warmup:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Runs Multimodal AI Inference (Vision ONNX/PyTorch Grad-CAM + Random Forest Telemetry)
 * Resolves candidate endpoints dynamically so mobile devices and web browsers connect
 * seamlessly without failing due to dead LAN IPs.
 */
export async function runInference({
  ph = null,
  moisture = null,
  temperature = null,
  ambientTemp = 25.0,
  imageBase64 = null,
  cropType = "Corn Silage",
  batchId = null,
}) {
  const hasSensor = (ph !== null && ph !== undefined) || (moisture !== null && moisture !== undefined) || (temperature !== null && temperature !== undefined);

  const payload = {
    image_base64: imageBase64,
    telemetry: hasSensor ? {
      ph: ph !== null ? Number(ph) : null,
      moisture: moisture !== null ? Number(moisture) : null,
      temperature: temperature !== null ? Number(temperature) : null,
      ambient: Number(ambientTemp),
      crop_type: cropType,
      pit_depth_cm: 40,
    } : null,
  };

    // Attempt live inference via discovered candidate endpoints
  const candidates = getCandidateUrls();
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // Fast 2.5s timeout per candidate

      const res = await fetch(`${baseUrl}/api/v1/inference/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Inference API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      cachedLiveBaseUrl = baseUrl;

      // Handle Image Quality Assessment rejection directly from the model
      if (data.decision === "RETAKE_REQUIRED" || data.need_retake) {
        return {
          success: false,
          error: data.reasons?.[0] || "Image quality assessment rejected. Please ensure adequate lighting and retake photo.",
          needRetake: true,
          result: null,
        };
      }

      const vision = data.vision_result || {};
      const gradcam = data.gradcam_heatmap_b64 || vision.gradcam_heatmap_b64 || null;
      const hotspotBbox = data.hotspot_bbox || vision.hotspot_bbox || null;
      const hotspotDesc = data.hotspot_description || vision.hotspot_description || null;

      console.log(`⚡ [INFERENCE SUCCESS] Received model predictions from ${baseUrl} (Grad-CAM: ${Boolean(gradcam)}, Hotspot Bbox: ${Boolean(hotspotBbox)})`);

      return {
        success: true,
        isOffline: false,
        backendUrl: baseUrl,
        result: {
          batchId: batchId || `BATCH-${Date.now()}`,
          verdict: data.decision === "SAFE" ? "GOOD" : data.decision === "CAUTION" ? "WATCH" : "HIGH RISK",
          mssiScore: data.mssi_score,
          confidence: data.confidence,
          modalityState: data.modality_state,
          hasSensor: data.modality_state !== "VISION_ONLY" && Boolean(data.sensor_result),
          ph: hasSensor ? (ph !== null ? Number(ph) : null) : null,
          moisture: hasSensor ? (moisture !== null ? Number(moisture) : null) : null,
          temperature: hasSensor ? (temperature !== null ? Number(temperature) : null) : null,
          ambient: ambientTemp,
          visionResult: vision,
          sensorResult: data.sensor_result,
          gradcamImage: gradcam,
          hotspotBbox,
          hotspotDescription: hotspotDesc,
          originalPhoto: imageBase64,
          latencyMs: data.total_latency_ms,
          disclaimer: data.disclaimer,
          summary: data.decision === "SAFE"
            ? "Physical readings normal. Aerobic stability maintained."
            : data.decision === "CAUTION"
            ? "Early warning: Elevated temperature or moisture shift observed."
            : "High risk: Warning thresholds crossed. Inspect silage face.",
          nextStep: data.decision === "SAFE"
            ? "Feed according to standard daily ration. Keep bunker face sealed."
            : "Monitor pit temperature daily and conduct another check in 24 hours.",
        },
      };
    } catch (err) {
      lastError = err;
      // Try next candidate endpoint before giving up
    }
  }

  console.log("⚡ [OFFLINE MODE ACTIVE] All server candidates unreachable:", lastError?.message);

  if (!hasSensor) {
    // Optical deep learning cannot be fabricated with dummy data. Report honest connection requirement.
    return {
      success: false,
      error: "AI model server is unreachable. Optical deep-learning analysis with MobileNetV3 and Grad-CAM requires an active network connection. Please check your connection or connect probe for on-device screening.",
    };
  }

  // Execute genuine on-device 25-tree Random Forest sensor model on physical telemetry
  const edgeResult = EdgeInferenceEngine.runOfflineFusion({
    ph,
    moisture,
    temperature,
    ambient: ambientTemp,
    imageBase64,
    cropType,
  });

  return {
    success: true,
    isOffline: true,
    offlineReason: lastError?.message || "Backend server unreachable",
    result: {
      ...edgeResult,
      batchId: batchId || edgeResult.batchId,
      originalPhoto: imageBase64,
      gradcamImage: null,
      hotspotBbox: null,
      hotspotDescription: "Sensor probe screening. No optical hotspot.",
      visionResult: null,
      sensorResult: edgeResult.sensorResult,
    },
  };
}


let cachedAuthToken = null;
let authTokenExpiry = 0;

/**
 * Provisions a device-scoped access token via POST /api/v1/auth/device
 */
export async function getDeviceAuthToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedAuthToken && now < authTokenExpiry) {
    return cachedAuthToken;
  }
  const baseUrl = await resolveLiveApiUrl();
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: "SILAGE-MOBILE-DEVICE-01",
        secret: "sg-dev-device-secret-change-me",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      cachedAuthToken = data.access_token;
      authTokenExpiry = now + (data.expires_in ? (data.expires_in - 60) * 1000 : 800000);
      return cachedAuthToken;
    }
  } catch (err) {
    console.warn("[Device Auth] Token request error:", err.message);
  }
  return null;
}

/**
 * Uploads queued batch records to FastAPI POST /api/v1/sync/batches with device auth
 */
export async function syncBatches(batches) {
  try {
    const baseUrl = await resolveLiveApiUrl();
    let token = await getDeviceAuthToken();
    let headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    let res = await fetch(`${baseUrl}/api/v1/sync/batches`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        device_id: "SILAGE-MOBILE-DEVICE-01",
        app_version: "3.0.0",
        batches,
      }),
    });

    if (res.status === 401) {
      // Force refresh expired or invalid device token and retry once
      token = await getDeviceAuthToken(true);
      headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      res = await fetch(`${baseUrl}/api/v1/sync/batches`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          device_id: "SILAGE-MOBILE-DEVICE-01",
          app_version: "3.0.0",
          batches,
        }),
      });
    }

    if (!res.ok) throw new Error(`Sync API returned HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Fetches latest model weights from backend registry and updates on-device edge engine
 */
export async function fetchAndSyncModels() {
  try {
    const baseUrl = await resolveLiveApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/models/download/sensor`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const modelJson = await res.json();
      if (modelJson && modelJson.trees) {
        EdgeInferenceEngine.updateModel(modelJson);
        return { success: true, model: modelJson };
      }
    }
    return { success: false, error: `Backend returned HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


