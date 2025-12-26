/**
 * Metrics calculations for movement analysis
 * Includes baseline subtraction, velocity calculations, peak detection, and ROM analysis
 */

/**
 * Utility function to calculate mean of an array
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return sum / arr.length;
}

/**
 * Utility function to calculate absolute values of an array
 */
export function absArray(arr: Float64Array): number[] {
  return Array.from(arr).map(Math.abs);
}

/**
 * Utility function to calculate maximum value in an array
 */
export function max(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.max(...arr);
}

/**
 * Utility function to calculate percentile of an array
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[index] || 0;
}

/**
 * Simple moving average smoothing
 */
export function movingAverage(
  data: Float64Array,
  windowSize: number = 5
): Float64Array {
  if (data.length === 0) return new Float64Array(0);

  const result = new Float64Array(data.length);
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;

    for (
      let j = Math.max(0, i - halfWindow);
      j <= Math.min(data.length - 1, i + halfWindow);
      j++
    ) {
      sum += data[j];
      count++;
    }

    result[i] = sum / count;
  }

  return result;
}

/**
 * Subtract baseline (mean of first N seconds) from angle series
 */
export function baselineSubtract(
  angles: Float64Array,
  timeSeconds: number[],
  baselineSeconds: number = 1.0
): Float64Array {
  // Safety checks
  if (
    !angles ||
    !timeSeconds ||
    angles.length === 0 ||
    timeSeconds.length === 0
  ) {
    return new Float64Array(0);
  }

  const baselineEndIndex = timeSeconds.findIndex((t) => t >= baselineSeconds);
  const endIndex =
    baselineEndIndex > 0
      ? baselineEndIndex
      : Math.min(60, Math.min(angles.length, timeSeconds.length));

  // Calculate baseline mean
  let baselineSum = 0;
  for (let i = 0; i < endIndex; i++) {
    baselineSum += angles[i];
  }
  const baselineMean = baselineSum / endIndex;

  // Subtract baseline
  const result = new Float64Array(angles.length);
  for (let i = 0; i < angles.length; i++) {
    result[i] = angles[i] - baselineMean;
  }

  return result;
}

/**
 * Calculate gradient (derivative) using finite differences
 * Returns velocities in degrees per second
 * Uses proper time differences in seconds as specified in requirements
 */
export function gradient(
  angles: Float64Array,
  timeSeconds: number[]
): Float64Array {
  // Safety checks
  if (
    !angles ||
    !timeSeconds ||
    angles.length === 0 ||
    timeSeconds.length === 0 ||
    angles.length !== timeSeconds.length
  ) {
    return new Float64Array(0);
  }

  const velocities = new Float64Array(angles.length).fill(0);

  // Middle points: central difference
  for (let i = 1; i < angles.length - 1; i++) {
    const dt = timeSeconds[i + 1] - timeSeconds[i - 1];
    velocities[i] = dt ? (angles[i + 1] - angles[i - 1]) / dt : 0;
  }

  // Endpoints per spec
  if (angles.length > 1) {
    velocities[0] = velocities[1];
    velocities[velocities.length - 1] = velocities[velocities.length - 2];
  }

  return velocities;
}

/**
 * Calculate average angular velocity (mean of absolute gradient)
 * Uses proper time differences in seconds
 */
export function avgVelocity(
  angles: Float64Array,
  timeSeconds: number[]
): number {
  if (angles.length === 0 || timeSeconds.length === 0) return 0;

  const velocities = gradient(angles, timeSeconds);
  const absVelocities = absArray(velocities);
  return mean(absVelocities);
}

/**
 * Calculate peak velocity (maximum absolute gradient)
 */
export function peakVelocity(
  angles: Float64Array,
  timeSeconds: number[]
): number {
  if (angles.length === 0 || timeSeconds.length === 0) return 0;

  const velocities = gradient(angles, timeSeconds);
  const absVelocities = absArray(velocities);
  return max(absVelocities);
}

/**
 * Calculate 95th percentile velocity
 */
export function p95Velocity(
  angles: Float64Array,
  timeSeconds: number[]
): number {
  if (angles.length === 0 || timeSeconds.length === 0) return 0;

  const velocities = gradient(angles, timeSeconds);
  const absVelocities = absArray(velocities);
  return percentile(absVelocities, 95);
}

/**
 * Simple moving average smoothing
 */
export function smoothData(
  data: Float64Array,
  windowSize: number = 5
): Float64Array {
  const smoothed = new Float64Array(data.length);
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;

    for (
      let j = Math.max(0, i - halfWindow);
      j <= Math.min(data.length - 1, i + halfWindow);
      j++
    ) {
      sum += data[j];
      count++;
    }

    smoothed[i] = sum / count;
  }

  return smoothed;
}

/**
 * Detect peaks in angle series - fixed to stop over-counting
 * Returns number of repetitions (peaks only)
 * Uses dynamic threshold based on ROM and proper minimum distance
 */
