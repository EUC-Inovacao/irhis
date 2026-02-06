import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useTheme } from "@theme/ThemeContext";
import { getSessionHistory, SessionWithMetrics } from "@services/localSessionService";
import { getPatientFeedback } from "@services/feedbackService";

interface PatientProgressGraphsProps {
  patientId: string;
}

const PatientProgressGraphs: React.FC<PatientProgressGraphsProps> = ({
  patientId,
}) => {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<SessionWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMetrics, setHasMetrics] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 48;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const history = await getSessionHistory(patientId);
        const fb = await getPatientFeedback(patientId);
        setSessions(
          history
            .slice()
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
            )
        );
        setHasMetrics(
          history.some((s) => s.metrics && (s.metrics.rom || s.metrics.reps))
        );
        setFeedbackCount(fb.length);
      } catch (error) {
        console.error("Failed to load progress graphs data:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId]);

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Progress Overview
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Loading progress data...
        </Text>
      </View>
    );
  }

  if (!sessions.length || !hasMetrics) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Progress Overview
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          No session metrics available yet. Once you analyze or record
          exercises, ROM, repetitions, and other metrics will appear here.
        </Text>
      </View>
    );
  }

  const labels = sessions.map((s, idx) => {
    const d = new Date(s.startTime);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const romData = sessions.map((s) => s.metrics?.rom ?? 0);
  const repsData = sessions.map((s) => s.metrics?.reps ?? 0);
  const scoreData = sessions.map((s) => s.metrics?.score ?? 0);

  const baseChartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    },
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Progress Overview
      </Text>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
        Based on {sessions.length} sessions
        {feedbackCount ? ` and ${feedbackCount} feedback entries` : ""}.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartsRow}
      >
        {/* ROM progression */}
        <View style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            ROM Progression
          </Text>
          <LineChart
            data={{
              labels,
              datasets: [
                {
                  data: romData,
                  color: () => colors.primary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            chartConfig={baseChartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Repetitions progression */}
        <View style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Repetitions
          </Text>
          <BarChart
            data={{
              labels,
              datasets: [{ data: repsData }],
            }}
            width={chartWidth}
            height={220}
            chartConfig={{
              ...baseChartConfig,
              decimalPlaces: 0,
            }}
            style={styles.chart}
          />
        </View>

        {/* Session score (if available) */}
        {scoreData.some((v) => v && v > 0) && (
          <View style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Session Score
            </Text>
            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: scoreData,
                    color: () => colors.success || colors.primary,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...baseChartConfig,
                decimalPlaces: 1,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 16,
  },
  chartsRow: {
    paddingVertical: 4,
    gap: 16,
  },
  chartCard: {
    marginRight: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  chart: {
    borderRadius: 12,
  },
});

export default PatientProgressGraphs;

