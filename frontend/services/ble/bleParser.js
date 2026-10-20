// SILAGEGUARD AI — BLE Packet Telemetry Parser & Validator
// Enforces strict data types, numeric ranges, packet age, and duplicate detection

export class TelemetryParser {
  static lastSequence = -1;
  static lastReceivedTimestamp = 0;

  /**
   * Parses raw string/JSON buffer from ESP32 characteristic
   */
  static parse(rawString) {
    if (!rawString || typeof rawString !== "string") {
      return { isValid: false, error: "Empty or invalid raw packet payload" };
    }

    try {
      const data = JSON.parse(rawString.trim());
      const now = Date.now();

      // Required fields from ESP32 firmware
      if (data.seq === undefined || data.temp === undefined || data.moisture === undefined) {
        return { isValid: false, error: "Missing required telemetry fields (seq, temp, moisture)" };
      }

      const seq = Number(data.seq);
      const coreTemp = Number(data.temp);
      const moisture = Number(data.moisture);
      const ambient = data.ambient !== undefined && data.ambient !== null ? Number(data.ambient) : 25.0;
      const ph = data.ph !== undefined && data.ph !== null ? Number(data.ph) : null;
      const probeId = data.probe_id || "SILAGE-ESP32-PROBE";

      // Physical Realism Validation
      if (isNaN(coreTemp) || coreTemp < -10.0 || coreTemp > 75.0) {
        return { isValid: false, error: `Unrealistic temperature reading: ${coreTemp}°C` };
      }
      if (isNaN(moisture) || moisture < 0.0 || moisture > 100.0) {
        return { isValid: false, error: `Moisture percentage out of physical bounds: ${moisture}%` };
      }
      if (ph !== null && (isNaN(ph) || ph < 1.0 || ph > 14.0)) {
        return { isValid: false, error: `pH value out of chemical bounds: ${ph}` };
      }

      // Stale or duplicate packet detection
      const isDuplicate = seq === this.lastSequence;
      this.lastSequence = seq;
      this.lastReceivedTimestamp = now;

      return {
        isValid: true,
        isDuplicate,
        timestamp: now,
        telemetry: {
          seq,
          coreTemp: Math.round(coreTemp * 10) / 10,
          moisture: Math.round(moisture * 10) / 10,
          ambient: Math.round(ambient * 10) / 10,
          deltaTemp: Math.round((coreTemp - ambient) * 10) / 10,
          ph: ph !== null ? Math.round(ph * 100) / 100 : null,
          probeId,
          battery: data.battery !== undefined && data.battery !== null ? Number(data.battery) : null,
          mode: data.mode || "REAL_SENSOR",
          isValid: true,
        },
      };
    } catch (err) {
      return { isValid: false, error: `Malformed JSON from probe: ${err.message}` };
    }
  }

  /**
   * Checks if signal is stale (packet timeout)
   */
  static isStale(timeoutMs = 3500) {
    if (this.lastReceivedTimestamp === 0) return true;
    return Date.now() - this.lastReceivedTimestamp > timeoutMs;
  }

  static reset() {
    this.lastSequence = -1;
    this.lastReceivedTimestamp = 0;
  }
}
