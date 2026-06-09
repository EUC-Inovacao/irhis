import api from "./api";

export interface ExerciseTypeRecord {
  id: string;
  name: string;
  description?: string;
  targetReps?: number;
  targetSets?: number;
  instructions?: string;
  category: "knee" | "hip" | "ankle" | "general";
}

export interface AssignSessionPayload {
  exerciseId: string;
  startDate: string;   
  endDate: string;     
  frequency: number;
  notes?: string;
}

export interface AssignedExerciseWithDetails {
  id: string;
  patientId: string;
  exerciseTypeId: string;
  assignedDate?: string;
  completed: 0 | 1;
  targetReps?: number | null;
  targetSets?: number | null;
  exerciseType?: ExerciseTypeRecord;
}

export async function assignPatientSession(
  patientId: string,
  payload: AssignSessionPayload
): Promise<void> {
  await api.post(`/patients/${patientId}/sessions`, {
    exercise_id: payload.exerciseId,
    start_date: payload.startDate,
    end_date: payload.endDate,
    frequency: payload.frequency,
    notes: payload.notes ?? ""
  });
}

export async function getAvailableExercises(): Promise<ExerciseTypeRecord[]> {
  try {
    const res = await api.get<ExerciseTypeRecord[]>("/exercise-types");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch available exercises:", error);
    return [];
  }
}

export async function getOrCreateExerciseTypeByName(
  availableExerciseTypes: ExerciseTypeRecord[],
  draft: {
    name: string;
    instructions?: string;
    targetRepetitions?: number;
    targetSets?: number;
  }
): Promise<ExerciseTypeRecord> {
  const normalizedName = draft.name.trim().toLowerCase();
  const existingExerciseType = availableExerciseTypes.find(
    (exerciseType) => exerciseType.name.trim().toLowerCase() === normalizedName
  );

  if (existingExerciseType) {
    return existingExerciseType;
  }

  const slug = draft.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    id: slug || `custom_exercise_${Date.now()}`,
    name: draft.name,
    description: draft.instructions || undefined,
    targetReps: draft.targetRepetitions || undefined,
    targetSets: draft.targetSets || undefined,
    instructions: draft.instructions || undefined,
    category: "general",
  };
}

export async function assignExerciseToPatient(
  patientId: string,
  exerciseTypeId: string,
  targetReps?: number,
  targetSets?: number,
  exerciseTypeName?: string
): Promise<void> {
  await api.post(`/patients/${patientId}/exercises`, {
    exercise_type_id: exerciseTypeId,
    exercise_type_name: exerciseTypeName,
    target_reps: targetReps,
    target_sets: targetSets,
  });
}

export async function updateAssignedExercise(
  patientId: string,
  assignedExerciseId: string,
  targetReps: number,
  exerciseTypeName: string
): Promise<void> {
  await api.put(`/patients/${patientId}/exercises/${assignedExerciseId}`, {
    exercise_type_name: exerciseTypeName,
    target_reps: targetReps,
  });
}

export async function getAssignedExercises(patientId: string): Promise<AssignedExerciseWithDetails[]> {
  try {
    const res = await api.get<AssignedExerciseWithDetails[]>(`/patients/${patientId}/exercises`);
    return res.data;
  } catch (error) {
    console.error("Failed to fetch assigned exercises:", error);
    return [];
  }
}

export async function getCurrentExercise(patientId: string): Promise<AssignedExerciseWithDetails | null> {
  try {
    const assigned = await getAssignedExercises(patientId);
    // Return the first incomplete exercise, or the most recent one
    const incomplete = assigned.find(e => e.completed === 0);
    if (incomplete) return incomplete;
    return assigned.length > 0 ? assigned[0] : null;
  } catch (error) {
    console.error("Failed to get current exercise:", error);
    return null;
  }
}
