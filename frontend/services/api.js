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

  // 1. In Web browsers: Localhost port 8000 is always the primary target
  if (Platform.OS === "web") {
    list.push("http://localhost:8000");
    list.push("http://127.0.0.1:8000");
    if (typeof window !== "undefined" && window.location?.hostname) {
      list.push(`http://${window.location.hostname}:8000`);
    }
    // Remote cloud backend as web fallback
    list.push("https://silageguard-ai.onrender.com");
  } else {
    // 2. On Mobile (Expo Go, EAS preview, Android, iOS):
    // Check Metro Host IP (dynamically matches dev PC on Ethernet, Wi-Fi, or Hotspot)
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        list.push(`http://${ip}:8000`);
      }
    }

    // Android emulator alias
    if (Platform.OS === "android") {
      list.push("http://10.0.2.2:8000");
    }

    // Primary cloud backend for physical mobile phones outside LAN
    list.push("https://silageguard-ai.onrender.com");

    const configApiUrl = Constants.expoConfig?.extra?.apiUrl || Constants.manifest2?.extra?.expoClient?.extra?.apiUrl;
    if (configApiUrl) {
      list.push(configApiUrl);
    }

    list.push("http://localhost:8000");
    list.push("http://127.0.0.1:8000");
  }

  // Explicit EXPO_PUBLIC_API_URL from environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    list.unshift(process.env.EXPO_PUBLIC_API_URL);
  }

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
      const probeTimeout = cachedLiveBaseUrl.includes("onrender.com") ? 5000 : 1500;
      const probeCtrl = new AbortController();
      const probeTid = setTimeout(() => probeCtrl.abort(), probeTimeout);
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

  // Probe candidates concurrently to discover the fastest responding live endpoint
  const probeCandidate = async (url) => {
    const probeTimeout = url.includes("onrender.com") ? 6000 : 2000;
    const probeCtrl = new AbortController();
    const probeTid = setTimeout(() => probeCtrl.abort(), probeTimeout);
    try {
      const res = await fetch(`${url}/health`, {
        method: "GET",
        signal: probeCtrl.signal,
      });
      clearTimeout(probeTid);
      if (res.ok) return url;
      throw new Error(`Endpoint ${url} returned ${res.status}`);
    } catch (err) {
      clearTimeout(probeTid);
      throw err;
    }
  };

  try {
    const fastestLiveUrl = await Promise.any(candidates.map(probeCandidate));
    cachedLiveBaseUrl = fastestLiveUrl;
    console.log(`[SilageGuard API] Discovered fastest live backend: ${fastestLiveUrl}`);
    return fastestLiveUrl;
  } catch (err) {
    console.warn("[SilageGuard API] All concurrent health probes failed, defaulting to cloud candidate.");
    return candidates.find((u) => u.includes("onrender.com")) || candidates[0] || "https://silageguard-ai.onrender.com";
  }
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

  // 1. Resolve active live reachable backend first via fast health check
  const activeBaseUrl = await resolveLiveApiUrl();
  console.log(`⚡ [INFERENCE] Active live candidate selected: ${activeBaseUrl}`);

  // Build ordered candidates with active candidate first
  const candidates = [
    activeBaseUrl,
    ...getCandidateUrls(),
  ].filter((u, i, arr) => u && arr.indexOf(u) === i);

  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const controller = new AbortController();
      // Realistic timeouts: 12s for local PC, 35s for cloud Render (neural network upload & Grad-CAM)
      const timeoutMs = baseUrl.includes("onrender.com") ? 35000 : 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`⚡ [INFERENCE] Sending POST to ${baseUrl}/api/v1/inference/predict (timeout: ${timeoutMs}ms)...`);
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
      console.warn(`[INFERENCE] Attempt on ${baseUrl} failed (${err.message}), trying next candidate...`);
      // Invalidate failed cache
      if (cachedLiveBaseUrl === baseUrl) {
        cachedLiveBaseUrl = null;
      }
    }
  }

  console.log("⚡ [OFFLINE MODE ACTIVE] All server candidates unreachable:", lastError?.message);

  if (!hasSensor) {
    // Optical deep learning cannot be fabricated with dummy data. Report honest connection requirement.
    return {
      success: false,
      error: `AI model server is unreachable (attempted ${candidates.slice(0, 3).join(", ")}). Error: ${lastError?.message || "Connection failed"}. Please verify your connection or backend server.`,
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


