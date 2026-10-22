// SILAGEGUARD AI — Native Mobile & Web BLE Hardware Manager
// Exclusively connects to real physical ESP32 sensor probe modules.
// Uses react-native-ble-plx for 100% offline Native Android/iOS Bluetooth,
// and gracefully falls back to Web Bluetooth API when running in desktop/mobile browsers.

import { Platform } from "react-native";
import { BLE_CONFIG } from "./bleConstants";
import { TelemetryParser } from "./bleParser";
import { requestNativeBlePermissions } from "./nativeBlePermissions";

// Guarded import of react-native-ble-plx for native platforms
let NativeBleManager = null;
if (Platform.OS !== "web") {
  try {
    NativeBleManager = require("react-native-ble-plx").BleManager;
  } catch (err) {
    console.warn("[BLE] Notice: Native react-native-ble-plx module not loaded in current environment:", err.message);
  }
}

/**
 * Universal base64 to UTF-8 string decoder for characteristic notification packets
 */
function decodeBase64ToUtf8(base64Str) {
  if (!base64Str) return "";
  try {
    if (typeof atob !== "undefined") {
      const binaryStr = atob(base64Str);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }
  } catch {}

  // Pure JavaScript UTF-8 Base64 decoder fallback
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  const clean = String(base64Str).replace(/[^A-Za-z0-9+/=]/g, "");
  while (i < clean.length) {
    const enc1 = chars.indexOf(clean.charAt(i++));
    const enc2 = chars.indexOf(clean.charAt(i++));
    const enc3 = chars.indexOf(clean.charAt(i++));
    const enc4 = chars.indexOf(clean.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64 && enc3 !== -1 && i <= clean.length) {
      output += String.fromCharCode(chr2);
    }
    if (enc4 !== 64 && enc4 !== -1 && i <= clean.length) {
      output += String.fromCharCode(chr3);
    }
  }

  try {
    return decodeURIComponent(escape(output));
  } catch {
    return output;
  }
}

