import * as THREE from "three";
import JSZip from "jszip";
import Papa from "papaparse";

// Types for the analysis
export type KneeMetrics = {
  repetitions: number;
  rom: number;
  maxFlexion: number;
  maxExtension: number;
  avgVelocity: number;
};

export type Analysis = {
  left: KneeMetrics;
  right: KneeMetrics;
  asymmetry: {
    romDifference: number;
    repetitionDifference: number;
    dominantSide: "left" | "right" | "balanced";
  };
};

export type Session = {
  sensors: {
    right: {
      thigh?: SensorData[];
      shank?: SensorData[];
    };
    left: {
      thigh?: SensorData[];
      shank?: SensorData[];
    };
    pelvis?: SensorData[];
  };
};

export type SensorData = {
  PacketCounter: number;
  SampleTimeFine: number;
  Euler_X: number;
  Euler_Y: number;
  Euler_Z: number;
  FreeAcc_X: number;
  FreeAcc_Y: number;
  FreeAcc_Z: number;
  Status: number;
  timeSeconds?: number; // Computed field
};

// DeviceTag mapping
const DEVICE_TAG_MAPPING: Record<number, keyof Session["sensors"] | "pelvis"> =
  {
    1: "right",
    2: "right",
    3: "left",
    4: "left",
    5: "pelvis",
  };

const DEVICE_SEGMENT_MAPPING: Record<number, "thigh" | "shank"> = {
  1: "thigh",
  2: "shank",
  3: "thigh",
  4: "shank",
};

/**
 * Extract DeviceTag from CSV header
 */
function extractDeviceTag(csvContent: string): number | null {
  const lines = csvContent.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("DeviceTag:")) {
      const match = trimmedLine.match(/DeviceTag:\s*,?\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }
  return null;
}

/**
 * Parse CSV content into SensorData array
 */
function parseCSVContent(csvContent: string): SensorData[] {
  const lines = csvContent.split("\n");

  // Find data start (look for PacketCounter header)
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("PacketCounter")) {
      dataStartIndex = i;
      break;
    }
  }

  if (dataStartIndex === -1) {
    throw new Error("Could not find data header in CSV");
  }

  // Parse CSV data
  const csvData = lines.slice(dataStartIndex).join("\n");
  const { data } = Papa.parse<SensorData>(csvData, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  return data.filter(
    (row) =>
      row.PacketCounter != null &&
      row.SampleTimeFine != null &&
      !isNaN(row.Euler_X) &&
      !isNaN(row.Euler_Y) &&
      !isNaN(row.Euler_Z)
  );
}

/**
 * Load session data from ZIP file
 */
export async function loadSessionFromZip(
  zipFile: File | Buffer | ArrayBuffer | Uint8Array | string
): Promise<Session> {
  // In React Native we often get a base64 string; in Node we may get Buffer/ArrayBuffer
  const zip =
    typeof zipFile === "string"
      ? await JSZip.loadAsync(zipFile, { base64: true })
      : await JSZip.loadAsync(zipFile as any);
  const session: Session = {
    sensors: {
      right: {},
      left: {},
    },
  };

  // Process each CSV file
  for (const fileName in zip.files) {
    const file = zip.files[fileName];
    if (
      file.dir ||
      (!fileName.endsWith(".csv") && !fileName.endsWith(".txt"))
    ) {
      continue;
    }

    try {
      const csvContent = await file.async("text");
      const deviceTag = extractDeviceTag(csvContent);

      if (!deviceTag || !DEVICE_TAG_MAPPING[deviceTag]) {
        console.warn(`Unknown DeviceTag ${deviceTag} in file ${fileName}`);
        continue;
      }

      const sensorData = parseCSVContent(csvContent);
      if (sensorData.length === 0) {
        console.warn(`No valid data found in file ${fileName}`);
        continue;
      }

      // Add time alignment
      const firstSampleTime = sensorData[0].SampleTimeFine;
      sensorData.forEach((row) => {
        row.timeSeconds = (row.SampleTimeFine - firstSampleTime) / 1e6;
      });

      const side = DEVICE_TAG_MAPPING[deviceTag];
      const segment = DEVICE_SEGMENT_MAPPING[deviceTag];

      if (side === "pelvis") {
        session.sensors.pelvis = sensorData;
      } else if (segment) {
        session.sensors[side][segment] = sensorData;
      }

      console.log(
        `Loaded ${sensorData.length} samples for DeviceTag ${deviceTag} (${side} ${segment})`
      );
    } catch (error) {
      console.error(`Error processing file ${fileName}:`, error);
    }
  }

  return session;
}

