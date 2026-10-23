import { Platform, PermissionsAndroid } from "react-native";

/**
 * Requests native Bluetooth and Location permissions required by Android OS for BLE scanning.
 * Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT.
 * Android 11 and lower requires ACCESS_FINE_LOCATION.
 */
export async function requestNativeBlePermissions() {
  if (Platform.OS !== "android") {
    return true; // iOS and web permissions are handled by OS dialogs
  }

  try {
    const apiLevel = Platform.Version;

    if (apiLevel >= 31) {
      // Android 12+ permissions
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const isScanGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const isConnectGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      const isLocationGranted =
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

      return isScanGranted && isConnectGranted;
    } else {
      // Android 11 and lower permissions
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "SilageGuard Location Permission",
          message: "Bluetooth Low Energy scanning requires location access on your Android version to detect nearby sensor probes.",
          buttonPositive: "Grant Permission",
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn("[BLE Permissions] Error requesting native BLE permissions:", err.message);
    return false;
  }
}
