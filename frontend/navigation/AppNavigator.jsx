import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { HomeScreen } from "../screens/HomeScreen";
import { CheckScreen } from "../screens/CheckScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { RecordsScreen } from "../screens/RecordsScreen";
import { RecordDetailScreen } from "../screens/RecordDetailScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { Storage } from "../services/storage";
import { activateModelsAndGradcam } from "../services/api";

export function AppNavigator() {
  const { theme, isDark, touchTargets, typography, isTablet, isDesktop } = useTheme();
  const { t } = useTranslation();

  // One-time Onboarding Introduction: Persisted across app restarts
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);

  useEffect(() => {
    // Pre-activate MobileNetV3 vision models, PyTorch Grad-CAM, and edge engines on app startup
    activateModelsAndGradcam();

    Storage.getItem("has_seen_onboarding").then((seen) => {
      if (!seen) {
        setShowOnboarding(true);
      }
      setIsCheckingStorage(false);
    });
  }, []);

  const handleFinishOnboarding = () => {
    Storage.setItem("has_seen_onboarding", "true");
    setShowOnboarding(false);
  };

  // Strict Finite Navigation Stack
  // currentTab: "HOME" | "RECORDS" | "PROFILE"
  const [currentTab, setCurrentTab] = useState("HOME");
  // activeModalScreen: null | "CHECK" | "RESULT" | "RECORD_DETAIL"
  const [modalScreen, setModalScreen] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const handleNavigate = (target, payload) => {
    if (target === "CHECK") {
      setModalScreen("CHECK");
    } else if (target === "RESULT") {
      setActiveResult(payload);
      setModalScreen("RESULT");
    } else if (target === "RECORD_DETAIL") {
      setSelectedBatch(payload);
      setModalScreen("RECORD_DETAIL");
    } else if (target === "HOME" || target === "RECORDS" || target === "PROFILE") {
      setModalScreen(null);
      setCurrentTab(target);
    }
  };

  const renderContent = () => {
    if (isCheckingStorage) {
      return null;
    }

    if (showOnboarding) {
      return <OnboardingScreen onFinish={handleFinishOnboarding} />;
    }

    if (modalScreen === "CHECK") {
      return (
        <CheckScreen
          onBack={() => setModalScreen(null)}
          onComplete={(res) => {
            setActiveResult(res);
            setModalScreen("RESULT");
          }}
        />
      );
    }
    if (modalScreen === "RESULT") {
      return (
        <ResultScreen
          result={activeResult}
          onDone={() => setModalScreen(null)}
          onViewHistory={() => {
            setModalScreen(null);
            setCurrentTab("RECORDS");
          }}
        />
      );
    }
    if (modalScreen === "RECORD_DETAIL") {
      return (
        <RecordDetailScreen
          batch={selectedBatch}
          onBack={() => setModalScreen(null)}
        />
      );
    }

    // Primary Tabs
    if (currentTab === "HOME") {
      return <HomeScreen onNavigate={handleNavigate} />;
    }
    if (currentTab === "RECORDS") {
      return (
        <RecordsScreen
          onSelectBatch={(b) => {
            setSelectedBatch(b);
            setModalScreen("RECORD_DETAIL");
          }}
        />
      );
    }
    if (currentTab === "PROFILE") {
      return <ProfileScreen />;
    }
    return <HomeScreen onNavigate={handleNavigate} />;
  };

  const isWide = isTablet || isDesktop;

  return (
    <SafeAreaView style={[styles.outerContainer, { backgroundColor: isWide ? (isDark ? "#080D0A" : "#EEF2F6") : theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* RESPONSIVE CENTERED APP CARD FOR ALL SCREEN WIDTHS */}
      <View
        style={[
          styles.responsiveCard,
          {
            backgroundColor: theme.background,
            maxWidth: 640,
            borderLeftColor: isWide ? theme.border : "transparent",
            borderRightColor: isWide ? theme.border : "transparent",
            borderLeftWidth: isWide ? 1 : 0,
            borderRightWidth: isWide ? 1 : 0,
            shadowColor: isWide ? "#000000" : "transparent",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isWide ? 0.08 : 0,
            shadowRadius: 16,
            elevation: isWide ? 4 : 0,
          },
        ]}
      >
        {/* ACTIVE SCREEN CONTENT */}
        <View style={styles.contentWrap}>
          {renderContent()}
        </View>

        {/* FINITE BOTTOM NAVIGATION (ONLY VISIBLE ON ROOT TABS) */}
        {!modalScreen && !showOnboarding && (
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                minHeight: 68,
                paddingBottom: Platform.OS === "web" ? 12 : 8,
                paddingTop: 8,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCurrentTab("HOME")}
              style={styles.tabItem}
            >
              <Text style={{ fontSize: 21 }}>🏠</Text>
              <Text
                style={[
                  typography.caption,
                  { color: currentTab === "HOME" ? theme.primary : theme.textMuted, fontWeight: currentTab === "HOME" ? "700" : "500", marginTop: 4 },
                ]}
              >
                {t("home")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setModalScreen("CHECK")}
              style={styles.tabItem}
            >
              <View style={[styles.checkBubble, { backgroundColor: theme.primary }]}>
                <Text style={{ fontSize: 18, color: "#FFFFFF" }}>▶</Text>
              </View>
              <Text
                style={[
                  typography.caption,
                  { color: theme.primary, fontWeight: "700", marginTop: 4 },
                ]}
              >
                {t("check")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCurrentTab("RECORDS")}
              style={styles.tabItem}
            >
              <Text style={{ fontSize: 21 }}>📋</Text>
              <Text
                style={[
                  typography.caption,
                  { color: currentTab === "RECORDS" ? theme.primary : theme.textMuted, fontWeight: currentTab === "RECORDS" ? "700" : "500", marginTop: 4 },
                ]}
              >
                {t("records")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCurrentTab("PROFILE")}
              style={styles.tabItem}
            >
              <Text style={{ fontSize: 21 }}>👤</Text>
              <Text
                style={[
                  typography.caption,
                  { color: currentTab === "PROFILE" ? theme.primary : theme.textMuted, fontWeight: currentTab === "PROFILE" ? "700" : "500", marginTop: 4 },
                ]}
              >
                {t("profile")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    alignItems: "center",
    justifyContent: "center",
  },
  responsiveCard: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  contentWrap: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 4,
    minHeight: 48,
  },
  checkBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