/**
 * Convert Euler angles (ZYX intrinsic) to quaternion
 */
function eulerToQuaternion(
  eulerX: number,
  eulerY: number,
  eulerZ: number
): THREE.Quaternion {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(eulerX),
    THREE.MathUtils.degToRad(eulerY),
    THREE.MathUtils.degToRad(eulerZ),
    "ZYX"
  );
  return new THREE.Quaternion().setFromEuler(euler);
}

/**
 * Calculate knee angle from thigh and shank orientations
 */
function calculateKneeAngle(
  thighData: SensorData,
  shankData: SensorData
): number {
  // Convert Euler angles to quaternions
  const thighQuat = eulerToQuaternion(
    thighData.Euler_X,
    thighData.Euler_Y,
    thighData.Euler_Z
  );
  const shankQuat = eulerToQuaternion(
    shankData.Euler_X,
    shankData.Euler_Y,
    shankData.Euler_Z
  );

  // Rotate sensor -Y axis to world coordinates
  const thighAxis = new THREE.Vector3(0, -1, 0).applyQuaternion(thighQuat);
  const shankAxis = new THREE.Vector3(0, -1, 0).applyQuaternion(shankQuat);

  // Calculate angle between vectors
  const dotProduct = Math.max(-1, Math.min(1, thighAxis.dot(shankAxis)));
  const angleRad = Math.acos(dotProduct);
  const angleDeg = THREE.MathUtils.radToDeg(angleRad);

  return angleDeg;
}

/**
 * Align sensor data by time and truncate to minimum length
 */
function alignSensorData(
  thighData: SensorData[],
  shankData: SensorData[]
): { thigh: SensorData[]; shank: SensorData[] } {
  const minLength = Math.min(thighData.length, shankData.length);

  return {
    thigh: thighData.slice(0, minLength),
    shank: shankData.slice(0, minLength),
  };
}

/**
 * Apply baseline subtraction (subtract mean of first 1 second)
 */
function applyBaselineSubtraction(
  angles: number[],
  timeSeconds: number[]
): number[] {
  const oneSecondIndex = timeSeconds.findIndex((t) => t >= 1.0);
  const baselineEndIndex =
    oneSecondIndex > 0 ? oneSecondIndex : Math.min(60, angles.length); // Fallback to 60 samples

  const baselineAngles = angles.slice(0, baselineEndIndex);
  const baselineMean =
    baselineAngles.reduce((sum, angle) => sum + angle, 0) /
    baselineAngles.length;

  return angles.map((angle) => angle - baselineMean);
}

/**
 * Smooth data using simple moving average
 */
function smoothData(data: number[], windowSize: number = 5): number[] {
  const smoothed: number[] = [];
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

    smoothed.push(sum / count);
  }

  return smoothed;
}

/**
 * Detect repetitions using peak detection
 */
function detectRepetitions(angles: number[], timeSeconds: number[]): number {
  const smoothedAngles = smoothData(angles, 5);
  const rom = Math.max(...smoothedAngles) - Math.min(...smoothedAngles);
  const threshold = Math.max(15, rom * 0.2); // At least 15° or 20% of ROM
  const minPeakDistance = 0.6; // seconds

  let reps = 0;
  let lastPeakTime = -minPeakDistance;

  for (let i = 2; i < smoothedAngles.length - 2; i++) {
    const v = smoothedAngles[i];
    const t = timeSeconds[i];
    const isPeak =
      v > smoothedAngles[i - 1] &&
      v > smoothedAngles[i + 1] &&
      v > smoothedAngles[i - 2] &&
      v > smoothedAngles[i + 2];
    if (!isPeak) continue;

    // Prominence-like check over a local window
    const start = Math.max(0, i - 15);
    const end = Math.min(smoothedAngles.length, i + 16);
    const window = smoothedAngles.slice(start, end);
    const localMin = Math.min(...window);
    const prominence = v - localMin;
    if (prominence < threshold) continue;

    if (t - lastPeakTime >= minPeakDistance) {
      reps++;
      lastPeakTime = t;
    }
  }

  return reps;
}

