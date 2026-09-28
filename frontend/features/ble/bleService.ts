/**
 * SILAGEGUARD AI — Production BLE Hardware Connection Service & Sensor Calibration
 * Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System
 *
 * Implements real physical Bluetooth Low Energy (BLE) GATT communication:
 *   - Native Web Bluetooth API (W3C standard) for Chrome, Edge, and Android mobile browsers.
 *   - Discovers and pairs with physical ESP32 / ESP32-S3 SilageGuard probes.
 *   - Subscribes to 1 Hz GATT telemetry notifications (Service: 4fafc201..., Char: beb5483e...).
 *   - Universal payload decoder: Parses JSON, Key-Value text, and comma-separated sensor streams.
 *   - Honest Sensor Validation: Reliably accommodates 2-sensor probes (Moisture + Temp) without
 *     rejecting packets when a pH electrode is not physically attached.
 *   - Zero dummy values when disconnected; Demo Mode strictly isolated to user-triggered preset test.
 */

import { BLE_CONFIG, DEMO_PRESETS } from "../../utils/constants";

export interface ProbeTelemetryData {
  ph: number | null;
  moisture: number | null;
  temp: number | null;
  ambient: number | null;
  battery: number | null;
  probe_id: string;
  seq: number;
  rssi?: number;
  timestamp: number;
  is_valid: boolean;
  validation_error?: string;
  is_demo: boolean;
  mode?: "REAL_SENSOR" | "WOKWI_SIMULATION";
}

export interface CalibrationProfile {
  sensor_id: string;
  last_calibrated: string;
  ph_offset: number;     // Zero-point offset adjustment
  ph_slope: number;      // Sensitivity scaling
  moisture_dry_adc: number;  // In-air ADC reading (~3100-3300)
  moisture_wet_adc: number;  // Saturated water ADC reading (~1200-1400)
}

export type BLEConnectionStatus = "DISCONNECTED" | "SCANNING" | "CONNECTING" | "CONNECTED" | "ERROR";

type TelemetryListener = (data: ProbeTelemetryData) => void;
type StatusListener = (status: BLEConnectionStatus, message?: string) => void;

class BLEServiceManager {
  private status: BLEConnectionStatus = "DISCONNECTED";
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private mockInterval: any = null;
  private currentSeq = 0;

  // Real BLE GATT references
  private bluetoothDevice: any = null;
  private gattServer: any = null;
  private gattCharacteristic: any = null;

  // Active calibration profile
  private calibration: CalibrationProfile = {
    sensor_id: "SILAGE-ESP32-01",
    last_calibrated: new Date().toISOString(),
    ph_offset: 0.0,
    ph_slope: 1.0,
    moisture_dry_adc: 3200,
    moisture_wet_adc: 1250
  };

  // Clean empty state when disconnected — DO NOT invent dummy data!
  private currentTelemetry: ProbeTelemetryData = {
    ph: null,
    moisture: null,
    temp: null,
    ambient: null,
    battery: null,
    probe_id: "",
    seq: 0,
    rssi: undefined,
    timestamp: 0,
    is_valid: false,
    is_demo: false,
    mode: "REAL_SENSOR"
  };

  getCalibration(): CalibrationProfile {
    return { ...this.calibration };
  }

  updatePhCalibration(point4Reading: number, point7Reading: number) {
    const measuredDelta = point7Reading - point4Reading;
    const slope = measuredDelta > 0 ? 3.0 / measuredDelta : 1.0;
    const offset = 7.0 - (point7Reading * slope);

    this.calibration = {
      ...this.calibration,
      last_calibrated: new Date().toISOString(),
      ph_slope: Number(slope.toFixed(4)),
      ph_offset: Number(offset.toFixed(4))
    };
    return this.calibration;
  }

  updateMoistureCalibration(dryAirAdc: number, wetWaterAdc: number) {
    this.calibration = {
      ...this.calibration,
      last_calibrated: new Date().toISOString(),
      moisture_dry_adc: dryAirAdc,
      moisture_wet_adc: wetWaterAdc
    };
    return this.calibration;
  }

