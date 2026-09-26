/**
 * SCREEN 7 - BATCH HISTORY (SQLITE STORE)
 * - Lists all past silage quality scans saved offline in SQLite
 * - Instant search by batch ID or crop type
 * - Filter pills: ALL, SAFE, CAUTION, UNSAFE
 * - Vector AppIcons throughout
 * - Tap to open detailed diagnostic report
 * - Theme & full viewport width support
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { AppIcon } from "../components/AppIcon";
import { batchRepository } from "../sqlite/batchRepository";
import { BatchRecord } from "../sqlite/database";
import { useTheme } from "../features/ble/bleManager";

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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
    const statusColor = isSafe ? theme.safe : isCaution ? theme.caution : theme.unsafe;
    const formattedDate = new Date(item.timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return (
      <TouchableOpacity
        style={[
          styles.batchCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            borderRadius: theme.radiusMd
          }
        ]}
        onPress={() => router.push({ pathname: "/details" as any, params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.batchTopRow}>
          <View style={styles.batchIdArea}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.batchId, { color: theme.text }]}>{item.id}</Text>
              {item.is_demo ? (
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.caution,
                    backgroundColor: theme.cautionBg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: theme.radiusSm,
                    marginLeft: 6,
                    fontWeight: "800"
                  }}
                >
                  DEMO
                </Text>
              ) : (
                <Text
                  style={{
                    fontSize: 9,
                    color: theme.safe,
                    backgroundColor: theme.safeBg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: theme.radiusSm,
                    marginLeft: 6,
                    fontWeight: "800"
                  }}
                >
                  FIELD
                </Text>
              )}
            </View>
            <Text style={[styles.batchDate, { color: theme.textMuted }]}>{formattedDate}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                borderColor: statusColor,
                backgroundColor: `${statusColor}1A`,
                borderRadius: theme.radiusSm
              }
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.decision}
            </Text>
          </View>
        </View>

        <View style={styles.batchMidRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppIcon name="leaf" size={13} color={theme.primary} />
            <Text style={[styles.cropText, { color: theme.text, marginLeft: 6 }]}>
              {item.crop_type}
            </Text>
          </View>
          <Text style={[styles.depthText, { color: theme.textMuted }]}>
            Pit Depth: {item.pit_depth_cm} cm
          </Text>
        </View>

        <View style={[styles.batchBottomRow, { borderTopColor: theme.cardBorder }]}>
          <View style={styles.scorePill}>
            <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>MSSI:</Text>
            <Text style={[styles.scoreVal, { color: statusColor }]}>{item.mssi_score}/100</Text>
          </View>

          <View style={styles.confidencePill}>
            <Text style={[styles.confLabel, { color: theme.textMuted }]}>Confidence:</Text>
            <Text style={[styles.confVal, { color: theme.text }]}>{item.confidence}%</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.viewReportLink, { color: theme.accent, marginRight: 4 }]}>
              View Details
            </Text>
            <AppIcon name="arrow-forward" size={13} color={theme.accent} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="SilageGuard AI" showBack={true} />

      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Search Input Box */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              borderRadius: theme.radiusSm
            }
          ]}
        >
          <AppIcon name="search" size={16} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by batch ID or crop type..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <AppIcon name="close" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(["ALL", "SAFE", "CAUTION", "UNSAFE"] as const).map((f) => {
            const isSelected = filterDecision === f;
            const accent =
              f === "SAFE"
                ? theme.safe
                : f === "CAUTION"
                ? theme.caution
                : f === "UNSAFE"
                ? theme.unsafe
                : theme.accent;

            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? accent + "22" : theme.card,
                    borderColor: isSelected ? accent : theme.cardBorder,
                    borderRadius: theme.radiusSm
                  }
                ]}
                onPress={() => setFilterDecision(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? accent : theme.textMuted }
                  ]}
                >
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
              <AppIcon name="history" size={38} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text, marginTop: 10 }]}>
                No Silage Batches Found
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                {searchQuery.length > 0
                  ? "Try adjusting your search query or filter criteria."
                  : "Completed scans will be safely preserved here in offline SQLite storage."}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 10
  },
  filterPill: {
    flex: 1,
    marginHorizontal: 2,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: "center"
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: "800"
  },
  listContent: {
    paddingBottom: 20
  },
  batchCard: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 4
  },
  batchTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  batchIdArea: {
    flex: 1
  },
  batchId: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  batchDate: {
    fontSize: 10,
    marginTop: 2
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900"
  },
  batchMidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4
  },
  cropText: {
    fontSize: 12,
    fontWeight: "700"
  },
  depthText: {
    fontSize: 11
  },
  batchBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center"
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginRight: 4
  },
  scoreVal: {
    fontSize: 13,
    fontWeight: "900"
  },
  confidencePill: {
    flexDirection: "row",
    alignItems: "center"
  },
  confLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginRight: 4
  },
  confVal: {
    fontSize: 12,
    fontWeight: "800"
  },
  viewReportLink: {
    fontSize: 11,
    fontWeight: "800"
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800"
  },
  emptySub: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 24
  }
});
