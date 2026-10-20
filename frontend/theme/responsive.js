// SILAGEGUARD AI — Device Dimension & Breakpoint Scaling Engine
// Dynamically optimizes layouts across small (360x800), standard (390x844), and large (412x915+) devices

import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base guide dimensions (standard 375x812 mobile frame)
const baseWidth = 375;
const baseHeight = 812;

export const scaleWidth = (size) => Math.round((SCREEN_WIDTH / baseWidth) * size);
export const scaleHeight = (size) => Math.round((SCREEN_HEIGHT / baseHeight) * size);
export const moderateScale = (size, factor = 0.5) => Math.round(size + (scaleWidth(size) - size) * factor);

export const isSmallDevice = SCREEN_WIDTH < 375;
export const isStandardDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;

export const getResponsiveScale = (screenWidth = SCREEN_WIDTH) => {
  const isSmall = screenWidth < 375;
  const isStandard = screenWidth >= 375 && screenWidth < 640;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  const isLarge = screenWidth >= 414;

  return {
    screenWidth,
    isSmall,
    isStandard,
    isTablet,
    isDesktop,
    isLarge,
    spacing: {
      xs: isSmall ? 4 : 5,
      sm: isSmall ? 8 : 10,
      md: isSmall ? 12 : 14,
      lg: isSmall ? 16 : isLarge ? 20 : 18,
      xl: isSmall ? 20 : isLarge ? 26 : 22,
      xxl: isSmall ? 24 : isLarge ? 32 : 28,
      xxxl: isSmall ? 30 : isLarge ? 40 : 36,
    },
    radius: {
      small: isSmall ? 6 : 8,
      medium: isSmall ? 10 : 12,
      large: isSmall ? 14 : 16,
      xlarge: isSmall ? 18 : 22,
      full: 9999,
    },
    typography: {
      display: {
        fontSize: isSmall ? 26 : isLarge ? 34 : 30,
        lineHeight: isSmall ? 32 : isLarge ? 40 : 36,
        fontWeight: "700",
      },
      screenTitle: {
        fontSize: isSmall ? 20 : isLarge ? 26 : 23,
        lineHeight: isSmall ? 26 : isLarge ? 32 : 28,
        fontWeight: "700",
      },
      sectionTitle: {
        fontSize: isSmall ? 17 : isLarge ? 20 : 18,
        lineHeight: isSmall ? 22 : isLarge ? 25 : 23,
        fontWeight: "600",
      },
      body: {
        fontSize: isSmall ? 14 : isLarge ? 17 : 15,
        lineHeight: isSmall ? 20 : isLarge ? 23 : 21,
        fontWeight: "400",
      },
      bodyBold: {
        fontSize: isSmall ? 14 : isLarge ? 17 : 15,
        lineHeight: isSmall ? 20 : isLarge ? 23 : 21,
        fontWeight: "600",
      },
      secondary: {
        fontSize: isSmall ? 12 : isLarge ? 15 : 13,
        lineHeight: isSmall ? 17 : isLarge ? 20 : 18,
        fontWeight: "400",
      },
      caption: {
        fontSize: isSmall ? 11 : isLarge ? 13 : 12,
        lineHeight: isSmall ? 15 : isLarge ? 17 : 16,
        fontWeight: "500",
      },
    },
    touchTargets: {
      min: isSmall ? 46 : 48,
      preferred: isSmall ? 52 : 56,
      spacious: isSmall ? 58 : 64,
    },
  };
};
