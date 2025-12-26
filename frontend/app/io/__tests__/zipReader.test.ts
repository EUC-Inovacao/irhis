/**
 * Tests for ZIP reader functionality
 */

import {
  loadSessionFromZip,
  extractDeviceTag,
  parseCSVContent,
  validateRequiredSensors,
  DEVICE_TAG_MAPPING,
} from "../zipReader";

// Mock JSZip
jest.mock("jszip", () => ({
  loadAsync: jest.fn(),
}));

describe("ZIP Reader", () => {
  describe("extractDeviceTag", () => {
    it("should extract DeviceTag from header line", () => {
      const csvContent = `DeviceTag: 3
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const result = extractDeviceTag(csvContent);
      expect(result).toBe(3);
    });

    it("should handle DeviceTag with comma format", () => {
      const csvContent = `DeviceTag:,4
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const result = extractDeviceTag(csvContent);
      expect(result).toBe(4);
    });

    it("should return null for missing DeviceTag", () => {
      const csvContent = `PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const result = extractDeviceTag(csvContent);
      expect(result).toBeNull();
    });
  });

  describe("parseCSVContent", () => {
    it("should parse CSV content into sensor data", () => {
      const csvContent = `PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0
1,16666,0,95,0,0,0,0,0`;

      const result = parseCSVContent(csvContent);

      expect(result.time).toHaveLength(2);
      expect(result.eulerX).toEqual([0, 0]);
      expect(result.eulerY).toEqual([90, 95]);
      expect(result.eulerZ).toEqual([0, 0]);
    });

    it("should skip invalid rows", () => {
      const csvContent = `PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0
invalid,row,data
1,16666,0,95,0,0,0,0,0`;

      const result = parseCSVContent(csvContent);

      expect(result.time).toHaveLength(2); // Should skip invalid row
    });
  });

  describe("loadSessionFromZip", () => {
    it("should load session data from ZIP file", async () => {
      const csvContent = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0
1,16666,0,95,0,0,0,0,0`;

      const mockZip = {
        files: {
          "1_20250711_200600_087.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const session = await loadSessionFromZip("mock-zip-content");

      expect(session.streams[1]).toBeDefined();
      expect(session.streams[1].tag).toBe(1);
      expect(session.streams[1].t).toHaveLength(2);
      expect(session.streams[1].quat).toHaveLength(2);
    });

    it("should handle multiple sensor files", async () => {
      const csvContent1 = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const csvContent2 = `DeviceTag: 2
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const mockZip = {
        files: {
          "1.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent1),
          },
          "2.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent2),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const session = await loadSessionFromZip("mock-zip-content");

      expect(session.streams[1]).toBeDefined();
      expect(session.streams[2]).toBeDefined();
      expect(session.streams[1].tag).toBe(1);
      expect(session.streams[2].tag).toBe(2);
    });

    it("should skip non-CSV files", async () => {
      const csvContent = `DeviceTag: 1
PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status
0,0,0,90,0,0,0,0,0`;

      const mockZip = {
        files: {
          "1.csv": {
            dir: false,
            async: jest.fn().mockResolvedValue(csvContent),
          },
          "readme.txt": {
            dir: false,
            async: jest.fn().mockResolvedValue("This is a readme file"),
          },
        },
      };

      (require("jszip") as any).loadAsync.mockResolvedValue(mockZip);

      const session = await loadSessionFromZip("mock-zip-content");

      expect(session.streams[1]).toBeDefined();
      // Should not create a stream for readme.txt
      expect(Object.keys(session.streams)).toEqual(["1"]);
    });
  });

  describe("validateRequiredSensors", () => {
    it("should validate all required sensors are present", () => {
      const session = {
        streams: {
          1: {
            tag: 1,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          2: {
            tag: 2,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          3: {
            tag: 3,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          4: {
            tag: 4,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          5: {
            tag: 5,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
        },
      };

      const result = validateRequiredSensors(session as any);

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.available).toHaveLength(5);
    });

    it("should identify missing sensors", () => {
      const session = {
        streams: {
          1: {
            tag: 1,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          2: {
            tag: 2,
            t: [0, 1],
            ex: [0, 0],
            ey: [90, 90],
            ez: [0, 0],
            quat: [
              [1, 0, 0, 0],
              [1, 0, 0, 0],
            ],
          },
          // Missing sensors 3, 4, 5
        },
      };

      const result = validateRequiredSensors(session as any);

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("left thigh");
      expect(result.missing).toContain("left shank");
      expect(result.missing).toContain("pelvis");
      expect(result.available).toContain("right thigh");
      expect(result.available).toContain("right shank");
    });

    it("should handle empty session", () => {
      const session = { streams: {} };

      const result = validateRequiredSensors(session as any);

      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(5);
      expect(result.available).toHaveLength(0);
    });
  });

  describe("DeviceTag mapping", () => {
    it("should have correct device tag mappings", () => {
      expect(DEVICE_TAG_MAPPING[1]).toEqual({
        side: "right",
        segment: "thigh",
      });
      expect(DEVICE_TAG_MAPPING[2]).toEqual({
        side: "right",
        segment: "shank",
      });
      expect(DEVICE_TAG_MAPPING[3]).toEqual({ side: "left", segment: "thigh" });
      expect(DEVICE_TAG_MAPPING[4]).toEqual({ side: "left", segment: "shank" });
      expect(DEVICE_TAG_MAPPING[5]).toEqual({ side: "pelvis", segment: null });
    });
  });
});
