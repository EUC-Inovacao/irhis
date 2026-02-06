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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exerciseAssignmentService.ts:15',message:'assignExerciseToPatient called',data:{patientId, exerciseTypeId, targetReps, targetSets},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  // Get exercise type to use defaults if not provided
  const exerciseType = await ExerciseTypesRepository.getById(exerciseTypeId);
  if (!exerciseType) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exerciseAssignmentService.ts:23',message:'Exercise type not found',data:{exerciseTypeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exerciseAssignmentService.ts:35',message:'About to save assignment to database',data:{assignmentId:assignment.id, patientId, exerciseTypeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  await AssignedExercisesRepository.create(assignment);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exerciseAssignmentService.ts:37',message:'Assignment saved to assignedExercises table',data:{assignmentId:assignment.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  return assignment;
}

/**
 * Get all assigned exercises for a patient
 */
export async function getAssignedExercises(
  patientId: string
): Promise<AssignedExerciseWithDetails[]> {
  console.log(`[getAssignedExercises] Fetching exercises for patient: ${patientId}`);
  const assignments = await AssignedExercisesRepository.listByPatient(patientId);
  console.log(`[getAssignedExercises] Found ${assignments.length} assignments in database`);
  
  // Enrich with exercise type details
  const enriched = await Promise.all(
    assignments.map(async (assignment) => {
      const exerciseType = await ExerciseTypesRepository.getById(
        assignment.exerciseTypeId
      );
      if (!exerciseType) {
        console.warn(`[getAssignedExercises] Exercise type ${assignment.exerciseTypeId} not found for assignment ${assignment.id}`);
      }
      return {
        ...assignment,
        exerciseType: exerciseType ?? undefined,
      };
    })
  );

  const validExercises = enriched.filter(e => e.exerciseType !== undefined);
  console.log(`[getAssignedExercises] Returning ${validExercises.length} valid exercises`);
  return validExercises;
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

