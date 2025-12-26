import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useTheme } from "@theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { FeedbackRecord } from "@storage/repositories";
import { getPatientFeedback } from "@services/feedbackService";

interface PatientFeedbackSectionProps {
  patientId: string;
}

// Default fallback colors
const DEFAULT_COLORS = {
  card: '#FFFFFF',
  background: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  primary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const PatientFeedbackSection: React.FC<PatientFeedbackSectionProps> = ({
  patientId,
}) => {
  const theme = useTheme();
  
  // Safely get colors with fallback - ensure it's always an object
  const colors = (theme?.colors && typeof theme.colors === 'object') 
    ? theme.colors 
    : DEFAULT_COLORS;
  
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [patientId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const feedbackData = await getPatientFeedback(patientId);
      // Sort by timestamp (oldest first for charts)
      feedbackData.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setFeedback(feedbackData);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Patient Feedback & Progression
        </Text>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading feedback...
        </Text>
      </View>
    );
  }

  if (feedback.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Patient Feedback & Progression
        </Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubble-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No feedback available yet
          </Text>
        </View>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 64;

  // Format dates for labels
  const labels = feedback.map((f) => {
    const date = new Date(f.timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  // Pain progression chart (lower is better)
  const painData = {
    labels,
    datasets: [
      {
        data: feedback.map((f) => f.pain),
        color: (opacity = 1) => "#FF6B6B", // Red for pain
        strokeWidth: 2,
      },
    ],
  };

  // Fatigue progression chart
  const fatigueWarningColor = colors.warning || "#FF9800";
  const fatigueData = {
    labels,
    datasets: [
      {
        data: feedback.map((f) => f.fatigue),
        color: (opacity = 1) => fatigueWarningColor,
        strokeWidth: 2,
      },
    ],
  };

  // Difficulty progression chart
  const difficultyInfoColor = colors.info || "#2196F3";
  const difficultyData = {
    labels,
    datasets: [
      {
        data: feedback.map((f) => f.difficulty),
        color: (opacity = 1) => difficultyInfoColor,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    },
  };

  // Calculate trends
  const latestFeedback = feedback[feedback.length - 1];
  const earliestFeedback = feedback[0];
  const painTrend = latestFeedback.pain - earliestFeedback.pain;
  const fatigueTrend = latestFeedback.fatigue - earliestFeedback.fatigue;
  const difficultyTrend =
    latestFeedback.difficulty - earliestFeedback.difficulty;

  const getTrendIcon = (trend: number) => {
    if (trend < -1) return "trending-down"; // Improving
    if (trend > 1) return "trending-up"; // Worsening
    return "remove"; // Stable
  };

  const getTrendColor = (trend: number) => {
    if (trend < -1) return colors.success; // Improving (lower is better for these metrics)
    if (trend > 1) return "#FF6B6B"; // Worsening
    return colors.textSecondary; // Stable
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Patient Feedback & Progression
      </Text>
      <Text
        style={[
          styles.sectionSubtitle,
          { color: colors.textSecondary, marginBottom: 16 },
        ]}
      >
        {feedback.length} feedback entries over time
      </Text>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="bandage-outline" size={20} color="#FF6B6B" />
            <Ionicons
              name={getTrendIcon(painTrend) as any}
              size={16}
              color={getTrendColor(painTrend)}
            />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {latestFeedback.pain}/10
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Pain Level
          </Text>
          <Text
            style={[
              styles.summaryTrend,
              { color: getTrendColor(painTrend) },
            ]}
          >
            {painTrend < 0 ? "↓" : painTrend > 0 ? "↑" : "→"}{" "}
            {Math.abs(painTrend)} from start
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
          <View style={styles.summaryHeader}>
            <Ionicons
              name="battery-half-outline"
              size={20}
              color={colors.warning || "#FF9800"}
            />
            <Ionicons
              name={getTrendIcon(fatigueTrend) as any}
              size={16}
              color={getTrendColor(fatigueTrend)}
            />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {latestFeedback.fatigue}/10
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Fatigue
          </Text>
          <Text
            style={[
              styles.summaryTrend,
              { color: getTrendColor(fatigueTrend) },
            ]}
          >
            {fatigueTrend < 0 ? "↓" : fatigueTrend > 0 ? "↑" : "→"}{" "}
            {Math.abs(fatigueTrend)} from start
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="barbell-outline" size={20} color={colors.info || "#2196F3"} />
            <Ionicons
              name={getTrendIcon(difficultyTrend) as any}
              size={16}
              color={getTrendColor(difficultyTrend)}
            />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {latestFeedback.difficulty}/10
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Difficulty
          </Text>
          <Text
            style={[
              styles.summaryTrend,
              { color: getTrendColor(difficultyTrend) },
            ]}
          >
            {difficultyTrend < 0 ? "↓" : difficultyTrend > 0 ? "↑" : "→"}{" "}
            {Math.abs(difficultyTrend)} from start
          </Text>
        </View>
      </View>

      {/* Pain Progression Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <Ionicons name="bandage-outline" size={20} color="#FF6B6B" />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Pain Level Over Time
            </Text>
          </View>
          <Text style={[styles.chartValue, { color: colors.text }]}>
            {latestFeedback.pain}/10
          </Text>
        </View>
        <LineChart
          data={painData}
          width={chartWidth}
          height={160}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          }}
          bezier
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withInnerLines={true}
          withOuterLines={false}
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix="/10"
          yAxisInterval={1}
        />
      </View>

      {/* Fatigue Progression Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <Ionicons
              name="battery-half-outline"
              size={20}
              color={colors.warning || "#FF9800"}
            />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Fatigue Over Time
            </Text>
          </View>
          <Text style={[styles.chartValue, { color: colors.text }]}>
            {latestFeedback.fatigue}/10
          </Text>
        </View>
        <LineChart
          data={fatigueData}
          width={chartWidth}
          height={160}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) =>
              `rgba(255, 152, 0, ${opacity})`,
          }}
          bezier
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withInnerLines={true}
          withOuterLines={false}
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix="/10"
          yAxisInterval={1}
        />
      </View>

      {/* Difficulty Progression Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <Ionicons name="barbell-outline" size={20} color={colors.info || "#2196F3"} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Exercise Difficulty Over Time
            </Text>
          </View>
          <Text style={[styles.chartValue, { color: colors.text }]}>
            {latestFeedback.difficulty}/10
          </Text>
        </View>
        <LineChart
          data={difficultyData}
          width={chartWidth}
          height={160}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          }}
          bezier
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withInnerLines={true}
          withOuterLines={false}
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix="/10"
          yAxisInterval={1}
        />
      </View>

      {/* Recent Feedback List */}
      <View style={styles.feedbackListContainer}>
        <Text style={[styles.feedbackListTitle, { color: colors.text }]}>
          Recent Feedback Entries
        </Text>
        {feedback
          .slice()
          .reverse()
          .slice(0, 5)
          .map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.feedbackItem,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.feedbackItemHeader}>
                <Text
                  style={[styles.feedbackDate, { color: colors.textSecondary }]}
                >
                  {new Date(item.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <View style={styles.feedbackMetrics}>
                  <View style={styles.metricBadge}>
                    <Ionicons name="bandage-outline" size={14} color="#FF6B6B" />
                    <Text style={[styles.metricText, { color: colors.text }]}>
                      {item.pain}
                    </Text>
                  </View>
                  <View style={styles.metricBadge}>
                    <Ionicons
                      name="battery-half-outline"
                      size={14}
                      color={colors.warning || "#FF9800"}
                    />
                    <Text style={[styles.metricText, { color: colors.text }]}>
                      {item.fatigue}
                    </Text>
                  </View>
                  <View style={styles.metricBadge}>
                    <Ionicons
                      name="barbell-outline"
                      size={14}
                      color={colors.info || "#2196F3"}
                    />
                    <Text style={[styles.metricText, { color: colors.text }]}>
                      {item.difficulty}
                    </Text>
                  </View>
                </View>
              </View>
              {item.comments && (
                <Text
                  style={[
                    styles.feedbackComment,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.comments}
                </Text>
              )}
            </View>
          ))}
      </View>
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
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryTrend: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  chart: {
    marginLeft: -10,
    borderRadius: 16,
  },
  feedbackListContainer: {
    marginTop: 24,
  },
  feedbackListTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  feedbackItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  feedbackItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 14,
    fontWeight: "500",
  },
  feedbackMetrics: {
    flexDirection: "row",
    gap: 12,
  },
  metricBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 14,
    fontWeight: "600",
  },
  feedbackComment: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },
});

export default PatientFeedbackSection;

