import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useTheme } from "@theme/ThemeContext";
import { getSessionHistory } from "@services/sessionService";
import { getPatientFeedback } from "@services/feedbackService";
import { useTranslation } from "react-i18next";

interface PatientProgressGraphsProps {
  patientId: string;
}

const PatientProgressGraphs: React.FC<PatientProgressGraphsProps> = ({
  patientId,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
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
          {t("patientProgress.title")}
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          {t("patientProgress.loading")}
        </Text>
      </View>
    );
  }

  if (!sessions.length || !hasMetrics) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("patientProgress.title")}
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          {t("patientProgress.empty")}
        </Text>
      </View>
    );
  }

  const labels = sessions.map((s) => {
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
    color: () => colors.primary,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    },
  };

  const helperText =
    feedbackCount > 0
      ? t("patientProgress.basedOnSessionsAndFeedback", {
          sessions: sessions.length,
          feedback: feedbackCount,
        })
      : t("patientProgress.basedOnSessions", { sessions: sessions.length });

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("patientProgress.title")}
      </Text>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
        {helperText}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartsRow}
      >
        <View style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            {t("patientProgress.romProgression")}
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

        <View style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            {t("patientProgress.repetitions")}
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

        {scoreData.some((v) => v && v > 0) && (
          <View style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t("patientProgress.sessionScore")}
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
