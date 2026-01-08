import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  TextInput,
  SectionList,
} from "react-native";
import { useTheme } from "@theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { getAvailableExercises, ExerciseTypeRecord } from "@services/exerciseAssignmentService";

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseTypeId: string) => void;
  selectedExerciseId?: string | null;
}

const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedExerciseId,
}) => {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<ExerciseTypeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const allExercises = await getAvailableExercises();
      setExercises(allExercises);
    } catch (error) {
      console.error("Error loading exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const groupedExercises = filteredExercises.reduce(
    (acc, exercise) => {
      const category = exercise.category || "general";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exercise);
      return acc;
    },
    {} as Record<string, ExerciseTypeRecord[]>
  );

  const sections = Object.keys(groupedExercises).map((category) => ({
    title: category.charAt(0).toUpperCase() + category.slice(1),
    data: groupedExercises[category],
  }));

  const handleSelect = (exerciseTypeId: string) => {
    onSelect(exerciseTypeId);
    onClose();
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

  const renderExerciseItem = ({ item }: { item: ExerciseTypeRecord }) => {
    const isSelected = item.id === selectedExerciseId;

    return (
      <TouchableOpacity
        style={[
          styles.exerciseItem,
          {
            backgroundColor: isSelected
              ? colors.primary + "15"
              : colors.background,
            borderColor: isSelected ? colors.primary : colors.mediumGray,
          },
        ]}
        onPress={() => handleSelect(item.id)}
      >
        <View style={styles.exerciseItemContent}>
          <View
            style={[
              styles.exerciseIcon,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(item.category) as any}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.exerciseItemInfo}>
            <Text
              style={[styles.exerciseItemName, { color: colors.text }]}
            >
              {item.name}
            </Text>
            {item.description && (
              <Text
                style={[
                  styles.exerciseItemDescription,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
            <View style={styles.exerciseItemMeta}>
              {item.targetReps && (
                <View style={styles.metaBadge}>
                  <Ionicons
                    name="repeat"
                    size={12}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.targetReps} reps
                  </Text>
                </View>
              )}
              {item.targetSets && (
                <View style={styles.metaBadge}>
                  <Ionicons
                    name="layers"
                    size={12}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.targetSets} sets
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Exercise
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.mediumGray,
              },
            ]}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />

          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Loading exercises...
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderExerciseItem}
              renderSectionHeader={({ section: { title } }) => (
                <View
                  style={[
                    styles.sectionHeader,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[styles.sectionHeaderText, { color: colors.text }]}
                  >
                    {title}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No exercises found
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  exerciseItemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseItemInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseItemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseItemMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});

export default ExercisePickerModal;

