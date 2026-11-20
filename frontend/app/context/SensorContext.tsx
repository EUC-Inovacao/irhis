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
 * This is the place to add auto-connect of registered sensors.
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
  const [kitId, setKitIdState] = useState<string>(DEFAULT_KIT_ID);
  const kitIdRef = useRef<string>(DEFAULT_KIT_ID);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    // Auto-assign the body position of registered sensors that belong to this kit
    for (const sensor of bleService.getSensors()) {
      if (!sensor.connected || sensor.deviceTag !== undefined) continue;
      const registered = parseSensorTag(sensor.hardwareDeviceTag);
      if (registered && sameKit(registered.kitId, kitIdRef.current)) {
        bleService.setDeviceTag(sensor.id, registered.position);
      }
    }
    // Copy objects so React sees a change when the service mutates a sensor in place
    setSensors(bleService.getSensors().map((s) => ({ ...s })));
    setBleAvailable(bleService.isAvailable());
  }, [bleService]);

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

  useEffect(() => {
    const unsubscribe = bleService.addListener({
      onSensorDiscovered: () => defer(refresh),
      onSensorConnected: (sensorId) =>
        defer(() => {
          clearConnecting(sensorId);
          refresh();
        }),
      onSensorDisconnected: (sensorId) =>
        defer(() => {
          clearConnecting(sensorId);
          refresh();
        }),
      onBatteryLevel: () => defer(refresh),
      onError: (error) =>
        defer(() => Alert.alert(t("ble.alertBleError"), error.message)),
    });
    refresh();
    return () => {
      unsubscribe();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [bleService, refresh, clearConnecting, t]);

  const stopScan = useCallback(async () => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    try {
      await bleService.stopScanning();
    } catch (error) {
      console.error("[Sensors] Error stopping scan:", error);
    } finally {
      setScanning(false);
    }
  }, [bleService]);

  const startScan = useCallback(async () => {
    try {
      setScanning(true);
      await bleService.startScanning();
      refresh();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        scanTimerRef.current = null;
        stopScan();
      }, SCAN_DURATION_MS);
    } catch (error) {
      console.error("[Sensors] Error starting scan:", error);
      setScanning(false);
      Alert.alert(
        t("ble.alertScanError"),
        error instanceof Error ? error.message : t("ble.failedStartScanning")
      );
    }
  }, [bleService, refresh, stopScan, t]);

  const rescan = useCallback(async () => {
    if (isRecording) {
      Alert.alert(t("sensors.recordingInProgressTitle"), t("sensors.recordingInProgressMessage"));
      return;
    }
    try {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      setScanning(false);
      setConnecting(new Set());
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
  }, [bleService, isRecording, refresh, startScan, t]);

  const connect = useCallback(
    async (sensorId: string) => {
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
    [bleService, clearConnecting, t]
  );

  const disconnect = useCallback(
    async (sensorId: string) => {
      if (isRecording) {
        Alert.alert(t("sensors.recordingInProgressTitle"), t("sensors.recordingInProgressMessage"));
        return;
      }
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
    [bleService, isRecording, refresh, t]
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
    [bleService, isRecording, refresh, t]
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
    setRecording: setIsRecording,
    startScan,
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
