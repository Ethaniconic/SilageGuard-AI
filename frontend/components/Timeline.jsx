import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useTranslation } from "../i18n";
import { StatusBadge } from "./StatusBadge";

export function Timeline({ events = [] }) {
  const { theme, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  if (!events || events.length === 0) {
    return (
      <View style={{ padding: spacing.md }}>
        <Text style={[typography.secondary, { color: theme.textMuted }]}>
          {t("noBatchesYet")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        return (
          <View key={event.id || idx} style={styles.row}>
            <View style={styles.lineCol}>
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: event.decision === "SAFE" || event.decision === "GOOD"
                      ? theme.good
                      : event.decision === "CAUTION" || event.decision === "WATCH"
                      ? theme.watch
                      : theme.highRisk,
                  },
                ]}
              />
              {!isLast ? (
                <View style={[styles.vertLine, { backgroundColor: theme.border }]} />
              ) : null}
            </View>

            <View
              style={[
                styles.content,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderRadius: radius.medium,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.headerRow}>
                <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                  {event.timeLabel || event.observed_at || t("recentRecords")}
                </Text>
                <StatusBadge status={event.decision || "GOOD"} size="small" />
              </View>

              {event.note ? (
                <Text style={[typography.secondary, { color: theme.textSecondary, marginTop: 4 }]}>
                  {event.note}
                </Text>
              ) : null}

              <View style={styles.readingsRow}>
                {event.ph ? (
                  <Text style={[typography.caption, { color: theme.textMuted, marginRight: 12 }]}>
                    pH: {event.ph}
                  </Text>
                ) : null}
                {event.moisture ? (
                  <Text style={[typography.caption, { color: theme.textMuted, marginRight: 12 }]}>
                    {t("moisture")}: {event.moisture}%
                  </Text>
                ) : null}
                {event.temperature ? (
                  <Text style={[typography.caption, { color: theme.textMuted }]}>
                    {t("coreTemp")}: {event.temperature}°C
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
  },
  lineCol: {
    alignItems: "center",
    width: 28,
    marginRight: 8,
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 18,
  },
  vertLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  readingsRow: {
    flexDirection: "row",
    marginTop: 8,
  },
});
