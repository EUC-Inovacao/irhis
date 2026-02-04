import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@theme/ThemeContext";
import { useAuth } from "@context/AuthContext";
import { usePatients } from "@context/PatientContext";
import type { Session } from "../types";

const ExerciseHistoryScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    sessionsByPatient,
    fetchPatientSessions,
    loading,
  } = usePatients();
  const patientId = user?.id ?? "";
  const { completed = [] } = sessionsByPatient[patientId] ?? { completed: [] as Session[] };

  useEffect(() => {
    if (patientId) {
      fetchPatientSessions(patientId);
    }
  }, [patientId, fetchPatientSessions]);

  const onRefresh = () => {
    if (patientId) fetchPatientSessions(patientId);
  };

  const renderItem = ({ item }: { item: Session }) => {
    const dateStr = item.timeCreated
      ? new Date(item.timeCreated).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
    const reps = item.repetitions != null ? `${item.repetitions} reps` : "";
    const duration = item.duration ? ` • ${item.duration}` : "";
    const summary = [reps, duration].filter(Boolean).join(" ") || "—";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() =>
          navigation.navigate("ExerciseHistoryDetail", { session: item })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="barbell-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.exerciseType || "Exercise"}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {dateStr}
            </Text>
            <Text style={[styles.summary, { color: colors.textSecondary }]}>
              {summary}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Exercise History
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Completed sessions with metrics and feedback
        </Text>
        {loading && completed.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        ) : completed.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="fitness-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No completed exercises yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your completed sessions will appear here with metrics and feedback.
            </Text>
          </View>
        ) : (
          <FlatList
            data={completed}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  list: { paddingBottom: 24 },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBlock: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  date: { fontSize: 13, marginBottom: 2 },
  summary: { fontSize: 13 },
  empty: { textAlign: "center", marginTop: 24 },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
});

export default ExerciseHistoryScreen;
