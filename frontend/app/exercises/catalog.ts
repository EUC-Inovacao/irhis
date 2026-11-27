/**
 * The exercises of the IRHIS clinical study protocol, as the patient app runs
 * them. Ids match /exercise-types in the backend and are stored in
 * session.ExerciseType.
 *
 * How repetitions are counted (see analysis/liveReps.ts):
 * - squat: both knees bend together; one bend is one repetition.
 * - knee-extension: sitting, one leg at a time (right, then left), each with
 *   its own target; one leg serves as the reference for the other.
 * - march: alternate leg lifts; one lift of each leg is one repetition.
 */

export type CountingMode = "squat" | "knee-extension" | "march";
export type Side = "right" | "left";

export interface ProtocolExercise {
  id: string;
  /** i18n key of the name shown to patients. */
  nameKey: string;
  /** i18n key of the one-line instruction shown before starting. */
  instructionKey: string;
  counting: CountingMode;
  /** Sides done one after another (knee extension); absent = both at once. */
  sides?: Side[];
  defaultTargetReps: number;
}

export const PROTOCOL_EXERCISES: ProtocolExercise[] = [
  {
    id: "squat",
    nameKey: "exercises.squat",
    instructionKey: "exercises.squatInstruction",
    counting: "squat",
    defaultTargetReps: 10,
  },
  {
    id: "seated_knee_extension",
    nameKey: "exercises.kneeExtension",
    instructionKey: "exercises.kneeExtensionInstruction",
    counting: "knee-extension",
    sides: ["right", "left"],
    defaultTargetReps: 10,
  },
  {
    id: "march_in_place",
    nameKey: "exercises.march",
    instructionKey: "exercises.marchInstruction",
    counting: "march",
    defaultTargetReps: 10,
  },
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Find the protocol exercise for a stored exercise type (id or a clinician's
 * own name). Older assignments used other ids and free names, so known words
 * are matched too. Returns null for exercises outside the protocol.
 */
export function matchProtocolExercise(
  typeId?: string | null,
  name?: string | null
): ProtocolExercise | null {
  const byId = PROTOCOL_EXERCISES.find((e) => e.id === typeId);
  if (byId) return byId;
  const text = normalise(`${typeId ?? ""} ${name ?? ""}`);
  if (/squat|agach/.test(text)) return PROTOCOL_EXERCISES[0];
  if (/march|marcha|walk/.test(text)) return PROTOCOL_EXERCISES[2];
  if (/knee|joelho/.test(text)) return PROTOCOL_EXERCISES[1];
  return null;
}
