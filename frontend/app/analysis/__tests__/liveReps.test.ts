import { LiveRepTracker, PeakCounter } from "../liveReps";

type Quat = [number, number, number, number];

/** Rotation of `deg` degrees about the X axis (bends the -Y bone axis forward). */
function rotX(deg: number): Quat {
  const h = (deg * Math.PI) / 360;
  return [Math.cos(h), Math.sin(h), 0, 0];
}

describe("PeakCounter", () => {
  it("counts sine cycles like the offline counter", () => {
    const c = new PeakCounter();
    for (let i = 0; i < 60 * 10; i++) {
      const t = i / 60;
      // 0.5 Hz, 40 degree swing, small noise
      c.push(t, 20 - 20 * Math.cos(2 * Math.PI * 0.5 * t) + (i % 3) * 0.3);
    }
    expect(c.reps).toBe(5);
  });

  it("ignores small wobble", () => {
    const c = new PeakCounter();
    for (let i = 0; i < 600; i++) c.push(i / 60, 2 * Math.sin(i / 5));
    expect(c.reps).toBe(0);
  });
});

describe("LiveRepTracker", () => {
  it("counts knee bends from thigh and shank orientations", () => {
    const tr = new LiveRepTracker();
    for (let i = 0; i < 60 * 8; i++) {
      const t = i / 60;
      const knee = 30 - 30 * Math.cos(2 * Math.PI * 0.5 * t); // 0..60 degrees, 4 cycles
      tr.push(1, t, rotX(0)); // right thigh still
      tr.push(2, t, rotX(knee)); // right shank bends
    }
    expect(tr.reps).toBe(4);
  });

  it("counts leg raises from the thigh alone (march)", () => {
    const tr = new LiveRepTracker();
    for (let i = 0; i < 60 * 9; i++) {
      const t = i / 60;
      const lift = i < 30 ? 0 : 25 - 25 * Math.cos(2 * Math.PI * (1 / 1.5) * (t - 0.5));
      tr.push(3, t, rotX(lift)); // left thigh
    }
    expect(tr.reps).toBe(6); // peaks at 1.25, 2.75, ... 8.75 s
  });

  it("shows 0 while standing still", () => {
    const tr = new LiveRepTracker();
    for (let i = 0; i < 300; i++) {
      tr.push(1, i / 60, rotX(0.5 * Math.sin(i)));
      tr.push(2, i / 60, rotX(0.5 * Math.cos(i)));
    }
    expect(tr.reps).toBe(0);
  });
});

describe("LiveRepTracker.repsFor", () => {
  it("march counts one lift of each leg as one repetition", () => {
    const tr = new LiveRepTracker();
    // Alternating lifts: right at 0.5 s, left at 1.25 s, ... (one cycle = 1.5 s)
    for (let i = 0; i < 60 * 8; i++) {
      const t = i / 60;
      const phase = 2 * Math.PI * (t - 0.5) / 1.5;
      const right = t < 0.5 ? 0 : Math.max(0, 30 * Math.sin(phase));
      const left = t < 0.5 ? 0 : Math.max(0, -30 * Math.sin(phase));
      tr.push(1, t, rotX(right));
      tr.push(3, t, rotX(left));
    }
    const right = tr.counters.rightHip.reps;
    const left = tr.counters.leftHip.reps;
    expect(tr.repsFor("march")).toBe(Math.min(right, left));
    expect(tr.repsFor("march")).toBeGreaterThanOrEqual(4);
  });

  it("knee extension counts only the requested side", () => {
    const tr = new LiveRepTracker();
    for (let i = 0; i < 60 * 8; i++) {
      const t = i / 60;
      // Seated: thighs horizontal-ish and still; right shank extends 4 times
      const ext = 45 - 45 * Math.cos(2 * Math.PI * 0.5 * t);
      tr.push(1, t, rotX(0));
      tr.push(3, t, rotX(0));
      tr.push(2, t, rotX(ext));
      tr.push(4, t, rotX(0));
    }
    expect(tr.repsFor("knee-extension", "right")).toBe(4);
    expect(tr.repsFor("knee-extension", "left")).toBe(0);
  });
});