export function countPeaks(
  angles: Float64Array,
  timeSeconds: number[],
  options: {
    minDist?: number; // seconds
    ampThreshAbs?: number; // degrees
    ampThreshFrac?: number; // fraction of total ROM
  } = {}
): number {
  const {
    minDist = 0.6, // seconds (walking/march)
    ampThreshAbs = 15, // degrees
    ampThreshFrac = 0.35, // of total ROM
  } = options;

  if (angles.length === 0 || timeSeconds.length === 0) return 0;

  // Apply moving average smoothing (5-point window)
  const s = movingAverage(angles, 5);

  // Calculate ROM for dynamic threshold
  const rom = max(Array.from(s)) - Math.min(...Array.from(s));
  const th = Math.max(ampThreshAbs, ampThreshFrac * rom);

  const idx: number[] = [];
  let last = -1e9;

  // Find peaks (local maxima only, no valleys)
  for (let i = 1; i < s.length - 1; i++) {
    const currentValue = s[i];
    const currentTime = timeSeconds[i];

    // Check if it's a local maximum
    const isLocalMax = currentValue > s[i - 1] && currentValue > s[i + 1];

    if (isLocalMax && currentValue >= th && currentTime - last >= minDist) {
      idx.push(i);
      last = currentTime;
    }
  }

  return idx.length;
}

/**
 * Detect active window using moving RMS of knee velocity
 * Returns { tOn, tOff } indices for the active period
 */
export function detectActiveWindow(
  leftKneeVel: Float64Array,
  rightKneeVel: Float64Array,
  timeSeconds: number[],
  options: {
    windowSize?: number; // samples for moving RMS
    threshold?: number; // velocity threshold for activity
  } = {}
): { tOn: number; tOff: number } {
  const {
    windowSize = 30, // ~0.5s at 60Hz
    threshold = 5, // deg/s threshold
  } = options;

  if (
    leftKneeVel.length === 0 ||
    rightKneeVel.length === 0 ||
    timeSeconds.length === 0
  ) {
    return { tOn: 0, tOff: timeSeconds.length - 1 };
  }

  const minLength = Math.min(
    leftKneeVel.length,
    rightKneeVel.length,
    timeSeconds.length
  );

  // Calculate composite activity (RMS of both knee velocities)
  const activity: number[] = [];
  for (let i = 0; i < minLength; i++) {
    const leftVel = Math.abs(leftKneeVel[i] || 0);
    const rightVel = Math.abs(rightKneeVel[i] || 0);
    activity.push(Math.sqrt((leftVel * leftVel + rightVel * rightVel) / 2));
  }

  // Calculate moving RMS
  const movingRMS: number[] = [];
  for (let i = 0; i < activity.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(activity.length, i + Math.floor(windowSize / 2));
    let sumSquares = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      sumSquares += activity[j] * activity[j];
      count++;
    }

    movingRMS.push(Math.sqrt(sumSquares / count));
  }

  // Find onset and offset
  let tOn = 0;
  let tOff = minLength - 1;

  // Find first point above threshold
  for (let i = 0; i < movingRMS.length; i++) {
    if (movingRMS[i] > threshold) {
      tOn = i;
      break;
    }
  }

  // Find last point above threshold
  for (let i = movingRMS.length - 1; i >= 0; i--) {
    if (movingRMS[i] > threshold) {
      tOff = i;
      break;
    }
  }

  // Ensure minimum window size
  if (tOff - tOn < windowSize) {
    const center = Math.floor((tOn + tOff) / 2);
    tOn = Math.max(0, center - Math.floor(windowSize / 2));
    tOff = Math.min(minLength - 1, center + Math.floor(windowSize / 2));
  }

  return { tOn, tOff };
}

/**
 * Calculate Range of Motion (ROM) from angle series
 */
export function rom(angles: Float64Array): number {
  let min = angles[0];
  let max = angles[0];

  for (let i = 1; i < angles.length; i++) {
    min = Math.min(min, angles[i]);
    max = Math.max(max, angles[i]);
  }

  return max - min;
}

/**
 * Calculate maximum flexion and extension angles
 */
export function maxFlexExt(angles: Float64Array): {
  maxFlexion: number;
  maxExtension: number;
} {
  // Baseline-relative policy per spec: maxExtension = 0, maxFlexion = ROM
  const r = rom(angles);
  return { maxFlexion: r, maxExtension: 0 };
}

/**
 * Calculate asymmetry metrics between left and right sides
 */
export function calculateAsymmetry(
  leftMetrics: { rom: number; repetitions: number },
  rightMetrics: { rom: number; repetitions: number }
): {
  romDifference: number;
  repetitionDifference: number;
  dominantSide: "left" | "right" | "balanced";
} {
  const romDifference = Math.abs(leftMetrics.rom - rightMetrics.rom);
  const repetitionDifference = Math.abs(
    leftMetrics.repetitions - rightMetrics.repetitions
  );

  let dominantSide: "left" | "right" | "balanced" = "balanced";

  // Determine dominant side based on ROM difference and repetition difference
  if (romDifference >= 10) {
    dominantSide = leftMetrics.rom > rightMetrics.rom ? "left" : "right";
  } else if (repetitionDifference > 1) {
    dominantSide =
      leftMetrics.repetitions > rightMetrics.repetitions ? "left" : "right";
  }

  return {
    romDifference,
    repetitionDifference,
    dominantSide,
  };
}
