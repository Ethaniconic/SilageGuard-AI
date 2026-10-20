// SILAGEGUARD AI — BLE Hardware Constants
// Matches hardware/esp32_sensor_probe/esp32_sensor_probe.ino exactly

export const BLE_CONFIG = {
  DEVICE_NAME: "SilageGuard-Probe",
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  STREAM_RATE_HZ: 1.0,
  STALE_TIMEOUT_MS: 3500, // If no packet received within 3.5s, signal is declared lost
  STABILIZATION_WINDOW_SECS: 3, // Required consecutive stable readings
};
