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
import { getAvailableExercises, getAssignedExercises, ExerciseTypeRecord } from "@services/exerciseAssignmentService";

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseTypeId: string, exerciseName?: string) => void;
  selectedExerciseId?: string | null;
  patientId?: string | null; // If provided, show only assigned exercises
  showCreateOption?: boolean; // Show option to create/assign new exercise
  onCreateNew?: () => void; // Callback when user wants to create new exercise
}

const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedExerciseId,
  patientId,
  showCreateOption = false,
  onCreateNew,
}) => {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<ExerciseTypeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      // Always reload when modal becomes visible to get latest data
      loadExercises();
    }
  }, [visible, patientId]);
  
  // Also reload when patientId changes while modal is visible
  useEffect(() => {
    if (visible && patientId) {
      loadExercises();
    }
  }, [patientId]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      // Clear search when loading to show all results
      setSearchQuery("");
      
      if (patientId) {
        // Load only assigned exercises for the patient
        console.log(`[ExercisePickerModal] Loading assigned exercises for patient: ${patientId}`);
        const assignedExercises = await getAssignedExercises(patientId);
        console.log(`[ExercisePickerModal] Found ${assignedExercises.length} assigned exercises`);
        
        // Log each exercise to debug
        assignedExercises.forEach((ae, idx) => {
          console.log(`[ExercisePickerModal] Exercise ${idx + 1}:`, {
            assignmentId: ae.id,
            exerciseTypeId: ae.exerciseTypeId,
            hasExerciseType: !!ae.exerciseType,
            exerciseTypeName: ae.exerciseType?.name,
          });
        });
        
        // Extract ExerciseTypeRecord from AssignedExerciseWithDetails
        // Only include exercises that have a valid exerciseType
        const exerciseTypes = assignedExercises
          .map((ae) => ae.exerciseType)
          .filter((et): et is ExerciseTypeRecord => et !== undefined);
        console.log(`[ExercisePickerModal] Extracted ${exerciseTypes.length} exercise types (filtered from ${assignedExercises.length} assignments)`);
        
        if (exerciseTypes.length === 0 && assignedExercises.length > 0) {
          console.warn(`[ExercisePickerModal] WARNING: Found ${assignedExercises.length} assignments but 0 valid exercise types. This may indicate missing exercise type records.`);
        }
        
        setExercises(exerciseTypes);
      } else {
        // Load all available exercises (for creating new assignments)
        const allExercises = await getAvailableExercises();
        setExercises(allExercises);
      }
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

  const handleSelect = (exercise: ExerciseTypeRecord) => {
    onSelect(exercise.id, exercise.name);
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
        onPress={() => handleSelect(item)}
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
              {patientId ? "Select Assigned Exercise" : "Select Exercise"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {showCreateOption && onCreateNew && (
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: colors.primary + "15", borderColor: colors.primary },
              ]}
              onPress={() => {
                onCreateNew();
                onClose();
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.createButtonText, { color: colors.primary }]}>
                Create/Assign New Exercise
              </Text>
            </TouchableOpacity>
          )}

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
                  <Ionicons
                    name="barbell-outline"
                    size={48}
                    color={colors.textSecondary}
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {patientId
                      ? "No exercises assigned to this patient yet"
                      : "No exercises found"}
                  </Text>
                  {patientId && showCreateOption && onCreateNew && (
                    <TouchableOpacity
                      style={[
                        styles.createButton,
                        {
                          backgroundColor: colors.primary,
                          marginTop: 16,
                          borderWidth: 0,
                        },
                      ]}
                      onPress={() => {
                        onCreateNew();
                        onClose();
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={[styles.createButtonText, { color: "#fff" }]}>
                        Assign Exercise
                      </Text>
                    </TouchableOpacity>
                  )}
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
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ExercisePickerModal;

