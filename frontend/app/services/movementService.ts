import * as THREE from "three";
import {
  ZipFileData,
  JointPositions,
  SegmentOrientations,
  GaitParameters,
} from "../types";
import * as FileSystem from "expo-file-system";
import { readAsStringAsync } from "expo-file-system/legacy";
import JSZip from "jszip";
import * as Papa from "papaparse";

// Sensor mapping based on DeviceTag
interface SensorMapping {
  side: "left" | "right" | "center";
  segment: "thigh" | "shank" | "pelvis";
}

const DEVICE_TAG_MAPPING: Record<number, SensorMapping> = {
  1: { side: "right", segment: "thigh" },
  2: { side: "right", segment: "shank" },
  3: { side: "left", segment: "thigh" },
  4: { side: "left", segment: "shank" },
  5: { side: "center", segment: "pelvis" },
};

// Enhanced analysis result with per-knee metrics
export interface PerKneeAnalysisResult {
  exerciseType: "Squat" | "Leg Knee Extension";
  leftKnee: {
    jointAngles: number[];
    metrics: {
      repetitionCount: number;
      maxFlexionAngle: number;
      maxExtensionAngle: number;
      rangeOfMotion: number;
      averageVelocity: number;
    };
  };
  rightKnee: {
    jointAngles: number[];
    metrics: {
      repetitionCount: number;
      maxFlexionAngle: number;
      maxExtensionAngle: number;
      rangeOfMotion: number;
      averageVelocity: number;
    };
  };
  asymmetry: {
    romDifference: number;
    repetitionDifference: number;
    dominantSide: "left" | "right" | "balanced";
  };
  centerOfMass: {
    dominantSide: "left" | "right";
    distribution: {
      left: number;
      right: number;
    };
  };
}

const eulerToQuaternion = (x: number, y: number, z: number) => {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(x),
    THREE.MathUtils.degToRad(y),
    THREE.MathUtils.degToRad(z),
    "ZYX"
  );
  return new THREE.Quaternion().setFromEuler(euler);
};

// Extract DeviceTag from CSV header
const extractDeviceTag = (csvContent: string): number | null => {
  const lines = csvContent.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Handle both formats: "DeviceTag:,1" and "DeviceTag: 1"
    if (trimmedLine.startsWith("DeviceTag:")) {
      const match = trimmedLine.match(/DeviceTag:\s*,?\s*(\d+)/);
      if (match) {
        const deviceTag = parseInt(match[1], 10);
        console.log(
          `Extracted DeviceTag: ${deviceTag} from line: "${trimmedLine}"`
        );
        return deviceTag;
      }
    }
  }
  console.warn("DeviceTag not found in CSV content");
  return null;
};

// Map sensor data by side and segment
interface MappedSensorData {
  left: {
    thigh?: any[];
    shank?: any[];
  };
  right: {
    thigh?: any[];
    shank?: any[];
  };
  pelvis?: any[];
}

const mapSensorDataByDeviceTag = async (
  zip: JSZip
): Promise<MappedSensorData> => {
  const mapped: MappedSensorData = {
    left: {},
    right: {},
  };

  // Process each CSV file in the ZIP
  for (const fileName in zip.files) {
    if (
      !zip.files[fileName].dir &&
      (fileName.endsWith(".txt") || fileName.endsWith(".csv"))
    ) {
      try {
        const fileContent = await zip.files[fileName].async("text");

        // Extract DeviceTag from the CSV header
        const deviceTag = extractDeviceTag(fileContent);

        if (deviceTag && DEVICE_TAG_MAPPING[deviceTag]) {
          const mapping = DEVICE_TAG_MAPPING[deviceTag];

          // Parse the CSV data
          const parsed = parseSensorFile(fileContent);

          if (parsed.length > 0) {
            console.log(
              `Mapped DeviceTag ${deviceTag} (${fileName}) to ${mapping.side} ${mapping.segment}`
            );

            if (mapping.side === "left") {
              mapped.left[mapping.segment as "thigh" | "shank"] = parsed;
            } else if (mapping.side === "right") {
              mapped.right[mapping.segment as "thigh" | "shank"] = parsed;
            } else if (mapping.segment === "pelvis") {
              mapped.pelvis = parsed;
            }
          }
        } else {
          console.warn(
            `Could not map file ${fileName} - DeviceTag not found or not recognized`
          );
        }
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
      }
    }
  }

  return mapped;
};

