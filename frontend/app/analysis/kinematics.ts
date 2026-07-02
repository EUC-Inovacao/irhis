/**
 * Kinematics calculations for joint angles and orientations
 * Based on Movella DOT sensor data and biomechanical principles
 */

import * as THREE from "three";

// Bone axis in sensor frame (configurable)
export const BONE_AXIS: [number, number, number] = [0, -1, 0];

// Pelvis frame axes: x=right, y=up, z=forward
export const Z_AXIS: [number, number, number] = [0, 0, 1]; // forward
export const Y_AXIS: [number, number, number] = [0, 1, 0]; // up

// Sensor −Y is bone long axis (module-level for reuse)
const AXIS: [number, number, number] = [0, -1, 0];

/**
 * Convert Euler angles (ZYX intrinsic) to quaternion
 */
export function quatFromEulerZYX(
  ex: number,
  ey: number,
  ez: number
): [number, number, number, number] {
  // ZYX intrinsic: q = qz(ez) * qy(ey) * qx(ex)
  const rx = (ex * Math.PI) / 180;
  const ry = (ey * Math.PI) / 180;
  const rz = (ez * Math.PI) / 180;

  const cz = Math.cos(rz / 2);
  const sz = Math.sin(rz / 2);
  const cy = Math.cos(ry / 2);
  const sy = Math.sin(ry / 2);
  const cx = Math.cos(rx / 2);
  const sx = Math.sin(rx / 2);

  const w = cz * cy * cx + sz * sy * sx;
  const x = cz * cy * sx - sz * sy * cx;
  const y = cz * sy * cx + sz * cy * sx;
  const z = sz * cy * cx - cz * sy * sx;

  return [w, x, y, z];
}

/**
 * Rotate a vector by a quaternion
 */
export function rotateVecByQuat(
  q: [number, number, number, number],
  v: [number, number, number]
): [number, number, number] {
  // Hamilton convention explicit formula (drop-in from spec)
  const [w, x, y, z] = q;
  const t0 = 2 * (-z * v[1] + y * v[2]);
  const t1 = 2 * (z * v[0] - x * v[2]);
  const t2 = 2 * (-y * v[0] + x * v[1]);
  return [
    v[0] + w * t0 + (y * t2 - z * t1),
    v[1] + w * t1 + (z * t0 - x * t2),
    v[2] + w * t2 + (x * t1 - y * t0),
  ];
}

/**
 * Convert quaternion to rotation matrix (3x3)
 */
export function mat3FromQuat([w, x, y, z]: [
  number,
  number,
  number,
  number,
]): number[][] {
  // Explicit 3x3 rotation matrix from quaternion per spec
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/**
 * Transpose a 3x3 matrix
 */
export function transpose3(R: number[][]): number[][] {
  return [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]],
  ];
}

