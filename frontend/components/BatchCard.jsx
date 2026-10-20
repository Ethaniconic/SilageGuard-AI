import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function BatchCard({ batch, onPress }) {
  const { theme, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  const getTranslatedCrop = (crop) => {
    if (!crop) return t("cropCorn");
    const lower = String(crop).toLowerCase();
    if (lower.includes("corn") || lower.includes("maize")) return t("cropCorn");
    if (lower.includes("alfalfa") || lower.includes("lucerne")) return t("cropAlfalfa");
    if (lower.includes("grass")) return t("cropGrass");
    if (lower.includes("mixed")) return t("cropMixed");
    if (lower.includes("sorghum") || lower.includes("jowar")) return t("cropSorghum");
    return crop;
  };

  const getTranslatedStorage = (storage) => {
    if (!storage) return t("storageBunker");
    const lower = String(storage).toLowerCase();
    if (lower.includes("trench")) return t("storageTrench");
    if (lower.includes("bale")) return t("storageBale");
    return t("storageBunker");
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: radius.large,
          padding: spacing.md,
          marginHorizontal: spacing.lg,
          marginVertical: 6,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
            {batch.client_batch_id || batch.id}
          </Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
            {getTranslatedCrop(batch.crop_type || batch.cropType)} • {getTranslatedStorage(batch.storage_type || batch.storageType)}
          </Text>
        </View>
        <StatusBadge status={batch.decision || batch.fused_decision || "GOOD"} />
      </View>

      <View style={[styles.bottomRow, { borderTopColor: theme.borderSubtle, marginTop: spacing.md }]}>
        <Text style={[typography.caption, { color: theme.textMuted }]}>
          {batch.scanned_at || batch.timestamp || batch.created_at || "Recently"}
        </Text>
        <Text style={[typography.caption, { color: theme.textPrimary, fontWeight: "600" }]}>
          {t("viewHistory")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
  },
});
