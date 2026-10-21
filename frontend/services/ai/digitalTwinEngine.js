// SILAGEGUARD AI — Deterministic Longitudinal Digital Twin Engine
// Client-side pure JavaScript engine for 100% offline Digital Twin derivation.
// Computes baseline comparisons, rate calculations, deterioration signals, evidence, and recommendations.

/**
 * Visual severity ranking for macroscopic silage condition
 */
export const VISION_SEVERITY_RANK = {
  HEALTHY: 0,
  SAFE: 0,
  GOOD: 0,
  ABNORMAL_APPEARANCE: 1,
  FOREIGN_OBJECT: 1,
  WATCH: 1,
  CAUTION: 1,
  MOULD: 2,
  SPOILAGE: 2,
  UNSAFE: 2,
  HIGH_RISK: 2,
};

/**
 * Normalizes an observation object from either local SQLite or API schema
 */
export function normalizeObservation(raw, index = 0) {
  if (!raw) return null;

  const rawDate = raw.created_at || raw.observed_at || raw.scanned_at || null;
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;

  const phVal = raw.ph !== null && raw.ph !== undefined && raw.ph !== "" ? Number(raw.ph) : null;
  const moistureVal =
    raw.moisture !== null && raw.moisture !== undefined && raw.moisture !== ""
      ? Number(raw.moisture)
      : raw.moisture_pct !== null && raw.moisture_pct !== undefined && raw.moisture_pct !== ""
      ? Number(raw.moisture_pct)
      : null;

  const tempVal =
    raw.temperature !== null && raw.temperature !== undefined && raw.temperature !== ""
      ? Number(raw.temperature)
      : raw.temperature_c !== null && raw.temperature_c !== undefined && raw.temperature_c !== ""
      ? Number(raw.temperature_c)
      : null;

  const ambientVal =
    raw.ambient !== null && raw.ambient !== undefined && raw.ambient !== ""
      ? Number(raw.ambient)
      : raw.ambient_temp_c !== null && raw.ambient_temp_c !== undefined && raw.ambient_temp_c !== ""
      ? Number(raw.ambient_temp_c)
      : 25.0;

  const deltaTemp = tempVal !== null ? tempVal - ambientVal : null;

  const mssiVal =
    raw.mssi_score !== null && raw.mssi_score !== undefined
      ? Number(raw.mssi_score)
      : raw.mssiScore !== null && raw.mssiScore !== undefined
      ? Number(raw.mssiScore)
      : raw.fused_score !== null && raw.fused_score !== undefined
      ? Math.round(Number(raw.fused_score) * 100)
      : null;

  const verdict = (raw.verdict || raw.decision || raw.fused_decision || "GOOD").toUpperCase().trim();
  const visionClass = (
    raw.vision_class ||
    raw.visionClass ||
    raw.visionResult?.detected_class ||
    (verdict === "GOOD" || verdict === "SAFE" ? "Healthy" : "Silage")
  ).trim();

  return {
    id: raw.id || `OBS-${index}`,
    clientBatchId: raw.client_batch_id || raw.batchId || raw.batch_id || "BATCH-UNKNOWN",
    observationNumber: index + 1,
    createdAt: rawDate,
    timestamp: isNaN(timestamp) ? null : timestamp,
    ph: phVal !== null && !isNaN(phVal) ? Math.round(phVal * 100) / 100 : null,
    moisture: moistureVal !== null && !isNaN(moistureVal) ? Math.round(moistureVal * 10) / 10 : null,
    temperature: tempVal !== null && !isNaN(tempVal) ? Math.round(tempVal * 10) / 10 : null,
    ambient: Math.round(ambientVal * 10) / 10,
    deltaTemp: deltaTemp !== null ? Math.round(deltaTemp * 10) / 10 : null,
    mssiScore: mssiVal !== null && !isNaN(mssiVal) ? Math.max(0, Math.min(100, mssiVal)) : 85,
    verdict: verdict === "SAFE" ? "GOOD" : verdict === "CAUTION" ? "WATCH" : verdict === "UNSAFE" ? "HIGH RISK" : verdict,
    visionClass,
    summary: raw.summary || raw.advisory_text || "Screening complete.",
    originalPhoto: raw.originalPhoto || raw.image_base64 || raw.imageBase64 || null,
    gradcamImage: raw.gradcamImage || raw.gradcam_image || null,
    hotspotBbox: raw.hotspotBbox || raw.hotspot_bbox || null,
    hotspotDescription: raw.hotspotDescription || raw.hotspot_description || null,
  };
}

