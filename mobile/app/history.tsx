/**
 * SCREEN 7 — BATCH HISTORY (SQLITE STORE)
 * - Lists all past silage quality scans saved offline in SQLite
 * - Instant search by batch ID or crop type
 * - Filter pills: ALL, SAFE, CAUTION, UNSAFE
 * - Tap to open detailed diagnostic report (Screen 8)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { batchRepository } from "../sqlite/batchRepository";
import { BatchRecord } from "../sqlite/database";
import { THEME_COLORS } from "../utils/constants";

export default function HistoryScreen() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDecision, setFilterDecision] = useState<"ALL" | "SAFE" | "CAUTION" | "UNSAFE">("ALL");

  useEffect(() => {
    loadBatches();
  }, [searchQuery, filterDecision]);

  async function loadBatches() {
    const list = await batchRepository.filterBatches(searchQuery, filterDecision);
    setBatches(list);
  }

  const renderBatchItem = ({ item }: { item: BatchRecord }) => {
    const isSafe = item.decision === "SAFE";
    const isCaution = item.decision === "CAUTION";
    const statusColor = isSafe ? THEME_COLORS.safe : isCaution ? THEME_COLORS.caution : THEME_COLORS.unsafe;
    const formattedDate = new Date(item.timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return (
      <TouchableOpacity
        style={styles.batchCard}
        onPress={() => router.push({ pathname: "/details" as any, params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.batchTopRow}>
          <View style={styles.batchIdArea}>
            <Text style={styles.batchId}>{item.id}</Text>
            <Text style={styles.batchDate}>{formattedDate}</Text>
          </View>

          <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.decision}
            </Text>
          </View>
        </View>

        <View style={styles.batchMidRow}>
          <Text style={styles.cropText}>🌾 {item.crop_type}</Text>
          <Text style={styles.depthText}>Pit Depth: {item.pit_depth_cm} cm</Text>
        </View>

        <View style={styles.batchBottomRow}>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>MSSI:</Text>
            <Text style={[styles.scoreVal, { color: statusColor }]}>{item.mssi_score}/100</Text>
          </View>

          <View style={styles.confidencePill}>
            <Text style={styles.confLabel}>Confidence:</Text>
            <Text style={styles.confVal}>{item.confidence}%</Text>
          </View>

          <Text style={styles.viewReportLink}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="BATCH HISTORY" showBack={true} />

      <View style={styles.container}>
        {/* Search Input Box */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by batch ID or crop type..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(["ALL", "SAFE", "CAUTION", "UNSAFE"] as const).map((f) => {
            const isSelected = filterDecision === f;
            const accent =
              f === "SAFE"
                ? THEME_COLORS.safe
                : f === "CAUTION"
                ? THEME_COLORS.caution
                : f === "UNSAFE"
                ? THEME_COLORS.unsafe
                : "#38BDF8";

            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  isSelected && { borderColor: accent, backgroundColor: "rgba(255, 255, 255, 0.08)" }
                ]}
                onPress={() => setFilterDecision(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && { color: accent }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Batches FlatList */}
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          renderItem={renderBatchItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No Silage Batches Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or filter criteria.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background
  },
  container: {
    flex: 1,
    padding: 16
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600"
  },
  clearSearch: {
    color: "#64748B",
    fontSize: 14,
    padding: 4
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 14
  },
  filterPill: {
    flex: 1,
    backgroundColor: THEME_COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    paddingVertical: 8,
    marginHorizontal: 3,
    alignItems: "center"
  },
  filterPillText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  listContent: {
    paddingBottom: 24
  },
  batchCard: {
    backgroundColor: THEME_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME_COLORS.cardBorder,
    padding: 16,
    marginBottom: 12
  },
  batchTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  batchIdArea: {
    flex: 1
  },
  batchId: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800"
  },
  batchDate: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500"
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  batchMidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6
  },
  cropText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600"
  },
  depthText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600"
  },
  batchBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 10,
    marginTop: 6
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "baseline"
  },
  scoreLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4
  },
  scoreVal: {
    fontSize: 14,
    fontWeight: "900"
  },
  confidencePill: {
    flexDirection: "row",
    alignItems: "baseline"
  },
  confLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4
  },
  confVal: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800"
  },
  viewReportLink: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800"
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800"
  },
  emptySub: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center"
  }
});