export const calculateJointAngle = (
  q1: THREE.Quaternion,
  q2: THREE.Quaternion
) => {
  const v1 = new THREE.Vector3(0, 1, 0).applyQuaternion(q1);
  const v2 = new THREE.Vector3(0, 1, 0).applyQuaternion(q2);
  const angle = v1.angleTo(v2);
  const degrees = THREE.MathUtils.radToDeg(angle);

  return 180 - degrees;
};

export const processZipFile = async (uri: string): Promise<ZipFileData> => {
  try {
    const fileContent = await readAsStringAsync(uri, {
      encoding: "base64",
    });

    const zip = await JSZip.loadAsync(fileContent, { base64: true });
    const data: ZipFileData = {};

    if (zip.files["joint_positions.csv"]) {
      const csvData = await zip.files["joint_positions.csv"].async("text");
      data.jointPositions = Papa.parse<JointPositions>(csvData, {
        header: true,
        dynamicTyping: true,
      }).data;
    }
    if (zip.files["segment_orientations.csv"]) {
      const csvData = await zip.files["segment_orientations.csv"].async("text");
      data.segmentOrientations = Papa.parse<SegmentOrientations>(csvData, {
        header: true,
        dynamicTyping: true,
      }).data;
    }
    if (zip.files["gait_parameters.csv"]) {
      const csvData = await zip.files["gait_parameters.csv"].async("text");
      data.gaitParameters = Papa.parse<GaitParameters>(csvData, {
        header: true,
        dynamicTyping: true,
      }).data;
    }

    return data;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
};

const parseSensorFile = (fileContent: string): any[] => {
  const lines = fileContent.replace(/\r\n/g, "\n").split("\n");

  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      /^\d/.test(line) ||
      /PacketCounter|SampleTimeFine|Quat_|Euler_/.test(line)
    ) {
      dataStartIndex = i;
      break;
    }
  }

  const headerLine = lines[dataStartIndex]
    .trim()
    .replace(/\s+/g, ",")
    .replace(/[,]+/g, ",")
    .replace(/^,|,$/g, "");

  const headers = headerLine.split(",").map((h) => h.trim());

  const dataRows = [];
  for (let i = dataStartIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      continue;
    }

    const values = line
      .replace(/\s+/g, ",")
      .replace(/[,]+/g, ",")
      .replace(/^,|,$/g, "")
      .split(",")
      .map((v) => v.trim());

    if (values.length >= 4) {
      const rowData: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          const value = parseFloat(values[index]);
          rowData[header] = isNaN(value) ? values[index] : value;
        }
      });
      dataRows.push(rowData);
    }
  }

  if (dataRows.length === 0) {
    console.warn("No valid data rows found in the file");
    console.warn("Headers found:", headers);
  } else {
    console.log(
      `Successfully parsed ${dataRows.length} rows with ${headers.length} columns`
    );
    console.log("Sample row:", dataRows[0]);
  }

  return dataRows;
};

