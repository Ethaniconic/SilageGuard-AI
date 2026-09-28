/**
 * SILAGEGUARD AI V4 — Production BLE Hardware Connection Service & Calibration
 * Complete rewrite for ESP32-S3 and physical probe hardware.
 * Re-exports the production BLE engine for clean architectural imports.
 */

export * from "../../features/ble/bleService";
import { bleService } from "../../features/ble/bleService";
export default bleService;