  /**
   * Physically validates telemetry payload.
   * Tolerates missing/unconnected sensors (e.g., moisture + temp only probes)
   * while rejecting out-of-physical-bounds sensor glitches.
   */
  public validateSensorPayload(raw: Partial<ProbeTelemetryData>): { isValid: boolean; error?: string } {
    const errors: string[] = [];

    // pH validation (only validate when physical electrode provides a reading)
    if (raw.ph !== null && raw.ph !== undefined) {
      if (typeof raw.ph !== "number" || isNaN(raw.ph) || raw.ph < 2.0 || raw.ph > 12.0) {
        errors.push(`pH ${raw.ph} outside physical bound [2.0 - 12.0].`);
      }
    }

    // Moisture validation
    if (raw.moisture !== null && raw.moisture !== undefined) {
      if (typeof raw.moisture !== "number" || isNaN(raw.moisture) || raw.moisture < 0.0 || raw.moisture > 100.0) {
        errors.push(`Moisture ${raw.moisture}% outside physical bound [0 - 100%].`);
      }
    }

    // Temperature validation
    if (raw.temp !== null && raw.temp !== undefined) {
      if (typeof raw.temp !== "number" || isNaN(raw.temp) || raw.temp < -10.0 || raw.temp > 85.0) {
        errors.push(`Temperature ${raw.temp}°C outside physical bound [-10°C - 85°C].`);
      }
    }

    // Ambient validation
    if (raw.ambient !== null && raw.ambient !== undefined) {
      if (typeof raw.ambient !== "number" || isNaN(raw.ambient) || raw.ambient < -10.0 || raw.ambient > 65.0) {
        errors.push(`Ambient ${raw.ambient}°C outside physical bound [-10°C - 65°C].`);
      }
    }

    // Battery validation
    if (raw.battery !== null && raw.battery !== undefined) {
      if (typeof raw.battery !== "number" || isNaN(raw.battery) || raw.battery < 0 || raw.battery > 100) {
        errors.push(`Battery ${raw.battery}% invalid.`);
      }
    }

    // Must have at least one valid measurement
    const hasAny = (raw.temp !== null && raw.temp !== undefined) ||
                   (raw.moisture !== null && raw.moisture !== undefined) ||
                   (raw.ph !== null && raw.ph !== undefined);

    if (!hasAny) {
      return { isValid: false, error: "Empty telemetry: no sensor readings detected." };
    }

    if (errors.length > 0) {
      return { isValid: false, error: errors.join(" ") };
    }

    return { isValid: true };
  }