export const analyzeMovementData = async (
  uri: string,
  exerciseType: "Squat" | "Leg Knee Extension"
): Promise<PerKneeAnalysisResult> => {
  try {
    const zipData = await readAsStringAsync(uri, {
      encoding: "base64",
    });
    const zip = await JSZip.loadAsync(zipData, { base64: true });

    console.log(
      `Processing ZIP file with ${Object.keys(zip.files).length} files`
    );

    // Map sensor data by DeviceTag (now reads DeviceTag from CSV headers)
    const mappedData = await mapSensorDataByDeviceTag(zip);

    // Enhanced mapping results logging for debugging
    console.log("=== SENSOR MAPPING VERIFICATION ===");
    console.log("Sensor mapping results:");
    console.log(
      "- Left thigh:",
      mappedData.left.thigh
        ? `${mappedData.left.thigh.length} frames`
        : "missing"
    );
    console.log(
      "- Left shank:",
      mappedData.left.shank
        ? `${mappedData.left.shank.length} frames`
        : "missing"
    );
    console.log(
      "- Right thigh:",
      mappedData.right.thigh
        ? `${mappedData.right.thigh.length} frames`
        : "missing"
    );
    console.log(
      "- Right shank:",
      mappedData.right.shank
        ? `${mappedData.right.shank.length} frames`
        : "missing"
    );
    console.log(
      "- Pelvis:",
      mappedData.pelvis ? `${mappedData.pelvis.length} frames` : "missing"
    );

    // Verify data integrity
    if (mappedData.left.thigh && mappedData.left.shank) {
      console.log("✓ Left knee data: Both thigh and shank available");
      console.log(`  Left thigh sample:`, mappedData.left.thigh[0]);
      console.log(`  Left shank sample:`, mappedData.left.shank[0]);
    } else {
      console.log("✗ Left knee data: Missing thigh or shank");
    }

    if (mappedData.right.thigh && mappedData.right.shank) {
      console.log("✓ Right knee data: Both thigh and shank available");
      console.log(`  Right thigh sample:`, mappedData.right.thigh[0]);
      console.log(`  Right shank sample:`, mappedData.right.shank[0]);
    } else {
      console.log("✗ Right knee data: Missing thigh or shank");
    }

    // Validate required sensors are present
    const hasLeftKnee = mappedData.left.thigh && mappedData.left.shank;
    const hasRightKnee = mappedData.right.thigh && mappedData.right.shank;

    if (!hasLeftKnee && !hasRightKnee) {
      throw new Error(
        "No valid knee sensor pairs found. Need at least one thigh-shank pair."
      );
    }

    // Calculate metrics for each knee
    const leftKneeMetrics = hasLeftKnee
      ? calculateKneeMetrics(
          mappedData.left.thigh!,
          mappedData.left.shank!,
          exerciseType
        )
      : null;

    const rightKneeMetrics = hasRightKnee
      ? calculateKneeMetrics(
          mappedData.right.thigh!,
          mappedData.right.shank!,
          exerciseType
        )
      : null;

    // Calculate asymmetry metrics
    const asymmetry = calculateAsymmetryMetrics(
      leftKneeMetrics,
      rightKneeMetrics
    );

    // Calculate center of mass (using available sensors)
    const centerOfMass = calculateCenterOfMass(mappedData);

    return {
      exerciseType,
      leftKnee: leftKneeMetrics || {
        jointAngles: [],
        metrics: {
          repetitionCount: 0,
          maxFlexionAngle: 0,
          maxExtensionAngle: 0,
          rangeOfMotion: 0,
          averageVelocity: 0,
        },
      },
      rightKnee: rightKneeMetrics || {
        jointAngles: [],
        metrics: {
          repetitionCount: 0,
          maxFlexionAngle: 0,
          maxExtensionAngle: 0,
          rangeOfMotion: 0,
          averageVelocity: 0,
        },
      },
      asymmetry,
      centerOfMass,
    };
  } catch (error) {
    console.error("Error in analyzeMovementData:", error);
    throw error;
  }
};

