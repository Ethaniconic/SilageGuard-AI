/**
 * SILAGEGUARD AI V4 — Industrial BottomSheet Component
 * Supports expandable farmer-first technical diagnostics (RULE 5) and modal interactions.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { RADIUS, SPACING } from "../theme";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightRatio = 0.85,
}) => {
  const { theme, largeTypography } = useAppStore();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <SafeAreaView
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.cardBorder,
                  maxHeight: `${Math.round(maxHeightRatio * 100)}%` as any,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.handleWrapper}>
                <View style={[styles.handle, { backgroundColor: theme.cardBorderHover }]} />
              </View>

              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                <View style={styles.headerTextContainer}>
                  <Text
                    style={[
                      styles.title,
                      {
                        color: theme.text,
                        fontSize: largeTypography ? 20 : 18,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text
                      style={[
                        styles.subtitle,
                        {
                          color: theme.textMuted,
                          fontSize: largeTypography ? 14 : 12,
                        },
                      ]}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 24 : SPACING.lg,
  },
  handleWrapper: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: RADIUS.full,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.md,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContainer: {
    padding: SPACING.lg,
  },
});
