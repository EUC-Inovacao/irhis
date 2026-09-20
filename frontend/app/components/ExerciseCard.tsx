import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { AssignedExerciseWithDetails } from "@services/exerciseAssignmentService";
import { getSessionHistory } from "@services/sessionService";

interface ExerciseCardProps {
  exercise: AssignedExerciseWithDetails;
  patientId: string;
  onPress?: () => void;
  /**
   * Show the detailed metrics row (reps, sets and the last session date)
   * instead of the compact reps/sets line.
   */
  showDetails?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  patientId,
  onPress,
  showDetails = true,
}) => {
  const { colors } = useTheme();
  const [lastSessionDate, setLastSessionDate] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (showDetails) {
      loadLastSessionDate();
    }
  }, [exercise.id, patientId, showDetails]);

  const loadLastSessionDate = async () => {
    try {
      const sessions = await getSessionHistory(patientId, exercise.exerciseTypeId);
      const lastSession = sessions[0];

      if (lastSession) {
        const ts = (lastSession as any).startTime ?? (lastSession as any).timeCreated ?? lastSession.timeCreated;
        const date = new Date(ts);
        setLastSessionDate(isNaN(date.getTime()) ? null : date.toLocaleDateString());
      }
    } catch (error) {
      console.error("Error loading last session date:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "knee":
        return "body-outline";
      case "hip":
        return "fitness-outline";
      case "ankle":
        return "footsteps-outline";
      default:
        return "barbell-outline";
    }
  };

  const exerciseType = exercise.exerciseType;
  const category = exerciseType?.category || "general";
  const isCompleted = exercise.completed === 1;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isCompleted ? colors.success : colors.mediumGray,
          borderWidth: isCompleted ? 2 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.exerciseInfo}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isCompleted
                  ? colors.success + "15"
                  : colors.primary + "15",
              },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(category) as any}
              size={24}
              color={isCompleted ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.exerciseDetails}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>
              {exerciseType?.name || "Unknown Exercise"}
            </Text>
            {exerciseType?.description && (
              <Text
                style={[
                  styles.exerciseDescription,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {exerciseType.description}
              </Text>
            )}
          </View>
        </View>
        {isCompleted && (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: colors.success + "15" },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        )}
      </View>

      {showDetails && (
        <>
          <View style={styles.metricsRow}>
            {exercise.targetReps && (
              <View style={styles.metricBadge}>
                <Ionicons
                  name="repeat"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.metricText, { color: colors.textSecondary }]}
                >
                  {exercise.targetReps} reps
                </Text>
              </View>
            )}
            {exercise.targetSets && (
              <View style={styles.metricBadge}>
                <Ionicons
                  name="layers"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.metricText, { color: colors.textSecondary }]}
                >
                  {exercise.targetSets} sets
                </Text>
              </View>
            )}
            {lastSessionDate && (
              <View style={styles.metricBadge}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.metricText, { color: colors.textSecondary }]}
                >
                  {lastSessionDate}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {!showDetails && (
        <View style={styles.metricsRow}>
          {exercise.targetReps && (
            <Text style={[styles.metricText, { color: colors.textSecondary }]}>
              {exercise.targetReps} reps
            </Text>
          )}
          {exercise.targetSets && (
            <Text style={[styles.metricText, { color: colors.textSecondary }]}>
              • {exercise.targetSets} sets
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  exerciseInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  completedBadge: {
    padding: 4,
    borderRadius: 12,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  metricBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 12,
  },
});

export default ExerciseCard;

