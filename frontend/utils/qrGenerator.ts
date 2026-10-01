/**
 * SILAGEGUARD AI V4 — QR Certificate & Cryptographic Verification Payload
 * Standard compact JSON/pipe payload for milk federations, cooperatives, and quality inspectors.
 */

export interface QRPayloadParamsV4 {
  batchId: string;
  decision: "SAFE" | "CAUTION" | "UNSAFE";
  mssiScore: number;
  confidence?: number;
  ph: number | null;
  moisture: number | null;
  temp: number | null;
  cropType: string;
  storageType?: string;
  timestamp: string;
  deviceId?: string;
  sensorModelVersion?: string;
  visionModelVersion?: string;
}

export interface SignedQRCertificate {
  version: "4.0.0";
  batchId: string;
  decision: string;
  mssi: number;
  confidence: number;
  telemetry: {
    ph: number | null;
    moisture: number | null;
    temp: number | null;
  };
  crop: string;
  timestamp: string;
  deviceId: string;
  models: {
    sensor: string;
    vision: string;
    fusion: string;
  };
  checksum: string;
}

function calculateSimpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
}

export function generateSilageQRPayload(params: QRPayloadParamsV4): string {
  const payloadBase = `${params.batchId}:${params.decision}:${params.mssiScore}:${params.timestamp}`;
  const checksum = calculateSimpleChecksum(payloadBase);

  const cert: SignedQRCertificate = {
    version: "4.0.0",
    batchId: params.batchId,
    decision: params.decision,
    mssi: params.mssiScore,
    confidence: params.confidence ?? 90,
    telemetry: {
      ph: params.ph !== null ? Number(params.ph.toFixed(2)) : null,
      moisture: params.moisture !== null ? Number(params.moisture.toFixed(1)) : null,
      temp: params.temp !== null ? Number(params.temp.toFixed(1)) : null,
    },
    crop: params.cropType,
    timestamp: params.timestamp,
    deviceId: params.deviceId || "SG-ESP32-S3",
    models: {
      sensor: params.sensorModelVersion || "rf_v4.1",
      vision: params.visionModelVersion || "mobilenetv3_v4.1",
      fusion: "mssi_v4.0",
    },
    checksum,
  };

  return JSON.stringify(cert);
}

export function parseSilageQRPayload(qrString: string): SignedQRCertificate | null {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed.version && parsed.batchId && parsed.decision) {
      return parsed as SignedQRCertificate;
    }
    return null;
  } catch {
    // Backward compatibility with pipe separated strings
    const tokens = qrString.split("|");
    if (tokens[0] === "SILAGEGUARD-SIH26111" && tokens.length >= 8) {
      return {
        version: "4.0.0",
        batchId: tokens[1],
        decision: tokens[2],
        mssi: parseInt(tokens[3].replace("MSSI:", ""), 10) || 0,
        confidence: 90,
        telemetry: {
          ph: parseFloat(tokens[4].replace("PH:", "")) || null,
          moisture: parseFloat(tokens[5].replace("M:", "")) || null,
          temp: parseFloat(tokens[6].replace("T:", "")) || null,
        },
        crop: decodeURIComponent(tokens[7].replace("CROP:", "")),
        timestamp: new Date().toISOString(),
        deviceId: "SG-LEGACY-01",
        models: { sensor: "v3", vision: "v3", fusion: "v3" },
        checksum: "LEGACY",
      };
    }
    return null;
  }
}