// Helper function for correct modulo operation
function wrap180(d: number): number {
  // Map any angle difference to (-180, 180]
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

/**
 * Unwrap degrees to handle 359° spikes and discontinuities
 * Fixes the issue where angles jump from 1° to 359° instead of continuous progression
 */
export function unwrapDegrees(arr: number[]): number[] {
  if (arr.length === 0) return [];

  const out = new Array(arr.length);
  out[0] = arr[0];

  for (let i = 1; i < arr.length; i++) {
    const d = wrap180(arr[i] - arr[i - 1]); // ✅ correct wrap
    out[i] = out[i - 1] + d;
  }

  return out;
}

/**
 * Utility function to clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Utility function to convert radians to degrees
 */
export function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Utility function to calculate dot product of two 3D vectors
 */
export function dot3(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Utility function to calculate vector norm
 */
export function norm(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Utility function to multiply a matrix by a vector (transpose)
 */
export function mulMatVec(
  matrix: number[][],
  vector: [number, number, number]
): [number, number, number] {
  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2],
  ];
}

/**
 * Calculate knee angle series from thigh and shank quaternions
 * Returns angles in degrees
 * Uses 3D bone-axis dot product method as specified in requirements
 */
export function kneeAngleSeries(
  qThigh: [number, number, number, number][],
  qShank: [number, number, number, number][]
): Float64Array {
  // Safety checks
  if (!qThigh || !qShank || qThigh.length === 0 || qShank.length === 0) {
    return new Float64Array(0);
  }

  const minLength = Math.min(qThigh.length, qShank.length);
  const angles = new Float64Array(minLength);

  for (let i = 0; i < minLength; i++) {
    // Rotate bone axis by thigh and shank quaternions (world frame)
    const vt = rotateVecByQuat(qThigh[i], AXIS);
    const vs = rotateVecByQuat(qShank[i], AXIS);

    // Calculate dot product and clamp to [-1, 1]
    const dot = clamp(dot3(vt, vs) / (norm(vt) * norm(vs)), -1, 1);

    // Calculate angle in degrees
    angles[i] = toDeg(Math.acos(dot));
  }

  return angles;
}

/**
 * Calculate hip flexion angle series from thigh quaternions in world frame
 * Similar approach to kneeAngleSeries but for hip flexion
 * Uses vertical axis (Y-up) as reference instead of pelvis frame
 * Returns angles in degrees: 0° = extension (leg down), 90° = flexion (leg horizontal)
 */
export function hipFlexionWorldFrame(
  thighQuats: [number, number, number, number][]
): Float64Array {
  // Safety checks
  if (!thighQuats || thighQuats.length === 0) {
    return new Float64Array(0);
  }

  const n = thighQuats.length;
  const angles = new Float64Array(n);
  const VERTICAL_AXIS: [number, number, number] = [0, 1, 0]; // Y-up (world frame)
  const FEMUR_AXIS: [number, number, number] = [0, -1, 0]; // Sensor -Y (bone axis)

  for (let i = 0; i < n; i++) {
    // Rotate femur axis by thigh quaternion (world frame)
    const femurAxisWorld = rotateVecByQuat(thighQuats[i], FEMUR_AXIS);

    // Calculate angle between femur axis and vertical
    // dot product gives cos(angle), angleFromVertical = angle from vertical axis (0-180°)
    const dot = clamp(
      dot3(femurAxisWorld, VERTICAL_AXIS) / norm(femurAxisWorld),
      -1,
      1
    );
    const angleFromVertical = toDeg(Math.acos(dot));

    // Convert to flexion angle:
    // - Femur pointing down (extension): angleFromVertical ≈ 180°, flexion = 0°
    // - Femur horizontal (90° flexion): angleFromVertical ≈ 90°, flexion = 90°
    // - Femur pointing up: angleFromVertical ≈ 0°, flexion = 180° (not physiological)
    // Formula: flexion = 180° - angleFromVertical
    angles[i] = 180 - angleFromVertical;
  }

  return angles;
}

/**
 * Calculate hip flexion with ROM metadata
 * Returns both the angle series and the calculated ROM
 */
export function hipFlexSeriesWithROM(
  pelvisQ: [number, number, number, number][],
  thighQ: [number, number, number, number][]
): { angles: Float64Array; rom: number; minV: number; maxV: number } {
  const n = Math.min(pelvisQ.length, thighQ.length);
  const angles = hipFlexSeries(pelvisQ, thighQ);
  
  // Recalculate ROM using wrapped values (same as internal calculation)
  const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
  let minV = 1e9, maxV = -1e9;
  for (let i = 0; i < angles.length; i++) {
    const w = wrap180(angles[i]);
    if (w < minV) minV = w;
    if (w > maxV) maxV = w;
  }
  const span = maxV - minV;
  const rom = span > 180 ? 360 - span : span;
  
  return { angles, rom, minV, maxV };
}

/**
 * Calculate hip abduction angle series (frontal plane)
 * Abduction: movement away from midline (positive) / adduction (negative)
 * Uses pelvis frame: angle in frontal plane (Y-Z plane)
 * Calculates angle between thigh axis projection on frontal plane and vertical
 */
export function hipAbductionSeries(
  pelvisQ: [number, number, number, number][],
  thighQ: [number, number, number, number][]
): Float64Array {
  const n = Math.min(pelvisQ.length, thighQ.length);
  const out = new Float64Array(n);
  if (n === 0) return out;

  const mul33 = (A: number[][], B: number[][]) =>
    [
      [
        A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
        A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
        A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
      ],
      [
        A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
        A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
        A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
      ],
      [
        A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
        A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
        A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
      ],
    ] as number[][];
  const transpose3 = (R: number[][]) => [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]],
  ];

  const B0 = Math.min(n, 200);
  let base = 0;

  for (let i = 0; i < n; i++) {
    const Rp = mat3FromQuat(pelvisQ[i]);
    const Rt = mat3FromQuat(thighQ[i]);
    const Rrel = mul33(transpose3(Rp), Rt);
    
    // Frontal plane: abduction/adduction angle
    // Project thigh -Y axis (bone axis) onto frontal plane (Y-Z plane)
    // Abduction angle = atan2(x_component, y_component) in pelvis frame
    const ux = Rrel[0][1]; // X component of thigh Y axis in pelvis frame
    const uy = Rrel[1][1]; // Y component
    const uz = Rrel[2][1]; // Z component
    
    // Angle in frontal plane: atan2(ux, sqrt(uy^2 + uz^2))
    // This gives abduction angle (positive = abduction, negative = adduction)
    const angle = (Math.atan2(ux, Math.sqrt(uy * uy + uz * uz)) * 180) / Math.PI;
    out[i] = angle;
    
    if (i < B0) base += angle;
  }
  
  base /= Math.max(1, B0);
  
  // Subtract baseline to center around 0
  for (let i = 0; i < n; i++) {
    out[i] -= base;
  }

  return out;
}

