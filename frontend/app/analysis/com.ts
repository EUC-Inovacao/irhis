/**
 * Center of Mass (CoM) calculations using segmental model
 * Based on De Leva (1996) anthropometric data and standard biomechanical models
 */

import { rotateVecByQuat, mat3FromQuat } from "./kinematics";

// De Leva (1996) anthropometric constants
export const DE_LEVA_CONSTANTS = {
  // Segment length ratios (as fraction of total body height)
  SEGMENT_LENGTHS: {
    THIGH: 0.245, // 24.5% of body height
    SHANK: 0.246, // 24.6% of body height
    PELVIS_WIDTH: 0.146, // 14.6% of body height
  },

  // Center of mass locations (as fraction of segment length from proximal end)
  COM_LOCATIONS: {
    THIGH: 0.409, // 40.9% from hip joint
    SHANK: 0.445, // 44.5% from knee joint
    PELVIS: 0.5, // 50% from center
  },

  // Segment mass fractions (as fraction of total body mass)
  MASS_FRACTIONS: {
    THIGH: 0.1, // 10.0% of body mass
    SHANK: 0.0465, // 4.65% of body mass
    PELVIS: 0.142, // 14.2% of body mass
  },
};

export interface SegmentModel {
  pelvis: {
    position: [number, number, number];
    orientation: [number, number, number, number]; // quaternion
    mass: number;
  };
  leftThigh: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    mass: number;
    length: number;
  };
  rightThigh: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    mass: number;
    length: number;
  };
  leftShank: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    mass: number;
    length: number;
  };
  rightShank: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    mass: number;
    length: number;
  };
}

export interface CoMPosition {
  position: [number, number, number];
  mass: number;
}

export interface CoMResult {
  verticalAmp_cm: number;
  mlAmp_cm: number;
  apAmp_cm: number;
  rms_cm: number;
}

/**
 * Build segment model from sensor data
 */
