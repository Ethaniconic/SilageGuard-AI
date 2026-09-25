/**
 * SILAGEGUARD AI — useSensorStream Custom Hook
 * Provides reactive access to real-time ESP32-S3 probe sensor updates.
 */

import { useEffect, useState } from "react";
import { bleService, ProbeTelemetryData, BLEConnectionStatus } from "../features/ble/bleService";
import { useAppStore } from "../features/ble/bleManager";

export function useSensorStream() {
  const { bleStatus, telemetry } = useAppStore();
  const [stream, setStream] = useState<ProbeTelemetryData>(telemetry);
  const [status, setStatus] = useState<BLEConnectionStatus>(bleStatus);

  useEffect(() => {
    const unsubTelemetry = bleService.onTelemetry((data) => {
      setStream(data);
    });

    const unsubStatus = bleService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, []);

  return {
    stream,
    status,
    isConnected: status === "CONNECTED",
    connect: () => bleService.startScanAndConnect(true),
    disconnect: () => bleService.disconnect()
  };
}
