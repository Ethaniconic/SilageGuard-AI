/**
 * SILAGEGUARD AI — QR Payload Formatter & QR Matrix Generator
 * Generates compact, standard verification payloads for milk federations & dairy co-operatives.
 */

export interface QRPayloadParams {
  batchId: string;
  decision: string;
  mssiScore: number;
  ph: number;
  moisture: number;
  temp: number;
  cropType: string;
  timestamp: string;
}

export function generateSilageQRPayload(params: QRPayloadParams): string {
  const parts = [
    "SILAGEGUARD-SIH26111",
    params.batchId,
    params.decision,
    `MSSI:${params.mssiScore}`,
    `PH:${params.ph.toFixed(2)}`,
    `M:${params.moisture.toFixed(1)}%`,
    `T:${params.temp.toFixed(1)}C`,
    `CROP:${encodeURIComponent(params.cropType)}`,
    `TIME:${new Date(params.timestamp).getTime()}`
  ];
  return parts.join("|");
}

export function parseSilageQRPayload(qrString: string) {
  const tokens = qrString.split("|");
  if (tokens[0] !== "SILAGEGUARD-SIH26111" || tokens.length < 8) {
    return null;
  }
  return {
    system: tokens[0],
    batchId: tokens[1],
    decision: tokens[2],
    mssiScore: tokens[3].replace("MSSI:", ""),
    ph: tokens[4].replace("PH:", ""),
    moisture: tokens[5].replace("M:", ""),
    temp: tokens[6].replace("T:", ""),
    cropType: decodeURIComponent(tokens[7].replace("CROP:", ""))
  };
}
