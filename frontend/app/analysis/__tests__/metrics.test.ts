/**
 * Tests for metrics calculations
 */

import {
  baselineSubtract,
  gradient,
  avgVelocity,
  peakVelocity,
  p95Velocity,
  smoothData,
  countPeaks,
  rom,
  maxFlexExt,
  calculateAsymmetry,
  mean,
  absArray,
  max,
  percentile,
  movingAverage,
} from "../metrics";

describe("Metrics", () => {
  describe("baselineSubtract", () => {
    it("should subtract baseline from angle series", () => {
      const angles = new Float64Array([100, 105, 110, 115, 120]);
      const timeSeconds = [0, 0.5, 1.0, 1.5, 2.0];

      const result = baselineSubtract(angles, timeSeconds, 1.0);

      // Baseline should be mean of first 1 second (100 + 105) / 2 = 102.5
      expect(result[0]).toBeCloseTo(-2.5, 1);
      expect(result[1]).toBeCloseTo(2.5, 1);
      expect(result[2]).toBeCloseTo(7.5, 1);
    });
  });

  describe("gradient", () => {
    it("should calculate gradient using finite differences", () => {
      const angles = new Float64Array([0, 10, 20, 30, 40]);
      const timeSeconds = [0, 1, 2, 3, 4];

      const result = gradient(angles, timeSeconds);

      expect(result[0]).toBeCloseTo(10, 1); // Forward difference
      expect(result[1]).toBeCloseTo(10, 1); // Central difference
      expect(result[2]).toBeCloseTo(10, 1); // Central difference
      expect(result[3]).toBeCloseTo(10, 1); // Central difference
      expect(result[4]).toBeCloseTo(10, 1); // Backward difference
    });
  });

  describe("avgVelocity", () => {
    it("should calculate average velocity", () => {
      const angles = new Float64Array([0, 10, 20, 30, 40]);
      const timeSeconds = [0, 1, 2, 3, 4];

      const result = avgVelocity(angles, timeSeconds);

      expect(result).toBeCloseTo(10, 1); // Average of 10°/s
    });
  });

  describe("peakVelocity", () => {
    it("should find peak velocity", () => {
      const angles = new Float64Array([0, 5, 15, 25, 20, 10, 5]);
      const timeSeconds = [0, 1, 2, 3, 4, 5, 6];

      const result = peakVelocity(angles, timeSeconds);

      expect(result).toBeGreaterThan(10); // Should find the peak velocity
    });
  });

  describe("smoothData", () => {
    it("should smooth data using moving average", () => {
      const data = new Float64Array([1, 5, 1, 5, 1]);

      const result = smoothData(data, 3);

      // First and last values should be less smoothed
      expect(result[1]).toBeCloseTo(2.33, 1); // (1+5+1)/3
      expect(result[2]).toBeCloseTo(3.67, 1); // (5+1+5)/3
    });
  });

  describe("countPeaks", () => {
    it("should detect peaks in sinusoidal data", () => {
      // Generate 5 cycles of sine wave
      const angles: number[] = [];
      const timeSeconds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const time = i * 0.1;
        const angle = 90 + Math.sin((2 * Math.PI * time) / 2) * 30; // 2-second cycles
        angles.push(angle);
        timeSeconds.push(time);
      }

      const result = countPeaks(new Float64Array(angles), timeSeconds, {
        thresholdDeg: 15,
        minPeakDistanceSec: 0.6,
      });

      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(6);
    });

    it("should not count valleys as peaks", () => {
      const angles = new Float64Array([120, 90, 60, 90, 120]);
      const timeSeconds = [0, 1, 2, 3, 4];

      const result = countPeaks(angles, timeSeconds, {
        thresholdDeg: 15,
        minPeakDistanceSec: 0.6,
      });

      expect(result).toBe(2); // Should find 2 peaks, not the valley
    });
  });

  describe("rom", () => {
    it("should calculate range of motion", () => {
      const angles = new Float64Array([60, 80, 100, 120, 90]);

      const result = rom(angles);

      expect(result).toBe(60); // 120 - 60 = 60
    });
  });

  describe("maxFlexExt", () => {
    it("should find maximum flexion and extension", () => {
      const angles = new Float64Array([60, 80, 100, 120, 90]);

      const result = maxFlexExt(angles);

      expect(result.maxFlexion).toBe(60); // Minimum value (most flexed)
      expect(result.maxExtension).toBe(120); // Maximum value (most extended)
    });
  });

  describe("calculateAsymmetry", () => {
    it("should calculate asymmetry metrics", () => {
      const leftMetrics = { rom: 100, repetitions: 5 };
      const rightMetrics = { rom: 90, repetitions: 6 };

      const result = calculateAsymmetry(leftMetrics, rightMetrics);

      expect(result.romDifference).toBe(10);
      expect(result.repetitionDifference).toBe(1);
      expect(result.dominantSide).toBe("left"); // Left has higher ROM
    });

    it("should identify balanced side when differences are small", () => {
      const leftMetrics = { rom: 100, repetitions: 5 };
      const rightMetrics = { rom: 95, repetitions: 5 };

      const result = calculateAsymmetry(leftMetrics, rightMetrics);

      expect(result.romDifference).toBe(5);
      expect(result.repetitionDifference).toBe(0);
      expect(result.dominantSide).toBe("balanced"); // Small differences
    });
  });

  describe("Utility functions", () => {
    it("should calculate mean correctly", () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([])).toBe(0);
      expect(mean([10])).toBe(10);
    });

    it("should calculate absolute values", () => {
      const arr = new Float64Array([-1, 2, -3, 4]);
      const result = absArray(arr);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("should find maximum value", () => {
      expect(max([1, 5, 3, 9, 2])).toBe(9);
      expect(max([])).toBe(0);
      expect(max([-1, -5, -3])).toBe(-1);
    });

    it("should calculate percentile", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentile(arr, 50)).toBe(5); // median
      expect(percentile(arr, 95)).toBe(9.5);
      expect(percentile(arr, 0)).toBe(1);
      expect(percentile(arr, 100)).toBe(10);
    });

    it("should apply moving average", () => {
      const data = new Float64Array([1, 2, 3, 4, 5]);
      const result = movingAverage(data, 3);
      expect(result[0]).toBeCloseTo(1, 1);
      expect(result[1]).toBeCloseTo(2, 1);
      expect(result[2]).toBeCloseTo(3, 1);
      expect(result[3]).toBeCloseTo(4, 1);
      expect(result[4]).toBeCloseTo(5, 1);
    });
  });

  describe("Updated countPeaks", () => {
    it("should detect peaks using the new algorithm", () => {
      // Generate 5 cycles of sine wave
      const angles: number[] = [];
      const timeSeconds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const time = i * 0.1;
        const angle = 90 + Math.sin((2 * Math.PI * time) / 2) * 30; // 2-second cycles
        angles.push(angle);
        timeSeconds.push(time);
      }

      const result = countPeaks(new Float64Array(angles), timeSeconds, {
        thresholdDeg: 15,
        minPeakDistanceSec: 0.6,
      });

      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(6);
    });

    it("should handle empty data", () => {
      const result = countPeaks(new Float64Array(), []);
      expect(result).toBe(0);
    });
  });
});
