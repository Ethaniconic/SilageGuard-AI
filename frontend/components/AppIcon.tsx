/**
 * SILAGEGUARD AI — Industry-Grade Vector Icon Library
 * Powered by React Lucide Icons (lucide-react-native)
 * Pixel-perfect, high-definition SVG icons with zero font dependencies.
 * Guaranteed 100% offline rendering on all Android, iOS, and Web environments.
 */

import React from "react";
import {
  Camera,
  ScanLine,
  SlidersHorizontal,
  Bluetooth,
  BluetoothConnected,
  Battery,
  BatteryCharging,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  CloudOff,
  History,
  Settings,
  Image as ImageIcon,
  FlaskConical,
  RotateCcw,
  Search,
  X,
  TestTube2,
  Droplets,
  Thermometer,
  TrendingUp,
  Shield,
  Volume2,
  QrCode,
  Share2,
  Trash2,
  Sprout,
  Home,
  BarChart3,
  Info,
  HelpCircle,
  FileText,
  Sliders,
  Layers,
  Zap,
} from "lucide-react-native";

export type IconName =
  | "camera"
  | "scan"
  | "probe"
  | "bluetooth"
  | "bluetooth-connected"
  | "battery"
  | "battery-charging"
  | "sun"
  | "moon"
  | "arrow-back"
  | "arrow-forward"
  | "chevron-down"
  | "chevron-up"
  | "check"
  | "check-circle"
  | "alert"
  | "alert-triangle"
  | "activity"
  | "cloud-offline"
  | "history"
  | "settings"
  | "gallery"
  | "flask"
  | "refresh"
  | "search"
  | "close"
  | "ph"
  | "water"
  | "thermometer"
  | "trending-up"
  | "shield"
  | "volume"
  | "qr-code"
  | "share"
  | "trash"
  | "leaf"
  | "home"
  | "analytics"
  | "info"
  | "help"
  | "file"
  | "sliders"
  | "layers"
  | "flash";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const AppIcon: React.FC<Props> = ({
  name,
  size = 20,
  color = "#F8FAFC",
  strokeWidth = 2,
}) => {
  switch (name) {
    case "camera":
      return <Camera size={size} color={color} strokeWidth={strokeWidth} />;
    case "scan":
      return <ScanLine size={size} color={color} strokeWidth={strokeWidth} />;
    case "probe":
      return <SlidersHorizontal size={size} color={color} strokeWidth={strokeWidth} />;
    case "bluetooth":
      return <Bluetooth size={size} color={color} strokeWidth={strokeWidth} />;
    case "bluetooth-connected":
      return <BluetoothConnected size={size} color={color} strokeWidth={strokeWidth} />;
    case "battery":
      return <Battery size={size} color={color} strokeWidth={strokeWidth} />;
    case "battery-charging":
      return <BatteryCharging size={size} color={color} strokeWidth={strokeWidth} />;
    case "sun":
      return <Sun size={size} color={color} strokeWidth={strokeWidth} />;
    case "moon":
      return <Moon size={size} color={color} strokeWidth={strokeWidth} />;
    case "arrow-back":
      return <ArrowLeft size={size} color={color} strokeWidth={strokeWidth} />;
    case "arrow-forward":
      return <ArrowRight size={size} color={color} strokeWidth={strokeWidth} />;
    case "chevron-down":
      return <ChevronDown size={size} color={color} strokeWidth={strokeWidth} />;
    case "chevron-up":
      return <ChevronUp size={size} color={color} strokeWidth={strokeWidth} />;
    case "check":
      return <Check size={size} color={color} strokeWidth={strokeWidth} />;
    case "check-circle":
      return <CheckCircle2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "alert":
    case "alert-triangle":
      return <AlertTriangle size={size} color={color} strokeWidth={strokeWidth} />;
    case "activity":
      return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
    case "cloud-offline":
      return <CloudOff size={size} color={color} strokeWidth={strokeWidth} />;
    case "history":
      return <History size={size} color={color} strokeWidth={strokeWidth} />;
    case "settings":
      return <Settings size={size} color={color} strokeWidth={strokeWidth} />;
    case "gallery":
      return <ImageIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case "flask":
      return <FlaskConical size={size} color={color} strokeWidth={strokeWidth} />;
    case "refresh":
      return <RotateCcw size={size} color={color} strokeWidth={strokeWidth} />;
    case "search":
      return <Search size={size} color={color} strokeWidth={strokeWidth} />;
    case "close":
      return <X size={size} color={color} strokeWidth={strokeWidth} />;
    case "ph":
      return <TestTube2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "water":
      return <Droplets size={size} color={color} strokeWidth={strokeWidth} />;
    case "thermometer":
      return <Thermometer size={size} color={color} strokeWidth={strokeWidth} />;
    case "trending-up":
      return <TrendingUp size={size} color={color} strokeWidth={strokeWidth} />;
    case "shield":
      return <Shield size={size} color={color} strokeWidth={strokeWidth} />;
    case "volume":
      return <Volume2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "qr-code":
      return <QrCode size={size} color={color} strokeWidth={strokeWidth} />;
    case "share":
      return <Share2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "trash":
      return <Trash2 size={size} color={color} strokeWidth={strokeWidth} />;
    case "leaf":
      return <Sprout size={size} color={color} strokeWidth={strokeWidth} />;
    case "home":
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case "analytics":
      return <BarChart3 size={size} color={color} strokeWidth={strokeWidth} />;
    case "info":
      return <Info size={size} color={color} strokeWidth={strokeWidth} />;
    case "help":
      return <HelpCircle size={size} color={color} strokeWidth={strokeWidth} />;
    case "file":
      return <FileText size={size} color={color} strokeWidth={strokeWidth} />;
    case "sliders":
      return <Sliders size={size} color={color} strokeWidth={strokeWidth} />;
    case "layers":
      return <Layers size={size} color={color} strokeWidth={strokeWidth} />;
    case "flash":
      return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
  }
};
