/**
 * Put every sensor on one time base (the phone's clock).
 *
 * Each Movella DOT stamps samples with its own clock (SampleTimeFine, µs,
 * uint32). Sensors are started one after another and their clocks are not
 * related, so "seconds from each sensor's first sample" can be off by several
 * hundred milliseconds between sensors.
 *
 * For each sensor we track offset = phoneReceiveTime - sensorTime. Bluetooth
 * only ever adds delay, so the smallest offset seen is the closest to the true
 * clock difference (the residual error is the fastest delivery latency,
 * typically one connection interval, ~10–30 ms). Every sample is then placed at
 * sensorTime + minOffset on the phone's clock.
 *
 * Handles the 32-bit wrap of SampleTimeFine (~71.6 min) and a sensor whose clock
 * restarts (switched off and on during a recording): a restart starts a new
 * segment with its own offset.
 */

const WRAP_US = 2 ** 32;
/** A jump back larger than this (but not a wrap) is a clock restart. */
const RESTART_THRESHOLD_US = 1_000_000;

interface ClockSegment {
  /** Index of the first sample in this segment. */
  startIndex: number;
  /** Smallest (phone ms - sensor ms) seen in this segment. */
  minOffsetMs: number;
}

export interface SensorClock {
  lastRawUs: number | null;
  wraps: number;
  count: number;
  segments: ClockSegment[];
}

export function createSensorClock(): SensorClock {
  return { lastRawUs: null, wraps: 0, count: 0, segments: [] };
}

/**
 * Register one sample. Returns the sensor time in µs with wraps removed; store
 * it with the sample (samples must be stored in the same order they are tracked).
 */
export function trackSample(clock: SensorClock, rawUs: number, receivedMs: number): number {
  let newSegment = clock.segments.length === 0;
  if (clock.lastRawUs !== null && rawUs < clock.lastRawUs) {
    const back = clock.lastRawUs - rawUs;
    if (back > WRAP_US / 2) {
      clock.wraps += 1;
    } else if (back > RESTART_THRESHOLD_US) {
      newSegment = true;
    }
    // Small steps back are out-of-order packets: keep them as they are
  }
  clock.lastRawUs = rawUs;

  const sensorUs = rawUs + clock.wraps * WRAP_US;
  const offsetMs = receivedMs - sensorUs / 1000;
  if (newSegment) {
    clock.segments.push({ startIndex: clock.count, minOffsetMs: offsetMs });
  } else {
    const seg = clock.segments[clock.segments.length - 1];
    if (offsetMs < seg.minOffsetMs) seg.minOffsetMs = offsetMs;
  }
  clock.count += 1;
  return sensorUs;
}

/** Phone-clock time (ms) of the sample at `index` with sensor time `sensorUs`. */
export function alignedTimeMs(clock: SensorClock, index: number, sensorUs: number): number {
  let seg = clock.segments[0];
  for (const s of clock.segments) {
    if (s.startIndex <= index) seg = s;
    else break;
  }
  return sensorUs / 1000 + (seg ? seg.minOffsetMs : 0);
}

/**
 * Convert several sensors' samples to seconds on a shared axis whose zero is
 * the earliest sample of any sensor.
 */
export function alignStreams(
  streams: Map<string, { clock: SensorClock; sensorUs: number[] }>
): Map<string, number[]> {
  const aligned = new Map<string, number[]>();
  let t0 = Infinity;
  for (const [id, { clock, sensorUs }] of Array.from(streams.entries())) {
    const ms = sensorUs.map((us, i) => alignedTimeMs(clock, i, us));
    aligned.set(id, ms);
    for (const v of ms) if (v < t0) t0 = v;
  }
  const out = new Map<string, number[]>();
  for (const [id, ms] of Array.from(aligned.entries())) {
    out.set(id, ms.map((v) => (v - t0) / 1000));
  }
  return out;
}