/**
 * Calculate hip rotation angle series (transverse plane)
 * Rotation: internal rotation (positive) / external rotation (negative)
 * Uses pelvis frame: angle in transverse plane (X-Z plane)
 * Calculates rotation around longitudinal axis of thigh
 */
export function hipRotationSeries(
  pelvisQ: [number, number, number, number][],
  thighQ: [number, number, number, number][]
): Float64Array {
  const n = Math.min(pelvisQ.length, thighQ.length);
  const out = new Float64Array(n);
  if (n === 0) return out;

  const mul33 = (A: number[][], B: number[][]) =>
    [
      [
        A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
        A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
        A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
      ],
      [
        A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
        A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
        A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
      ],
      [
        A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
        A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
        A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
      ],
    ] as number[][];
  const transpose3 = (R: number[][]) => [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]],
  ];

  const B0 = Math.min(n, 200);
  let base = 0;

  for (let i = 0; i < n; i++) {
    const Rp = mat3FromQuat(pelvisQ[i]);
    const Rt = mat3FromQuat(thighQ[i]);
    const Rrel = mul33(transpose3(Rp), Rt);
    
    // Transverse plane: rotation angle
    // Rotation around longitudinal axis (thigh Y axis)
    // Use Z component of thigh X axis in pelvis frame
    // atan2(uz, ux) gives rotation angle
    const ux = Rrel[0][0]; // X component of thigh X axis in pelvis frame
    const uz = Rrel[2][0]; // Z component
    const angle = (Math.atan2(uz, ux) * 180) / Math.PI;
    out[i] = angle;
    
    if (i < B0) base += angle;
  }
  
  base /= Math.max(1, B0);
  
  // Subtract baseline to center around 0
  for (let i = 0; i < n; i++) {
    out[i] -= base;
  }

  return out;
}

