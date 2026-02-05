import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@theme/ThemeContext";
import type { Session, SessionMetric, SessionFeedback } from "../types";

const ExerciseHistoryDetailScreen = ({ route }: any) => {
  const { session } = route.params as { session: Session };
  const { colors } = useTheme();

  const dateStr = session.timeCreated
    ? new Date(session.timeCreated).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const metrics: SessionMetric[] = session.metrics ?? [];
  const feedbackList: SessionFeedback[] = session.feedback ?? [];

  const hasVelocity = metrics.some(
    (m) =>
      (m as any).AvgVelocity != null ||
      (m as any).P95Velocity != null ||
      (m as any).MinVelocity != null ||
      (m as any).MaxVelocity != null
  );
  const hasROM = metrics.some(
    (m) =>
      (m as any).AvgROM != null ||
      (m as any).MinROM != null ||
      (m as any).MaxROM != null
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {session.exerciseType || "Exercise"}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {dateStr}
          </Text>
          <View style={styles.row}>
            {session.repetitions != null && (
              <View style={styles.badge}>
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {session.repetitions} reps
                </Text>
              </View>
            )}
            {session.duration && (
              <View style={styles.badge}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {session.duration}
                </Text>
              </View>
            )}
          </View>
          {session.exerciseDescription ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {session.exerciseDescription}
            </Text>
          ) : null}
        </View>

        {metrics.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Metrics
            </Text>
            {metrics.map((m, idx) => (
              <View key={idx} style={styles.metricRow}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  {(m as any).Joint ?? "—"} / {(m as any).Side ?? "—"}
                </Text>
                <View style={styles.metricGrid}>
                  {hasVelocity && (
                    <>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        Avg velocity: {(m as any).AvgVelocity ?? "—"}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        P95 velocity: {(m as any).P95Velocity ?? "—"}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        Min/Max: {(m as any).MinVelocity ?? "—"} / {(m as any).MaxVelocity ?? "—"}
                      </Text>
                    </>
                  )}
                  {hasROM && (
                    <>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        Avg ROM: {(m as any).AvgROM ?? "—"}
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        Min/Max ROM: {(m as any).MinROM ?? "—"} / {(m as any).MaxROM ?? "—"}
                      </Text>
                    </>
                  )}
                  {(m as any).CenterMassDisplacement ? (
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      Center of mass: {(m as any).CenterMassDisplacement}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {feedbackList.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Feedback
            </Text>
            {feedbackList.map((fb, idx) => (
              <View key={idx} style={styles.feedbackRow}>
                <View style={styles.feedbackMetrics}>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="bandage-outline" size={16} color={colors.primary} />
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      Pain: {(fb as any).Pain ?? "—"}/10
                    </Text>
                  </View>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="battery-half-outline" size={16} color={colors.primary} />
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      Fatigue: {(fb as any).Fatigue ?? "—"}/10
                    </Text>
                  </View>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      Difficulty: {(fb as any).Difficulty ?? "—"}/10
                    </Text>
                  </View>
                </View>
                {(fb as any).Comments ? (
                  <Text style={[styles.comments, { color: colors.textSecondary }]}>
                    {(fb as any).Comments}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {metrics.length === 0 && feedbackList.length === 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.noData, { color: colors.textSecondary }]}>
              No metrics or feedback recorded for this session.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 14, marginBottom: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { fontSize: 14 },
  description: { fontSize: 14, lineHeight: 20 },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  metricRow: { marginBottom: 12 },
  metricLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  metricGrid: { gap: 4 },
  metricValue: { fontSize: 14 },
  feedbackRow: { marginBottom: 12 },
  feedbackMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 8 },
  feedbackMetric: { flexDirection: "row", alignItems: "center", gap: 4 },
  feedbackValue: { fontSize: 14 },
  comments: { fontSize: 14, fontStyle: "italic" },
  noData: { textAlign: "center", fontSize: 14 },
});

export default ExerciseHistoryDetailScreen;