export function buildSegmentModel(
  sensorData: {
    pelvis?: { time: number; quat: [number, number, number, number] }[];
    leftThigh?: { time: number; quat: [number, number, number, number] }[];
    rightThigh?: { time: number; quat: [number, number, number, number] }[];
    leftShank?: { time: number; quat: [number, number, number, number] }[];
    rightShank?: { time: number; quat: [number, number, number, number] }[];
  },
  bodyHeight_m: number = 1.75,
  bodyMass_kg: number = 70
): SegmentModel[] {
  const minLength = Math.min(
    sensorData.pelvis?.length || Infinity,
    sensorData.leftThigh?.length || Infinity,
    sensorData.rightThigh?.length || Infinity,
    sensorData.leftShank?.length || Infinity,
    sensorData.rightShank?.length || Infinity
  );

  if (minLength === Infinity || minLength === 0) {
    throw new Error("No valid sensor data available for segment model");
  }

  const models: SegmentModel[] = [];

  // Calculate segment dimensions
  const thighLength = bodyHeight_m * DE_LEVA_CONSTANTS.SEGMENT_LENGTHS.THIGH;
  const shankLength = bodyHeight_m * DE_LEVA_CONSTANTS.SEGMENT_LENGTHS.SHANK;
  const pelvisWidth =
    bodyHeight_m * DE_LEVA_CONSTANTS.SEGMENT_LENGTHS.PELVIS_WIDTH;

  // Calculate masses
  const pelvisMass = bodyMass_kg * DE_LEVA_CONSTANTS.MASS_FRACTIONS.PELVIS;
  const thighMass = bodyMass_kg * DE_LEVA_CONSTANTS.MASS_FRACTIONS.THIGH;
  const shankMass = bodyMass_kg * DE_LEVA_CONSTANTS.MASS_FRACTIONS.SHANK;

  for (let i = 0; i < minLength; i++) {
    const pelvis = sensorData.pelvis?.[i];
    const leftThigh = sensorData.leftThigh?.[i];
    const rightThigh = sensorData.rightThigh?.[i];
    const leftShank = sensorData.leftShank?.[i];
    const rightShank = sensorData.rightShank?.[i];

    if (!pelvis || !leftThigh || !rightThigh || !leftShank || !rightShank) {
      continue;
    }

    // Pelvis position (origin of coordinate system)
    const pelvisPosition: [number, number, number] = [0, 0, 0];

    // Calculate hip joint positions (assuming hip joints are at pelvis edges)
    const pelvisMatrix = mat3FromQuat(pelvis.quat);
    const hipOffset = pelvisWidth / 2;

    const leftHipPosition: [number, number, number] = [
      -hipOffset * pelvisMatrix[0][0],
      -hipOffset * pelvisMatrix[1][0],
      -hipOffset * pelvisMatrix[2][0],
    ];

    const rightHipPosition: [number, number, number] = [
      hipOffset * pelvisMatrix[0][0],
      hipOffset * pelvisMatrix[1][0],
      hipOffset * pelvisMatrix[2][0],
    ];

    // Calculate knee positions using thigh orientations and lengths
    const leftThighAxis = rotateVecByQuat(leftThigh.quat, [0, -1, 0]);
    const leftKneePosition: [number, number, number] = [
      leftHipPosition[0] + leftThighAxis[0] * thighLength,
      leftHipPosition[1] + leftThighAxis[1] * thighLength,
      leftHipPosition[2] + leftThighAxis[2] * thighLength,
    ];

    const rightThighAxis = rotateVecByQuat(rightThigh.quat, [0, -1, 0]);
    const rightKneePosition: [number, number, number] = [
      rightHipPosition[0] + rightThighAxis[0] * thighLength,
      rightHipPosition[1] + rightThighAxis[1] * thighLength,
      rightHipPosition[2] + rightThighAxis[2] * thighLength,
    ];

    // Calculate ankle positions using shank orientations and lengths
    const leftShankAxis = rotateVecByQuat(leftShank.quat, [0, -1, 0]);
    const leftAnklePosition: [number, number, number] = [
      leftKneePosition[0] + leftShankAxis[0] * shankLength,
      leftKneePosition[1] + leftShankAxis[1] * shankLength,
      leftKneePosition[2] + leftShankAxis[2] * shankLength,
    ];

    const rightShankAxis = rotateVecByQuat(rightShank.quat, [0, -1, 0]);
    const rightAnklePosition: [number, number, number] = [
      rightKneePosition[0] + rightShankAxis[0] * shankLength,
      rightKneePosition[1] + rightShankAxis[1] * shankLength,
      rightKneePosition[2] + rightShankAxis[2] * shankLength,
    ];

    models.push({
      pelvis: {
        position: pelvisPosition,
        orientation: pelvis.quat,
        mass: pelvisMass,
      },
      leftThigh: {
        position: leftHipPosition,
        orientation: leftThigh.quat,
        mass: thighMass,
        length: thighLength,
      },
      rightThigh: {
        position: rightHipPosition,
        orientation: rightThigh.quat,
        mass: thighMass,
        length: thighLength,
      },
      leftShank: {
        position: leftKneePosition,
        orientation: leftShank.quat,
        mass: shankMass,
        length: shankLength,
      },
      rightShank: {
        position: rightKneePosition,
        orientation: rightShank.quat,
        mass: shankMass,
        length: shankLength,
      },
    });
  }

  return models;
}

/**
 * Calculate Center of Mass for a segment model
 */
