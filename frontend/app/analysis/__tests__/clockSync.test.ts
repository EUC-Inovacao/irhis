import { alignStreams, createSensorClock, trackSample } from "../clockSync";

/** Simulate a sensor: clock starts at `startUs`, samples every 1/60 s, delivered with jittery delay. */
function simulate(startUs: number, phoneStartMs: number, n: number, delays: (i: number) => number) {
  const clock = createSensorClock();
  const sensorUs: number[] = [];
  for (let i = 0; i < n; i++) {
    const raw = (startUs + Math.round((i * 1e6) / 60)) % 2 ** 32;
    const trueMs = phoneStartMs + (i * 1000) / 60;
    sensorUs.push(trackSample(clock, raw, trueMs + delays(i)));
  }
  return { clock, sensorUs };
}

describe("clockSync", () => {
  it("aligns two sensors with unrelated clocks to within the fastest delivery delay", () => {
    // Sensor A starts streaming 600 ms after sensor B, clocks unrelated
    const a = simulate(123_456_789, 1600, 600, (i) => 15 + (i % 7) * 10);
    const b = simulate(9_000_000, 1000, 600, (i) => 12 + (i % 5) * 12);
    const t = alignStreams(new Map([["a", a], ["b", b]]));
    // B's first sample is time zero; A's first sample is ~0.6 s later
    expect(t.get("b")![0]).toBeCloseTo(0, 1);
    expect(t.get("a")![0]).toBeGreaterThan(0.58);
    expect(t.get("a")![0]).toBeLessThan(0.62);
    // Spacing within a stream is unchanged
    expect(t.get("a")![60] - t.get("a")![0]).toBeCloseTo(1, 3);
  });

  it("handles the 32-bit wrap of the sensor clock", () => {
    const s = simulate(2 ** 32 - 500_000, 0, 120, () => 20);
    const t = alignStreams(new Map([["s", s]]));
    for (let i = 1; i < t.get("s")!.length; i++) {
      expect(t.get("s")![i]).toBeGreaterThan(t.get("s")![i - 1]);
    }
    expect(t.get("s")![119]).toBeCloseTo(119 / 60, 3);
  });

  it("starts a new segment when the sensor clock restarts", () => {
    const clock = createSensorClock();
    const sensorUs: number[] = [];
    // 1 s of data, then the sensor restarts (clock back to ~0) 2 s later on the phone
    for (let i = 0; i < 60; i++) sensorUs.push(trackSample(clock, 50_000_000 + i * 16_667, 1000 + i * 16.667 + 20));
    for (let i = 0; i < 60; i++) sensorUs.push(trackSample(clock, 100 + i * 16_667, 4000 + i * 16.667 + 20));
    expect(clock.segments.length).toBe(2);
    const t = alignStreams(new Map([["s", { clock, sensorUs }]]));
    expect(t.get("s")![60] - t.get("s")![0]).toBeCloseTo(3, 2);
  });
});
