import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  DeviceTag,
  FusionMeasurementData,
  PayloadMode,
  getMovellaBleService,
} from "../services/movellaBleService";
import { useSensors } from "../context/SensorContext";
import { LiveRepTracker } from "../analysis/liveReps";
import { SensorClock, alignStreams, createSensorClock, trackSample } from "../analysis/clockSync";
import { buildSessionFromBleData } from "../analysis/bleSession";
import { createLocalAnalysisApi } from "../services/analysisApi";
import { getPatientBodyMeasurements } from "../services/patientService";
import type { CountingMode, Side } from "../exercises/catalog";
import type { AnalysisResult } from "../types";

/**
 * Records one exercise from the connected sensors: starts and stops streaming,
 * keeps the samples on a shared clock (clockSync.ts), counts repetitions live
 * (liveReps.ts) and analyses the result on the phone.
 *
 * Used by the guided patient flow. Connection is handled by SensorContext.
 */
export function useExerciseRecorder() {
  const bleService = useMemo(() => getMovellaBleService(), []);
  const { setRecording } = useSensors();

  const activeRef = useRef(false);
  const dataRef = useRef<Map<string, FusionMeasurementData[]>>(new Map());
  const clocksRef = useRef<Map<string, SensorClock>>(new Map());
  const sensorUsRef = useRef<Map<string, number[]>>(new Map());
  const firstRef = useRef<Map<string, number>>(new Map());
  const tagByIdRef = useRef<Map<string, DeviceTag>>(new Map());
  const trackerRef = useRef(new LiveRepTracker());
  const startTimeRef = useRef<Date | null>(null);
  const endTimeRef = useRef<Date | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsubscribe = bleService.addListener({
      onFusionMeasurementData: (sensorId, data) => {
        if (!activeRef.current) return;
        const receivedMs = Date.now();
        let clock = clocksRef.current.get(sensorId);
        if (!clock) {
          clock = createSensorClock();
          clocksRef.current.set(sensorId, clock);
        }
        const sensorUs = trackSample(clock, data.SampleTimeFine, receivedMs);
        let usList = sensorUsRef.current.get(sensorId);
        if (!usList) {
          usList = [];
          sensorUsRef.current.set(sensorId, usList);
        }
        usList.push(sensorUs);
        let first = firstRef.current.get(sensorId);
        if (first === undefined) {
          first = sensorUs;
          firstRef.current.set(sensorId, first);
        }
        let samples = dataRef.current.get(sensorId);
        if (!samples) {
          samples = [];
          dataRef.current.set(sensorId, samples);
        }
        samples.push({ ...data, PacketCounter: samples.length + 1, SampleTimeFine: sensorUs - first });

        let tag = tagByIdRef.current.get(sensorId);
        if (tag === undefined) {
          tag = bleService.getSensors().find((s) => s.id === sensorId)?.deviceTag;
          if (tag !== undefined) tagByIdRef.current.set(sensorId, tag);
        }
        if (tag !== undefined && data.quaternion) {
          const q = data.quaternion;
          trackerRef.current.push(Number(tag), receivedMs / 1000, [q.w, q.x, q.y, q.z]);
        }
      },
    });
    return unsubscribe;
  }, [bleService]);

  const stopStreaming = useCallback(async () => {
    const connected = bleService.getConnectedSensors();
    // One at a time: Android's Bluetooth stack struggles with parallel requests
    for (let i = 0; i < connected.length; i++) {
      try {
        await bleService.stopMeasurement(connected[i].id);
      } catch (error) {
        console.warn("[Recorder] stopMeasurement failed:", error);
      }
      if (Platform.OS === "android" && i < connected.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }, [bleService]);

  const start = useCallback(async () => {
    dataRef.current = new Map();
    clocksRef.current = new Map();
    sensorUsRef.current = new Map();
    firstRef.current = new Map();
    trackerRef.current = new LiveRepTracker();
    const connected = bleService.getConnectedSensors();
    tagByIdRef.current = new Map(
      connected.filter((s) => s.deviceTag !== undefined).map((s) => [s.id, s.deviceTag as DeviceTag])
    );
    startTimeRef.current = new Date();
    endTimeRef.current = null;
    activeRef.current = true;
    setIsActive(true);
    setRecording(true);
    try {
      for (let i = 0; i < connected.length; i++) {
        await bleService.startMeasurement(connected[i].id, PayloadMode.EXTENDED_QUATERNION);
        if (Platform.OS === "android" && i < connected.length - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    } catch (error) {
      activeRef.current = false;
      setIsActive(false);
      setRecording(false);
      await stopStreaming();
      throw error;
    }
  }, [bleService, setRecording, stopStreaming]);

  const stop = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    endTimeRef.current = new Date();
    setIsActive(false);
    setRecording(false);
    await stopStreaming();
  }, [setRecording, stopStreaming]);

  // Leaving the screen mid-recording: stop streaming, keep sensors connected
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        activeRef.current = false;
        setRecording(false);
        stopStreaming();
      }
    };
  }, [setRecording, stopStreaming]);

  /** Number of sensors that have sent data since start(). */
  const sensorsStreaming = useCallback(() => dataRef.current.size, []);

  const repsFor = useCallback(
    (mode: CountingMode | undefined, side?: Side) =>
      mode ? trackerRef.current.repsFor(mode, side) : trackerRef.current.reps,
    []
  );

  /** Analyse the last recording on the phone. */
  const analyze = useCallback(async (patientId?: string | null): Promise<AnalysisResult> => {
    const deviceTagMap = new Map<string, DeviceTag>();
    for (const [id, tag] of Array.from(tagByIdRef.current.entries())) {
      if (dataRef.current.has(id)) deviceTagMap.set(id, tag);
    }
    if (deviceTagMap.size === 0) throw new Error("No sensor data recorded");
    const clockStreams = new Map<string, { clock: SensorClock; sensorUs: number[] }>();
    for (const id of Array.from(deviceTagMap.keys())) {
      const clock = clocksRef.current.get(id);
      const sensorUs = sensorUsRef.current.get(id);
      if (clock && sensorUs) clockStreams.set(id, { clock, sensorUs });
    }
    const aligned = clockStreams.size === deviceTagMap.size ? alignStreams(clockStreams) : undefined;
    const session = buildSessionFromBleData(
      dataRef.current,
      deviceTagMap,
      startTimeRef.current ?? new Date(),
      aligned
    );
    const body = await getPatientBodyMeasurements(patientId);
    const result = await createLocalAnalysisApi().analyzeSession(session, {
      bodyHeight_m: body.bodyHeight_m,
      bodyMass_kg: body.bodyMass_kg,
    });
    return result as AnalysisResult;
  }, []);

  return {
    isActive,
    start,
    stop,
    analyze,
    repsFor,
    sensorsStreaming,
    startTime: () => startTimeRef.current,
    endTime: () => endTimeRef.current,
  };
}
