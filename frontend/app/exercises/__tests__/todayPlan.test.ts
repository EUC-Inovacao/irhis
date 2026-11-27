import { buildTodayPlan } from "../todayPlan";
import { matchProtocolExercise } from "../catalog";
import type { Session } from "../../types";

const s = (over: Partial<Session>): Session => ({
  id: Math.random().toString(36).slice(2),
  exerciseType: "",
  timeCreated: "2026-11-20 10:00:00",
  ...over,
});

describe("matchProtocolExercise", () => {
  it("matches ids, old ids and Portuguese names", () => {
    expect(matchProtocolExercise("squat")?.id).toBe("squat");
    expect(matchProtocolExercise("agachamento")?.id).toBe("squat");
    expect(matchProtocolExercise("knee_flexion")?.id).toBe("seated_knee_extension");
    expect(matchProtocolExercise("custom", "Flexão do Joelho")?.id).toBe("seated_knee_extension");
    expect(matchProtocolExercise("marcha")?.id).toBe("march_in_place");
    expect(matchProtocolExercise("general_walking")?.id).toBe("march_in_place");
    expect(matchProtocolExercise("hip_abduction", "Hip Abduction")).toBeNull();
  });
});

describe("buildTodayPlan", () => {
  const now = new Date("2026-11-27T15:00:00Z");

  it("lists assignments in protocol order with targets and today's status", () => {
    const plan = buildTodayPlan(
      {
        assigned: [
          s({ exerciseType: "march_in_place", repetitions: 12 }),
          s({ exerciseType: "squat", repetitions: 8 }),
          s({ exerciseType: "seated_knee_extension", repetitions: null }),
        ],
        completed: [
          s({ exerciseType: "squat", performedAt: "2026-11-27 09:12:00" }),
          s({ exerciseType: "march_in_place", performedAt: "2026-11-26 09:12:00" }),
        ],
      },
      now
    );
    expect(plan.map((p) => p.key)).toEqual(["squat", "seated_knee_extension", "march_in_place"]);
    expect(plan.map((p) => p.targetReps)).toEqual([8, 10, 12]);
    expect(plan.map((p) => p.doneToday)).toEqual([true, false, false]);
  });

  it("uses the latest assignment of an exercise", () => {
    const plan = buildTodayPlan(
      {
        assigned: [
          s({ exerciseType: "squat", repetitions: 8, timeCreated: "2026-11-01 10:00:00" }),
          s({ exerciseType: "squat", repetitions: 15, timeCreated: "2026-11-10 10:00:00" }),
        ],
        completed: [],
      },
      now
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].targetReps).toBe(15);
  });
});