// Hip flexion UNWRAPPED no referencial da pélvis.
// 1) R_rel = R_pelvis^T · R_thigh
// 2) Ângulo sagital: atan2(uz, -uy)  (flexão +)
// 3) UNWRAP cumulativo (sem voltar a [-180,180])
// 4) Escolhe a coluna (0/1/2) com maior amplitude robusta (p97.5 - p2.5)
// Hip flexion UNWRAPPED no referencial da pélvis (flexão +)
export function hipFlexSeries(
  pelvisQ: [number, number, number, number][],
  thighQ: [number, number, number, number][]
): Float64Array {
  const n = Math.min(pelvisQ.length, thighQ.length);
  const out = new Float64Array(n);
  if (n === 0) return out;

  const BONE: [number, number, number] = [0, -1, 0];
  const CALIB_N = Math.min(n, 120); // ~2 s at 60 Hz

  // --- Calibration: average bone-axis direction in world frame ---
  // Averaging unit vectors gives the mean direction (renormalise after).
  // This captures the actual resting orientation of each sensor regardless
  // of how it is strapped to the segment.
  let tx = 0, ty = 0, tz = 0;
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i < CALIB_N; i++) {
    const t = rotateVecByQuat(thighQ[i],  BONE);
    const p = rotateVecByQuat(pelvisQ[i], BONE);
    tx += t[0]; ty += t[1]; tz += t[2];
    px += p[0]; py += p[1]; pz += p[2];
  }
  const tm = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
  const pm = Math.sqrt(px*px + py*py + pz*pz) || 1;
  const thighNeutral:  [number, number, number] = [tx/tm, ty/tm, tz/tm];
  const pelvisNeutral: [number, number, number] = [px/pm, py/pm, pz/pm];

  // --- Per-sample angle ---
  // thighDisplacement  = how far the thigh  has moved from its calibrated neutral
  // pelvisDisplacement = how far the pelvis has moved from its calibrated neutral
  // hip flexion ≈ thighDisplacement − pelvisDisplacement
  // (pelvis correction removes anterior pelvic tilt / transverse sway)
  for (let i = 0; i < n; i++) {
    const tc = rotateVecByQuat(thighQ[i],  BONE);
    const pc = rotateVecByQuat(pelvisQ[i], BONE);

    const thighDeg  = toDeg(Math.acos(clamp(dot3(thighNeutral,  tc), -1, 1)));
    const pelvisDeg = toDeg(Math.acos(clamp(dot3(pelvisNeutral, pc), -1, 1)));

    out[i] = thighDeg - pelvisDeg;
  }

  return out;
}

/**
 * Time-based interpolation for aligning sensor data
 */
export function interpolateByTime(
  data: { time: number; value: [number, number, number, number] }[],
  targetTimes: number[]
): [number, number, number, number][] {
  if (data.length === 0) return [];

  const result: [number, number, number, number][] = [];

  for (const targetTime of targetTimes) {
    // Find surrounding data points
    let leftIndex = -1;
    let rightIndex = -1;

    for (let i = 0; i < data.length; i++) {
      if (data[i].time <= targetTime) {
        leftIndex = i;
      }
      if (data[i].time >= targetTime && rightIndex === -1) {
        rightIndex = i;
        break;
      }
    }

    if (leftIndex === -1) {
      // Extrapolate backward
      result.push([...data[0].value]);
    } else if (rightIndex === -1) {
      // Extrapolate forward
      result.push([...data[data.length - 1].value]);
    } else if (leftIndex === rightIndex) {
      // Exact match
      result.push([...data[leftIndex].value]);
    } else {
      // Interpolate
      const t =
        (targetTime - data[leftIndex].time) /
        (data[rightIndex].time - data[leftIndex].time);
      const leftQuat = new THREE.Quaternion(
        data[leftIndex].value[1],
        data[leftIndex].value[2],
        data[leftIndex].value[3],
        data[leftIndex].value[0]
      );
      const rightQuat = new THREE.Quaternion(
        data[rightIndex].value[1],
        data[rightIndex].value[2],
        data[rightIndex].value[3],
        data[rightIndex].value[0]
      );

      const interpolated = new THREE.Quaternion().slerpQuaternions(
        leftQuat,
        rightQuat,
        t
      );
      result.push([
        interpolated.w,
        interpolated.x,
        interpolated.y,
        interpolated.z,
      ]);
    }
  }

  return result;
}
