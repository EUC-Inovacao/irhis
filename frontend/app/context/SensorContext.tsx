import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Alert, InteractionManager, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DeviceTag,
  MovellaSensor,
  getMovellaBleService,
} from "@services/movellaBleService";
import { buildSensorTag, normalizeKitId, parseSensorTag, sameKit } from "@services/sensorTags";

/**
 * App-wide sensor state.
 *
 * Owns the Movella DOT connection lifecycle (scan, connect, disconnect, tag
 * assignment) independently of any exercise. Screens that record exercises
 * only read readiness from here and never manage connections themselves.
 *
 * Registered sensors carry their kit and body position in their stored name
 * (e.g. "K01-RTHIGH", see services/sensorTags.ts). When a sensor of this phone's
 * kit connects, its position is assigned automatically.
 *
 * Auto-connect: connectKit() scans and connects every sensor of this phone's kit
 * (matched by its advertised name, its stored name, or the list of kit sensors
 * this phone has seen before) until all five positions are covered. A sensor
 * whose link drops is reconnected with retries; if it was streaming during a
 * recording, streaming is restarted. Sensors the user disconnected by hand are
 * left alone until the user connects them or starts connectKit() again.
 */

const KIT_STORAGE_KEY = "irhis.sensorKitId";
export const DEFAULT_KIT_ID = "K01";

/** The five body positions a full recording needs. */
export const REQUIRED_TAGS: DeviceTag[] = [
  DeviceTag.RIGHT_THIGH,
  DeviceTag.RIGHT_SHANK,
  DeviceTag.LEFT_THIGH,
  DeviceTag.LEFT_SHANK,
  DeviceTag.PELVIS,
];

const SCAN_DURATION_MS = 10000;
/** How long connectKit() keeps scanning for missing kit sensors. */
const KIT_SCAN_DURATION_MS = 30000;
/** Waits before each reconnect attempt after a dropped link. */
const RECONNECT_DELAYS_MS = [1000, 3000, 6000, 10000, 15000];
/** Sensor id -> stored name ("K01-RTHIGH") of kit sensors this phone has seen. */
const KNOWN_SENSORS_STORAGE_KEY = "irhis.kitSensors";

/** i18n key for a body-position tag. */
export function deviceTagLabelKey(tag?: DeviceTag): string {
  switch (tag) {
    case DeviceTag.RIGHT_THIGH:
      return "ble.tagRightThigh";
    case DeviceTag.RIGHT_SHANK:
      return "ble.tagRightShank";
    case DeviceTag.LEFT_THIGH:
      return "ble.tagLeftThigh";
    case DeviceTag.LEFT_SHANK:
      return "ble.tagLeftShank";
    case DeviceTag.PELVIS:
      return "ble.tagPelvis";
    default:
      return "ble.tagNotAssigned";
  }
}

interface SensorContextValue {
  sensors: MovellaSensor[];
  connectedSensors: MovellaSensor[];
  scanning: boolean;
  connecting: Set<string>;
  bleAvailable: boolean;
  /** Required body positions not covered by a connected, tagged sensor. */
  missingTags: DeviceTag[];
  /** All five body positions are covered by connected sensors. */
  isReady: boolean;
  /** True while an exercise is being recorded; connection changes are blocked. */
  isRecording: boolean;
  setRecording: (recording: boolean) => void;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  rescan: () => Promise<void>;
  connect: (sensorId: string) => Promise<void>;
  disconnect: (sensorId: string) => Promise<void>;
  assignTag: (sensorId: string, tag: DeviceTag) => void;
  refresh: () => void;
  /** Kit this phone belongs to (e.g. "K01" or "K01-XSens01"); saved on the phone. */
  kitId: string;
  /** Change the kit; returns false if the value is not a valid kit name. */
  setKitId: (kitId: string) => Promise<boolean>;
  /** Scan for and connect all sensors of this phone's kit. */
  connectKit: () => Promise<void>;
  /** True while connectKit() is looking for kit sensors. */
  autoConnecting: boolean;
  /** Sensors whose link dropped and that are being reconnected. */
  reconnecting: Set<string>;
  /** Body position registered for this sensor in this phone's kit, if any. */
  kitPositionOf: (sensor: MovellaSensor) => DeviceTag | null;
  /** Blink the sensor's LED so it can be found physically. */
  identify: (sensorId: string) => Promise<void>;
  /** Store "<kit>-<position>" on the sensor and assign the position. Returns true when verified. */
  registerSensor: (sensorId: string, position: DeviceTag) => Promise<boolean>;
}