/**
 * Calculate average velocity using gradient
 */
function calculateAverageVelocity(
  angles: number[],
  timeSeconds: number[]
): number {
  const velocities: number[] = [];

  for (let i = 1; i < angles.length; i++) {
    const dt = timeSeconds[i] - timeSeconds[i - 1];
    if (dt > 0) {
      const velocity = Math.abs(angles[i] - angles[i - 1]) / dt;
      velocities.push(velocity);
    }
  }

  return velocities.length > 0
    ? velocities.reduce((sum, vel) => sum + vel, 0) / velocities.length
    : 0;
}

/**
 * Calculate knee metrics for a single knee
 */
function calculateKneeMetrics(
  thighData: SensorData[],
  shankData: SensorData[]
): KneeMetrics {
  const aligned = alignSensorData(thighData, shankData);

  // Calculate raw knee angles
  const rawAngles: number[] = [];
  const timeSeconds: number[] = [];

  for (let i = 0; i < aligned.thigh.length; i++) {
    const angle = calculateKneeAngle(aligned.thigh[i], aligned.shank[i]);
    rawAngles.push(angle);
    timeSeconds.push(aligned.thigh[i].timeSeconds!);
  }

  if (rawAngles.length === 0) {
    throw new Error("No valid knee angles calculated");
  }

  // Apply baseline subtraction
  const anglesBaseline = applyBaselineSubtraction(rawAngles, timeSeconds);

  // Ensure extension is ~0 and flexion is positive: shift to zero minimum
  const minAngle = Math.min(...anglesBaseline);
  const angles = anglesBaseline.map((a) => a - minAngle);

  // Calculate metrics
  const maxExtension = Math.max(...angles);
  const maxFlexion = Math.min(...angles);
  const rom = maxExtension - maxFlexion;
  const repetitions = detectRepetitions(angles, timeSeconds);
  const avgVelocity = calculateAverageVelocity(angles, timeSeconds);

  return {
    repetitions,
    rom,
    maxFlexion,
    maxExtension,
    avgVelocity,
  };
}

/**
 * Main analysis function - analyze ZIP file and return per-knee metrics
 */
export async function analyzeZip(
  zipFile: File | Buffer | ArrayBuffer | Uint8Array | string
): Promise<Analysis> {
  const session = await loadSessionFromZip(zipFile);

  // Validate required sensors are present
  if (!session.sensors.left.thigh || !session.sensors.left.shank) {
    throw new Error("Missing left knee sensors (DeviceTag 3 and 4)");
  }

  if (!session.sensors.right.thigh || !session.sensors.right.shank) {
    throw new Error("Missing right knee sensors (DeviceTag 1 and 2)");
  }

  // Calculate metrics for each knee
  const leftMetrics = calculateKneeMetrics(
    session.sensors.left.thigh,
    session.sensors.left.shank
  );
  const rightMetrics = calculateKneeMetrics(
    session.sensors.right.thigh,
    session.sensors.right.shank
  );

  // Calculate asymmetry
  const romDifference = Math.abs(leftMetrics.rom - rightMetrics.rom);
  const repetitionDifference = Math.abs(
    leftMetrics.repetitions - rightMetrics.repetitions
  );

  let dominantSide: "left" | "right" | "balanced" = "balanced";
  if (romDifference >= 10) {
    dominantSide = leftMetrics.rom > rightMetrics.rom ? "left" : "right";
  } else if (repetitionDifference > 1) {
    dominantSide =
      leftMetrics.repetitions > rightMetrics.repetitions ? "left" : "right";
  }

  return {
    left: leftMetrics,
    right: rightMetrics,
    asymmetry: {
      romDifference,
      repetitionDifference,
      dominantSide,
    },
  };
}
