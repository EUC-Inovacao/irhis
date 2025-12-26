/**
 * ZIP file reader for Movella DOT CSV data
 * Supports both browser (JSZip) and Node.js (adm-zip) environments
 */

import JSZip from "jszip";

// DeviceTag mapping as specified in requirements
export const DEVICE_TAG_MAPPING = {
  1: { side: "right", segment: "thigh" },
  2: { side: "right", segment: "shank" },
  3: { side: "left", segment: "thigh" },
  4: { side: "left", segment: "shank" },
  5: { side: "pelvis", segment: null },
} as const;

export interface SensorStream {
  tag: 1 | 2 | 3 | 4 | 5;
  t: number[]; // time in seconds
  ex: number[]; // Euler X
  ey: number[]; // Euler Y
  ez: number[]; // Euler Z
  quat: [number, number, number, number][]; // [w, x, y, z]
}

export interface Session {
  streams: Record<number, SensorStream>;
}

/**
 * Extract DeviceTag from CSV header line
 * Supports format: "DeviceTag: <n>" or "DeviceTag:,<n>"
 */
export function extractDeviceTag(csvContent: string): number | null {
  const lines = csvContent.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("DeviceTag:")) {
      // Handle both "DeviceTag: <n>" and "DeviceTag:,<n>" formats
      const match = trimmedLine.match(/DeviceTag:\s*,?\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }
  return null;
}

/**
 * Parse CSV content into sensor data arrays
 */
export function parseCSVContent(csvContent: string): {
  time: number[];
  eulerX: number[];
  eulerY: number[];
  eulerZ: number[];
} {
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
  const dataLines = lines.slice(dataStartIndex + 1); // Skip header
  const time: number[] = [];
  const eulerX: number[] = [];
  const eulerY: number[] = [];
  const eulerZ: number[] = [];

  for (const line of dataLines) {
    if (line.trim() === "") continue;

    const columns = line.split(",");
    if (columns.length < 9) continue; // Need at least 9 columns

    try {
      const sampleTimeFine = parseInt(columns[1], 10);
      const ex = parseFloat(columns[2]);
      const ey = parseFloat(columns[3]);
      const ez = parseFloat(columns[4]);

      if (!isNaN(sampleTimeFine) && !isNaN(ex) && !isNaN(ey) && !isNaN(ez)) {
        time.push(sampleTimeFine);
        eulerX.push(ex);
        eulerY.push(ey);
        eulerZ.push(ez);
      }
    } catch (error) {
      // Skip invalid rows
      continue;
    }
  }

  return { time, eulerX, eulerY, eulerZ };
}

/**
 * Convert Euler angles to quaternions
 */
export function eulerToQuaternion(
  ex: number,
  ey: number,
  ez: number
): [number, number, number, number] {
  // Convert degrees to radians
  const exRad = (ex * Math.PI) / 180;
  const eyRad = (ey * Math.PI) / 180;
  const ezRad = (ez * Math.PI) / 180;

  // ZYX intrinsic rotation (same as THREE.js)
  const cy = Math.cos(ezRad * 0.5);
  const sy = Math.sin(ezRad * 0.5);
  const cp = Math.cos(eyRad * 0.5);
  const sp = Math.sin(eyRad * 0.5);
  const cr = Math.cos(exRad * 0.5);
  const sr = Math.sin(exRad * 0.5);

  const w = cr * cp * cy + sr * sp * sy;
  const x = sr * cp * cy - cr * sp * sy;
  const y = cr * sp * cy + sr * cp * sy;
  const z = cr * cp * sy - sr * sp * cy;

  return [w, x, y, z]; // [w, x, y, z] format
}

/**
 * Load session data from ZIP file
 * Works in both browser and Node.js environments
 */
