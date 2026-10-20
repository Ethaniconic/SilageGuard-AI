// SILAGEGUARD AI — Web Local Database Implementation (Zero native SQLite dependencies)
// Uses browser window.localStorage for real observation persistence, Digital Twin, and sync queue

import { syncBatches } from "../api";

class DatabaseWebService {
  /**
   * Retrieves all registered farmer batches
   */
  async getBatches() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return JSON.parse(window.localStorage.getItem("sg_batches") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Creates a batch if it doesn't already exist or returns existing
   */
  async createOrGetBatch(params = {}) {
    const batchId = params.id || params.client_batch_id || params.clientBatchId || `BATCH-${Date.now()}`;
    const crop = params.cropType || params.crop_type || "Corn Silage";
    const storage = params.storageType || params.storage_type || "Bunker Pit";
    const now = new Date().toISOString();
    const batchObj = {
      id: batchId,
      client_batch_id: batchId,
      crop_type: crop,
      storage_type: storage,
      created_at: now,
    };

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_batches") || "[]");
        const existing = stored.find((b) => b.client_batch_id === batchId || b.id === batchId);
        if (existing) return existing;
        stored.unshift(batchObj);
        window.localStorage.setItem("sg_batches", JSON.stringify(stored));
        return batchObj;
      } catch {
        return batchObj;
      }
    }
    return batchObj;
  }

  /**
   * Save a real completed check observation into localStorage
   */
  async saveObservation(obs) {
    const id = obs.id || `OBS-${Date.now()}`;
    const now = new Date().toISOString();
    const batchId = obs.batchId || obs.client_batch_id || obs.clientBatchId || "BATCH-DEFAULT";
    const cropType = obs.cropType || obs.crop_type || "Corn Silage";
    const storageType = obs.storageType || obs.storage_type || "Bunker Pit";

    await this.createOrGetBatch({
      id: batchId,
      cropType,
      storageType,
    });

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
        stored.unshift({ ...obs, id, client_batch_id: batchId, crop_type: cropType, storage_type: storageType, sync_status: "SAVED_LOCAL", created_at: now });
        window.localStorage.setItem("sg_observations", JSON.stringify(stored));
        this.flushSyncQueue().catch(() => {});
        return { success: true, id };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: "localStorage unavailable" };
  }

  /**
   * Get all real observations for history and Digital Twin
   */
  async getObservations(batchId = null) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
        if (!batchId) return stored;
        return stored.filter((o) => o.batchId === batchId || o.client_batch_id === batchId);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  /**
   * Count observations waiting to sync
   */
  async getPendingSyncCount() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
        return stored.filter((s) => s.sync_status === "SAVED_LOCAL" || s.sync_status === "PENDING").length;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Detects simple early deterioration trends across multiple historical observations (Digital Twin)
   */
  async detectDeteriorationTrend(batchId = null) {
    const observations = await this.getObservations(batchId);
    if (!observations || observations.length < 2) {
      return {
        hasTrend: false,
        pattern: "INSUFFICIENT_HISTORY",
        message: "Not enough history to assess deterioration trend. Baseline established.",
        triggers: [],
        evidence: [],
        severity: "NORMAL",
      };
    }

    const sorted = [...observations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const triggers = [];
    const evidence = [];

    if (latest.ph != null && prev.ph != null) {
      const phDiff = Number(latest.ph) - Number(prev.ph);
      if (phDiff >= 0.20) {
        triggers.push("pH increasing");
        evidence.push(`pH rose by +${phDiff.toFixed(2)} (from ${Number(prev.ph).toFixed(2)} to ${Number(latest.ph).toFixed(2)})`);
      }
    }

    if (latest.temperature != null && prev.temperature != null) {
      const tempDiff = Number(latest.temperature) - Number(prev.temperature);
      if (tempDiff >= 1.5) {
        triggers.push("temperature increasing");
        evidence.push(`Core temperature rose by +${tempDiff.toFixed(1)}°C (from ${Number(prev.temperature).toFixed(1)}°C to ${Number(latest.temperature).toFixed(1)}°C)`);
      }
    }

    const latestScore = latest.mssi_score ?? latest.mssiScore;
    const prevScore = prev.mssi_score ?? prev.mssiScore;
    if (latestScore != null && prevScore != null) {
      const scoreDiff = Number(prevScore) - Number(latestScore);
      if (scoreDiff >= 8) {
        triggers.push("safety score decreasing");
        evidence.push(`Safety index dropped by -${scoreDiff} points (from ${prevScore} to ${latestScore})`);
      }
    }

    const rank = { GOOD: 0, SAFE: 0, WATCH: 1, CAUTION: 1, "HIGH RISK": 2, UNSAFE: 2 };
    const latestRank = rank[latest.decision || latest.verdict] || 0;
    const prevRank = rank[prev.decision || prev.verdict] || 0;
    if (latestRank > prevRank) {
      triggers.push("visual condition worsening");
      evidence.push(`Screening verdict shifted from ${prev.decision || prev.verdict} to ${latest.decision || latest.verdict}`);
    }

    if (triggers.length >= 2) {
      return {
        hasTrend: true,
        pattern: "EARLY_DETERIORATION",
        message: "Early deterioration pattern detected across repeated checks.",
        triggers,
        evidence,
        severity: latestRank >= 2 ? "HIGH RISK" : "CAUTION",
        latest,
        previous: prev,
      };
    } else if (triggers.length === 1) {
      return {
        hasTrend: true,
        pattern: "EARLY_WATCH",
        message: `Watch trend: ${triggers[0]}.`,
        triggers,
        evidence,
        severity: "CAUTION",
        latest,
        previous: prev,
      };
    }

    return {
      hasTrend: true,
      pattern: "STABLE",
      message: "Fermentation parameters are stable across repeated checks.",
      triggers: [],
      evidence: ["No adverse thermal, chemical, or visual trend detected."],
      severity: "NORMAL",
      latest,
      previous: prev,
    };
  }

  /**
   * Flushes offline sync queue to the FastAPI cloud backend
   */
  async flushSyncQueue() {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
      const pending = stored.filter((o) => o.sync_status === "SAVED_LOCAL" || o.sync_status === "PENDING");
      if (pending.length === 0) return { success: true, count: 0 };

      const batchPayloads = pending.map((obs) => ({
        client_batch_id: obs.client_batch_id || obs.batchId || obs.id,
        scanned_at: obs.created_at || new Date().toISOString(),
        storage_type: obs.storageType || "BUNKER_PIT",
        ph: obs.ph !== undefined ? obs.ph : null,
        moisture_pct: obs.moisture !== undefined ? obs.moisture : null,
        temperature_c: obs.temperature !== undefined ? obs.temperature : null,
        ambient_temp_c: obs.ambient !== undefined ? obs.ambient : 25.0,
        sensor_decision: obs.verdict || obs.decision || "SAFE",
        vision_decision: obs.visionResult?.prediction || obs.verdict || "SAFE",
        fused_decision: obs.verdict || obs.decision || "SAFE",
        fused_score: ((obs.mssiScore ?? obs.mssi_score ?? 85) / 100.0),
        advisory_text: obs.summary || "Screening complete.",
        image_count: obs.originalPhoto ? 1 : 0,
      }));

      const syncRes = await syncBatches(batchPayloads);
      if (!syncRes.error) {
        const updated = stored.map((o) => ({ ...o, sync_status: "SYNCED" }));
        window.localStorage.setItem("sg_observations", JSON.stringify(updated));
        return { success: true, count: pending.length, serverResponse: syncRes };
      }
      return { success: false, error: syncRes.error };
    }
    return { success: false, error: "localStorage unavailable" };
  }

  /**
   * Clear all records and batches from localStorage (for testing)
   */
  async clearAllRecords() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem("sg_observations");
        window.localStorage.removeItem("sg_batches");
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  }
}

export const localDb = new DatabaseWebService();