// Calculate metrics for a single knee (thigh + shank pair) - IMPROVED VERSION
const calculateKneeMetrics = (
  thighData: any[],
  shankData: any[],
  exerciseType: "Squat" | "Leg Knee Extension"
) => {
  const jointAngles: number[] = [];
  const timestamps: number[] = [];
  const numFrames = Math.min(thighData.length, shankData.length);

  console.log(`Processing ${exerciseType} data for knee:`, numFrames, "frames");

  // Step 1: Calculate raw joint angles and collect timestamps
  for (let i = 0; i < numFrames; i++) {
    const thighRow = thighData[i];
    const shankRow = shankData[i];

    let q1, q2;

    if (thighRow.Quat_W != null) {
      q1 = new THREE.Quaternion(
        thighRow.Quat_X,
        thighRow.Quat_Y,
        thighRow.Quat_Z,
        thighRow.Quat_W
      );
    } else {
      q1 = eulerToQuaternion(
        thighRow.Euler_X || 0,
        thighRow.Euler_Y || 0,
        thighRow.Euler_Z || 0
      );
    }

    if (shankRow.Quat_W != null) {
      q2 = new THREE.Quaternion(
        shankRow.Quat_X,
        shankRow.Quat_Y,
        shankRow.Quat_Z,
        shankRow.Quat_W
      );
    } else {
      q2 = eulerToQuaternion(
        shankRow.Euler_X || 0,
        shankRow.Euler_Y || 0,
        shankRow.Euler_Z || 0
      );
    }

    const angle = calculateJointAngle(q1, q2);

    if (angle >= 0 && angle <= 180) {
      jointAngles.push(angle);
      // Use SampleTimeFine for accurate timestamps
      timestamps.push(shankRow.SampleTimeFine || i);
    }
  }

  if (jointAngles.length === 0) {
    console.warn("No valid joint angles calculated for knee");
    return {
      jointAngles: [],
      metrics: {
        repetitionCount: 0,
        maxFlexionAngle: 0,
        maxExtensionAngle: 0,
        rangeOfMotion: 0,
        averageVelocity: 0,
      },
    };
  }

  // Step 2: Normalize signal - ensure flexion is positive
  const meanAngle = jointAngles.reduce((a, b) => a + b, 0) / jointAngles.length;
  const stdPositive = Math.sqrt(
    jointAngles
      .filter((a) => a > meanAngle)
      .reduce((sum, a) => sum + Math.pow(a - meanAngle, 2), 0) /
      jointAngles.filter((a) => a > meanAngle).length
  );
  const stdNegative = Math.sqrt(
    jointAngles
      .filter((a) => a < meanAngle)
      .reduce((sum, a) => sum + Math.pow(a - meanAngle, 2), 0) /
      jointAngles.filter((a) => a < meanAngle).length
  );

  // If negative values have higher std, invert the signal
  if (stdNegative > stdPositive) {
    const maxAngle = Math.max(...jointAngles);
    jointAngles.forEach((angle, i) => {
      jointAngles[i] = maxAngle - angle;
    });
    console.log("Signal inverted to ensure flexion is positive");
  }

  // Step 3: Apply low-pass filter (simple moving average)
  const filteredAngles = applyLowPassFilter(jointAngles, 5); // 5-sample window

  // Step 4: Calculate angular velocity using real timestamps
  const velocities: number[] = [];
  for (let i = 1; i < filteredAngles.length; i++) {
    const dt = (timestamps[i] - timestamps[i - 1]) / 1000; // Convert to seconds
    if (dt > 0) {
      const velocity = Math.abs(filteredAngles[i] - filteredAngles[i - 1]) / dt;
      velocities.push(velocity);
    }
  }

  const averageVelocity =
    velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;

  // Step 5: Calculate ROM and extrema
  const maxExtensionAngle = Math.max(...filteredAngles);
  const maxFlexionAngle = Math.min(...filteredAngles);
  const rangeOfMotion = maxExtensionAngle - maxFlexionAngle;

  // Step 6: Improved peak detection with temporal constraints
  const peaks = findPeaksImproved(
    filteredAngles,
    timestamps,
    rangeOfMotion,
    exerciseType
  );
  const repetitionCount = peaks.length;

  // Debug logging
  console.log(
    `Knee angle stats - Max: ${maxExtensionAngle.toFixed(1)}°, Min: ${maxFlexionAngle.toFixed(1)}°, ROM: ${rangeOfMotion.toFixed(1)}°`
  );
  console.log(`Average velocity: ${averageVelocity.toFixed(2)}°/s`);
  console.log(`Detected ${repetitionCount} repetitions`);
  console.log(`First 5 timestamps:`, timestamps.slice(0, 5));
  console.log(`Last 5 timestamps:`, timestamps.slice(-5));

  return {
    jointAngles: filteredAngles,
    metrics: {
      repetitionCount,
      maxFlexionAngle,
      maxExtensionAngle,
      rangeOfMotion,
      averageVelocity,
    },
  };
};

