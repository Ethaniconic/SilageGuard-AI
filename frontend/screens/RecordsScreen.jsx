import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { ScreenHeader } from "../components/ScreenHeader";
import { BatchCard } from "../components/BatchCard";
import { localDb } from "../services/db/localDb";

export function RecordsScreen({ onSelectBatch }) {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [dbRecords, setDbRecords] = useState([]);

  useEffect(() => {
    localDb.getObservations().then((obs) => {
      setDbRecords(obs || []);
    });
  }, []);

  const records = dbRecords.filter((item) => {
    const id = item.client_batch_id || item.id || item.batchId || "";
    const crop = item.crop_type || item.cropType || "Silage Batch";
    const matchesSearch =
      id.toLowerCase().includes(search.toLowerCase()) ||
      crop.toLowerCase().includes(search.toLowerCase());
    if (filter === "ALL") return matchesSearch;
    const dec = item.decision || item.verdict;
    return matchesSearch && (dec === filter || (filter === "GOOD" && dec === "SAFE"));
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t("recordsTitle")}
        subtitle={`${records.length} ${t("batchChecksRecorded")}`}
      />

      <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.sm }}>
        <TextInput
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radius.medium,
              color: theme.textPrimary,
              paddingHorizontal: spacing.md,
              height: 48,
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <View style={{ padding: spacing.xxl, alignItems: "center" }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
              {t("noBatchesYet")}
            </Text>
            <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
              {t("startFirstCheck")}
            </Text>
          </View>
        ) : (
          records.map((item) => (
            <BatchCard
              key={item.id}
              batch={item}
              onPress={() => onSelectBatch(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    fontSize: 15,
  },
});
