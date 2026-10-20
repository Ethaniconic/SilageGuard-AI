// SILAGEGUARD AI — Deterministic Agronomic Safety Rule Engine (Client-Side)
// Grounded in peer-reviewed animal science literature (Kung et al. 2018, Borreani et al. 2018).
// ML statistical probabilities must NEVER override deterministic safety rules.

export class SafetyRuleEngine {
  /**
   * Evaluates sensor telemetry and visual detections against agronomic safety thresholds.
   * Returns:
   *   triggered: boolean
   *   overrideVerdict: "CAUTION" | "UNSAFE" | null
   *   reasons: string[]
   *   severity: "NORMAL" | "CAUTION" | "UNSAFE"
   */
  static evaluate({
    ph = null,
    moisture = null,
    temperature = null,
    ambient = 25.0,
    visionPrediction = null,
    detectedClass = null,
  }) {
    const reasons = [];
    let overrideVerdict = null;

    // Rule 1: High pH Spoilage Threshold
    if (ph !== null && ph !== undefined) {
      const p = Number(ph);
      if (p >= 5.0) {
        overrideVerdict = "UNSAFE";
        reasons.push(`Silage pH (${p.toFixed(2)}) exceeds clostridial danger threshold (≥ 5.0). Risk of butyric degradation.`);
      } else if (p >= 4.5) {
        if (overrideVerdict !== "UNSAFE") overrideVerdict = "CAUTION";
        reasons.push(`Silage pH (${p.toFixed(2)}) indicates incomplete lactic acidification (optimal 3.8–4.2).`);
      }
    }

    // Rule 2: Heat Rise / Delta Temp Spoilage Threshold
    if (temperature !== null && temperature !== undefined) {
      const t = Number(temperature);
      const a = ambient !== null && ambient !== undefined ? Number(ambient) : 25.0;
      const deltaTemp = t - a;
      if (deltaTemp >= 8.0) {
        overrideVerdict = "UNSAFE";
        reasons.push(`Core heating (+${deltaTemp.toFixed(1)}°C above ambient) indicates severe aerobic runaway heating.`);
      } else if (deltaTemp >= 4.0) {
        if (overrideVerdict !== "UNSAFE") overrideVerdict = "CAUTION";
        reasons.push(`Elevated heat rise (+${deltaTemp.toFixed(1)}°C above ambient) indicates early aerobic instability.`);
      }
    }

    // Rule 3: High Moisture Clostridial Vulnerability
    if (moisture !== null && moisture !== undefined) {
      const m = Number(moisture);
      if (m > 72.0) {
        if (overrideVerdict !== "UNSAFE") overrideVerdict = "CAUTION";
        reasons.push(`High moisture content (${m.toFixed(1)}% > 72%) creates clostridial fermentation vulnerability.`);
      }
    }

    // Rule 4: Visual Pathogen / Mould / Foreign Object Contamination
    if (
      visionPrediction === "UNSAFE" ||
      ["Mould", "Spoilage", "Foreign_object"].includes(detectedClass)
    ) {
      overrideVerdict = "UNSAFE";
      reasons.push(`Visual screening identified physical contamination or fungal growth: ${detectedClass || "Mould/Spoilage"}.`);
    }

    const triggered = overrideVerdict !== null;
    return {
      triggered,
      overrideVerdict,
      reasons,
      severity: overrideVerdict || "NORMAL",
    };
  }
}
