import { createSession, SessionData } from "../services/localSessionService";
import { 
  assignExerciseToPatient, 
  getAvailableExercises,
  getAssignedExercises 
} from "../services/exerciseAssignmentService";
import { SessionsRepository, PatientsRepository } from "../storage/repositories";
import { generateMockFeedback } from "../services/feedbackService";

/**
 * Generate realistic mock patient progress over time
 */
export async function generateMockPatientProgress(
  patientId: string,
  exerciseTypeId: string,
  days: number = 30
): Promise<void> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let rom = 45; // Starting ROM
  let reps = 8; // Starting reps
  let score = 60; // Starting score

  // Generate sessions every 2-3 days
  for (let i = 0; i < days; i += Math.floor(Math.random() * 2) + 2) {
    const sessionDate = new Date(startDate);
    sessionDate.setDate(sessionDate.getDate() + i);

    // Progressive improvement with some variation
    const progressFactor = i / days; // 0 to 1
    const improvement = progressFactor * 0.4; // 40% improvement over time

    // ROM: 45° → 90° with variation
    rom = Math.min(
      90,
      45 + improvement * 45 + (Math.random() - 0.5) * 5
    );

    // Reps: 8 → 15 with occasional increases
    if (Math.random() > 0.7) {
      reps = Math.min(15, reps + 1);
    }

    // Score: 60 → 95 based on ROM and consistency
    score = Math.min(
      95,
      60 + (rom / 90) * 30 + (Math.random() - 0.5) * 5
    );

    // Calculate flexion/extension from ROM
    const maxFlexion = rom * 0.85;
    const maxExtension = rom * 0.15;

    const sessionData: SessionData = {
      patientId,
      exerciseTypeId,
      startTime: sessionDate.toISOString(),
      endTime: new Date(sessionDate.getTime() + 15 * 60000).toISOString(), // 15 min session
      metrics: {
        rom: Math.round(rom),
        maxFlexion: Math.round(maxFlexion),
        maxExtension: Math.round(maxExtension),
        reps: Math.round(reps),
        score: Math.round(score),
      },
    };

    await createSession(sessionData);
  }
}

/**
 * Assign exercises and generate progress for demo patients
 */
export async function setupDemoPatientData(): Promise<void> {
  try {
    // Get all patients
    const patients = await PatientsRepository.list();

    // Get available exercises
    const exercises = await getAvailableExercises();

    if (exercises.length === 0 || patients.length === 0) {
      console.log("No exercises or patients available for demo data");
      return;
    }

    // Assign exercises to first 3 patients with different progress levels
    const demoPatients = patients.slice(0, 3);
    const kneeExercises = exercises.filter((e) => e.category === "knee");

    for (let i = 0; i < demoPatients.length; i++) {
      const patient = demoPatients[i];
      const exercise = kneeExercises[i % kneeExercises.length];

      if (!exercise) continue;

      // Check if exercise already assigned
      const assigned = await getAssignedExercises(patient.id);
      const alreadyAssigned = assigned.some(
        (a) => a.exerciseTypeId === exercise.id
      );

      if (!alreadyAssigned) {
        // Assign exercise
        await assignExerciseToPatient(
          patient.id,
          exercise.id,
          exercise.targetReps,
          exercise.targetSets
        );

        // Generate progress: different levels for each patient
        const days = [30, 20, 10][i]; // Different progress levels
        await generateMockPatientProgress(patient.id, exercise.id, days);

        // Generate mock feedback for demo
        await generateMockFeedback(patient.id, 8);

        console.log(
          `✓ Setup demo data for ${patient.name}: ${exercise.name} (${days} days)`
        );
      }
    }
  } catch (error) {
    console.error("Error setting up demo patient data:", error);
  }
}

/**
 * Check if patient has any sessions (to avoid regenerating)
 */
export async function patientHasSessions(patientId: string): Promise<boolean> {
  const sessions = await SessionsRepository.listByPatient(patientId);
  return sessions.length > 0;
}

