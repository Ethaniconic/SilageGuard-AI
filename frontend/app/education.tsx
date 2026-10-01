/**
 * SILAGEGUARD AI V4 — Farmer Education Module ("Learn Silage")
 * Offline educational guides with agronomic best practices, mold identification,
 * bunker sealing, and fermentation science written in simple dairy farmer terms.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Header } from "../components/Header";
import { BottomSheet } from "../components/BottomSheet";
import { useAppStore } from "../store/useAppStore";
import { useTheme } from "../features/ble/bleManager";
import { RADIUS, SPACING } from "../theme";

interface GuideCard {
  id: string;
  category: "Visual" | "Fermentation" | "Management";
  title: string;
  shortDesc: string;
  badge: string;
  badgeColor: "safe" | "caution" | "unsafe" | "info";
  fullDetails: string[];
  agronomicTip: string;
}

const GUIDES: GuideCard[] = [
  {
    id: "guide-1",
    category: "Visual",
    title: "How Good Silage Looks and Smells",
    shortDesc: "Golden-yellow or olive green color with a pleasant, sweet yogurt/lactic aroma.",
    badge: "IDEAL STANDARD",
    badgeColor: "safe",
    fullDetails: [
      "Color: Light greenish-yellow to bright golden khaki. Leaves intact and distinct.",
      "Smell: Pleasantly sharp and acidic, like clean curd or yogurt. No ammonia smell.",
      "Touch: Cool to the touch (within 2-3°C of ambient temperature). Not slimy.",
      "Livestock intake: Dairy cattle consume it eagerly without sorting.",
    ],
    agronomicTip: "Kung et al. (2018): High lactic acid content (>65% of total VFA) preserves proteins from breakdown.",
  },
  {
    id: "guide-2",
    category: "Visual",
    title: "Signs of Bad or Spoiled Silage",
    shortDesc: "Dark brown, caramelized, slimy, or foul-smelling silage must never be fed to milking cows.",
    badge: "DO NOT FEED",
    badgeColor: "unsafe",
    fullDetails: [
      "Caramelized brown or black: Caused by excessive heating during filling (Maillard reaction).",
      "Pungent ammonia or rotten butter odor: Indicates clostridial breakdown and butyric acid formation.",
      "Slimy, mushy texture: Structural fiber breakdown caused by secondary anaerobic bacterial rot.",
      "Health risk: Feeding causes severe drop in milk yield, ketosis, and reproductive failures.",
    ],
    agronomicTip: "Discard any layer exceeding 15 cm around the spoiled pocket. Do not blend spoiled feed.",
  },
  {
    id: "guide-3",
    category: "Visual",
    title: "Identifying Mold and Spores",
    shortDesc: "White, blue-green, or reddish fungal patches represent aerobic deterioration.",
    badge: "MOLD WARNING",
    badgeColor: "unsafe",
    fullDetails: [
      "White fungal crusts: Usually yeast or Geotrichum blooming due to oxygen penetration.",
      "Blue-green crusts: Penicillium roqueforti clusters common in poorly compacted bunker shoulders.",
      "Red or pink tinge: Fusarium species; avoid all contact with breeding cows.",
      "Worker safety: Avoid breathing mold dust when opening pits. Use protective face masks.",
    ],
    agronomicTip: "Borreani et al. (2018): Visible mold indicates significant invisible spore dispersion deep into surrounding feed.",
  },
  {
    id: "guide-4",
    category: "Management",
    title: "Bunker Packing and Tractor Rolling",
    shortDesc: "Pack tightly to expel all air pockets. Target compaction: 240 kg dry matter per m³.",
    badge: "CRITICAL STEP",
    badgeColor: "info",
    fullDetails: [
      "Spread incoming forage in thin progressive layers of 15 cm maximum thickness.",
      "Continuous rolling: Use heavy tractors continuously during the filling process.",
      "Tractor weight rule: (Tons of forage delivered per hour) × 800 = required tractor packing weight (kg).",
      "Compacted forage slows oxygen infiltration and accelerates beneficial anaerobic fermentation.",
    ],
    agronomicTip: "Moran (2005): Every 10% increase in packing density reduces dry matter loss by 3.2%.",
  },
  {
    id: "guide-5",
    category: "Management",
    title: "Airtight Bunker Sealing",
    shortDesc: "Seal the pit on the same day harvest finishes using multi-layer UV-stabilized plastic.",
    badge: "OXYGEN BARRIER",
    badgeColor: "info",
    fullDetails: [
      "Oxygen Barrier: Use true 2-layer film (clear oxygen barrier film underneath heavy black plastic).",
      "Overlap sheets by at least 1.5 meters at all joints.",
      "Continuous edge seal: Use sandbags or clean dirt ridges. Avoid punctured tires that harbor dirty rainwater.",
      "Inspect weekly: Patch tears or rodent damage immediately using UV-resistant silage tape.",
    ],
    agronomicTip: "Prompt sealing prevents surface spoilage, preserving up to 15 tons of top-layer feed per 100-ton bunker.",
  },
  {
    id: "guide-6",
    category: "Fermentation",
    title: "Why pH is the Master Safety Indicator",
    shortDesc: "Acidity (pH 3.8 - 4.2) prevents clostridial spores and harmful microbes from multiplying.",
    badge: "PH SCIENCE",
    badgeColor: "safe",
    fullDetails: [
      "Lactic acid bacteria consume plant sugars and produce natural preservative lactic acid.",
      "When pH drops below 4.2, spoilage bacteria are completely inhibited in absence of oxygen.",
      "If pH remains high (> 4.8), clostridia convert lactic acid to foul butyric acid.",
      "SilageGuard AI probe measures pH deep inside the bunker without letting air penetrate.",
    ],
    agronomicTip: "Pitt (1990): Rapid pH decline within the first 72 hours is the single most critical quality safeguard.",
  },
  {
    id: "guide-7",
    category: "Fermentation",
    title: "Optimal Harvest Moisture (60% - 68%)",
    shortDesc: "Too wet leads to effluent runoff; too dry leads to poor packing and overheating.",
    badge: "MOISTURE BAND",
    badgeColor: "caution",
    fullDetails: [
      "Optimal window: 62% to 68% moisture (32% to 38% dry matter) for corn/maize silage.",
      "Above 72% moisture: High risk of seepage loss, leaching soluble nutrients, and sour clostridial fermentation.",
      "Below 55% moisture: Forage is difficult to compact, leaving trapped oxygen that triggers severe aerobic heating.",
      "Field squeeze test: Squeeze a handful of chopped forage. It should hold shape without dripping water droplets.",
    ],
    agronomicTip: "Calibrate harvest timing using the corn kernel milk line (1/2 to 2/3 milk line stage).",
  },
];

export default function EducationScreen() {
  const { theme } = useTheme();
  const { largeTypography } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeGuide, setActiveGuide] = useState<GuideCard | null>(null);

  const categories = ["All", "Visual", "Fermentation", "Management"];

  const filteredGuides =
    selectedCategory === "All"
      ? GUIDES
      : GUIDES.filter((g) => g.category === selectedCategory);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Learn Silage" showBack fallbackRoute="/home" />

      {/* Category Pills */}
      <View style={styles.pillsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surfaceElevated,
                    borderColor: isSelected ? theme.primaryLight : theme.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isSelected ? theme.textInverse : theme.textSecondary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Guide Cards List */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {filteredGuides.map((guide) => {
          let badgeBg = theme.surfaceElevated;
          let badgeTextColor = theme.textMuted;

          if (guide.badgeColor === "safe") {
            badgeBg = theme.safeBg;
            badgeTextColor = theme.safe;
          } else if (guide.badgeColor === "unsafe") {
            badgeBg = theme.unsafeBg;
            badgeTextColor = theme.unsafe;
          } else if (guide.badgeColor === "caution") {
            badgeBg = theme.cautionBg;
            badgeTextColor = theme.caution;
          } else if (guide.badgeColor === "info") {
            badgeBg = "rgba(56, 189, 248, 0.14)";
            badgeTextColor = theme.accent;
          }

          return (
            <TouchableOpacity
              key={guide.id}
              activeOpacity={0.8}
              onPress={() => setActiveGuide(guide)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{guide.badge}</Text>
                </View>
                <Text style={[styles.categoryTag, { color: theme.textMuted }]}>{guide.category}</Text>
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.text,
                    fontSize: largeTypography ? 17 : 15,
                  },
                ]}
              >
                {guide.title}
              </Text>

              <Text
                style={[
                  styles.cardDesc,
                  {
                    color: theme.textSecondary,
                    fontSize: largeTypography ? 13 : 12,
                  },
                ]}
                numberOfLines={2}
              >
                {guide.shortDesc}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.readMore, { color: theme.primary }]}>Read Farmer Guide →</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full Guide BottomSheet */}
      {activeGuide ? (
        <BottomSheet
          visible={!!activeGuide}
          onClose={() => setActiveGuide(null)}
          title={activeGuide.title}
          subtitle={`Category: ${activeGuide.category}`}
        >
          <View style={styles.sheetBody}>
            <Text style={[styles.sheetSectionTitle, { color: theme.text }]}>Key Diagnostic Indicators:</Text>
            {activeGuide.fullDetails.map((detail, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.textSecondary, fontSize: largeTypography ? 15 : 13 }]}>
                  {detail}
                </Text>
              </View>
            ))}

            <View style={[styles.agronomicBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.cardBorder }]}>
              <Text style={[styles.agronomicTitle, { color: theme.accent }]}>Agronomic Literature Context:</Text>
              <Text style={[styles.agronomicText, { color: theme.textMuted }]}>{activeGuide.agronomicTip}</Text>
            </View>
          </View>
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pillsRow: {
    paddingVertical: SPACING.sm,
  },
  pillsContainer: {
    paddingHorizontal: SPACING.lg,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  pillText: {
    fontSize: 12,
  },
  scrollList: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardTitle: {
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 4,
  },
  cardDesc: {
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: SPACING.sm,
  },
  readMore: {
    fontSize: 12,
    fontWeight: "700",
  },
  sheetBody: {
    paddingVertical: SPACING.sm,
  },
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 18,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  agronomicBox: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  agronomicTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  agronomicText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
});