class BleHardwareManager {
  constructor() {
    this.isConnected = false;
    this.isScanning = false;
    this.device = null;
    this.characteristic = null;
    this.listeners = new Set();
    this.staleChecker = null;
    this.nativeManager = null;
    this.subscription = null;
    this.scanTimeout = null;

    if (NativeBleManager && Platform.OS !== "web") {
      try {
        this.nativeManager = new NativeBleManager();
      } catch (e) {
        console.warn("[BLE] Could not initialize native BleManager instance:", e.message);
      }
    }
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
        console.warn("[BLE] Listener error:", err.message);
      }
    }
  }

  /**
   * Scans and connects to the physical SilageGuard ESP32 probe.
   * Uses Native OS Bluetooth on mobile devices, or Web Bluetooth in browsers.
   */
  async connect() {
    if (this.isConnected) {
      return { success: true, deviceName: this.device?.name || BLE_CONFIG.DEVICE_NAME };
    }

    this.isScanning = true;
    this.notifyListeners({ type: "SCANNING" });

    // ─────────────────────────────────────────────────────────────
    // PATH 1: NATIVE MOBILE BLUETOOTH (ANDROID & iOS)
    // ─────────────────────────────────────────────────────────────
    if (Platform.OS !== "web" && this.nativeManager) {
      return await this._connectNativeMobile();
    }

    // ─────────────────────────────────────────────────────────────
    // PATH 2: WEB BLUETOOTH API (CHROME / EDGE BROWSER FALLBACK)
    // ─────────────────────────────────────────────────────────────
    if (typeof navigator !== "undefined" && navigator.bluetooth) {
      return await this._connectWebBluetooth();
    }

    this.isScanning = false;
    const msg = "Native Bluetooth hardware is unavailable on this device. Please ensure Bluetooth is enabled in device settings.";
    this.notifyListeners({ type: "ERROR", error: msg });
    return { success: false, error: msg };
  }

  /**
   * Native Mobile BLE implementation via react-native-ble-plx
   */
  async _connectNativeMobile() {
    try {
      // 1. Request native runtime permissions (Android 12+ scan/connect, location)
      const hasPerms = await requestNativeBlePermissions();
      if (!hasPerms) {
        throw new Error("Bluetooth permissions were denied. Please grant Bluetooth and Location permissions in system settings.");
      }

      // 2. Verify OS Bluetooth state is PoweredOn
      const state = await this.nativeManager.state();
      if (state !== "PoweredOn") {
        throw new Error(`Bluetooth adapter is currently "${state}". Please turn on Bluetooth in device settings.`);
      }

      console.log(`[Native BLE] Starting scan for SilageGuard ESP32 Probe (Service UUID: ${BLE_CONFIG.SERVICE_UUID})...`);

      return await new Promise((resolve) => {
        let isResolved = false;

        // Auto-abort scan after 15 seconds if probe is not detected
        this.scanTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            this.nativeManager.stopDeviceScan();
            this.isScanning = false;
            const err = "Scan timed out. Probe not detected. Please verify ESP32 is powered on and within range.";
            this.notifyListeners({ type: "ERROR", error: err });
            resolve({ success: false, error: err });
          }
        }, 15000);

        this.nativeManager.startDeviceScan(
          null, // Scan all advertising packets to catch custom ESP32 advertisements
          { allowDuplicates: false },
          async (error, scannedDevice) => {
            if (error) {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(this.scanTimeout);
                this.nativeManager.stopDeviceScan();
                this.isScanning = false;
                this.notifyListeners({ type: "ERROR", error: error.message });
                resolve({ success: false, error: error.message });
              }
              return;
            }

            if (!scannedDevice) return;

            const name = scannedDevice.name || scannedDevice.localName || "";
            const serviceUUIDs = scannedDevice.serviceUUIDs || [];
            const matchesService = serviceUUIDs.some(
              (u) => u.toLowerCase() === BLE_CONFIG.SERVICE_UUID.toLowerCase()
            );
            const matchesName =
              name === BLE_CONFIG.DEVICE_NAME ||
              name.startsWith("Silage") ||
              name.startsWith("ESP32");

            if (matchesService || matchesName) {
              console.log(`[Native BLE] Found candidate probe "${name}" (${scannedDevice.id}). Connecting...`);
              if (isResolved) return;
              isResolved = true;
              clearTimeout(this.scanTimeout);
              this.nativeManager.stopDeviceScan();

              try {
                // Connect to the ESP32 probe
                const connectedDevice = await scannedDevice.connect({ timeout: 8000 });
                console.log(`[Native BLE] Connected to ${name}. Discovering services & characteristics...`);

                // Discover GATT Services and Characteristics
                const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

                // Setup disconnection listener from hardware side
                discoveredDevice.onDisconnected(() => {
                  console.log("[Native BLE] ESP32 probe disconnected.");
                  this.disconnect();
                  this.notifyListeners({
                    type: "SIGNAL_LOST",
                    message: "ESP32 probe was turned off or moved out of range.",
                  });
                });

                // Monitor characteristic for real 1Hz telemetry packets
                this.subscription = discoveredDevice.monitorCharacteristicForService(
                  BLE_CONFIG.SERVICE_UUID,
                  BLE_CONFIG.CHARACTERISTIC_UUID,
                  (charErr, characteristic) => {
                    if (charErr) {
                      console.warn("[Native BLE] Characteristic monitor error:", charErr.message);
                      return;
                    }

                    if (characteristic && characteristic.value) {
                      const jsonStr = decodeBase64ToUtf8(characteristic.value);
                      const parsed = TelemetryParser.parse(jsonStr);

                      if (parsed.isValid) {
                        this.notifyListeners({
                          type: "TELEMETRY",
                          telemetry: parsed.telemetry,
                          timestamp: parsed.timestamp,
                        });
                      } else {
                        console.warn("[Native BLE] Telemetry validation rejected packet:", parsed.error);
                      }
                    }
                  }
                );

                this.isConnected = true;
                this.isScanning = false;
                this.device = discoveredDevice;
                this.startStaleWatchdog();

                console.log(`✓ [Native BLE] Successfully paired and streaming telemetry from ${name || BLE_CONFIG.DEVICE_NAME}`);
                this.notifyListeners({
                  type: "CONNECTED",
                  deviceName: name || BLE_CONFIG.DEVICE_NAME,
                });

                resolve({ success: true, deviceName: name || BLE_CONFIG.DEVICE_NAME });
              } catch (connectErr) {
                console.warn("[Native BLE] Connection failed:", connectErr.message);
                this.disconnect();
                this.notifyListeners({ type: "ERROR", error: connectErr.message });
                resolve({ success: false, error: connectErr.message });
              }
            }
          }
        );
      });
    } catch (err) {
      this.isScanning = false;
      this.isConnected = false;
      this.notifyListeners({ type: "ERROR", error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Browser Web Bluetooth fallback implementation (Chrome / Edge)
   */
  async _connectWebBluetooth() {
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
        if (filterErr.name === "NotFoundError" || (filterErr.message && filterErr.message.toLowerCase().includes("user cancelled"))) {
          throw filterErr;
        }
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [BLE_CONFIG.SERVICE_UUID],
        });
      }

      if (!device) {
        throw new Error("No Bluetooth device selected.");
      }

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);
      const char = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID);

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
        }
      });

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
    if (this.staleChecker) {
      clearInterval(this.staleChecker);
      this.staleChecker = null;
    }
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch {}
      this.subscription = null;
    }
    if (this.nativeManager) {
      try {
        this.nativeManager.stopDeviceScan();
        if (this.device && this.device.id) {
          this.nativeManager.cancelDeviceConnection(this.device.id);
        }
      } catch {}
    }
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch {}
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
