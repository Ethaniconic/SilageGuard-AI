/**
 * TypeScript definitions for Lucide React Native icons
 */

declare module "lucide-react-native" {
  import React from "react";
  import { SvgProps } from "react-native-svg";

  export interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type LucideIcon = React.FC<LucideProps>;

  export const Camera: LucideIcon;
  export const Scan: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Activity: LucideIcon;
  export const Bluetooth: LucideIcon;
  export const BluetoothConnected: LucideIcon;
  export const Battery: LucideIcon;
  export const BatteryCharging: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CloudOff: LucideIcon;
  export const History: LucideIcon;
  export const Settings: LucideIcon;
  export const Image: LucideIcon;
  export const FlaskConical: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Search: LucideIcon;
  export const X: LucideIcon;
  export const Droplets: LucideIcon;
  export const TestTube2: LucideIcon;
  export const Thermometer: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Shield: LucideIcon;
  export const Volume2: LucideIcon;
  export const QrCode: LucideIcon;
  export const Share2: LucideIcon;
  export const Trash2: LucideIcon;
  export const Sprout: LucideIcon;
  export const Home: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Info: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const FileText: LucideIcon;
  export const Sliders: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Layers: LucideIcon;
  export const Zap: LucideIcon;
}