export function calculateCoM(segmentModel: SegmentModel): CoMPosition {
  let totalMass = 0;
  let weightedPosition: [number, number, number] = [0, 0, 0];

  // Pelvis CoM
  const pelvisCom = segmentModel.pelvis.position;
  weightedPosition[0] += pelvisCom[0] * segmentModel.pelvis.mass;
  weightedPosition[1] += pelvisCom[1] * segmentModel.pelvis.mass;
  weightedPosition[2] += pelvisCom[2] * segmentModel.pelvis.mass;
  totalMass += segmentModel.pelvis.mass;

  // Left thigh CoM (at COM_LOCATIONS.THIGH from hip)
  const leftThighCom: [number, number, number] = [
    segmentModel.leftThigh.position[0] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
    segmentModel.leftThigh.position[1] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
    segmentModel.leftThigh.position[2] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
  ];
  weightedPosition[0] += leftThighCom[0] * segmentModel.leftThigh.mass;
  weightedPosition[1] += leftThighCom[1] * segmentModel.leftThigh.mass;
  weightedPosition[2] += leftThighCom[2] * segmentModel.leftThigh.mass;
  totalMass += segmentModel.leftThigh.mass;

  // Right thigh CoM
  const rightThighCom: [number, number, number] = [
    segmentModel.rightThigh.position[0] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
    segmentModel.rightThigh.position[1] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
    segmentModel.rightThigh.position[2] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.THIGH),
  ];
  weightedPosition[0] += rightThighCom[0] * segmentModel.rightThigh.mass;
  weightedPosition[1] += rightThighCom[1] * segmentModel.rightThigh.mass;
  weightedPosition[2] += rightThighCom[2] * segmentModel.rightThigh.mass;
  totalMass += segmentModel.rightThigh.mass;

  // Left shank CoM (at COM_LOCATIONS.SHANK from knee)
  const leftShankCom: [number, number, number] = [
    segmentModel.leftShank.position[0] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
    segmentModel.leftShank.position[1] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
    segmentModel.leftShank.position[2] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
  ];
  weightedPosition[0] += leftShankCom[0] * segmentModel.leftShank.mass;
  weightedPosition[1] += leftShankCom[1] * segmentModel.leftShank.mass;
  weightedPosition[2] += leftShankCom[2] * segmentModel.leftShank.mass;
  totalMass += segmentModel.leftShank.mass;

  // Right shank CoM
  const rightShankCom: [number, number, number] = [
    segmentModel.rightShank.position[0] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
    segmentModel.rightShank.position[1] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
    segmentModel.rightShank.position[2] *
      (1 - DE_LEVA_CONSTANTS.COM_LOCATIONS.SHANK),
  ];
  weightedPosition[0] += rightShankCom[0] * segmentModel.rightShank.mass;
  weightedPosition[1] += rightShankCom[1] * segmentModel.rightShank.mass;
  weightedPosition[2] += rightShankCom[2] * segmentModel.rightShank.mass;
  totalMass += segmentModel.rightShank.mass;

  // Calculate final CoM position
  const comPosition: [number, number, number] = [
    weightedPosition[0] / totalMass,
    weightedPosition[1] / totalMass,
    weightedPosition[2] / totalMass,
  ];

  return {
    position: comPosition,
    mass: totalMass,
  };
}

/**
 * Analyze Center of Mass over active window
 */
export function analyzeCoM(
  segmentModels: SegmentModel[],
  timeSeconds: number[],
  activeWindow?: { tOn: number; tOff: number }
): CoMResult {
  if (segmentModels.length === 0) {
    return { verticalAmp_cm: 0, mlAmp_cm: 0, apAmp_cm: 0, rms_cm: 0 };
  }

  // Use active window if provided, otherwise use full dataset
  const tOn = activeWindow?.tOn || 0;
  const tOff = activeWindow?.tOff || segmentModels.length - 1;

  // Calculate CoM positions over active window
  const comPositions: [number, number, number][] = [];
  for (let i = tOn; i <= tOff; i++) {
    if (i >= 0 && i < segmentModels.length) {
      const com = calculateCoM(segmentModels[i]);
      comPositions.push(com.position);
    }
  }

  if (comPositions.length === 0) {
    return { verticalAmp_cm: 0, mlAmp_cm: 0, apAmp_cm: 0, rms_cm: 0 };
  }

  // Calculate amplitudes (max - min) for each axis
  let minVertical = comPositions[0][1];
  let maxVertical = comPositions[0][1];
  let minML = comPositions[0][0]; // Mediolateral (X-axis)
  let maxML = comPositions[0][0];
  let minAP = comPositions[0][2]; // Anteroposterior (Z-axis)
  let maxAP = comPositions[0][2];

  for (const pos of comPositions) {
    minVertical = Math.min(minVertical, pos[1]);
    maxVertical = Math.max(maxVertical, pos[1]);
    minML = Math.min(minML, pos[0]);
    maxML = Math.max(maxML, pos[0]);
    minAP = Math.min(minAP, pos[2]);
    maxAP = Math.max(maxAP, pos[2]);
  }

  const verticalAmp = maxVertical - minVertical;
  const mlAmp = maxML - minML;
  const apAmp = maxAP - minAP;

  // Calculate RMS (Root Mean Square) displacement
  let rmsSum = 0;
  for (const pos of comPositions) {
    const displacement = Math.sqrt(
      pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]
    );
    rmsSum += displacement * displacement;
  }
  const rms = Math.sqrt(rmsSum / comPositions.length);

  // Convert to centimeters
  const verticalAmp_cm = verticalAmp * 100;
  const mlAmp_cm = mlAmp * 100;
  const apAmp_cm = apAmp * 100;
  const rms_cm = rms * 100;

  return {
    verticalAmp_cm,
    mlAmp_cm,
    apAmp_cm,
    rms_cm,
  };
}