// Calculate asymmetry metrics between left and right knees - IMPROVED VERSION
const calculateAsymmetryMetrics = (leftKnee: any, rightKnee: any) => {
  if (!leftKnee || !rightKnee) {
    return {
      romDifference: 0,
      repetitionDifference: 0,
      dominantSide: "balanced" as const,
    };
  }

  const romDifference = Math.abs(
    leftKnee.metrics.rangeOfMotion - rightKnee.metrics.rangeOfMotion
  );
  const repetitionDifference = Math.abs(
    leftKnee.metrics.repetitionCount - rightKnee.metrics.repetitionCount
  );

  // Improved dominant side logic - only consider balanced if difference is <= 1
  let dominantSide: "left" | "right" | "balanced" = "balanced";
  const repDiff = Math.abs(
    leftKnee.metrics.repetitionCount - rightKnee.metrics.repetitionCount
  );

  if (repDiff <= 1) {
    dominantSide = "balanced";
  } else if (
    leftKnee.metrics.repetitionCount > rightKnee.metrics.repetitionCount
  ) {
    dominantSide = "left";
  } else {
    dominantSide = "right";
  }

  console.log(
    `Asymmetry analysis: L=${leftKnee.metrics.repetitionCount} reps, R=${rightKnee.metrics.repetitionCount} reps, diff=${repDiff}, dominant=${dominantSide}`
  );

  return {
    romDifference,
    repetitionDifference,
    dominantSide,
  };
};

// Calculate center of mass distribution
const calculateCenterOfMass = (mappedData: MappedSensorData) => {
  const leftWeightDistribution: number[] = [];
  const rightWeightDistribution: number[] = [];

  // Use available sensors to estimate weight distribution
  if (mappedData.left.thigh && mappedData.left.shank) {
    const numFrames = Math.min(
      mappedData.left.thigh.length,
      mappedData.left.shank.length
    );
    for (let i = 0; i < numFrames; i++) {
      const thighRow = mappedData.left.thigh[i];
      const shankRow = mappedData.left.shank[i];
      const leftWeight =
        Math.abs(thighRow.Euler_Y || 0) + Math.abs(shankRow.Euler_Y || 0);
      leftWeightDistribution.push(leftWeight);
    }
  }

  if (mappedData.right.thigh && mappedData.right.shank) {
    const numFrames = Math.min(
      mappedData.right.thigh.length,
      mappedData.right.shank.length
    );
    for (let i = 0; i < numFrames; i++) {
      const thighRow = mappedData.right.thigh[i];
      const shankRow = mappedData.right.shank[i];
      const rightWeight =
        Math.abs(thighRow.Euler_Z || 0) + Math.abs(shankRow.Euler_Z || 0);
      rightWeightDistribution.push(rightWeight);
    }
  }

  const avgLeftWeight =
    leftWeightDistribution.length > 0
      ? leftWeightDistribution.reduce((a, b) => a + b, 0) /
        leftWeightDistribution.length
      : 0;
  const avgRightWeight =
    rightWeightDistribution.length > 0
      ? rightWeightDistribution.reduce((a, b) => a + b, 0) /
        rightWeightDistribution.length
      : 0;

  const totalWeight = avgLeftWeight + avgRightWeight;
  const leftPercentage =
    totalWeight > 0 ? (avgLeftWeight / totalWeight) * 100 : 50;
  const rightPercentage =
    totalWeight > 0 ? (avgRightWeight / totalWeight) * 100 : 50;

  return {
    dominantSide: leftPercentage > rightPercentage ? "left" : "right",
    distribution: {
      left: leftPercentage,
      right: rightPercentage,
    },
  };
};

// Low-pass filter using simple moving average
const applyLowPassFilter = (data: number[], windowSize: number): number[] => {
  const filtered: number[] = [];
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

    filtered.push(sum / count);
  }

  return filtered;
};

