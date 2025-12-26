import { ExerciseTypesRepository, ExerciseTypeRecord } from "./repositories";

export const PRESET_EXERCISES: Omit<ExerciseTypeRecord, "id">[] = [
  {
    name: "Leg Knee Extension",
    description: "Sit and extend your leg fully, then return to starting position",
    targetReps: 12,
    targetSets: 3,
    instructions: "Keep your back straight. Extend slowly and hold for 2 seconds at full extension before returning.",
    category: "knee",
  },
  {
    name: "Straight Leg Raise",
    description: "Lie down and lift your leg straight up",
    targetReps: 15,
    targetSets: 3,
    instructions: "Keep your leg straight throughout the movement. Lift slowly and lower with control. Hold at the top for 2 seconds.",
    category: "knee",
  },
  {
    name: "Heel Slide",
    description: "Slide your heel toward your body while lying down",
    targetReps: 10,
    targetSets: 3,
    instructions: "Slide slowly and hold at maximum flexion for 5 seconds. Keep your heel in contact with the surface.",
    category: "knee",
  },
  {
    name: "Mini Squat",
    description: "Small squatting motion with support",
    targetReps: 10,
    targetSets: 3,
    instructions: "Go down slowly, keep knees behind toes. Don't go too deep. Use a chair or wall for support if needed.",
    category: "knee",
  },
  {
    name: "Quad Sets",
    description: "Tighten your thigh muscle while keeping your leg straight",
    targetReps: 20,
    targetSets: 3,
    instructions: "Sit or lie with leg straight. Tighten thigh muscle and hold for 5 seconds. Relax and repeat.",
    category: "knee",
  },
  {
    name: "Hip Abduction",
    description: "Lift your leg sideways away from your body while standing or lying down",
    targetReps: 12,
    targetSets: 3,
    instructions: "Stand or lie on your side. Keep your leg straight and lift it sideways away from your body. Hold for 2 seconds at the top, then slowly lower. Keep your core engaged throughout the movement.",
    category: "hip",
  },
];

export async function seedExerciseTypes(): Promise<void> {
  try {
    const existingExercises = await ExerciseTypesRepository.list();
    
    // Only seed if table is empty
    if (existingExercises.length > 0) {
      console.log("Exercise types already seeded, skipping...");
      return;
    }

    console.log("Seeding exercise types...");
    
    for (const exercise of PRESET_EXERCISES) {
      const id = exercise.name.toLowerCase().replace(/\s+/g, "-");
      await ExerciseTypesRepository.create({
        id,
        ...exercise,
      });
    }
    
    console.log(`Successfully seeded ${PRESET_EXERCISES.length} exercise types`);
  } catch (error) {
    console.error("Error seeding exercise types:", error);
    throw error;
  }
}