/**
 * Derives the complete, deterministic Digital Twin state from chronological observations
 */
export function deriveDigitalTwin(rawObservations = [], batchMetadata = {}) {
  if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
    return {
      batchId: batchMetadata.client_batch_id || batchMetadata.id || "EMPTY",
      cropType: batchMetadata.crop_type || "Corn Silage",
      storageType: batchMetadata.storage_type || "Bunker Pit",
      observationCount: 0,
      baseline: null,
      latest: null,
      previous: null,
      changes: null,
      ratesPerDay: null,
      trendDirection: "UNOBSERVED",
      deteriorationDetected: false,
      warningLevel: "STABLE",
      warningReasons: ["No observations recorded yet for this batch."],
      recommendedAction: "Perform initial silage probe check and photo to establish baseline.",
      timeline: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // 1. Sort observations strictly chronologically
  const normalizedList = rawObservations
    .map((o, idx) => normalizeObservation(o, idx))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
      return 0;
    });

  const count = normalizedList.length;
  const baseline = normalizedList[0];
  const latest = normalizedList[count - 1];
  const previous = count >= 2 ? normalizedList[count - 2] : null;

  // 2. Build Timeline items
  const timeline = normalizedList.map((obs, idx) => {
    const isBaseline = idx === 0;
    return {
      step: idx + 1,
      id: obs.id,
      isBaseline,
      date: obs.createdAt ? new Date(obs.createdAt).toLocaleDateString() : `Check #${idx + 1}`,
      time: obs.createdAt ? new Date(obs.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      decision: obs.verdict,
      mssiScore: obs.mssiScore,
      ph: obs.ph,
      temperature: obs.temperature,
      moisture: obs.moisture,
      deltaTemp: obs.deltaTemp,
      visionClass: obs.visionClass,
      note: isBaseline
        ? "Initial Baseline Reference"
        : `Check #${idx + 1}: MSSI ${obs.mssiScore} (${obs.verdict})`,
    };
  });

  // 3. CASE: Single Observation Rule
  // A single observation establishes Baseline & Current Status, NEVER a longitudinal trend
  if (count === 1) {
    const isImmediateCritical = latest.verdict === "HIGH RISK" || (latest.ph !== null && latest.ph >= 5.0) || (latest.deltaTemp !== null && latest.deltaTemp >= 8.0);
    return {
      batchId: latest.clientBatchId,
      cropType: batchMetadata.crop_type || "Corn Silage",
      storageType: batchMetadata.storage_type || "Bunker Pit",
      observationCount: 1,
      baseline,
      latest,
      previous: null,
      changes: {
        fromBaseline: { ph: 0, temperature: 0, deltaTemp: 0, moisture: 0, mssi: 0 },
        fromPrevious: null,
      },
      ratesPerDay: null,
      trendDirection: "BASELINE",
      deteriorationDetected: false,
      warningLevel: isImmediateCritical ? "HIGH_RISK" : "STABLE",
      warningReasons: isImmediateCritical
        ? ["Immediate single-check alert: Core measurements crossed safety threshold."]
        : ["Initial baseline established. Further checks required to detect trend."],
      recommendedAction: isImmediateCritical
        ? "Review immediate physical measurements. Discard discolored face layers and consult nutritionist."
        : "Initial baseline established. Conduct a second check in 2–3 days to begin monitoring longitudinal trends.",
      timeline,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 4. Calculate Changes from Baseline (O_1) and Previous (O_{N-1})
  const dPhBase = latest.ph !== null && baseline.ph !== null ? Math.round((latest.ph - baseline.ph) * 100) / 100 : null;
  const dTempBase = latest.temperature !== null && baseline.temperature !== null ? Math.round((latest.temperature - baseline.temperature) * 10) / 10 : null;
  const dDeltaTempBase = latest.deltaTemp !== null && baseline.deltaTemp !== null ? Math.round((latest.deltaTemp - baseline.deltaTemp) * 10) / 10 : null;
  const dMoistureBase = latest.moisture !== null && baseline.moisture !== null ? Math.round((latest.moisture - baseline.moisture) * 10) / 10 : null;
  const dMssiBase = latest.mssiScore !== null && baseline.mssiScore !== null ? latest.mssiScore - baseline.mssiScore : 0;

  const dPhPrev = latest.ph !== null && previous.ph !== null ? Math.round((latest.ph - previous.ph) * 100) / 100 : null;
  const dTempPrev = latest.temperature !== null && previous.temperature !== null ? Math.round((latest.temperature - previous.temperature) * 10) / 10 : null;
  const dDeltaTempPrev = latest.deltaTemp !== null && previous.deltaTemp !== null ? Math.round((latest.deltaTemp - previous.deltaTemp) * 10) / 10 : null;
  const dMoisturePrev = latest.moisture !== null && previous.moisture !== null ? Math.round((latest.moisture - previous.moisture) * 10) / 10 : null;
  const dMssiPrev = latest.mssiScore !== null && previous.mssiScore !== null ? latest.mssiScore - previous.mssiScore : 0;

  // 5. Calculate Rates Per Day (Requires valid timestamps and >= 1 hour elapsed time)
  let ratesPerDay = null;
  if (latest.timestamp && baseline.timestamp && latest.timestamp > baseline.timestamp) {
    const hoursElapsed = (latest.timestamp - baseline.timestamp) / (1000 * 60 * 60);
    const daysElapsed = hoursElapsed / 24.0;
    if (daysElapsed >= 0.05) { // at least 1.2 hours
      ratesPerDay = {
        daysElapsed: Math.round(daysElapsed * 10) / 10,
        phPerDay: dPhBase !== null ? Math.round((dPhBase / daysElapsed) * 100) / 100 : null,
        tempPerDay: dTempBase !== null ? Math.round((dTempBase / daysElapsed) * 10) / 10 : null,
        mssiPerDay: Math.round((dMssiBase / daysElapsed) * 10) / 10,
      };
    }
  }

  // 6. Longitudinal Deterioration Signals
  const triggers = [];
  const reasons = [];

  // Signal 1: Chemical pH Increase (Alkalization / Lactic Acid Depletion)
  if (dPhPrev !== null && dPhPrev >= 0.25) {
    triggers.push("PH_RISING");
    reasons.push(`Acidity shifting: pH increased by +${dPhPrev.toFixed(2)} since previous check.`);
  } else if (dPhBase !== null && dPhBase >= 0.35) {
    triggers.push("PH_RISING");
    reasons.push(`Acidity shifting: pH increased by +${dPhBase.toFixed(2)} compared with initial baseline.`);
  }

  // Signal 2: Core Temperature Accumulation (Aerobic Respiration Heat)
  if (dTempPrev !== null && dTempPrev >= 2.0) {
    triggers.push("TEMP_RISING");
    reasons.push(`Core temperature rose by +${dTempPrev.toFixed(1)}°C since previous check.`);
  } else if (dTempBase !== null && dTempBase >= 3.0) {
    triggers.push("TEMP_RISING");
    reasons.push(`Core temperature rose by +${dTempBase.toFixed(1)}°C above initial baseline.`);
  }

  // Signal 3: Thermal Differential Expansion (Core heating faster than ambient)
  if (latest.deltaTemp !== null && latest.deltaTemp >= 4.0) {
    triggers.push("THERMAL_STRESS");
    reasons.push(`Thermal differential is elevated at +${latest.deltaTemp.toFixed(1)}°C above ambient.`);
  } else if (dDeltaTempPrev !== null && dDeltaTempPrev >= 1.5) {
    triggers.push("THERMAL_STRESS");
    reasons.push(`Thermal gap expanded by +${dDeltaTempPrev.toFixed(1)}°C.`);
  }

  // Signal 4: MSSI Stability Index Drop
  if (dMssiPrev <= -8) {
    triggers.push("MSSI_DECLINE");
    reasons.push(`Silage Stability Index dropped by ${dMssiPrev} points since previous check.`);
  } else if (dMssiBase <= -15) {
    triggers.push("MSSI_DECLINE");
    reasons.push(`Silage Stability Index has dropped by ${dMssiBase} points since baseline.`);
  }

  // Signal 5: Visual Condition Worsening
  const latestRank = VISION_SEVERITY_RANK[latest.visionClass.toUpperCase()] || VISION_SEVERITY_RANK[latest.verdict] || 0;
  const prevRank = VISION_SEVERITY_RANK[previous.visionClass.toUpperCase()] || VISION_SEVERITY_RANK[previous.verdict] || 0;
  if (latestRank > prevRank) {
    triggers.push("VISUAL_WORSENING");
    reasons.push(`Visual surface appearance worsened (${previous.visionClass} → ${latest.visionClass}).`);
  }

  // 7. Deterioration Warning Determination
  // Hard immediate safety rules always remain authoritative
  const isImmediateCritical =
    latest.verdict === "HIGH RISK" ||
    (latest.ph !== null && latest.ph >= 5.0) ||
    (latest.deltaTemp !== null && latest.deltaTemp >= 8.0) ||
    latest.visionClass === "Mould" ||
    latest.visionClass === "Spoilage";

  let warningLevel = "STABLE";
  let deteriorationDetected = false;
  let trendDirection = "STABLE";

  if (isImmediateCritical) {
    warningLevel = "HIGH_RISK";
    deteriorationDetected = true;
    trendDirection = "DETERIORATING";
    if (reasons.length === 0) {
      reasons.push("Critical screening threshold crossed in latest physical reading.");
    }
  } else if (triggers.length >= 2) {
    warningLevel = "EARLY_DETERIORATION";
    deteriorationDetected = true;
    trendDirection = "DETERIORATING";
  } else if (triggers.length === 1) {
    warningLevel = "WATCH";
    deteriorationDetected = false;
    trendDirection = "WATCH_SHIFT";
  } else {
    // Check if parameters actually improved
    if (dMssiBase >= 6 && dPhBase !== null && dPhBase <= -0.15) {
      trendDirection = "IMPROVING";
      reasons.push("Fermentation parameters demonstrate stabilizing acidity and high MSSI.");
    } else {
      trendDirection = "STABLE";
      reasons.push("Fermentation parameters remain steady across checks.");
    }
  }

  // 8. Farmer Recommendation Synthesis
  let recommendedAction = "";
  if (warningLevel === "HIGH_RISK") {
    recommendedAction =
      "Do not feed visibly deteriorated sections to cattle. Scrape off and discard surface spoilage immediately. Inspect face sealing and consult a livestock nutritionist.";
  } else if (warningLevel === "EARLY_DETERIORATION") {
    recommendedAction =
      "Multiple deterioration indicators detected. Inspect the bunker pit face for air pockets or loose compaction. Increase daily feed-out speed and re-test within 24 hours.";
  } else if (warningLevel === "WATCH") {
    recommendedAction =
      "Monitor this batch again in 24–48 hours. Ensure the bunker plastic sheet is firmly secured against wind and rain.";
  } else {
    recommendedAction =
      "Fermentation parameters remain steady. Continue standard routine feeding and maintain clean face management.";
  }

  return {
    batchId: latest.clientBatchId,
    cropType: batchMetadata.crop_type || "Corn Silage",
    storageType: batchMetadata.storage_type || "Bunker Pit",
    observationCount: count,
    baseline,
    latest,
    previous,
    changes: {
      fromBaseline: {
        ph: dPhBase,
        temperature: dTempBase,
        deltaTemp: dDeltaTempBase,
        moisture: dMoistureBase,
        mssi: dMssiBase,
      },
      fromPrevious: {
        ph: dPhPrev,
        temperature: dTempPrev,
        deltaTemp: dDeltaTempPrev,
        moisture: dMoisturePrev,
        mssi: dMssiPrev,
      },
    },
    ratesPerDay,
    trendDirection,
    deteriorationDetected,
    warningLevel,
    warningReasons: reasons,
    recommendedAction,
    timeline,
    lastUpdated: new Date().toISOString(),
  };
}