// Improved peak detection with temporal constraints
const findPeaksImproved = (
  data: number[],
  timestamps: number[],
  rangeOfMotion: number,
  exerciseType: "Squat" | "Leg Knee Extension"
) => {
  const peaks: { index: number; angle: number; timestamp: number }[] = [];

  // Dynamic threshold based on ROM
  const minPeakHeight = rangeOfMotion * 0.3; // At least 30% of ROM
  const minPeakDistance = 600; // Minimum 0.6 seconds between peaks (in ms)

  console.log(
    `Peak detection: minHeight=${minPeakHeight.toFixed(1)}°, minDistance=${minPeakDistance}ms`
  );

  for (let i = 2; i < data.length - 2; i++) {
    const currentTime = timestamps[i];
    const currentAngle = data[i];

    // Check if this is a local extremum
    let isExtremum = false;
    if (exerciseType === "Squat") {
      // For squats, look for valleys (flexion peaks)
      isExtremum =
        currentAngle < data[i - 1] &&
        currentAngle < data[i + 1] &&
        currentAngle < data[i - 2] &&
        currentAngle < data[i + 2];
    } else {
      // For leg extensions, look for peaks (extension peaks)
      isExtremum =
        currentAngle > data[i - 1] &&
        currentAngle > data[i + 1] &&
        currentAngle > data[i - 2] &&
        currentAngle > data[i + 2];
    }

    if (isExtremum) {
      // Check if peak height is sufficient
      const windowSize = Math.min(20, Math.floor(data.length / 10));
      const startIdx = Math.max(0, i - windowSize);
      const endIdx = Math.min(data.length - 1, i + windowSize);

      let localMin = Math.min(...data.slice(startIdx, endIdx + 1));
      let localMax = Math.max(...data.slice(startIdx, endIdx + 1));
      let localRange = localMax - localMin;

      if (localRange >= minPeakHeight) {
        // Check temporal distance from last peak
        const lastPeakTime =
          peaks.length > 0 ? peaks[peaks.length - 1].timestamp : 0;
        const timeDiff = currentTime - lastPeakTime;

        if (peaks.length === 0 || timeDiff >= minPeakDistance) {
          peaks.push({
            index: i,
            angle: currentAngle,
            timestamp: currentTime,
          });
        }
      }
    }
  }

  console.log(
    `Found ${peaks.length} ${exerciseType} repetitions with improved detection`
  );
  return peaks;
};

// Legacy peak detection function (kept for backward compatibility)
const findPeaks = (
  data: number[],
  threshold: number,
  distance: number,
  exerciseType: "Squat" | "Leg Knee Extension"
) => {
  const peaks: { index: number; angle: number }[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    if (exerciseType === "Squat") {
      const isValley =
        data[i] < threshold && data[i] < data[i - 1] && data[i] < data[i + 1];
      if (
        isValley &&
        (peaks.length === 0 || i - peaks[peaks.length - 1].index > distance)
      ) {
        peaks.push({ index: i, angle: data[i] });
      }
    } else {
      const isPeak =
        data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1];
      if (
        isPeak &&
        (peaks.length === 0 || i - peaks[peaks.length - 1].index > distance)
      ) {
        peaks.push({ index: i, angle: data[i] });
      }
    }
  }

  console.log(`Found ${peaks.length} ${exerciseType} repetitions`);
  return peaks;
};

