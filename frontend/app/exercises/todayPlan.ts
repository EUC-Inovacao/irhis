/**
 * Today's exercises for the patient home screen: one entry per exercise the
 * clinician assigned, with its target and whether it was already done today.
 *
 * Sessions without metrics are assignments (the plan); sessions with metrics
 * are recordings. Each recording is a new session (sessionService.ts), so the
 * plan stays in place from day to day.
 */

import type { Session } from "../types";
import { PROTOCOL_EXERCISES, ProtocolExercise, matchProtocolExercise } from "./catalog";

export interface PlannedExercise {
  /** Stable key (protocol id, or the stored exercise type). */
  key: string;
  protocol: ProtocolExercise | null;
  /** Exercise type to save recordings under (keeps matching the assignment). */
  exerciseTypeId: string;
  /** Name stored by the clinician, used when the exercise is not in the protocol. */
  storedName: string;
  targetReps: number;
  doneToday: boolean;
}

function sameLocalDay(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  // Backend times are UTC without a zone ("2026-11-27 09:30:00")
  const normalised = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`;
  const d = new Date(normalised);
  if (isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function buildTodayPlan(
  sessions: { assigned: Session[]; completed: Session[] },
  now: Date = new Date()
): PlannedExercise[] {
  const plan = new Map<string, PlannedExercise & { _latest: string }>();

  for (const s of sessions.assigned) {
    const protocol = matchProtocolExercise(s.exerciseType, s.exerciseDescription);
    const key = protocol?.id ?? (s.exerciseType || s.exerciseDescription || s.id);
    const existing = plan.get(key);
    // The most recent assignment of an exercise sets its target
    if (existing && existing._latest >= s.timeCreated) continue;
    const target =
      typeof s.repetitions === "number" && s.repetitions > 0
        ? s.repetitions
        : protocol?.defaultTargetReps ?? 10;
    plan.set(key, {
      key,
      protocol,
      exerciseTypeId: s.exerciseType || protocol?.id || key,
      storedName: s.exerciseDescription || s.exerciseType || "",
      targetReps: target,
      doneToday: false,
      _latest: s.timeCreated,
    });
  }

  for (const s of sessions.completed) {
    if (!sameLocalDay(s.performedAt ?? s.timeCreated, now)) continue;
    const protocol = matchProtocolExercise(s.exerciseType, s.exerciseDescription);
    const key = protocol?.id ?? (s.exerciseType || s.exerciseDescription || s.id);
    const entry = plan.get(key);
    if (entry) entry.doneToday = true;
  }

  const order = (p: PlannedExercise) => {
    const i = PROTOCOL_EXERCISES.findIndex((e) => e.id === p.protocol?.id);
    return i === -1 ? PROTOCOL_EXERCISES.length : i;
  };
  return Array.from(plan.values())
    .map(({ _latest, ...rest }) => rest)
    .sort((a, b) => order(a) - order(b));
}