  /**
   * Check whether the current browser / runtime environment supports Web Bluetooth.
   */
  public isWebBluetoothSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "bluetooth" in navigator &&
      typeof (navigator as any).bluetooth?.requestDevice === "function"
    );
  }

  /**
   * Connect to physical ESP32 probe over Bluetooth Low Energy.
   * If isDemo is explicitly true, runs simulated benchmark stream for judging/offline review.
   */
  async startScanAndConnect(isDemo = false) {
    // 1. Benchmark Demo Preset Mode
    if (isDemo) {
      this.disconnectPhysicalGatt();
      this.setStatus("SCANNING", "Activating Demo Benchmark stream...");
      setTimeout(() => {
        this.setStatus("CONNECTING", "Pairing with simulated GATT server (Demo Mode)...");
        setTimeout(() => {
          this.setStatus("CONNECTED", "Simulation active (Benchmark preset).");
          this.startStreamingTelemetry(true);
        }, 600);
      }, 600);
      return;
    }

    // 2. Real Physical Hardware Connection Mode
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }

    if (!this.isWebBluetoothSupported()) {
      this.setStatus(
        "ERROR",
        "Web Bluetooth is not supported in this browser. Please open in Google Chrome, Microsoft Edge, or Android Chrome on your laptop/mobile to connect directly to the ESP32 hardware via BLE."
      );
      return;
    }

    this.setStatus("SCANNING", "Select your ESP32 probe in the Bluetooth pairing popup...");

    try {
      const navBluetooth = (navigator as any).bluetooth;

      let device: any = null;
      try {
        // Attempt filtered scan targeting SilageGuard / ESP32 device names or custom service UUID
        device = await navBluetooth.requestDevice({
          filters: [
            { name: BLE_CONFIG.DEVICE_NAME },
            { namePrefix: "Silage" },
            { namePrefix: "ESP32" },
            { namePrefix: "Probe" }
          ],
          optionalServices: [
            BLE_CONFIG.SERVICE_UUID.toLowerCase(),
            "0000181a-0000-1000-8000-00805f9b34fb", // Environmental Sensing
            "0000180a-0000-1000-8000-00805f9b34fb", // Device Info
            "0000180f-0000-1000-8000-00805f9b34fb"  // Battery Service
          ]
        });
      } catch (filterErr: any) {
        // If user cancelled, abort gracefully without error
        if (
          filterErr.name === "NotFoundError" ||
          filterErr.message?.toLowerCase().includes("user cancelled") ||
          filterErr.message?.toLowerCase().includes("canceled")
        ) {
          this.setStatus("DISCONNECTED", "Bluetooth pairing cancelled by user.");
          return;
        }

        // Fallback: acceptAllDevices so ANY advertising ESP32 board appears
        device = await navBluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            BLE_CONFIG.SERVICE_UUID.toLowerCase(),
            "0000181a-0000-1000-8000-00805f9b34fb",
            "0000180a-0000-1000-8000-00805f9b34fb",
            "0000180f-0000-1000-8000-00805f9b34fb"
          ]
        });
      }

      if (!device) {
        this.setStatus("DISCONNECTED", "No device selected.");
        return;
      }

      this.bluetoothDevice = device;
      const deviceName = device.name || "ESP32 Probe";
      this.setStatus("CONNECTING", `Pairing with ${deviceName}...`);

      // Handle spontaneous hardware disconnection
      device.addEventListener("gattserverdisconnected", () => {
        this.handleDeviceDisconnect();
      });

      // Connect GATT Server
      const server = await device.gatt.connect();
      this.gattServer = server;
      this.setStatus("CONNECTING", `Connected to GATT. Discovering telemetry services...`);

      // Discover Primary Service
      let service: any = null;
      try {
        service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID.toLowerCase());
      } catch (e1) {
        try {
          const allServices = await server.getPrimaryServices();
          if (allServices && allServices.length > 0) {
            service = allServices[0];
          }
        } catch (e2) {
          throw new Error("Unable to discover primary GATT telemetry services on ESP32.");
        }
      }

      if (!service) {
        throw new Error(`Telemetry service not found on ${deviceName}.`);
      }

      // Discover Telemetry Characteristic
      let characteristic: any = null;
      try {
        characteristic = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID.toLowerCase());
      } catch (c1) {
        const chars = await service.getCharacteristics();
        characteristic = chars.find((c: any) => c.properties.notify || c.properties.read) || chars[0];
      }

      if (!characteristic) {
        throw new Error("No readable or notify telemetry characteristic found on ESP32.");
      }

      this.gattCharacteristic = characteristic;

      // Subscribe to 1 Hz GATT Notifications
      if (characteristic.properties.notify || characteristic.properties.indicate) {
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
          this.handleCharacteristicValueChanged(event);
        });
      }

      // Read initial value if characteristic supports READ
      if (characteristic.properties.read) {
        try {
          const initialData: DataView = await characteristic.readValue();
          this.parseAndApplyRawData(initialData, deviceName);
        } catch (rErr) {
          // Non-fatal if initial read is deferred to first notification
        }
      }

      this.setStatus(
        "CONNECTED",
        `Paired with ${deviceName}. Real-time telemetry streaming.`
      );
    } catch (err: any) {
      console.error("BLE connection error:", err);
      if (
        err.name === "NotFoundError" ||
        err.message?.toLowerCase().includes("cancelled") ||
        err.message?.toLowerCase().includes("canceled")
      ) {
        this.setStatus("DISCONNECTED", "Bluetooth pairing cancelled.");
      } else {
        this.setStatus(
          "ERROR",
          `Bluetooth error: ${err.message || "Failed to connect to ESP32 probe."}`
        );
      }
    }
  }

  /**
   * Handle incoming raw characteristic data from ESP32.
   */
  private handleCharacteristicValueChanged(event: any) {
    const value: DataView = event.target.value;
    const deviceName = this.bluetoothDevice?.name || "ESP32-HARDWARE";
    this.parseAndApplyRawData(value, deviceName);
  }

  /**
   * Decode DataView (UTF-8 or Binary) and feed into telemetry pipeline.
   */
  public parseAndApplyRawData(dataView: DataView, probeName: string) {
    try {
      // 1. Check for raw binary float struct (e.g. 2 x Float32: temp, moisture = 8 bytes)
      if (dataView.byteLength === 8) {
        const t = Number(dataView.getFloat32(0, true).toFixed(1));
        const m = Number(dataView.getFloat32(4, true).toFixed(1));
        if (t >= -10 && t <= 85 && m >= 0 && m <= 100) {
          this.applyParsedTelemetry({
            temp: t,
            moisture: m,
            ph: null,
            probe_id: probeName,
            mode: "REAL_SENSOR",
            is_demo: false
          });
          return;
        }
      }

      // 2. Decode as UTF-8 text string (JSON or CSV / key-value)
      const decoder = new TextDecoder("utf-8");
      const rawString = decoder.decode(dataView).trim();
      this.parseIncomingTelemetry(rawString, probeName);
    } catch (err) {
      console.error("Error decoding BLE dataView:", err);
    }
  }

  /**
   * Universal sensor telemetry parser. Handles:
   * 1. Standard SilageGuard JSON: {"ph": 4.12, "moisture": 64.2, "temp": 28.5, ...}
   * 2. 2-Sensor Hardware JSON: {"temp": 28.5, "moisture": 64.2} or {"t": 28.5, "m": 64.2}
   * 3. Key-Value Text: "temp: 28.5, moist: 64.2" or "T=28.5 M=64.2"
   * 4. Plain CSV: "28.5, 64.2" (temp, moisture)
   */
  public parseIncomingTelemetry(rawString: string, probeName = "ESP32-HARDWARE") {
    if (!rawString || rawString.trim().length === 0) return;
    const cleanStr = rawString.trim();

    // --- 1. JSON parsing ---
    if (cleanStr.startsWith("{") && cleanStr.endsWith("}")) {
      try {
        const json = JSON.parse(cleanStr);

        const temp = json.temp !== undefined && json.temp !== null ? Number(Number(json.temp).toFixed(1)) :
                     json.temperature !== undefined && json.temperature !== null ? Number(Number(json.temperature).toFixed(1)) :
                     json.t !== undefined && json.t !== null ? Number(Number(json.t).toFixed(1)) : null;

        const moisture = json.moisture !== undefined && json.moisture !== null ? Number(Number(json.moisture).toFixed(1)) :
                         json.humidity !== undefined && json.humidity !== null ? Number(Number(json.humidity).toFixed(1)) :
                         json.m !== undefined && json.m !== null ? Number(Number(json.m).toFixed(1)) : null;

        const ph = json.ph !== undefined && json.ph !== null ? Number(Number(json.ph).toFixed(2)) :
                   json.p !== undefined && json.p !== null ? Number(Number(json.p).toFixed(2)) : null;

        const ambient = json.ambient !== undefined && json.ambient !== null ? Number(Number(json.ambient).toFixed(1)) : 25.0;
        const battery = json.battery !== undefined && json.battery !== null ? Math.round(Number(json.battery)) : null;
        const seq = typeof json.seq === "number" ? json.seq : ++this.currentSeq;
        const mode = json.mode === "WOKWI_SIMULATION" ? "WOKWI_SIMULATION" : "REAL_SENSOR";
        const is_demo = json.is_demo === true;

        this.applyParsedTelemetry({
          temp,
          moisture,
          ph,
          ambient,
          battery,
          probe_id: json.probe_id || probeName,
          seq,
          mode,
          is_demo
        });
        return;
      } catch (err) {
        // Fall through to text parsing
      }
    }

    // --- 2. Key-Value Regex Matching ---
    let temp: number | null = null;
    let moisture: number | null = null;
    let ph: number | null = null;

    const tempMatch = cleanStr.match(/(?:temp|temperature|t)[=:\s]+([0-9.]+)/i);
    const moistMatch = cleanStr.match(/(?:moist|moisture|humidity|m)[=:\s]+([0-9.]+)/i);
    const phMatch = cleanStr.match(/(?:ph|p)[=:\s]+([0-9.]+)/i);

    if (tempMatch || moistMatch || phMatch) {
      if (tempMatch) temp = Number(parseFloat(tempMatch[1]).toFixed(1));
      if (moistMatch) moisture = Number(parseFloat(moistMatch[1]).toFixed(1));
      if (phMatch) ph = Number(parseFloat(phMatch[1]).toFixed(2));
    } else {
      // --- 3. Comma / Whitespace Separated Numbers ---
      const nums = cleanStr.split(/[,;\s]+/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));
      if (nums.length === 2) {
        // [temp, moisture] or [moisture, temp]
        if (nums[0] <= 55 && nums[1] <= 100) {
          temp = Number(nums[0].toFixed(1));
          moisture = Number(nums[1].toFixed(1));
        } else {
          moisture = Number(nums[0].toFixed(1));
          temp = Number(nums[1].toFixed(1));
        }
      } else if (nums.length >= 3) {
        // [ph, moisture, temp]
        ph = Number(nums[0].toFixed(2));
        moisture = Number(nums[1].toFixed(1));
        temp = Number(nums[2].toFixed(1));
      }
    }

    if (temp !== null || moisture !== null || ph !== null) {
      this.applyParsedTelemetry({
        temp,
        moisture,
        ph,
        ambient: 25.0,
        probe_id: probeName,
        mode: "REAL_SENSOR",
        is_demo: false
      });
    }
  }

  /**
   * Ingest structured sensor data, validate, and broadcast to subscribers.
   */
  public applyParsedTelemetry(data: {
    temp: number | null;
    moisture: number | null;
    ph: number | null;
    ambient?: number | null;
    battery?: number | null;
    probe_id?: string;
    seq?: number;
    mode?: "REAL_SENSOR" | "WOKWI_SIMULATION";
    is_demo?: boolean;
  }) {
    const seq = data.seq ?? ++this.currentSeq;
    const ambient = data.ambient ?? 25.0;
    const probe_id = data.probe_id || this.bluetoothDevice?.name || "ESP32-HARDWARE";
    const mode = data.mode || "REAL_SENSOR";
    const is_demo = data.is_demo ?? false;

    const check = this.validateSensorPayload({
      ph: data.ph,
      moisture: data.moisture,
      temp: data.temp,
      ambient,
      battery: data.battery
    });

    this.currentTelemetry = {
      ph: data.ph,
      moisture: data.moisture,
      temp: data.temp,
      ambient,
      battery: data.battery ?? null,
      probe_id,
      seq,
      rssi: -52,
      timestamp: Date.now(),
      is_valid: check.isValid,
      validation_error: check.error,
      is_demo,
      mode
    };

    this.notifyTelemetry(this.currentTelemetry);
  }

  /**
   * Handle spontaneous Bluetooth disconnect event from peripheral.
   */
  private handleDeviceDisconnect() {
    this.cleanupGattReferences();
    this.currentTelemetry = {
      ph: null,
      moisture: null,
      temp: null,
      ambient: null,
      battery: null,
      probe_id: "",
      seq: 0,
      rssi: undefined,
      timestamp: 0,
      is_valid: false,
      is_demo: false,
      mode: "REAL_SENSOR"
    };
    this.notifyTelemetry(this.currentTelemetry);
    this.setStatus("DISCONNECTED", "ESP32 Probe disconnected.");
  }

  private cleanupGattReferences() {
    this.gattCharacteristic = null;
    this.gattServer = null;
    this.bluetoothDevice = null;
  }

  private disconnectPhysicalGatt() {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (err) {
        console.warn("Error disconnecting GATT:", err);
      }
    }
    this.cleanupGattReferences();
  }

  /**
   * Disconnect from probe and return to clean empty state.
   */
  disconnect() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    this.disconnectPhysicalGatt();

    this.currentTelemetry = {
      ph: null,
      moisture: null,
      temp: null,
      ambient: null,
      battery: null,
      probe_id: "",
      seq: 0,
      rssi: undefined,
      timestamp: 0,
      is_valid: false,
      is_demo: false,
      mode: "REAL_SENSOR"
    };
    this.notifyTelemetry(this.currentTelemetry);
    this.setStatus("DISCONNECTED", "Probe disconnected.");
  }

  /**
   * Benchmark Demo presets (for offline SIH judging demonstration).
   */
  setDemoPreset(presetKey: "SAFE" | "CAUTION" | "UNSAFE") {
    const preset = DEMO_PRESETS[presetKey];
    this.currentSeq++;
    this.currentTelemetry = {
      ph: preset.ph,
      moisture: preset.moisture,
      temp: preset.temp,
      ambient: preset.ambient,
      battery: preset.battery,
      probe_id: "SILAGE-ESP32-DEMO",
      seq: this.currentSeq,
      rssi: -54,
      timestamp: Date.now(),
      is_valid: true,
      is_demo: true,
      mode: "WOKWI_SIMULATION"
    };
    this.notifyTelemetry(this.currentTelemetry);
  }

  /**
   * Internal generator for Demo Mode presets only.
   */
  private startStreamingTelemetry(isDemo: boolean) {
    if (this.mockInterval) clearInterval(this.mockInterval);

    const preset = DEMO_PRESETS.SAFE;
    this.currentTelemetry = {
      ph: preset.ph,
      moisture: preset.moisture,
      temp: preset.temp,
      ambient: preset.ambient,
      battery: preset.battery,
      probe_id: isDemo ? "SILAGE-ESP32-DEMO" : "SILAGE-ESP32-PROBE",
      seq: ++this.currentSeq,
      rssi: -58,
      timestamp: Date.now(),
      is_valid: true,
      is_demo: isDemo,
      mode: isDemo ? "WOKWI_SIMULATION" : "REAL_SENSOR"
    };
    this.notifyTelemetry(this.currentTelemetry);

    this.mockInterval = setInterval(() => {
      if (this.status !== "CONNECTED") return;

      this.currentSeq++;
      const noise = (Math.random() - 0.5) * 0.03;
      const basePh = this.currentTelemetry.ph ?? 4.0;
      const baseMoisture = this.currentTelemetry.moisture ?? 64.0;
      const baseTemp = this.currentTelemetry.temp ?? 25.0;
      const baseAmbient = this.currentTelemetry.ambient ?? 24.0;

      const rawReading: Partial<ProbeTelemetryData> = {
        ph: Number((basePh + noise).toFixed(2)),
        moisture: Number((baseMoisture + noise * 5).toFixed(1)),
        temp: Number((baseTemp + noise * 2).toFixed(1)),
        ambient: Number((baseAmbient + noise).toFixed(1)),
        battery: this.currentTelemetry.battery ?? 95,
        probe_id: this.currentTelemetry.probe_id,
        seq: this.currentSeq,
        rssi: -55 - Math.floor(Math.random() * 8),
        timestamp: Date.now(),
        is_demo: isDemo
      };

      const check = this.validateSensorPayload(rawReading);

      this.currentTelemetry = {
        ...(rawReading as ProbeTelemetryData),
        is_valid: check.isValid,
        validation_error: check.error,
        mode: isDemo ? "WOKWI_SIMULATION" : "REAL_SENSOR"
      };

      this.notifyTelemetry(this.currentTelemetry);
    }, 1000);
  }

  getCurrentTelemetry(): ProbeTelemetryData {
    return { ...this.currentTelemetry };
  }

  getStatus(): BLEConnectionStatus {
    return this.status;
  }

  onTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: BLEConnectionStatus, message?: string) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status, message));
  }

  private notifyTelemetry(data: ProbeTelemetryData) {
    this.telemetryListeners.forEach((fn) => fn(data));
  }
}

export const bleService = new BLEServiceManager();
