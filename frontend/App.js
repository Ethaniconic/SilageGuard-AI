import React from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./theme";
import { LanguageProvider } from "./i18n";
import { AppNavigator } from "./navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppNavigator />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// In standard Expo apps (without Expo Router), registerRootComponent registers the "main" component with AppRegistry
registerRootComponent(App);

