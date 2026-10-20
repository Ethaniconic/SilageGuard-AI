// SILAGEGUARD AI — Real Physical ESP32 Hardware Manager
// Exclusively connects to real physical ESP32 sensor probe modules.
// ZERO simulated devices. ZERO artificial telemetry loops.

import { Platform } from "react-native";
import { BLE_CONFIG } from "./bleConstants";
import { TelemetryParser } from "./bleParser";

class BleHardwareManager {
  constructor() {
    this.isConnected = false;
    this.isScanning = false;
    this.device = null;
    this.characteristic = null;
    this.networkPollInterval = null;
    this.listeners = new Set();
    this.staleChecker = null;
  }

  /**
   * Subscribe to live validated telemetry events
   */
  onTelemetry(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch (err) {
        console.warn("BLE listener error:", err.message);
      }
    }
  }

  /**
   * Scans and connects ONLY to a real physical SilageGuard ESP32 probe via Web Bluetooth GATT
   */
  async connect() {
    this.isScanning = true;
    this.notifyListeners({ type: "SCANNING" });

    // Physical Web Bluetooth API (Chrome, Edge, Android Chrome, and mobile browsers)
    if (typeof navigator !== "undefined" && navigator.bluetooth) {
      try {
        let device = null;
        try {
          device = await navigator.bluetooth.requestDevice({
            filters: [
              { name: BLE_CONFIG.DEVICE_NAME },
              { namePrefix: "Silage" },
              { namePrefix: "ESP32" },
              { services: [BLE_CONFIG.SERVICE_UUID] },
            ],
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
          });
        } catch (filterErr) {
          // If the user cancelled the dialog, propagate cancellation
          if (filterErr.name === "NotFoundError" || (filterErr.message && filterErr.message.toLowerCase().includes("user cancelled"))) {
            throw filterErr;
          }
          // If name filter didn't match, fall back to open chooser but enforce strict GATT verification below
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
          });
        }

        if (!device) {
          throw new Error("No Bluetooth device selected.");
        }

        const server = await device.gatt.connect();

        // STRICT HARDWARE VERIFICATION: Must implement the SilageGuard Service UUID
        let service;
        try {
          service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);
        } catch (e) {
          if (device.gatt && device.gatt.connected) device.gatt.disconnect();
          throw new Error(
            `Device "${device.name || "Unknown"}" is not a SilageGuard ESP32 probe (missing service ${BLE_CONFIG.SERVICE_UUID}). Only real flashed ESP32 modules can connect.`
          );
        }

        // STRICT HARDWARE VERIFICATION: Must implement the SilageGuard Characteristic UUID
        let char;
        try {
          char = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID);
        } catch (e) {
          if (device.gatt && device.gatt.connected) device.gatt.disconnect();
          throw new Error(
            `Device "${device.name || "Unknown"}" lacks SilageGuard telemetry characteristic (${BLE_CONFIG.CHARACTERISTIC_UUID}). Connection rejected.`
          );
        }

        await char.startNotifications();
        char.addEventListener("characteristicvaluechanged", (event) => {
          const value = event.target.value;
          const decoder = new TextDecoder("utf-8");
          const jsonStr = decoder.decode(value);
          const parsed = TelemetryParser.parse(jsonStr);

          if (parsed.isValid) {
            this.notifyListeners({
              type: "TELEMETRY",
              telemetry: parsed.telemetry,
              timestamp: parsed.timestamp,
            });
          } else {
            console.warn("[ESP32 BLE] Telemetry validation rejected packet:", parsed.error);
          }
        });

        // Handle physical disconnect from ESP32 side
        device.addEventListener("gattserverdisconnected", () => {
          this.disconnect();
          this.notifyListeners({
            type: "SIGNAL_LOST",
            message: "ESP32 probe was turned off or moved out of range.",
          });
        });

        this.isConnected = true;
        this.isScanning = false;
        this.device = device;
        this.characteristic = char;

        this.startStaleWatchdog();
        this.notifyListeners({ type: "CONNECTED", deviceName: device.name || BLE_CONFIG.DEVICE_NAME });
        return { success: true, deviceName: device.name || BLE_CONFIG.DEVICE_NAME };
      } catch (err) {
        this.isScanning = false;
        this.isConnected = false;
        this.notifyListeners({ type: "ERROR", error: err.message });
        return { success: false, error: err.message };
      }
    }

    this.isScanning = false;
    const msg = "Bluetooth scanning requires Web Bluetooth support in your browser (Chrome / Edge or Android Chrome) or native BLE permissions.";
    this.notifyListeners({ type: "ERROR", error: msg });
    return { success: false, error: msg };
  }

  startStaleWatchdog() {
    if (this.staleChecker) clearInterval(this.staleChecker);
    this.staleChecker = setInterval(() => {
      if (this.isConnected && TelemetryParser.isStale(BLE_CONFIG.STALE_TIMEOUT_MS)) {
        this.notifyListeners({
          type: "SIGNAL_LOST",
          message: "Probe signal lost. No telemetry received for > 3.5s.",
        });
      }
    }, 1500);
  }

  disconnect() {
    if (this.staleChecker) clearInterval(this.staleChecker);
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {}
    }
    this.isConnected = false;
    this.isScanning = false;
    this.device = null;
    this.characteristic = null;
    TelemetryParser.reset();
    this.notifyListeners({ type: "DISCONNECTED" });
  }
}

export const bleManager = new BleHardwareManager();
