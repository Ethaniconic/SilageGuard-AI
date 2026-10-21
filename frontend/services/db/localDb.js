// SILAGEGUARD AI — Real SQLite Local Database
// Manages genuine farmer batches, historical observations (Digital Twin), and the offline sync queue

import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { syncBatches } from "../api";
import { deriveDigitalTwin } from "../ai/digitalTwinEngine";

class DatabaseService {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    if (Platform.OS === "web") {
      return; // Web fallback handled via localStorage
    }

    try {
      this.db = SQLite.openDatabaseSync("silageguard_prod.db");
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS batches (
          id TEXT PRIMARY KEY,
          client_batch_id TEXT UNIQUE NOT NULL,
          crop_type TEXT NOT NULL,
          storage_type TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS observations (
          id TEXT PRIMARY KEY,
          client_batch_id TEXT NOT NULL,
          ph REAL,
          moisture REAL,
          temperature REAL,
          ambient REAL,
          decision TEXT NOT NULL,
          mssi_score INTEGER,
          confidence INTEGER,
          summary TEXT,
          next_step TEXT,
          image_base64 TEXT,
          gradcam_image TEXT,
          hotspot_bbox TEXT,
          hotspot_description TEXT,
          vision_class TEXT,
          sync_status TEXT DEFAULT 'SAVED_LOCAL',
          created_at TEXT NOT NULL,
          FOREIGN KEY (client_batch_id) REFERENCES batches(client_batch_id)
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          observation_id TEXT UNIQUE NOT NULL,
          payload_json TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          status TEXT DEFAULT 'PENDING',
          created_at TEXT NOT NULL
        );
      `);

      // Seamless schema migration for existing SQLite production tables
      const migrations = [
        "ALTER TABLE observations ADD COLUMN image_base64 TEXT;",
        "ALTER TABLE observations ADD COLUMN gradcam_image TEXT;",
        "ALTER TABLE observations ADD COLUMN hotspot_bbox TEXT;",
        "ALTER TABLE observations ADD COLUMN hotspot_description TEXT;",
        "ALTER TABLE observations ADD COLUMN vision_class TEXT;",
      ];
      for (const sql of migrations) {
        try {
          this.db.execSync(sql);
        } catch (_) {
          // Column already exists, safe to ignore
        }
      }
    } catch (err) {
      console.warn("SQLite database init error:", err.message);
    }
  }

  /**
   * Retrieves all registered farmer batches
   */
  async getBatches() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        return JSON.parse(window.localStorage.getItem("sg_batches") || "[]");
      } catch {
        return [];
      }
    }

    if (!this.db) return [];
    try {
      return this.db.getAllSync("SELECT * FROM batches ORDER BY created_at DESC");
    } catch (err) {
      console.warn("getBatches error:", err.message);
      return [];
    }
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

    if (Platform.OS === "web" && typeof window !== "undefined") {
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

    if (!this.db) return batchObj;
    try {
      this.db.runSync(
        `INSERT OR IGNORE INTO batches (id, client_batch_id, crop_type, storage_type, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [batchId, batchId, crop, storage, now]
      );
      return batchObj;
    } catch (err) {
      console.warn("createOrGetBatch error:", err.message);
      return batchObj;
    }
  }

  /**
   * Save a real completed check observation into local SQLite
   */
  async saveObservation(obs) {
    const id = obs.id || `OBS-${Date.now()}`;
    const now = new Date().toISOString();
    const batchId = obs.batchId || obs.client_batch_id || obs.clientBatchId || "BATCH-DEFAULT";
    const cropType = obs.cropType || obs.crop_type || "Corn Silage";
    const storageType = obs.storageType || obs.storage_type || "Bunker Pit";

    // Auto-register batch if not already present
    await this.createOrGetBatch({
      id: batchId,
      cropType,
      storageType,
    });

    const imageBase64 = obs.originalPhoto || obs.image_base64 || obs.imageBase64 || null;
    const gradcamImage = obs.gradcamImage || obs.gradcam_image || null;
    const hotspotBbox = obs.hotspotBbox
      ? (typeof obs.hotspotBbox === "object" ? JSON.stringify(obs.hotspotBbox) : obs.hotspotBbox)
      : (obs.hotspot_bbox ? (typeof obs.hotspot_bbox === "object" ? JSON.stringify(obs.hotspot_bbox) : obs.hotspot_bbox) : null);
    const hotspotDesc = obs.hotspotDescription || obs.hotspot_description || null;
    const visionClass = obs.visionResult?.detected_class || obs.visionClass || obs.vision_class || null;

    if (Platform.OS === "web" && typeof window !== "undefined") {
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
          hotspot_bbox: hotspotBbox ? (typeof hotspotBbox === "string" ? JSON.parse(hotspotBbox) : hotspotBbox) : null,
          hotspotBbox: hotspotBbox ? (typeof hotspotBbox === "string" ? JSON.parse(hotspotBbox) : hotspotBbox) : null,
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

    if (!this.db) return { success: false, error: "Database not ready" };

    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO observations (
          id, client_batch_id, ph, moisture, temperature, ambient, decision, mssi_score, confidence, summary, next_step, image_base64, gradcam_image, hotspot_bbox, hotspot_description, vision_class, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAVED_LOCAL', ?)`,
        [
          id,
          batchId,
          obs.ph !== undefined ? obs.ph : null,
          obs.moisture !== undefined ? obs.moisture : null,
          obs.temperature !== undefined ? obs.temperature : null,
          obs.ambient !== undefined ? obs.ambient : null,
          obs.verdict || obs.decision || "GOOD",
          obs.mssiScore !== undefined ? obs.mssiScore : (obs.mssi_score !== undefined ? obs.mssi_score : null),
          obs.confidence !== undefined ? obs.confidence : null,
          obs.summary || "Screening complete.",
          obs.nextStep || "Continue standard bunker monitoring.",
          imageBase64,
          gradcamImage,
          hotspotBbox,
          hotspotDesc,
          visionClass,
          now,
        ]
      );

      // Queue for cloud sync
      this.db.runSync(
        `INSERT OR REPLACE INTO sync_queue (id, observation_id, payload_json, status, created_at)
         VALUES (?, ?, ?, 'PENDING', ?)`,
        [`SYNC-${Date.now()}`, id, JSON.stringify({ ...obs, id, client_batch_id: batchId, crop_type: cropType, storage_type: storageType, image_base64: imageBase64, gradcam_image: gradcamImage, hotspot_bbox: hotspotBbox, hotspot_description: hotspotDesc, created_at: now }), now]
      );

      this.flushSyncQueue().catch(() => {});
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get all real observations for history and Digital Twin
   */
  async getObservations(batchId = null) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
        if (!batchId) return stored;
        return stored.filter((o) => o.batchId === batchId || o.client_batch_id === batchId);
      } catch (e) {
        return [];
      }
    }

