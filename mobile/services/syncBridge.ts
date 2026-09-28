/**
 * SILAGEGUARD AI — Integration: Offline → Cloud Sync Bridge
 *
 * Translates the local SQLite records (frontend/sqlite/database.ts) into the
 * backend's SyncBatchRequest contract (backend/app/schemas/batch.py) and pushes
 * them to POST /api/v1/sync/batches.
 *
 * Design notes
 * ------------
 *  - The backend de-duplicates on `client_batch_id`, so replaying the queue is
 *    safe: duplicates come back as `skipped`, not `inserted`.
 *  - On any network failure the batches stay queued and the function returns
 *    `{ ok: false }`; the app never blocks a farmer's scan on connectivity.
 *  - The app has no login screen, so authentication is a device-scoped token
 *    obtained lazily via POST /auth/device (see ensureDeviceAuthenticated).
 */
import {
  batchRepository,
  CompleteBatchDetails,
} from "../sqlite/batchRepository";
import {
  BackendBatchPayload,
  SyncResponse,
  ensureDeviceAuthenticated,
  isBackendReachable,
  syncBatches,
} from "./apiClient";
import { DEVICE_ID, APP_VERSION } from "./deviceInfo";

export interface SyncOutcome {
  ok: boolean;
  attempted: number;
  inserted: number;
  skipped: number;
  error?: string;
}

const MAX_BATCH_CHUNK = 50;

/** Map one locally stored batch to the backend wire format. */
function toPayload(details: CompleteBatchDetails): BackendBatchPayload {
  const { batch, sensor, vision, fusion } = details;
  const explainability = (() => {
    try {
      return JSON.parse(fusion.explainability_json || "[]");
    } catch {
      return [];
    }
  })();

  return {
    client_batch_id: batch.id,
    scanned_at: batch.timestamp,
    storage_type: batch.storage_type,
    storage_duration_days: null,
    ph: sensor.ph,
    moisture_pct: sensor.moisture,
    temperature_c: sensor.temperature,
    ambient_temp_c: sensor.ambient,
    sensor_decision:
      sensor.ph != null || sensor.moisture != null ? batch.decision : null,
    sensor_confidence: sensor.ph != null ? batch.confidence : null,
    vision_decision: vision.iqa_passed ? vision.prediction : null,
    vision_confidence: vision.iqa_passed ? vision.confidence : null,
    fused_decision: batch.decision,
    fused_score: fusion.fusion_score,
    rule_override: batch.rule_id ?? null,
    advisory_text:
      explainability.length > 0
        ? String(explainability[0]?.factor ?? "")
        : batch.summary_reason,
    advisory_language: null,
    latitude: null,
    longitude: null,
    qr_token: batch.qr_data || null,
    image_count: vision.num_frames ?? 0,
    image_urls: batch.image_uri ? [batch.image_uri] : null,
    device_model: DEVICE_ID,
    app_version: APP_VERSION,
  };
}

/** Collect every locally stored batch (newest first). */
async function collectLocalBatches(excludeDemo: boolean): Promise<BackendBatchPayload[]> {
  const all = await batchRepository.getAllBatches(excludeDemo);
  const payloads: BackendBatchPayload[] = [];
  for (const record of all) {
    const details = await batchRepository.getBatchById(record.id);
    if (details) payloads.push(toPayload(details));
  }
  return payloads;
}

/**
 * Push all locally stored batches to the backend.
 * Returns an outcome instead of throwing so callers can surface a soft warning.
 */
export async function flushToBackend(excludeDemo = true): Promise<SyncOutcome> {
  if (!isBackendReachable()) {
    return {
      ok: false,
      attempted: 0,
      inserted: 0,
      skipped: 0,
      error: "Backend unreachable",
    };
  }
  if (!(await ensureDeviceAuthenticated(DEVICE_ID))) {
    return {
      ok: false,
      attempted: 0,
      inserted: 0,
      skipped: 0,
      error: "Device not provisioned",
    };
  }

  const payloads = await collectLocalBatches(excludeDemo);
  if (payloads.length === 0) {
    return { ok: true, attempted: 0, inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;
  let attempted = 0;

  for (let i = 0; i < payloads.length; i += MAX_BATCH_CHUNK) {
    const chunk = payloads.slice(i, i + MAX_BATCH_CHUNK);
    attempted += chunk.length;
    try {
      const response: SyncResponse = await syncBatches(
        chunk,
        DEVICE_ID,
        APP_VERSION,
      );
      inserted += response.inserted;
      skipped += response.skipped;
    } catch (err) {
      return {
        ok: false,
        attempted,
        inserted,
        skipped,
        error: err instanceof Error ? err.message : "Sync failed",
      };
    }
  }

  return { ok: true, attempted, inserted, skipped };
}

/**
 * Convenience hook for screens: attempt a flush, swallow all errors.
 * Use in a useEffect with a dependency on the local batch count.
 */
export async function trySyncInBackground(): Promise<SyncOutcome | null> {
  try {
    return await flushToBackend(true);
  } catch {
    return null;
  }
}

/**
 * Push a single freshly-created batch to the backend.
 *
 * Called from the processing screen right after the local save. It is
 * intentionally fire-and-forget: the scan is already scored and stored
 * locally, so a slow, absent, or unprovisioned backend must never delay or
 * block the farmer from seeing their result. The batch simply remains local
 * and will be picked up by a later flush, which is safe because the backend
 * de-duplicates on `client_batch_id`.
 */
export async function enqueueBatchForSync(batchId: string): Promise<SyncOutcome | null> {
  try {
    const details = await batchRepository.getBatchById(batchId);
    if (!details) return null;

    if (!isBackendReachable()) return null;
    if (!(await ensureDeviceAuthenticated(DEVICE_ID))) return null;

    const response: SyncResponse = await syncBatches(
      [toPayload(details)],
      DEVICE_ID,
      APP_VERSION,
    );
    return {
      ok: true,
      attempted: 1,
      inserted: response.inserted,
      skipped: response.skipped,
    };
  } catch {
    return null;
  }
}
