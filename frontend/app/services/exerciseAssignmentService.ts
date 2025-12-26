import {
  AssignedExercisesRepository,
  ExerciseTypesRepository,
  AssignedExerciseRecord,
  ExerciseTypeRecord,
} from "../storage/repositories";

export interface AssignedExerciseWithDetails extends AssignedExerciseRecord {
  exerciseType?: ExerciseTypeRecord;
}

/**
 * Assign an exercise to a patient
 */
export async function assignExerciseToPatient(
  patientId: string,
  exerciseTypeId: string,
  targetReps?: number,
  targetSets?: number
): Promise<AssignedExerciseRecord> {
  // Get exercise type to use defaults if not provided
  const exerciseType = await ExerciseTypesRepository.getById(exerciseTypeId);
  if (!exerciseType) {
    throw new Error(`Exercise type ${exerciseTypeId} not found`);
  }

  const assignment: AssignedExerciseRecord = {
    id: `assign_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    patientId,
    exerciseTypeId,
    assignedDate: new Date().toISOString(),
    completed: 0,
    targetReps: targetReps ?? exerciseType.targetReps ?? null,
    targetSets: targetSets ?? exerciseType.targetSets ?? null,
  };

  await AssignedExercisesRepository.create(assignment);
  return assignment;
}

/**
 * Get all assigned exercises for a patient
 */
export async function getAssignedExercises(
  patientId: string
): Promise<AssignedExerciseWithDetails[]> {
  const assignments = await AssignedExercisesRepository.listByPatient(patientId);
  
  // Enrich with exercise type details
  const enriched = await Promise.all(
    assignments.map(async (assignment) => {
      const exerciseType = await ExerciseTypesRepository.getById(
        assignment.exerciseTypeId
      );
      return {
        ...assignment,
        exerciseType: exerciseType ?? undefined,
      };
    })
  );

  return enriched;
}

/**
 * Get the current active (incomplete) exercise for a patient
 */
export async function getCurrentExercise(
  patientId: string
): Promise<AssignedExerciseWithDetails | null> {
  const assignments = await AssignedExercisesRepository.listByPatient(patientId);
  const incomplete = assignments.find((a) => a.completed === 0);
  
  if (!incomplete) return null;

  const exerciseType = await ExerciseTypesRepository.getById(
    incomplete.exerciseTypeId
  );

  return {
    ...incomplete,
    exerciseType: exerciseType ?? undefined,
  };
}

/**
 * Mark an exercise as completed
 */
export async function markExerciseCompleted(
  assignmentId: string
): Promise<void> {
  await AssignedExercisesRepository.markCompleted(assignmentId);
}

/**
 * Update exercise assignment (targets, etc.)
 */
export async function updateExerciseAssignment(
  assignmentId: string,
  updates: Partial<Pick<AssignedExerciseRecord, "targetReps" | "targetSets">>
): Promise<void> {
  await AssignedExercisesRepository.update(assignmentId, updates);
}

/**
 * Get all available exercise types
 */
export async function getAvailableExercises(): Promise<ExerciseTypeRecord[]> {
  return await ExerciseTypesRepository.list();
}

/**
 * Get exercises by category
 */
export async function getExercisesByCategory(
  category: "knee" | "hip" | "ankle" | "general"
): Promise<ExerciseTypeRecord[]> {
  return await ExerciseTypesRepository.listByCategory(category);
}