    if (!this.db) return [];

    try {
      const query = batchId
        ? "SELECT * FROM observations WHERE client_batch_id = ? ORDER BY created_at DESC"
        : "SELECT * FROM observations ORDER BY created_at DESC";
      const params = batchId ? [batchId] : [];
      const rows = this.db.getAllSync(query, params) || [];

      return rows.map((r) => {
        let parsedBbox = null;
        if (r.hotspot_bbox) {
          try {
            parsedBbox = typeof r.hotspot_bbox === "string" ? JSON.parse(r.hotspot_bbox) : r.hotspot_bbox;
          } catch (_) {
            parsedBbox = null;
          }
        }
        return {
          ...r,
          batchId: r.client_batch_id,
          mssiScore: r.mssi_score,
          originalPhoto: r.image_base64,
          imageBase64: r.image_base64,
          gradcamImage: r.gradcam_image,
          hotspotBbox: parsedBbox,
          hotspotDescription: r.hotspot_description,
          visionClass: r.vision_class,
        };
      });
    } catch (err) {
      console.warn("getObservations error:", err.message);
      return [];
    }
  }

  /**
   * Count observations waiting to sync
   */
  async getPendingSyncCount() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const stored = JSON.parse(window.localStorage.getItem("sg_observations") || "[]");
      return stored.filter((s) => s.sync_status === "SAVED_LOCAL" || s.sync_status === "PENDING").length;
    }

    try {
      const res = this.db.getFirstSync("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'");
      return res ? res.count : 0;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Derives complete longitudinal Digital Twin for a given batch from local observations
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
   * Detects longitudinal deterioration trends across historical observations (Digital Twin)
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
    if (Platform.OS === "web" && typeof window !== "undefined") {
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

    if (!this.db) return { success: false, error: "Database not ready" };

    try {
      const pendingRows = this.db.getAllSync("SELECT * FROM sync_queue WHERE status = 'PENDING'");
      if (!pendingRows || pendingRows.length === 0) return { success: true, count: 0 };

      const batchPayloads = [];
      for (const row of pendingRows) {
        const obs = JSON.parse(row.payload_json);
        batchPayloads.push({
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
        });
      }

      const syncRes = await syncBatches(batchPayloads);
      if (!syncRes.error) {
        for (const row of pendingRows) {
          this.db.runSync("UPDATE sync_queue SET status = 'SYNCED' WHERE id = ?", [row.id]);
          this.db.runSync("UPDATE observations SET sync_status = 'SYNCED' WHERE id = ?", [row.observation_id]);
        }
        return { success: true, count: pendingRows.length, serverResponse: syncRes };
      }
      return { success: false, error: syncRes.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Clear all records, batches, and sync queues from local SQLite database (for testing)
   */
  async clearAllRecords() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("sg_observations");
        window.localStorage.removeItem("sg_batches");
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    if (!this.db) return { success: false, error: "Database not ready" };

    try {
      this.db.execSync(`
        DELETE FROM sync_queue;
        DELETE FROM observations;
        DELETE FROM batches;
      `);
      return { success: true };
    } catch (err) {
      console.warn("clearAllRecords error:", err.message);
      return { success: false, error: err.message };
    }
  }
}

export const localDb = new DatabaseService();