// Legacy functions - kept for backward compatibility but deprecated
const calculateMetricsForExercise = (
  sensorData: { [key: string]: any[] },
  exerciseType: "Squat" | "Leg Knee Extension"
) => {
  console.warn(
    "calculateMetricsForExercise is deprecated. Use analyzeMovementData instead for per-knee analysis."
  );
  const sensorKeys = Object.keys(sensorData).sort();
  if (sensorKeys.length < 2) {
    throw new Error(
      "At least two sensor files are required for angle calculation."
    );
  }

  const thighData = sensorData[sensorKeys[0]];
  const shinData = sensorData[sensorKeys[1]];

  const jointAngles: number[] = [];
  const numFrames = Math.min(thighData.length, shinData.length);

  console.log(`Processing ${exerciseType} data:`, numFrames, "frames");

  const leftWeightDistribution: number[] = [];
  const rightWeightDistribution: number[] = [];

  for (let i = 0; i < numFrames; i++) {
    const thighRow = thighData[i];
    const shinRow = shinData[i];

    let q1, q2;

    if (thighRow.Quat_W != null) {
      q1 = new THREE.Quaternion(
        thighRow.Quat_X,
        thighRow.Quat_Y,
        thighRow.Quat_Z,
        thighRow.Quat_W
      );
    } else {
      q1 = eulerToQuaternion(
        thighRow.Euler_X || 0,
        thighRow.Euler_Y || 0,
        thighRow.Euler_Z || 0
      );
    }

    if (shinRow.Quat_W != null) {
      q2 = new THREE.Quaternion(
        shinRow.Quat_X,
        shinRow.Quat_Y,
        shinRow.Quat_Z,
        shinRow.Quat_W
      );
    } else {
      q2 = eulerToQuaternion(
        shinRow.Euler_X || 0,
        shinRow.Euler_Y || 0,
        shinRow.Euler_Z || 0
      );
    }

    const angle = calculateJointAngle(q1, q2);

    if (angle >= 0 && angle <= 180) {
      jointAngles.push(angle);
    }

    const leftWeight =
      Math.abs(thighRow.Euler_Y || 0) + Math.abs(shinRow.Euler_Y || 0);
    const rightWeight =
      Math.abs(thighRow.Euler_Z || 0) + Math.abs(shinRow.Euler_Z || 0);

    leftWeightDistribution.push(leftWeight);
    rightWeightDistribution.push(rightWeight);
  }

  if (jointAngles.length === 0) {
    console.warn("No valid joint angles calculated");
    return {
      jointAngles: [],
      metrics: {
        repetitionCount: 0,
        maxFlexionAngle: 0,
        maxExtensionAngle: 0,
        centerOfMass: {
          dominantSide: "left",
          distribution: {
            left: 50,
            right: 50,
          },
        },
      },
    };
  }

  const maxExtensionAngle = Math.max(...jointAngles);
  const maxFlexionAngle = Math.min(...jointAngles);

  const avgLeftWeight =
    leftWeightDistribution.reduce((a, b) => a + b, 0) /
    leftWeightDistribution.length;
  const avgRightWeight =
    rightWeightDistribution.reduce((a, b) => a + b, 0) /
    rightWeightDistribution.length;

  const totalWeight = avgLeftWeight + avgRightWeight;
  const leftPercentage = (avgLeftWeight / totalWeight) * 100;
  const rightPercentage = (avgRightWeight / totalWeight) * 100;

  let repThreshold;
  if (exerciseType === "Squat") {
    repThreshold = 100;
  } else {
    repThreshold =
      maxFlexionAngle + (maxExtensionAngle - maxFlexionAngle) * 0.8;
  }

  console.log(
    `Using ${exerciseType} threshold: ${repThreshold.toFixed(1)}° based on ROM: ${maxFlexionAngle.toFixed(1)}° - ${maxExtensionAngle.toFixed(1)}°`
  );

  const peaks = findPeaks(jointAngles, repThreshold, 20, exerciseType);
  const repetitionCount = peaks.length;

  return {
    jointAngles,
    metrics: {
      repetitionCount,
      maxFlexionAngle,
      maxExtensionAngle,
      centerOfMass: {
        dominantSide: leftPercentage > rightPercentage ? "left" : "right",
        distribution: {
          left: leftPercentage,
          right: rightPercentage,
        },
      },
    },
  };
};

const calculateSquatMetrics = (sensorData: { [key: string]: any[] }) => {
  return calculateMetricsForExercise(sensorData, "Squat");
};

const calculateLegKneeExtensionMetrics = (sensorData: {
  [key: string]: any[];
}) => {
  return calculateMetricsForExercise(sensorData, "Leg Knee Extension");
};

const movementService = {
  eulerToQuaternion,
  calculateJointAngle,
  processZipFile,
  analyzeMovementData,
  // Legacy functions
  calculateSquatMetrics,
  calculateLegKneeExtensionMetrics,
};

export default movementService;