const SensorContext = createContext<SensorContextValue | undefined>(undefined);

// Defer BLE callbacks to next JS tick to avoid Android crash (state updates from native BLE context)
const defer = (fn: () => void) => {
  if (Platform.OS === "android") {
    setTimeout(fn, 0);
  } else {
    fn();
  }
};

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const bleService = useMemo(() => getMovellaBleService(), []);

  const [sensors, setSensors] = useState<MovellaSensor[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());
  const [bleAvailable, setBleAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const autoModeRef = useRef(false);
  const [reconnecting, setReconnecting] = useState<Set<string>>(new Set());
  const knownSensorsRef = useRef<Record<string, string>>({});
  const queueRef = useRef<string[]>([]);
  const queueBusyRef = useRef(false);
  const inFlightRef = useRef<Set<string>>(new Set());
  const userDisconnectedRef = useRef<Set<string>>(new Set());
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [kitId, setKitIdState] = useState<string>(DEFAULT_KIT_ID);
  const kitIdRef = useRef<string>(DEFAULT_KIT_ID);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Position of a sensor in this phone's kit: from the name read from the
   * sensor, else its advertised name, else the list of kit sensors seen before.
   */
  const kitPositionOf = useCallback((sensor: MovellaSensor): DeviceTag | null => {
    const candidates = [
      sensor.hardwareDeviceTag,
      sensor.name,
      knownSensorsRef.current[sensor.id],
    ];
    for (const candidate of candidates) {
      const registered = parseSensorTag(candidate);
      if (registered) {
        return sameKit(registered.kitId, kitIdRef.current) ? registered.position : null;
      }
    }
    return null;
  }, []);

  const rememberKitSensor = useCallback((sensorId: string, storedName: string) => {
    if (knownSensorsRef.current[sensorId] === storedName) return;
    knownSensorsRef.current = { ...knownSensorsRef.current, [sensorId]: storedName };
    AsyncStorage.setItem(KNOWN_SENSORS_STORAGE_KEY, JSON.stringify(knownSensorsRef.current)).catch(
      (error) => console.warn("[Sensors] Could not save kit sensors:", error)
    );
  }, []);

  const refresh = useCallback(() => {
    for (const sensor of bleService.getSensors()) {
      if (!sensor.connected) continue;
      // Remember sensors whose stored name says they belong to this kit
      const registered = parseSensorTag(sensor.hardwareDeviceTag);
      if (registered && sameKit(registered.kitId, kitIdRef.current) && sensor.hardwareDeviceTag) {
        rememberKitSensor(sensor.id, sensor.hardwareDeviceTag);
      }
      // Auto-assign the body position of registered sensors that belong to this kit
      if (sensor.deviceTag === undefined) {
        const position = kitPositionOf(sensor);
        if (position !== null) bleService.setDeviceTag(sensor.id, position);
      }
    }
    // Copy objects so React sees a change when the service mutates a sensor in place
    setSensors(bleService.getSensors().map((s) => ({ ...s })));
    setBleAvailable(bleService.isAvailable());
  }, [bleService, kitPositionOf, rememberKitSensor]);

  // Load the list of kit sensors this phone has seen
  useEffect(() => {
    AsyncStorage.getItem(KNOWN_SENSORS_STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          knownSensorsRef.current = { ...parsed, ...knownSensorsRef.current };
        }
      })
      .catch((error) => console.warn("[Sensors] Could not load kit sensors:", error));
  }, []);

  // Load the kit this phone belongs to
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KIT_STORAGE_KEY)
      .then((stored) => {
        const kit = normalizeKitId(stored ?? "") ?? DEFAULT_KIT_ID;
        if (cancelled) return;
        kitIdRef.current = kit;
        setKitIdState(kit);
        refresh();
      })
      .catch((error) => console.warn("[Sensors] Could not load kit id:", error));
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const setKitId = useCallback(
    async (value: string) => {
      const kit = normalizeKitId(value);
      if (!kit) return false;
      kitIdRef.current = kit;
      setKitIdState(kit);
      try {
        await AsyncStorage.setItem(KIT_STORAGE_KEY, kit);
      } catch (error) {
        console.warn("[Sensors] Could not save kit id:", error);
      }
      refresh();
      return true;
    },
    [refresh]
  );

  const clearConnecting = useCallback((sensorId: string) => {
    setConnecting((prev) => {
      if (!prev.has(sensorId)) return prev;
      const next = new Set(prev);
      next.delete(sensorId);
      return next;
    });
  }, []);

  const setReconnectingFlag = useCallback((sensorId: string, on: boolean) => {
    setReconnecting((prev) => {
      if (prev.has(sensorId) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(sensorId);
      else next.delete(sensorId);
      return next;
    });
  }, []);

  const cancelReconnect = useCallback(
    (sensorId: string) => {
      const timer = reconnectTimersRef.current.get(sensorId);
      if (timer) clearTimeout(timer);
      reconnectTimersRef.current.delete(sensorId);
      setReconnectingFlag(sensorId, false);
    },
    [setReconnectingFlag]
  );

  /** Positions already covered by a connected sensor. */
  const coveredPositions = useCallback(() => {
    const covered = new Set<DeviceTag>();
    for (const s of bleService.getSensors()) {
      if (s.connected && s.deviceTag !== undefined) covered.add(s.deviceTag);
    }
    return covered;
  }, [bleService]);

  const finishAutoConnect = useCallback(() => {
    autoModeRef.current = false;
    setAutoConnecting(false);
  }, []);

  const stopScan = useCallback(async () => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    finishAutoConnect();
    try {
      await bleService.stopScanning();
    } catch (error) {
      console.error("[Sensors] Error stopping scan:", error);
    } finally {
      setScanning(false);
    }
  }, [bleService, finishAutoConnect]);

  /** Connect queued kit sensors one at a time (Android BLE dislikes parallel connects). */
  const processQueue = useCallback(async () => {
    if (queueBusyRef.current) return;
    queueBusyRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const sensorId = queueRef.current.shift()!;
        const sensor = bleService.getSensors().find((s) => s.id === sensorId);
        if (!sensor || sensor.connected || userDisconnectedRef.current.has(sensorId)) continue;
        const position = kitPositionOf(sensor);
        if (position === null || coveredPositions().has(position)) continue;
        inFlightRef.current.add(sensorId);
        setConnecting((prev) => new Set(prev).add(sensorId));
        try {
          await bleService.connectToSensor(sensorId);
        } catch (error) {
          // Quiet: it will be tried again the next time it is seen advertising
          console.warn(`[Sensors] Auto-connect failed for ${sensorId}:`, error);
        } finally {
          inFlightRef.current.delete(sensorId);
          clearConnecting(sensorId);
        }
        if (Platform.OS === "android") await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      queueBusyRef.current = false;
      refresh();
      if (autoModeRef.current && coveredPositions().size >= REQUIRED_TAGS.length) {
        console.log("[Sensors] All kit sensors connected");
        stopScan();
      }
    }
  }, [bleService, clearConnecting, coveredPositions, kitPositionOf, refresh, stopScan]);

  /** Queue discovered kit sensors that are not connected yet. */
  const queueKitSensors = useCallback(() => {
    if (!autoModeRef.current || isRecordingRef.current) return;
    const covered = coveredPositions();
    for (const sensor of bleService.getSensors()) {
      if (sensor.connected || inFlightRef.current.has(sensor.id)) continue;
      if (userDisconnectedRef.current.has(sensor.id)) continue;
      if (reconnectTimersRef.current.has(sensor.id)) continue;
      if (queueRef.current.includes(sensor.id)) continue;
      const position = kitPositionOf(sensor);
      if (position === null || covered.has(position)) continue;
      queueRef.current.push(sensor.id);
    }
    if (queueRef.current.length > 0) processQueue();
  }, [bleService, coveredPositions, kitPositionOf, processQueue]);

  const startScan = useCallback(
    async (durationMs: number = SCAN_DURATION_MS) => {
      try {
        setScanning(true);
        await bleService.startScanning(durationMs);
        refresh();
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        scanTimerRef.current = setTimeout(() => {
          scanTimerRef.current = null;
          stopScan();
        }, durationMs);
      } catch (error) {
        console.error("[Sensors] Error starting scan:", error);
        setScanning(false);
        finishAutoConnect();
        Alert.alert(
          t("ble.alertScanError"),
          error instanceof Error ? error.message : t("ble.failedStartScanning")
        );
      }
    },
    [bleService, finishAutoConnect, refresh, stopScan, t]
  );

  const startAutoConnect = useCallback(
    async (clearUserChoices: boolean) => {
      if (isRecordingRef.current) return;
      if (clearUserChoices) userDisconnectedRef.current.clear();
      refresh();
      if (coveredPositions().size >= REQUIRED_TAGS.length) return;
      autoModeRef.current = true;
      setAutoConnecting(true);
      queueKitSensors();
      await startScan(KIT_SCAN_DURATION_MS);
    },
    [coveredPositions, queueKitSensors, refresh, startScan]
  );

  const connectKit = useCallback(() => startAutoConnect(true), [startAutoConnect]);

  /** Manual scan button: always the short scan (ignores press-event arguments). */
  const manualStartScan = useCallback(() => startScan(), [startScan]);

  /** Reconnect a sensor whose link dropped, with increasing waits. */
  const scheduleReconnect = useCallback(
    (sensorId: string, attempt: number) => {
      if (userDisconnectedRef.current.has(sensorId)) return;
      if (attempt >= RECONNECT_DELAYS_MS.length) {
        // Give up direct retries; pick it up when it advertises again
        console.warn(`[Sensors] Could not reconnect ${sensorId}; scanning for it`);
        cancelReconnect(sensorId);
        if (!isRecordingRef.current) startAutoConnect(false);
        return;
      }
      setReconnectingFlag(sensorId, true);
      const timer = setTimeout(async () => {
        reconnectTimersRef.current.delete(sensorId);
        const sensor = bleService.getSensors().find((s) => s.id === sensorId);
        if (!sensor || userDisconnectedRef.current.has(sensorId)) {
          setReconnectingFlag(sensorId, false);
          return;
        }
        if (sensor.connected) {
          setReconnectingFlag(sensorId, false);
          return;
        }
        try {
          inFlightRef.current.add(sensorId);
          await bleService.connectToSensor(sensorId);
          setReconnectingFlag(sensorId, false);
          console.log(`[Sensors] Reconnected ${sensorId} (attempt ${attempt + 1})`);
        } catch (error) {
          console.warn(`[Sensors] Reconnect attempt ${attempt + 1} failed for ${sensorId}:`, error);
          scheduleReconnect(sensorId, attempt + 1);
        } finally {
          inFlightRef.current.delete(sensorId);
        }
      }, RECONNECT_DELAYS_MS[attempt]);
      reconnectTimersRef.current.set(sensorId, timer);
    },
    [bleService, cancelReconnect, setReconnectingFlag, startAutoConnect]
  );

  // Latest handlers for the BLE listener (registered once)
  const handlersRef = useRef({ queueKitSensors, scheduleReconnect, refresh, clearConnecting });
  handlersRef.current = { queueKitSensors, scheduleReconnect, refresh, clearConnecting };

  useEffect(() => {
    const unsubscribe = bleService.addListener({
      onSensorDiscovered: () =>
        defer(() => {
          handlersRef.current.refresh();
          handlersRef.current.queueKitSensors();
        }),
      onSensorConnected: (sensorId) =>
        defer(() => {
          handlersRef.current.clearConnecting(sensorId);
          handlersRef.current.refresh();
          // Restart streaming if this sensor dropped out of a running recording
          if (isRecordingRef.current) {
            bleService
              .resumeInterruptedMeasurement(sensorId)
              .then((resumed) => {
                if (resumed) console.log(`[Sensors] Resumed streaming on ${sensorId}`);
              })
              .catch((error) =>
                console.warn(`[Sensors] Could not resume streaming on ${sensorId}:`, error)
              );
          }
        }),
      onSensorDisconnected: (sensorId) =>
        defer(() => {
          handlersRef.current.clearConnecting(sensorId);
          handlersRef.current.refresh();
        }),
      onSensorConnectionLost: (sensorId) =>
        defer(() => handlersRef.current.scheduleReconnect(sensorId, 0)),
      onBatteryLevel: () => defer(() => handlersRef.current.refresh()),
      onError: (error) =>
        defer(() => Alert.alert(t("ble.alertBleError"), error.message)),
    });
    refresh();
    const reconnectTimers = reconnectTimersRef.current;
    return () => {
      unsubscribe();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      reconnectTimers.forEach((timer) => clearTimeout(timer));
      reconnectTimers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bleService, t]);

  const rescan = useCallback(async () => {
    if (isRecording) {
      Alert.alert(t("sensors.recordingInProgressTitle"), t("sensors.recordingInProgressMessage"));
      return;
    }
    try {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      setScanning(false);
      setConnecting(new Set());
      finishAutoConnect();
      queueRef.current = [];
      reconnectTimersRef.current.forEach((timer) => clearTimeout(timer));
      reconnectTimersRef.current.clear();
      setReconnecting(new Set());
      userDisconnectedRef.current.clear();
      await bleService.reset();
      refresh();
      await startScan();
    } catch (error) {
      console.error("[Sensors] Error during rescan:", error);
      Alert.alert(
        t("ble.alertRescanError"),
        error instanceof Error ? error.message : t("ble.failedRescan")
      );
    }
  }, [bleService, finishAutoConnect, isRecording, refresh, startScan, t]);

  const connect = useCallback(
    async (sensorId: string) => {
      userDisconnectedRef.current.delete(sensorId);
      cancelReconnect(sensorId);
      setConnecting((prev) => new Set(prev).add(sensorId));
      try {
        await bleService.connectToSensor(sensorId);
      } catch (error) {
        clearConnecting(sensorId);
        Alert.alert(
          t("ble.alertConnectionError"),
          error instanceof Error ? error.message : t("ble.failedConnect")
        );
      }
    },
    [bleService, cancelReconnect, clearConnecting, t]
  );

  const disconnect = useCallback(
    async (sensorId: string) => {
      if (isRecording) {
        Alert.alert(t("sensors.recordingInProgressTitle"), t("sensors.recordingInProgressMessage"));
        return;
      }
      // A manual disconnect is a choice: don't reconnect or auto-connect it
      userDisconnectedRef.current.add(sensorId);
      queueRef.current = queueRef.current.filter((id) => id !== sensorId);
      cancelReconnect(sensorId);
      const doDisconnect = async () => {
        try {
          await bleService.disconnectFromSensor(sensorId);
        } catch (error) {
          Alert.alert(
            t("ble.alertDisconnectError"),
            error instanceof Error ? error.message : t("ble.failedDisconnect")
          );
        } finally {
          setTimeout(refresh, 100);
        }
      };
      if (Platform.OS === "android") {
        // Defer to after UI interactions (avoids native crash during button press)
        InteractionManager.runAfterInteractions(() => {
          setTimeout(doDisconnect, 100);
        });
      } else {
        await doDisconnect();
      }
    },
    [bleService, cancelReconnect, isRecording, refresh, t]
  );

  const assignTag = useCallback(
    (sensorId: string, tag: DeviceTag) => {
      bleService.setDeviceTag(sensorId, tag);
      refresh();
    },
    [bleService, refresh]
  );

  const identify = useCallback(
    async (sensorId: string) => {
      try {
        await bleService.identifySensor(sensorId);
      } catch (error) {
        Alert.alert(
          t("sensors.identifyFailedTitle"),
          error instanceof Error ? error.message : String(error)
        );
      }
    },
    [bleService, t]
  );

  const registerSensor = useCallback(
    async (sensorId: string, position: DeviceTag) => {
      if (isRecording) {
        Alert.alert(t("sensors.recordingInProgressTitle"), t("sensors.recordingInProgressMessage"));
        return false;
      }
      try {
        const tag = buildSensorTag(kitIdRef.current, position);
        const stored = await bleService.writeHardwareTag(sensorId, tag);
        bleService.setDeviceTag(sensorId, position);
        refresh();
        if (stored === tag) rememberKitSensor(sensorId, tag);
        if (stored !== tag) {
          Alert.alert(
            t("sensors.registerVerifyFailedTitle"),
            t("sensors.registerVerifyFailedMessage", { expected: tag, actual: stored ?? "—" })
          );
          return false;
        }
        return true;
      } catch (error) {
        Alert.alert(
          t("sensors.registerFailedTitle"),
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    },
    [bleService, isRecording, refresh, rememberKitSensor, t]
  );

  const setRecording = useCallback(
    (recording: boolean) => {
      isRecordingRef.current = recording;
      setIsRecording(recording);
      // A dropped sensor reconnected after the recording ends should not stream
      if (!recording) bleService.clearInterruptedMeasurements();
    },
    [bleService]
  );

  const connectedSensors = useMemo(() => sensors.filter((s) => s.connected), [sensors]);

  const missingTags = useMemo(() => {
    const covered = new Set(
      connectedSensors.map((s) => s.deviceTag).filter((tag) => tag !== undefined)
    );
    return REQUIRED_TAGS.filter((tag) => !covered.has(tag));
  }, [connectedSensors]);

  const value: SensorContextValue = {
    sensors,
    connectedSensors,
    scanning,
    connecting,
    bleAvailable,
    missingTags,
    isReady: missingTags.length === 0,
    isRecording,
    setRecording,
    startScan: manualStartScan,
    stopScan,
    rescan,
    connect,
    disconnect,
    assignTag,
    refresh,
    kitId,
    setKitId,
    identify,
    registerSensor,
    connectKit,
    autoConnecting,
    reconnecting,
    kitPositionOf,
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
};

export const useSensors = (): SensorContextValue => {
  const ctx = useContext(SensorContext);
  if (!ctx) {
    throw new Error("useSensors must be used within a SensorProvider");
  }
  return ctx;
};
