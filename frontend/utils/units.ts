/**
 * SILAGEGUARD AI — Agronomic Unit Conversion & Formatting Utilities
 */

export function formatPh(ph: number): string {
  return ph.toFixed(2);
}

export function formatMoisture(moisture: number): string {
  return `${moisture.toFixed(1)}%`;
}

export function formatTemperature(tempC: number): string {
  return `${tempC.toFixed(1)}°C`;
}

export function calculateDryMatter(moisture: number): number {
  return Number((100.0 - moisture).toFixed(1));
}

export function getAgronomicStatusColor(status: "safe" | "caution" | "unsafe"): string {
  switch (status) {
    case "safe":
      return "#10B981";
    case "caution":
      return "#F59E0B";
    case "unsafe":
      return "#EF4444";
  }
}
