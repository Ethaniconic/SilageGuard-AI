import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import { LIGHT_THEME, DARK_THEME } from "./colors";
import { getResponsiveScale } from "./responsive";

const ThemeContext = createContext({
  theme: LIGHT_THEME,
  isDark: false,
  toggleTheme: () => {},
  spacing: getResponsiveScale().spacing,
  radius: getResponsiveScale().radius,
  typography: getResponsiveScale().typography,
  touchTargets: getResponsiveScale().touchTargets,
  isSmallDevice: false,
  isLargeDevice: false,
  screenWidth: 375,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const { width: screenWidth } = useWindowDimensions();
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const responsive = getResponsiveScale(screenWidth);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        spacing: responsive.spacing,
        radius: responsive.radius,
        typography: responsive.typography,
        touchTargets: responsive.touchTargets,
        isSmallDevice: responsive.isSmall,
        isTablet: responsive.isTablet,
        isDesktop: responsive.isDesktop,
        isLargeDevice: responsive.isLarge,
        screenWidth,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

