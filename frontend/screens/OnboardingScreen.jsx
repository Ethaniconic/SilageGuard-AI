import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { AppButton } from "../components/AppButton";

export function OnboardingScreen({ onFinish }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1); // 1, 2, 3

  const languages = [
    { code: "en", label: "English", sub: "Default" },
    { code: "hi", label: "हिन्दी", sub: "Hindi" },
    { code: "mr", label: "मराठी", sub: "Marathi" },
    { code: "kn", label: "ಕನ್ನಡ", sub: "Kannada" },
    { code: "te", label: "తెలుగు", sub: "Telugu" },
  ];

  const handleNext = () => {
    if (currentPage < 3) {
      setCurrentPage((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* TOP BAR: STEP INDICATOR & SKIP BUTTON */}
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <View style={styles.indicatorRow}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.dot,
                {
                  backgroundColor: step === currentPage ? theme.primary : theme.border,
                  width: step === currentPage ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onFinish}
          style={[styles.skipButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
        >
          <Text style={[typography.caption, { color: theme.textSecondary, fontWeight: "700" }]}>
            {t("skipBtn")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PAGE 1: CHOOSE LANGUAGE */}
        {currentPage === 1 && (
          <View style={styles.pageCard}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.startupLogo}
              resizeMode="contain"
            />

            <Text style={[typography.screenTitle, { color: theme.textPrimary, textAlign: "center", marginTop: spacing.md }]}>
              {t("chooseLanguageTitle")}
            </Text>
            <Text style={[typography.secondary, { color: theme.textSecondary, textAlign: "center", marginTop: 4, marginBottom: spacing.lg }]}>
              {t("chooseLanguageSub")}
            </Text>

            <View style={{ width: "100%", marginVertical: spacing.sm }}>
              {languages.map((l) => {
                const isSelected = language === l.code;
                return (
                  <TouchableOpacity
                    key={l.code}
                    activeOpacity={0.7}
                    onPress={() => setLanguage(l.code)}
                    style={[
                      styles.langItem,
                      {
                        backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderRadius: radius.medium,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.lg,
                        marginVertical: 4,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text style={[typography.bodyBold, { color: isSelected ? theme.primaryDark : theme.textPrimary }]}>
                          {l.label}
                        </Text>
                        <Text style={[typography.caption, { color: theme.textMuted }]}>
                          {l.sub}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.primary : "transparent",
                          },
                        ]}
                      >
                        {isSelected && <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* PAGE 2: SILAGE PHOTO TUTORIAL */}
        {currentPage === 2 && (
          <View style={styles.pageCard}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
              <Text style={{ fontSize: 36 }}>📷</Text>
            </View>

            <Text style={[typography.screenTitle, { color: theme.textPrimary, textAlign: "center", marginTop: spacing.md }]}>
              {t("silagePhotoTitle")}
            </Text>
            <Text style={[typography.secondary, { color: theme.textSecondary, textAlign: "center", marginTop: 4, marginBottom: spacing.lg }]}>
              {t("silagePhotoSub")}
            </Text>

            <View style={[styles.tutorialCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.lg }]}>
              <View style={styles.stepRow}>
                <Text style={styles.stepNum}>1.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step1PhotoTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step1PhotoSub")}
                  </Text>
                </View>
              </View>

              <View style={[styles.stepRow, { marginTop: spacing.md }]}>
                <Text style={styles.stepNum}>2.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step2PhotoTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step2PhotoSub")}
                  </Text>
                </View>
              </View>

              <View style={[styles.stepRow, { marginTop: spacing.md }]}>
                <Text style={styles.stepNum}>3.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step3PhotoTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step3PhotoSub")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* PAGE 3: PROBE CONNECTION */}
        {currentPage === 3 && (
          <View style={styles.pageCard}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
              <Text style={{ fontSize: 36 }}>📡</Text>
            </View>

            <Text style={[typography.screenTitle, { color: theme.textPrimary, textAlign: "center", marginTop: spacing.md }]}>
              {t("probeTutorialTitle")}
            </Text>
            <Text style={[typography.secondary, { color: theme.textSecondary, textAlign: "center", marginTop: 4, marginBottom: spacing.lg }]}>
              {t("probeTutorialSub")}
            </Text>

            <View style={[styles.tutorialCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.large, padding: spacing.lg }]}>
              <View style={styles.stepRow}>
                <Text style={styles.stepNum}>1.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step1ProbeTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step1ProbeSub")}
                  </Text>
                </View>
              </View>

              <View style={[styles.stepRow, { marginTop: spacing.md }]}>
                <Text style={styles.stepNum}>2.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step2ProbeTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step2ProbeSub")}
                  </Text>
                </View>
              </View>

              <View style={[styles.stepRow, { marginTop: spacing.md }]}>
                <Text style={styles.stepNum}>3.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{t("step3ProbeTitle")}</Text>
                  <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                    {t("step3ProbeSub")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM ACTION BUTTON */}
      <View style={[styles.bottomBar, { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, backgroundColor: theme.background }]}>
        <AppButton
          title={currentPage === 3 ? t("getStartedBtn") : t("nextStepBtn")}
          variant="primary"
          size="large"
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pageCard: {
    width: "100%",
    alignItems: "center",
  },
  startupLogo: {
    width: 200,
    height: 70,
    marginBottom: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  langItem: {
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tutorialCard: {
    width: "100%",
    borderWidth: 1,
    marginVertical: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNum: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5E9F73",
    width: 24,
  },
  bottomBar: {
    width: "100%",
  },
});