export async function loadSessionFromZip(
  zipFile: File | Buffer | ArrayBuffer | Uint8Array | string
): Promise<Session> {
  let zip: JSZip;

  try {
    // Handle different input types
    if (typeof zipFile === "string") {
      // Base64 string (React Native)
      zip = await JSZip.loadAsync(zipFile, { base64: true });
    } else {
      // Buffer, ArrayBuffer, or File (Browser/Node)
      zip = await JSZip.loadAsync(zipFile as any);
    }
  } catch (error) {
    throw new Error(`Failed to load ZIP file: ${error}`);
  }

  const session: Session = {
    streams: {},
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

      if (
        !deviceTag ||
        !DEVICE_TAG_MAPPING[deviceTag as keyof typeof DEVICE_TAG_MAPPING]
      ) {
        console.warn(`Unknown DeviceTag ${deviceTag} in file ${fileName}`);
        continue;
      }

      const { time, eulerX, eulerY, eulerZ } = parseCSVContent(csvContent);

      if (time.length === 0) {
        console.warn(`No valid data found in file ${fileName}`);
        continue;
      }

      // Convert time to seconds from microseconds
      const firstSampleTime = time[0];
      const timeSeconds = time.map((t) => (t - firstSampleTime) / 1e6);

      // Convert Euler angles to quaternions
      const quaternions: [number, number, number, number][] = [];
      for (let i = 0; i < eulerX.length; i++) {
        quaternions.push(eulerToQuaternion(eulerX[i], eulerY[i], eulerZ[i]));
      }

      const stream: SensorStream = {
        tag: deviceTag as 1 | 2 | 3 | 4 | 5,
        t: timeSeconds,
        ex: eulerX,
        ey: eulerY,
        ez: eulerZ,
        quat: quaternions,
      };

      session.streams[deviceTag] = stream;

      console.log(
        `Loaded ${time.length} samples for DeviceTag ${deviceTag} (${DEVICE_TAG_MAPPING[deviceTag as keyof typeof DEVICE_TAG_MAPPING].side} ${DEVICE_TAG_MAPPING[deviceTag as keyof typeof DEVICE_TAG_MAPPING].segment})`
      );
    } catch (error) {
      console.error(`Error processing file ${fileName}:`, error);
    }
  }

  return session;
}

/**
 * Align sensor streams by time and truncate to minimum length
 */
export function alignSensorStreams(streams: SensorStream[]): SensorStream[] {
  if (streams.length === 0) return [];

  // Find minimum length
  const minLength = Math.min(...streams.map((stream) => stream.t.length));

  // Truncate all streams to minimum length
  return streams.map((stream) => ({
    ...stream,
    t: stream.t.slice(0, minLength),
    ex: stream.ex.slice(0, minLength),
    ey: stream.ey.slice(0, minLength),
    ez: stream.ez.slice(0, minLength),
    quat: stream.quat.slice(0, minLength),
  }));
}

/**
 * Get time-aligned quaternion data for a specific sensor tag
 */
export function getQuaternionData(
  session: Session,
  tag: number
): [number, number, number, number][] | null {
  const stream = session.streams[tag];
  if (!stream) return null;

  return stream.quat;
}

/**
 * Get time array for a specific sensor tag
 */
export function getTimeData(session: Session, tag: number): number[] | null {
  const stream = session.streams[tag];
  if (!stream) return null;

  return stream.t;
}

/**
 * Check if required sensors are present
 */
export function validateRequiredSensors(session: Session): {
  isValid: boolean;
  missing: string[];
  available: string[];
} {
  const missing: string[] = [];
  const available: string[] = [];

  // Check each required sensor
  for (const [tag, mapping] of Object.entries(DEVICE_TAG_MAPPING)) {
    const tagNum = parseInt(tag, 10);
    const hasData =
      session.streams[tagNum] && session.streams[tagNum].t.length > 0;

    if (hasData) {
      if (mapping.side === "pelvis") {
        available.push("pelvis");
      } else {
        available.push(`${mapping.side} ${mapping.segment}`);
      }
    } else {
      if (mapping.side === "pelvis") {
        missing.push("pelvis");
      } else {
        missing.push(`${mapping.side} ${mapping.segment}`);
      }
    }
  }

  // For knee analysis, we need both thigh and shank for each side
  const leftKneeValid = session.streams[3] && session.streams[4];
  const rightKneeValid = session.streams[1] && session.streams[2];

  return {
    isValid: leftKneeValid && rightKneeValid,
    missing,
    available,
  };
}
