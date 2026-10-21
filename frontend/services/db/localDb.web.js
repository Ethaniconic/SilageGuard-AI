// SILAGEGUARD AI — Web Local Database Implementation (Zero native SQLite dependencies)
// Uses browser window.localStorage for real observation persistence, Digital Twin, and sync queue

import { syncBatches } from "../api";
import { deriveDigitalTwin } from "../ai/digitalTwinEngine";

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

    const imageBase64 = obs.originalPhoto || obs.image_base64 || obs.imageBase64 || null;
    const gradcamImage = obs.gradcamImage || obs.gradcam_image || null;
    const hotspotBbox = obs.hotspotBbox || obs.hotspot_bbox || null;
    const hotspotDesc = obs.hotspotDescription || obs.hotspot_description || null;
    const visionClass = obs.visionResult?.detected_class || obs.visionClass || obs.vision_class || null;

    await this.createOrGetBatch({
      id: batchId,
      cropType,
      storageType,
    });

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
        const normalized = {
          ...obs,
          id,
          client_batch_id: batchId,
          batchId,
          crop_type: cropType,
          cropType,
          storage_type: storageType,
          storageType,
          image_base64: imageBase64,
          originalPhoto: imageBase64,
          imageBase64,
          gradcam_image: gradcamImage,
          gradcamImage,
          hotspot_bbox: hotspotBbox,
          hotspotBbox,
          hotspot_description: hotspotDesc,
          hotspotDescription: hotspotDesc,
          vision_class: visionClass,
          visionClass,
          sync_status: "SAVED_LOCAL",
          created_at: now,
        };
        stored.unshift(normalized);
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
   * Derives complete longitudinal Digital Twin for a given batch from local observations (Web)
   */
  async getDigitalTwin(batchId = null) {
    const observations = await this.getObservations(batchId);
    let batchMeta = {};
    if (batchId) {
      try {
        const batches = await this.getBatches();
        batchMeta = (batches || []).find((b) => b.client_batch_id === batchId || b.id === batchId) || {};
      } catch (_) {}
    }
    return deriveDigitalTwin(observations, batchMeta);
  }

  /**
   * Detects longitudinal deterioration trends across multiple historical observations (Digital Twin)
   */
  async detectDeteriorationTrend(batchId = null) {
    const twin = await this.getDigitalTwin(batchId);
    return {
      hasTrend: twin.observationCount >= 2,
      pattern:
        twin.warningLevel === "EARLY_DETERIORATION"
          ? "EARLY_DETERIORATION"
          : twin.warningLevel === "WATCH"
          ? "EARLY_WATCH"
          : twin.warningLevel === "HIGH_RISK"
          ? "EARLY_DETERIORATION"
          : twin.observationCount === 1
          ? "INSUFFICIENT_HISTORY"
          : "STABLE",
      message:
        twin.warningReasons && twin.warningReasons.length > 0
          ? twin.warningReasons[0]
          : "Fermentation parameters are stable across checks.",
      triggers: twin.warningReasons || [],
      evidence: twin.warningReasons || [],
      severity:
        twin.warningLevel === "HIGH_RISK"
          ? "HIGH RISK"
          : twin.warningLevel === "EARLY_DETERIORATION" || twin.warningLevel === "WATCH"
          ? "CAUTION"
          : "NORMAL",
      latest: twin.latest,
      previous: twin.previous,
      twin,
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
        image_count: (obs.originalPhoto || obs.image_base64) ? 1 : 0,
        image_urls: (obs.originalPhoto || obs.image_base64) ? [obs.originalPhoto || obs.image_base64] : null,
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
