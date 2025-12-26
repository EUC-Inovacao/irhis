/**
 * Tests for kinematics calculations
 */

import {
  quatFromEulerZYX,
  rotateVecByQuat,
  mat3FromQuat,
  kneeAngleSeries,
  hipFlexSeries,
  unwrapDegrees,
  BONE_AXIS,
  Z_AXIS,
  Y_AXIS,
} from "../kinematics";

describe("Kinematics", () => {
  describe("quatFromEulerZYX", () => {
    it("should convert Euler angles to quaternion correctly", () => {
      const quat = quatFromEulerZYX(0, 0, 0);
      expect(quat[0]).toBeCloseTo(1, 5); // w component should be 1 for zero rotation
      expect(quat[1]).toBeCloseTo(0, 5); // x component
      expect(quat[2]).toBeCloseTo(0, 5); // y component
      expect(quat[3]).toBeCloseTo(0, 5); // z component
    });

    it("should handle 90-degree rotations", () => {
      const quat = quatFromEulerZYX(90, 0, 0);
      expect(quat[0]).toBeCloseTo(0.7071, 3); // w component
      expect(quat[1]).toBeCloseTo(0.7071, 3); // x component
    });
  });

  describe("rotateVecByQuat", () => {
    it("should rotate vector by quaternion", () => {
      const quat: [number, number, number, number] = [1, 0, 0, 0]; // Identity quaternion
      const vec: [number, number, number] = [1, 0, 0];

      const result = rotateVecByQuat(quat, vec);
      expect(result[0]).toBeCloseTo(1, 5);
      expect(result[1]).toBeCloseTo(0, 5);
      expect(result[2]).toBeCloseTo(0, 5);
    });

    it("should handle 90-degree rotation around Z-axis", () => {
      const quat = quatFromEulerZYX(0, 0, 90);
      const vec: [number, number, number] = [1, 0, 0];

      const result = rotateVecByQuat(quat, vec);
      expect(result[0]).toBeCloseTo(0, 3);
      expect(result[1]).toBeCloseTo(1, 3);
      expect(result[2]).toBeCloseTo(0, 3);
    });
  });

  describe("mat3FromQuat", () => {
    it("should convert quaternion to rotation matrix", () => {
      const quat: [number, number, number, number] = [1, 0, 0, 0]; // Identity
      const matrix = mat3FromQuat(quat);

      // Should be identity matrix
      expect(matrix[0][0]).toBeCloseTo(1, 5);
      expect(matrix[0][1]).toBeCloseTo(0, 5);
      expect(matrix[0][2]).toBeCloseTo(0, 5);
      expect(matrix[1][0]).toBeCloseTo(0, 5);
      expect(matrix[1][1]).toBeCloseTo(1, 5);
      expect(matrix[1][2]).toBeCloseTo(0, 5);
      expect(matrix[2][0]).toBeCloseTo(0, 5);
      expect(matrix[2][1]).toBeCloseTo(0, 5);
      expect(matrix[2][2]).toBeCloseTo(1, 5);
    });
  });

  describe("kneeAngleSeries", () => {
    it("should calculate knee angles from thigh and shank quaternions", () => {
      // Create aligned thigh and shank quaternions (thigh pointing up, shank pointing down)
      const thighQuats: [number, number, number, number][] = [
        [1, 0, 0, 0], // Identity (thigh pointing up)
        [1, 0, 0, 0],
      ];

      const shankQuats: [number, number, number, number][] = [
        [0.7071, 0, 0.7071, 0], // 90-degree rotation around Y-axis (shank pointing forward)
        [0.7071, 0, 0.7071, 0],
      ];

      const angles = kneeAngleSeries(thighQuats, shankQuats);

      expect(angles.length).toBe(2);
      expect(angles[0]).toBeCloseTo(90, 1); // 90-degree angle between thigh and shank
    });

    it("should handle parallel vectors (0-degree angle)", () => {
      const quats: [number, number, number, number][] = [
        [1, 0, 0, 0],
        [1, 0, 0, 0],
      ];

      const angles = kneeAngleSeries(quats, quats);

      expect(angles[0]).toBeCloseTo(0, 1); // Parallel vectors should give 0 degrees
    });
  });

  describe("hipFlexSeries", () => {
    it("should calculate hip flexion from pelvis and thigh quaternions", () => {
      // Pelvis in neutral position
      const pelvisQuats: [number, number, number, number][] = [
        [1, 0, 0, 0], // Identity
        [1, 0, 0, 0],
      ];

      // Thigh with 45-degree flexion
      const thighQuats: [number, number, number, number][] = [
        [0.9239, 0.3827, 0, 0], // 45-degree rotation around X-axis
        [0.9239, 0.3827, 0, 0],
      ];

      const angles = hipFlexSeries(pelvisQuats, thighQuats);

      expect(angles.length).toBe(2);
      expect(angles[0]).toBeCloseTo(45, 1); // Should detect 45-degree hip flexion
    });
  });

  describe("unwrapDegrees", () => {
    it("should unwrap degrees to handle 359° spikes", () => {
      const angles = [1, 2, 3, 359, 1, 2, 3];
      const unwrapped = unwrapDegrees(angles);

      expect(unwrapped[0]).toBeCloseTo(1, 1);
      expect(unwrapped[1]).toBeCloseTo(2, 1);
      expect(unwrapped[2]).toBeCloseTo(3, 1);
      expect(unwrapped[3]).toBeCloseTo(-1, 1); // 359 unwrapped to -1
      expect(unwrapped[4]).toBeCloseTo(0, 1);
      expect(unwrapped[5]).toBeCloseTo(1, 1);
      expect(unwrapped[6]).toBeCloseTo(2, 1);
    });

    it("should handle empty array", () => {
      const unwrapped = unwrapDegrees([]);
      expect(unwrapped).toEqual([]);
    });
  });

  describe("Constants", () => {
    it("should have correct bone axis", () => {
      expect(BONE_AXIS).toEqual([0, -1, 0]);
    });

    it("should have correct pelvis frame axes", () => {
      expect(Z_AXIS).toEqual([0, 0, 1]); // forward
      expect(Y_AXIS).toEqual([0, 1, 0]); // up
    });
  });
});
