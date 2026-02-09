import api from "./api";
import { ExerciseTypeRecord } from "../storage/repositories";

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

export async function assignExerciseToPatient(
  patientId: string,
  exerciseTypeId: string,
  targetReps?: number,
  targetSets?: number
): Promise<void> {
  await api.post(`/patients/${patientId}/exercises`, {
    exercise_type_id: exerciseTypeId,
    target_reps: targetReps,
    target_sets: targetSets,
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
