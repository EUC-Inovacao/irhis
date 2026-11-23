/**
 * Live repetition count while an exercise is being recorded.
 *
 * Feedback for the patient only: the saved result still comes from the full
 * analysis after the recording. The count follows the same rule as the
 * offline count (countRepsSafe in services/analysisApi.ts): a peak of the
 * ~150 ms smoothed angle that rises at least max(6°, 25% of the range so far)
 * above the lowest point since the previous repetition, and at least 0.6 s
 * after it.
 *
 * Four angles are followed: each thigh's movement away from its starting
 * direction (hip exercises such as marching or abduction) and each knee's
 * angle (thigh vs shank). The count shown is that of the angle that moves the
 * most, so it fits the exercise without knowing which one it is.
 */

import { BONE_AXIS, rotateVecByQuat } from "./kinematics";

type Quat = [number, number, number, number];
type Vec = [number, number, number];

const MIN_DIST_S = 0.6;
const MIN_PROM_DEG = 6;
const PROM_FRACTION = 0.25;
/** Below this range of motion nothing is shown (sensor noise, small sway). */
const MIN_ACTIVE_ROM_DEG = 10;
/** Samples averaged for the thigh's starting direction (~0.25 s at 60 Hz). */
const REF_SAMPLES = 15;

// Movella DOT body-position tags (DeviceTag in services/movellaBleService.ts)
const RIGHT_THIGH = 1;
const RIGHT_SHANK = 2;
const LEFT_THIGH = 3;
const LEFT_SHANK = 4;

function unit(v: Vec): Vec {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function angleDeg(a: Vec, b: Vec): number {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(d) * 180) / Math.PI;
}

/** Incremental version of countRepsSafe. */
export class PeakCounter {
  private window: number[] = [];
  private sum = 0;
  private prev2: number | null = null;
  private prev1: number | null = null;
  private prev1T = 0;
  private lastMin = Infinity;
  private lastPeakT = -Infinity;
  private minSeen = Infinity;
  private maxSeen = -Infinity;
  reps = 0;

  constructor(private readonly smoothSamples = 9) {}

  get rom(): number {
    return this.maxSeen > this.minSeen ? this.maxSeen - this.minSeen : 0;
  }

  push(t: number, value: number): void {
    if (!Number.isFinite(value)) return;
    this.window.push(value);
    this.sum += value;
    if (this.window.length > this.smoothSamples) this.sum -= this.window.shift()!;
    const y = this.sum / this.window.length;

    if (y < this.minSeen) this.minSeen = y;
    if (y > this.maxSeen) this.maxSeen = y;

    if (this.prev1 !== null && this.prev2 !== null) {
      const p = this.prev1;
      // Running valley since the last accepted repetition
      if (p < this.prev2 && p < this.lastMin) this.lastMin = p;
      // prev1 is a local maximum
      if (this.prev2 < p && p >= y) {
        const minProm = Math.max(MIN_PROM_DEG, PROM_FRACTION * this.rom);
        if (p - this.lastMin >= minProm && this.prev1T - this.lastPeakT >= MIN_DIST_S) {
          this.reps += 1;
          this.lastPeakT = this.prev1T;
          this.lastMin = p;
        }
      }
    } else if (this.prev1 === null) {
      this.lastMin = y;
    }
    this.prev2 = this.prev1;
    this.prev1 = y;
    this.prev1T = t;
  }
}

export class LiveRepTracker {
  private latest = new Map<number, Quat>();
  private thighRefSum = new Map<number, Vec>();
  private thighRefCount = new Map<number, number>();
  readonly counters = {
    rightHip: new PeakCounter(),
    leftHip: new PeakCounter(),
    rightKnee: new PeakCounter(),
    leftKnee: new PeakCounter(),
  };

  /** Add one orientation sample. `t` in seconds (any steady clock). */
  push(tag: number, t: number, q: Quat): void {
    this.latest.set(tag, q);
    const bone = unit(rotateVecByQuat(q, BONE_AXIS));

    if (tag === RIGHT_THIGH || tag === LEFT_THIGH) {
      const count = this.thighRefCount.get(tag) ?? 0;
      if (count < REF_SAMPLES) {
        const s = this.thighRefSum.get(tag) ?? [0, 0, 0];
        this.thighRefSum.set(tag, [s[0] + bone[0], s[1] + bone[1], s[2] + bone[2]]);
        this.thighRefCount.set(tag, count + 1);
        return;
      }
      const ref = unit(this.thighRefSum.get(tag)!);
      const counter = tag === RIGHT_THIGH ? this.counters.rightHip : this.counters.leftHip;
      counter.push(t, angleDeg(bone, ref));
      return;
    }

    if (tag === RIGHT_SHANK || tag === LEFT_SHANK) {
      const thighQ = this.latest.get(tag === RIGHT_SHANK ? RIGHT_THIGH : LEFT_THIGH);
      if (!thighQ) return;
      const thighBone = unit(rotateVecByQuat(thighQ, BONE_AXIS));
      const counter = tag === RIGHT_SHANK ? this.counters.rightKnee : this.counters.leftKnee;
      counter.push(t, angleDeg(thighBone, bone));
    }
  }

  /** Repetitions of the angle that moves the most (0 until something moves). */
  get reps(): number {
    let best: PeakCounter | null = null;
    for (const c of Object.values(this.counters)) {
      if (!best || c.rom > best.rom) best = c;
    }
    return best && best.rom >= MIN_ACTIVE_ROM_DEG ? best.reps : 0;
  }
}
