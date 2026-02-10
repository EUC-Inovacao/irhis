import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@theme/ThemeContext";
import { useAuth } from "@context/AuthContext";
import { getSessionById } from "../services/sessionService";
import type { Session } from "../types";
import { FeedbackRepository } from "../storage/repositories";
import SessionFeedbackModal from "@components/SessionFeedbackModal";
import MetricsDisplayCard from "@components/MetricsDisplayCard";

const SessionDetailScreen = ({ route, navigation }: any) => {
  const { sessionId, patientId } = route.params as {
    sessionId: string;
    patientId: string;
  };
  const { colors } = useTheme();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<any[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);
        const sessionData = await getSessionById(sessionId);
        setSession(sessionData);
      } catch (err: any) {
        console.error("Failed to load session:", err);
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const allFeedback = await FeedbackRepository.listByPatient(patientId);
        // Filter feedback for this specific session
        const feedbackForSession = allFeedback.filter(
          (fb) => fb.sessionId === sessionId
        );
        setSessionFeedback(feedbackForSession);
      } catch (error) {
        console.error("Failed to load feedback:", error);
      }
    };

    if (session) {
      loadFeedback();
    }
  }, [session, sessionId, patientId]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || "Session not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = session.timeCreated
    ? new Date(session.timeCreated).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const metrics = session.metrics ?? [];

  const apiToDisplay = (m: any) => ({
    rom: m?.AvgROM ?? m?.avgROM ?? null,
    maxFlexion: m?.MaxROM ?? m?.maxROM ?? null,
    maxExtension: m?.MinROM ?? m?.minROM ?? null,
    repetitions: m?.Repetitions ?? null,
    avgVelocity: m?.AvgVelocity ?? m?.avgVelocity ?? null,
    peakVelocity: m?.MaxVelocity ?? m?.maxVelocity ?? null,
    p95Velocity: m?.P95Velocity ?? m?.p95Velocity ?? null,
    centerMassDisplacement: m?.CenterMassDisplacement ?? m?.centerMassDisplacement ?? null,
  });

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {session.exerciseDescription || session.exerciseType || "Exercise Session"}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {dateStr}
          </Text>
          <View style={styles.row}>
            {session.repetitions != null && (
              <View style={[styles.badge, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {session.repetitions} reps
                </Text>
              </View>
            )}
            {session.duration && (
              <View style={[styles.badge, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {session.duration}
                </Text>
              </View>
            )}
          </View>
          {session.exerciseDescription && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {session.exerciseDescription}
            </Text>
          )}
        </View>

        {/* Session info */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Session info</Text>
          <View style={{ gap: 8, width: "100%" }}>
            {session.duration && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Duration</Text>
                <Text style={[styles.metricValue, { color: colors.text, flex: 1 }]}>{session.duration}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
              <Ionicons name="finger-print-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Session ID</Text>
              <Text style={[styles.metricValue, { color: colors.text, flex: 1, fontSize: 12 }]} numberOfLines={1}>{session.id}</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics - same layout as live session (LocalAnalysisResults) */}
        {metrics.length > 0 && (
          <View style={[styles.section, styles.metricsSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Performance Metrics
            </Text>
            <View style={[metrics.length > 1 ? styles.jointGrid : styles.metricsSingleColumn]}>
              {metrics.map((m, idx) => {
                const joint = (m as any).Joint ?? (m as any).joint ?? "Session";
                const side = (m as any).Side ?? (m as any).side ?? "";
                const sideLabel = side ? `${joint} · ${side}` : joint;
                return (
                  <MetricsDisplayCard
                    key={idx}
                    title=""
                    sideLabel={sideLabel}
                    metrics={{
                      ...apiToDisplay(m),
                      repetitions: (m as any).Repetitions ?? (m as any).repetitions ?? session.repetitions ?? undefined,
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Feedback Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.feedbackHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Patient Feedback
            </Text>
            {/* Show "Provide Feedback" button for patients if no feedback exists */}
            {user?.role === "patient" && user.id === patientId && sessionFeedback.length === 0 && (
              <TouchableOpacity
                style={[styles.feedbackButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFeedbackModal(true)}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
                <Text style={[styles.feedbackButtonText, { color: colors.white }]}>
                  Provide Feedback
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {sessionFeedback.length > 0 ? (
            sessionFeedback.map((fb, idx) => (
              <View
                key={idx}
                style={[
                  styles.feedbackCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.feedbackMetrics}>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="bandage-outline" size={18} color="#FF6B6B" />
                    <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
                      Pain
                    </Text>
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      {(fb as any).Pain ?? (fb as any).pain ?? "—"}/10
                    </Text>
                  </View>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="battery-half-outline" size={18} color={colors.warning} />
                    <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
                      Fatigue
                    </Text>
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      {(fb as any).Fatigue ?? (fb as any).fatigue ?? "—"}/10
                    </Text>
                  </View>
                  <View style={styles.feedbackMetric}>
                    <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                    <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
                      Difficulty
                    </Text>
                    <Text style={[styles.feedbackValue, { color: colors.text }]}>
                      {(fb as any).Difficulty ?? (fb as any).difficulty ?? "—"}/10
                    </Text>
                  </View>
                </View>
                {((fb as any).Comments || (fb as any).comments) && (
                  <Text
                    style={[styles.comments, { color: colors.textSecondary }]}
                  >
                    {(fb as any).Comments || (fb as any).comments}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={[styles.noFeedbackText, { color: colors.textSecondary }]}>
              {user?.role === "patient" && user.id === patientId
                ? "No feedback provided yet. Click the button above to provide feedback."
                : "No feedback recorded for this session."}
            </Text>
          )}
        </View>

        {/* No Data State */}
        {metrics.length === 0 && sessionFeedback.length === 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Ionicons
              name="information-circle-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.noData, { color: colors.textSecondary }]}>
              No metrics or feedback recorded for this session.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Feedback Modal */}
      {user?.role === "patient" && user.id === patientId && (
        <SessionFeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={async () => {
            // Reload feedback after submission
            try {
              const allFeedback = await FeedbackRepository.listByPatient(patientId);
              const feedbackForSession = allFeedback.filter(
                (fb) => fb.sessionId === sessionId
              );
              setSessionFeedback(feedbackForSession);
            } catch (error) {
              console.error("Failed to reload feedback:", error);
            }
            setShowFeedbackModal(false);
          }}
          sessionId={sessionId}
          patientId={patientId}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  metricsSection: {
    alignSelf: "stretch",
  },
  metricsSingleColumn: {
    width: "100%",
    alignSelf: "stretch",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noFeedbackText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 16,
  },
  jointGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  feedbackMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  feedbackMetric: {
    alignItems: "center",
    gap: 4,
  },
  feedbackLabel: {
    fontSize: 12,
  },
  feedbackValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  comments: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: "italic",
  },
  noData: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
});

export default SessionDetailScreen;
