import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput, Alert, Platform } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { AppButton } from "../components/AppButton";
import { checkBackendHealth } from "../services/api";
import { localDb } from "../services/db/localDb";
import { Storage } from "../services/storage";
import { bleManager } from "../services/ble/bleManager";

export function ProfileScreen() {
  const { theme, isDark, toggleTheme, spacing, radius, typography } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [backendStatus, setBackendStatus] = useState({ checked: false, isOnline: false, data: null });
  
  // Real Dynamic Farmer Profile (loaded from local persistent storage)
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmerCoop, setFarmerCoop] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempCoop, setTempCoop] = useState("");
  const [dbClearedMsg, setDbClearedMsg] = useState(null);
  const [probeStatus, setProbeStatus] = useState({
    isConnected: bleManager.isConnected,
    deviceName: bleManager.device?.name || "SilageGuard-Probe",
    telemetry: null,
  });

  useEffect(() => {
    checkBackendHealth().then((res) => {
      setBackendStatus({ checked: true, isOnline: res.isOnline, data: res.data });
    });

    // Real-time subscription to physical ESP32 probe hardware events
    const unsubBle = bleManager.onTelemetry((evt) => {
      if (evt.type === "CONNECTED") {
        setProbeStatus({
          isConnected: true,
          deviceName: evt.deviceName || "SilageGuard-Probe",
          telemetry: null,
        });
      } else if (evt.type === "TELEMETRY" && evt.telemetry) {
        setProbeStatus((prev) => ({
          ...prev,
          isConnected: true,
          telemetry: evt.telemetry,
        }));
      } else if (evt.type === "DISCONNECTED" || evt.type === "SIGNAL_LOST") {
        setProbeStatus({
          isConnected: false,
          deviceName: null,
          telemetry: null,
        });
      }
    });

    // Load real stored profile
    Promise.all([
      Storage.getItem("farmer_name"),
      Storage.getItem("farmer_phone"),
      Storage.getItem("farmer_coop"),
    ]).then(([name, phone, coop]) => {
      const currentName = name || "SilageGuard Farmer";
      const currentPhone = phone || "";
      const currentCoop = coop || "District Dairy Cooperative";
      setFarmerName(currentName);
      setFarmerPhone(currentPhone);
      setFarmerCoop(currentCoop);
      setTempName(currentName);
      setTempPhone(currentPhone);
      setTempCoop(currentCoop);
    });

    return () => {
      unsubBle();
    };
  }, []);

  const handleSaveProfile = async () => {
    await Storage.setItem("farmer_name", tempName.trim() || "SilageGuard Farmer");
    await Storage.setItem("farmer_phone", tempPhone.trim());
    await Storage.setItem("farmer_coop", tempCoop.trim() || "District Dairy Cooperative");
    setFarmerName(tempName.trim() || "SilageGuard Farmer");
    setFarmerPhone(tempPhone.trim());
    setFarmerCoop(tempCoop.trim() || "District Dairy Cooperative");
    setIsEditingProfile(false);
  };

  const handleClearAllRecords = () => {
    const performClear = async () => {
      const res = await localDb.clearAllRecords();
      if (res.success) {
        setDbClearedMsg("All local batch screening records and queue cleared successfully.");
        setTimeout(() => setDbClearedMsg(null), 4000);
      } else {
        setDbClearedMsg(`Error clearing records: ${res.error}`);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete all local screening records and testing batches? This cannot be undone.")) {
        performClear();
      }
    } else {
      Alert.alert(
        "Clear All Records",
        "Are you sure you want to permanently delete all local batches and screening observations from SQLite? This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete All", style: "destructive", onPress: performClear },
        ]
      );
    }
  };

  const languages = [
    { code: "hi", label: "हिन्दी (Hindi)" },
    { code: "en", label: "English" },
    { code: "mr", label: "मराठी (Marathi)" },
    { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
    { code: "te", label: "తెలుగు (Telugu)" },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t("profile")}
        subtitle={t("settingsSubtitle")}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* BRAND IDENTITY BANNER */}
        <View
          style={[
            styles.brandCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginBottom: spacing.md,
              alignItems: "center",
            },
          ]}
        >
          <Image
            source={require("../assets/logo.png")}
            style={styles.profileLogo}
            resizeMode="contain"
          />
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {t("platformVersion")}
          </Text>
        </View>

        {/* REAL FARMER PROFILE CARD (EDITABLE & PERSISTENT) */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase" }]}>
              {t("account")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditingProfile(!isEditingProfile)}
            >
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>
                {isEditingProfile ? t("cancel") : t("editProfile")}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingProfile ? (
            <View style={{ marginTop: 10 }}>
              <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 2 }]}>
                {t("farmerNameLabel")}
              </Text>
              <TextInput
                value={tempName}
                onChangeText={setTempName}
                placeholder={t("farmerNamePlaceholder")}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderRadius: radius.medium,
                  },
                ]}
              />

              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 8, marginBottom: 2 }]}>
                {t("farmerPhoneLabel")}
              </Text>
              <TextInput
                value={tempPhone}
                onChangeText={setTempPhone}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderRadius: radius.medium,
                  },
                ]}
              />

              <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 8, marginBottom: 2 }]}>
                {t("farmerCoopLabel")}
              </Text>
              <TextInput
                value={tempCoop}
                onChangeText={setTempCoop}
                placeholder={t("farmerCoopPlaceholder")}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderRadius: radius.medium,
                  },
                ]}
              />

              <View style={{ marginTop: 16 }}>
                <AppButton
                  title={t("saveProfile")}
                  variant="primary"
                  size="medium"
                  onPress={handleSaveProfile}
                />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 4 }}>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>
                {farmerName}
              </Text>
              {farmerPhone ? (
                <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                  📞 {farmerPhone}
                </Text>
              ) : null}
              <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 2 }]}>
                {t("cooperativeLabel")}: {farmerCoop}
              </Text>
            </View>
          )}
        </View>

        {/* HARDWARE / PROBE STATUS (REAL PHYSICAL HARDWARE ONLY) */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: probeStatus.isConnected ? theme.goodBorder : theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase" }]}>
            {t("device")}
          </Text>
          <View style={styles.rowBetween}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
              {probeStatus.isConnected
                ? probeStatus.deviceName || "SilageGuard ESP32 Probe"
                : t("noProbeConnected")}
            </Text>
            <StatusBadge
              status={probeStatus.isConnected ? "GOOD" : "OFFLINE"}
              label={probeStatus.isConnected ? t("connected") : t("disconnected")}
            />
          </View>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {probeStatus.isConnected
              ? probeStatus.telemetry
                ? `${t("coreTemp")}: ${probeStatus.telemetry.coreTemp}°C • ${t("moisture")}: ${probeStatus.telemetry.moisture}%${probeStatus.telemetry.ph !== null ? ` • ${t("phLevel")}: ${probeStatus.telemetry.ph}` : ""} • ${t("liveHardwareStream")}`
                : t("awaitingPackets")
              : t("zeroSimulatedDevices")}
          </Text>
          {probeStatus.isConnected ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => bleManager.disconnect()}
              style={{ marginTop: 10, alignSelf: "flex-start" }}
            >
              <Text style={{ color: theme.highRisk, fontWeight: "700", fontSize: 12 }}>
                {t("disconnectEsp32")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* LANGUAGE SELECTION */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase", marginBottom: 8 }]}>
            {t("language")}
          </Text>
          <View style={styles.langList}>
            {languages.map((lang) => {
              const active = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.7}
                  onPress={() => setLanguage(lang.code)}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: active ? theme.primarySoft : theme.surfaceSoft,
                      borderColor: active ? theme.primary : theme.border,
                      borderRadius: radius.medium,
                      padding: spacing.md,
                      marginVertical: 6,
                      minHeight: 50,
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      { color: active ? theme.primaryDark : theme.textPrimary },
                    ]}
                  >
                    {lang.label} {active ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* THEME SWITCHER */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase" }]}>
            {t("appearance")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            style={[
              styles.themeToggle,
              {
                backgroundColor: theme.surfaceSoft,
                borderColor: theme.border,
                borderRadius: radius.medium,
                padding: spacing.md,
                marginTop: 10,
                minHeight: 50,
                justifyContent: "center",
              },
            ]}
          >
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
              {isDark ? `🌙 ${t("themeDark")} ${t("switchToLight")}` : `☀️ ${t("themeLight")} ${t("switchToDark")}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CLOUD & SUPABASE SYNCHRONIZATION STATUS */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.large,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: theme.textMuted, textTransform: "uppercase" }]}>
              {t("backendCloud")}
            </Text>
            <StatusBadge
              status={backendStatus.isOnline ? "GOOD" : "OFFLINE"}
              label={backendStatus.isOnline ? t("apiOnline") : t("localOnly")}
            />
          </View>
          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginTop: 4 }]}>
            {t("supabaseActive")}
          </Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
            Target: db.oapbhudrqsfzzqwwlkvf.supabase.co:5432
          </Text>
          {backendStatus.data && (
            <Text style={[typography.caption, { color: theme.good, marginTop: 4 }]}>
              FastAPI v{backendStatus.data.version} • Models: v{backendStatus.data.model_registry?.fusion_engine_version}
            </Text>
          )}
        </View>

        {/* TESTING & DATABASE MANAGEMENT */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.highRiskBorder,
              borderRadius: radius.large,
              padding: spacing.lg,
              marginTop: spacing.md,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={[typography.caption, { color: theme.highRisk, textTransform: "uppercase", fontWeight: "700" }]}>
              {t("developerTools")}
            </Text>
            <StatusBadge status="ALERT" label={t("debugMode")} size="small" />
          </View>
          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginTop: 4 }]}>
            {t("localSqliteDb")}
          </Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2, marginBottom: 14 }]}>
            {t("resetDbNotice")}
          </Text>

          {dbClearedMsg ? (
            <View style={[styles.alertBanner, { backgroundColor: theme.goodBg, borderColor: theme.goodBorder, marginBottom: 12 }]}>
              <Text style={{ color: theme.good, fontWeight: "600", fontSize: 13 }}>
                ✓ {dbClearedMsg}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleClearAllRecords}
            style={[
              styles.dangerButton,
              {
                backgroundColor: theme.highRiskBg,
                borderColor: theme.highRiskBorder,
              },
            ]}
          >
            <Text style={{ color: theme.highRisk, fontWeight: "700", fontSize: 14 }}>
              {t("clearAllBatchRecords")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
  brandCard: {
    borderWidth: 1,
  },
  profileLogo: {
    width: 220,
    height: 60,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 2,
  },
  dangerButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  langList: {
    marginTop: 4,
  },
  langChip: {
    borderWidth: 1,
  },
  themeToggle: {
    borderWidth: 1,
    alignItems: "center",
  },
});
