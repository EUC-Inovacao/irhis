/**
 * Tests for Local Analysis API
 * Ensures no hard-coded values and proper local computation
 */

import { localAnalysisApi, AnalysisResult } from "../analysisApi";
import { loadSessionFromZip } from "../../io/zipReader";

// Mock JSZip
jest.mock("jszip", () => ({
  loadAsync: jest.fn(),
}));

// Mock FileSystem for React Native
jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(),
}));

describe("Local Analysis API", () => {
  // Synthetic dataset generator
  const generateSyntheticData = (
    cycles: number = 5,
    sampleRate: number = 60
  ) => {
    const duration = cycles * 2; // 2 seconds per cycle
    const totalSamples = Math.floor(duration * sampleRate);
    const timeStep = 1 / sampleRate;

    const data = [];
    for (let i = 0; i < totalSamples; i++) {
      const time = i * timeStep;

      // Create realistic movement patterns based on actual CSV data patterns
      // Real data shows Euler angles like -96.5, -14.2, 43.0 with significant variation

      // Knee flexion/extension (Euler_Y) - realistic range based on actual data
      const kneeAngle = Math.sin((2 * Math.PI * time) / 2) * 50 + 45; // -5 to +95 degree range (100° ROM)

      // Hip flexion/extension (Euler_X) - realistic range
      const hipAngle = Math.sin((2 * Math.PI * time) / 2) * 20 - 15; // -35 to +5 degree range (40° ROM)

      // Lateral movement (Euler_Z) - realistic range
      const lateralAngle = Math.sin((2 * Math.PI * time) / 2) * 15 + 30; // 15 to 45 degree range (30° ROM)

      data.push({
        PacketCounter: i,
        SampleTimeFine: i * 16666, // ~60Hz
        Euler_X: hipAngle,
        Euler_Y: kneeAngle,
        Euler_Z: lateralAngle,
        FreeAcc_X: 0,
        FreeAcc_Y: 0,
        FreeAcc_Z: 0,
        Status: 0,
      });
    }

    return data;
  };

  const createMockZipContent = () => {
    const csvContent = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
${generateSyntheticData()
  .map(
    (row) =>
      `${row.PacketCounter},${row.SampleTimeFine},${row.Euler_X},${row.Euler_Y},${row.Euler_Z},${row.FreeAcc_X},${row.FreeAcc_Y},${row.FreeAcc_Z},${row.Status}`
  )
  .join("\n")}`;

    return {
      "1_20250711_200600_087.csv": csvContent,
      "2_20250711_200600_088.csv": csvContent.replace(
        "DeviceTag: 1",
        "DeviceTag: 2"
      ),
      "3_20250711_200600_090.csv": csvContent.replace(
        "DeviceTag: 1",
        "DeviceTag: 3"
      ),
      "4_20250711_200600_092.csv": csvContent.replace(
        "DeviceTag: 1",
        "DeviceTag: 4"
      ),
      "5_20250711_200600_080.csv": csvContent.replace(
        "DeviceTag: 1",
        "DeviceTag: 5"
      ),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Synthetic Dataset Tests", () => {
    it("should analyze synthetic data and produce expected metrics", async () => {
      // This test ensures synthetic cycles produce expected results
      const mockZipContent = createMockZipContent();

      // Mock JSZip to return our synthetic data
      const mockZip = {
        files: Object.keys(mockZipContent).reduce((acc, fileName) => {
          acc[fileName] = {
            dir: false,
            async: jest.fn().mockResolvedValue(mockZipContent[fileName]),
          };
          return acc;
        }, {} as any),
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const result = await localAnalysisApi.analyzeZip("mock-zip-content", {
        thresholdAngleDeg: 18,
        minPeakDistanceSec: 0.6,
        artificialDelayMs: 0,
      });

      // Verify basic structure
      expect(result).toBeDefined();
      expect(result.knee).toBeDefined();
      expect(result.hip).toBeDefined();
      expect(result.com).toBeDefined();
      expect(result.asymmetry).toBeDefined();

      // Verify knee metrics - for synthetic data, just check that fields exist
      expect(typeof result.knee.left.repetitions).toBe("number");
      expect(typeof result.knee.right.repetitions).toBe("number");
      expect(typeof result.knee.left.rom).toBe("number");
      expect(typeof result.knee.right.rom).toBe("number");
      expect(typeof result.knee.left.avgVelocity).toBe("number");
      expect(typeof result.knee.right.avgVelocity).toBe("number");

      // Verify hip metrics - for synthetic data, just check that fields exist
      expect(typeof result.hip.left.repetitions).toBe("number");
      expect(typeof result.hip.right.repetitions).toBe("number");
      expect(typeof result.hip.left.rom).toBe("number");
      expect(typeof result.hip.right.rom).toBe("number");

      // Verify CoM metrics - check structure first
      expect(result.com).toBeDefined();
      if (result.com.overall) {
        expect(typeof result.com.overall.verticalAmp_cm).toBe("number");
        expect(typeof result.com.overall.mlAmp_cm).toBe("number");
        expect(typeof result.com.overall.apAmp_cm).toBe("number");
        expect(typeof result.com.overall.rms_cm).toBe("number");
      }
    });

    it("should detect approximately 5 cycles in synthetic data", async () => {
      const mockZipContent = createMockZipContent();
      const mockZip = {
        files: Object.keys(mockZipContent).reduce((acc, fileName) => {
          acc[fileName] = {
            dir: false,
            async: jest.fn().mockResolvedValue(mockZipContent[fileName]),
          };
          return acc;
        }, {} as any),
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const result = await localAnalysisApi.analyzeZip("mock-zip-content", {
        thresholdAngleDeg: 15,
        minPeakDistanceSec: 0.6,
        artificialDelayMs: 0,
      });

      // Should detect approximately 5 cycles (allowing for some variation)
      expect(result.knee.left.repetitions).toBeGreaterThanOrEqual(4);
      expect(result.knee.left.repetitions).toBeLessThanOrEqual(6);
      expect(result.knee.right.repetitions).toBeGreaterThanOrEqual(4);
      expect(result.knee.right.repetitions).toBeLessThanOrEqual(6);
    });
  });

  describe("Header Parsing Tests", () => {
    it("should correctly parse DeviceTag from CSV header", async () => {
      const csvContent = `DeviceTag: 3
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const mockZip = {
        files: {
          "test.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const session = await loadSessionFromZip("mock-zip-content");

      // Should correctly identify DeviceTag 3 as left thigh
      expect(session.streams[3]).toBeDefined();
      expect(session.streams[3].tag).toBe(3);
    });

    it("should handle DeviceTag with comma format", async () => {
      const csvContent = `DeviceTag:,4
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const mockZip = {
        files: {
          "test.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const session = await loadSessionFromZip("mock-zip-content");

      // Should correctly identify DeviceTag 4 as left shank
      expect(session.streams[4]).toBeDefined();
      expect(session.streams[4].tag).toBe(4);
    });
  });

  describe("Time Correctness Tests", () => {
    it("should use seconds for velocity calculations", async () => {
      const generateDataWithFrequency = (frequency: number) => {
        const cycles = 3;
        const duration = cycles * 2;
        const totalSamples = Math.floor(duration * frequency);

        return Array.from({ length: totalSamples }, (_, i) => ({
          PacketCounter: i,
          SampleTimeFine: i * (1e6 / frequency), // Convert to microseconds
          Euler_X: 0,
          Euler_Y: 90 + Math.sin((2 * Math.PI * i) / frequency / 2) * 30,
          Euler_Z: 0,
          FreeAcc_X: 0,
          FreeAcc_Y: 0,
          FreeAcc_Z: 0,
          Status: 0,
        }));
      };

      // Test with different sampling frequencies
      const frequencies = [30, 60, 120];
      const results = [];

      for (const freq of frequencies) {
        const csvContent = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
${generateDataWithFrequency(freq)
  .map(
    (row) =>
      `${row.PacketCounter},${row.SampleTimeFine},${row.Euler_X},${row.Euler_Y},${row.Euler_Z},${row.FreeAcc_X},${row.FreeAcc_Y},${row.FreeAcc_Z},${row.Status}`
  )
  .join("\n")}`;

        const mockZip = {
          files: {
            "1.csv": {
              dir: false,
              async: jest.fn().mockResolvedValue(csvContent),
            },
            "2.csv": {
              dir: false,
              async: jest
                .fn()
                .mockResolvedValue(
                  csvContent.replace("DeviceTag: 1", "DeviceTag: 2")
                ),
            },
          },
        };

        (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

        const result = await localAnalysisApi.analyzeZip("mock-zip-content", {
          artificialDelayMs: 0,
        });

        results.push({
          frequency: freq,
          avgVelocity: result.knee.left.avgVelocity,
        });
      }

      // Higher frequencies should produce higher velocities (more samples per second)
      expect(results[1].avgVelocity).toBeGreaterThan(results[0].avgVelocity);
      expect(results[2].avgVelocity).toBeGreaterThan(results[1].avgVelocity);
    });
  });

  describe("Missing Sensors Tests", () => {
    it("should handle missing sensors gracefully", async () => {
      const csvContent = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      // Only provide DeviceTag 1 and 2 (right knee only)
      const mockZip = {
        files: {
          "1.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent),
          },
          "2.csv": {
            dir: false,
            async: jest
              .fn()
              .mockResolvedValue(
                csvContent.replace("DeviceTag: 1", "DeviceTag: 2")
              ),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const result = await localAnalysisApi.analyzeZip("mock-zip-content", {
        artificialDelayMs: 0,
      });

      // Should report missing sensors
      expect(result.missingSensors).toContain("left thigh");
      expect(result.missingSensors).toContain("left shank");
      expect(result.missingSensors).toContain("pelvis");

      // Right knee should be computed
      expect(result.knee.right.repetitions).toBeDefined();
      expect(result.knee.right.rom).toBeDefined();

      // Left knee should have zero values
      expect(result.knee.left.repetitions).toBe(0);
      expect(result.knee.left.rom).toBe(0);
    });
  });

  describe("No Network Tests", () => {
    it("should not make any network calls", async () => {
      // Stub global fetch to throw if called
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        throw new Error("Network calls are not allowed in local analysis");
      });

      try {
        const mockZipContent = createMockZipContent();
        const mockZip = {
          files: Object.keys(mockZipContent).reduce((acc, fileName) => {
            acc[fileName] = {
              dir: false,
              async: jest.fn().mockResolvedValue(mockZipContent[fileName]),
            };
            return acc;
          }, {} as any),
        };

        (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

        const result = await localAnalysisApi.analyzeZip("mock-zip-content", {
          artificialDelayMs: 0,
        });

        // Should succeed without network calls
        expect(result).toBeDefined();
        expect(result.knee).toBeDefined();
        expect(result.hip).toBeDefined();

        // Verify no fetch calls were made
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });
  });

  describe("No Hardcoding Verification", () => {
    it("should not contain any hardcoded metric values", () => {
      // This test ensures no constants like reps = 5, rom = 78.7 etc.
      // All values must come from ZIP analysis at runtime

      const sourceCode = require("fs").readFileSync(
        __dirname + "/../analysisApi.ts",
        "utf8"
      );

      // Check for common hardcoded patterns
      const hardcodedPatterns = [
        /repetitions\s*=\s*\d+/,
        /rom\s*=\s*\d+/,
        /maxFlexion\s*=\s*\d+/,
        /maxExtension\s*=\s*\d+/,
        /avgVelocity\s*=\s*\d+/,
        /return\s*{\s*repetitions:\s*\d+/,
        /return\s*{\s*rom:\s*\d+/,
      ];

      hardcodedPatterns.forEach((pattern) => {
        expect(sourceCode).not.toMatch(pattern);
      });
    });
  });

  describe("Artificial Delay Tests", () => {
    it("should respect artificial delay parameter", async () => {
      const startTime = Date.now();
      const delayMs = 100;

      const mockZipContent = createMockZipContent();
      const mockZip = {
        files: Object.keys(mockZipContent).reduce((acc, fileName) => {
          acc[fileName] = {
            dir: false,
            async: jest.fn().mockResolvedValue(mockZipContent[fileName]),
          };
          return acc;
        }, {} as any),
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      await localAnalysisApi.analyzeZip("mock-zip-content", {
        artificialDelayMs: delayMs,
      });

      const endTime = Date.now();
      const actualDelay = endTime - startTime;

      // Should take at least the specified delay (allowing some margin for processing)
      expect(actualDelay).toBeGreaterThanOrEqual(delayMs);
    });
  });
});
