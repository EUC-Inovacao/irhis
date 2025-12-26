/**
 * Real-time Data Service
 * Processes BLE measurement data and converts it to format compatible with analysis engine
 */

import {
  MovellaBleService,
  MeasurementData,
  DeviceTag,
  getMovellaBleService,
} from "./movellaBleService";

export interface SensorStream {
  quat: [number, number, number, number][]; // Array of quaternions [w, x, y, z]
  t: number[]; // Array of timestamps in seconds
}

export interface RealtimeSessionData {
  streams: {
    [tag: number]: SensorStream; // DeviceTag -> SensorStream
  };
  sensors: {
    left: {
      thigh?: SensorStream;
      shank?: SensorStream;
    };
    right: {
      thigh?: SensorStream;
      shank?: SensorStream;
    };
    pelvis?: SensorStream;
  };
  startTime: number; // Unix timestamp in milliseconds
}

/**
 * Real-time data service that buffers and aligns BLE data
 */
export class RealtimeDataService {
  private bleService: MovellaBleService;
  private sessionData: RealtimeSessionData | null = null;
  private dataBuffer: Map<DeviceTag, MeasurementData[]> = new Map();
  private alignmentInterval: NodeJS.Timeout | null = null;
  private onDataCallback?: (data: RealtimeSessionData) => void;

  constructor() {
    this.bleService = getMovellaBleService();
    this.setupBleCallbacks();
  }

  /**
   * Setup BLE service callbacks
   */
  private setupBleCallbacks(): void {
    this.bleService.setCallbacks({
      onMeasurementData: (sensorId, data) => {
        this.handleMeasurementData(sensorId, data);
      },
    });
  }

  /**
   * Handle incoming measurement data from BLE
   */
  private handleMeasurementData(sensorId: string, data: MeasurementData): void {
    const sensor = this.bleService.getSensors().find((s) => s.id === sensorId);
    if (!sensor || !sensor.deviceTag) {
      console.warn(`Sensor ${sensorId} has no device tag assigned`);
      return;
    }

    // Add to buffer
    if (!this.dataBuffer.has(sensor.deviceTag)) {
      this.dataBuffer.set(sensor.deviceTag, []);
    }
    this.dataBuffer.get(sensor.deviceTag)!.push(data);
  }

  /**
   * Start a new real-time session
   */
  startSession(): void {
    this.sessionData = {
      streams: {},
      sensors: {
        left: {},
        right: {},
      },
      startTime: Date.now(),
    };

    // Clear buffers
    this.dataBuffer.clear();

    // Start alignment process (align data every 100ms)
    this.alignmentInterval = setInterval(() => {
      this.alignAndProcessData();
    }, 100);

    console.log("Started real-time data session");
  }

  /**
   * Stop the current session
   */
  stopSession(): void {
    if (this.alignmentInterval) {
      clearInterval(this.alignmentInterval);
      this.alignmentInterval = null;
    }

    // Final alignment
    this.alignAndProcessData();

    console.log("Stopped real-time data session");
  }

  /**
   * Align data by timestamp and convert to analysis format
   */
  private alignAndProcessData(): void {
    if (!this.sessionData) return;

    // Get all available device tags
    const tags = Array.from(this.dataBuffer.keys());
    if (tags.length === 0) return;

    // Find common time range
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const tag of tags) {
      const data = this.dataBuffer.get(tag)!;
      if (data.length === 0) continue;

      const firstTime = data[0].timestamp;
      const lastTime = data[data.length - 1].timestamp;

      minTime = Math.min(minTime, firstTime);
      maxTime = Math.max(maxTime, lastTime);
    }

    if (minTime === Infinity || maxTime === -Infinity) return;

    // Convert timestamps to seconds relative to session start
    const sessionStartMicroseconds = this.sessionData.startTime * 1000;

    // Process each sensor tag
    for (const tag of tags) {
      const data = this.dataBuffer.get(tag)!;
      if (data.length === 0) continue;

      // Convert to quaternion arrays and time arrays
      const quats: [number, number, number, number][] = [];
      const times: number[] = [];

      for (const measurement of data) {
        // Convert timestamp from microseconds to seconds, relative to session start
        const timeSeconds =
          (measurement.timestamp - sessionStartMicroseconds) / 1000000;

        quats.push([
          measurement.quaternion.w,
          measurement.quaternion.x,
          measurement.quaternion.y,
          measurement.quaternion.z,
        ]);
        times.push(timeSeconds);
      }

      // Store in streams by tag
      this.sessionData.streams[tag] = {
        quat: quats,
        t: times,
      };

      // Also store in sensor structure for compatibility
      this.mapToSensorStructure(tag, { quat: quats, t: times });
    }

    // Clear processed data from buffer (keep last 100 samples for overlap)
    for (const tag of tags) {
      const data = this.dataBuffer.get(tag)!;
      if (data.length > 100) {
        this.dataBuffer.set(tag, data.slice(-100));
      }
    }

    // Notify callback
    if (this.onDataCallback && this.sessionData) {
      this.onDataCallback({ ...this.sessionData });
    }
  }

  /**
   * Map device tag to sensor structure (for compatibility with analysis API)
   */
  private mapToSensorStructure(
    tag: DeviceTag,
    stream: SensorStream
  ): void {
    if (!this.sessionData) return;

    switch (tag) {
      case DeviceTag.RIGHT_THIGH:
        this.sessionData.sensors.right.thigh = stream;
        break;
      case DeviceTag.RIGHT_SHANK:
        this.sessionData.sensors.right.shank = stream;
        break;
      case DeviceTag.LEFT_THIGH:
        this.sessionData.sensors.left.thigh = stream;
        break;
      case DeviceTag.LEFT_SHANK:
        this.sessionData.sensors.left.shank = stream;
        break;
      case DeviceTag.PELVIS:
        this.sessionData.sensors.pelvis = stream;
        break;
    }
  }

  /**
   * Get current session data
   */
  getSessionData(): RealtimeSessionData | null {
    return this.sessionData;
  }

  /**
   * Set callback for processed data
   */
  setOnDataCallback(callback: (data: RealtimeSessionData) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Convert session data to format compatible with ZIP analysis
   * This allows reusing the same analysis engine
   */
  convertToAnalysisFormat(): any {
    if (!this.sessionData) return null;

    // Convert to format expected by loadSessionFromZip
    // The analysis API expects streams indexed by tag number
    return {
      streams: this.sessionData.streams,
      sensors: this.sessionData.sensors,
    };
  }
}

// Singleton instance
let realtimeServiceInstance: RealtimeDataService | null = null;

/**
 * Get or create real-time data service instance
 */
export function getRealtimeDataService(): RealtimeDataService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new RealtimeDataService();
  }
  return realtimeServiceInstance;
}

