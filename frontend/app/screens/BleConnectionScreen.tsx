import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Modal,
  Platform,
  ToastAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@theme/ThemeContext";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  MovellaBleService,
  MovellaSensor,
  DeviceTag,
  FusionMeasurementData,
  PayloadMode,
  getMovellaBleService,
} from "@services/movellaBleService";
import { createCSVForSensor } from "@services/bleDataConverter";
import { createLocalAnalysisApi, AnalysisResult } from "@services/analysisApi";
import type { Session, SensorStream } from "@io/zipReader";
import { createSessionFromAnalysisResult } from "@services/sessionService";
import { getPatientBodyMeasurements } from "@services/patientService";
import { useAuth } from "@context/AuthContext";
import { usePatients } from "@context/PatientContext";
import { deviceTagLabelKey, useSensors } from "@context/SensorContext";
import ErrorBoundary from "@components/ErrorBoundary";
import LocalAnalysisResults from "@components/LocalAnalysisResults";
import { LiveRepTracker } from "../analysis/liveReps";
import {
  SensorClock,
  alignStreams,
  createSensorClock,
  trackSample,
} from "../analysis/clockSync";

/** mm:ss */
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Exercise recording screen.
 *
 * Records, analyses and saves an exercise using sensors that are already
 * connected. Scanning, connecting and tagging live in the Sensors tab
 * (SensorContext); this screen only checks readiness.
 */
interface BleConnectionScreenProps {
  navigation?: any;
}

/**
 * Build a Session object directly from BLE exercise data.
 * Uses the original quaternion stored on each FusionMeasurementData packet,
 * falling back to Euler conversion only if the quaternion field is absent.
 * This avoids the quat → Euler → quat round-trip that was done via ZIP/CSV.
 */
function buildSessionFromBleData(
  exerciseData: Map<string, FusionMeasurementData[]>,
  deviceTagMap: Map<string, DeviceTag>,
  _startTime: Date,
  /** Per-sensor times (s) on a shared clock (clockSync.ts); falls back to each sensor's own clock. */
  alignedTimes?: Map<string, number[]>
): Session {
  const streams: Record<number, SensorStream> = {};

  for (const [sensorId, data] of Array.from(exerciseData.entries())) {
    const tagEnum = deviceTagMap.get(sensorId);
    if (tagEnum === undefined || data.length === 0) continue;

    const tag = typeof tagEnum === "number" ? tagEnum : Number(tagEnum);
    const firstTime = data[0].SampleTimeFine;
    const shared = alignedTimes?.get(sensorId);
    const useShared = !!shared && shared.length === data.length;

    const quats: [number, number, number, number][] = [];
    const times: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      // Shared clock when available, else seconds from this sensor's first sample
      times.push(useShared ? shared![i] : (sample.SampleTimeFine - firstTime) / 1e6);

      if (sample.quaternion) {
        // Use original BLE quaternion — no conversion needed
        const q = sample.quaternion;
        quats.push([q.w, q.x, q.y, q.z]);
      } else {
        // Fallback: convert from Euler (legacy path)
        const ex = (sample.Euler_X * Math.PI) / 180;
        const ey = (sample.Euler_Y * Math.PI) / 180;
        const ez = (sample.Euler_Z * Math.PI) / 180;
        const cy = Math.cos(ez * 0.5), sy = Math.sin(ez * 0.5);
        const cp = Math.cos(ey * 0.5), sp = Math.sin(ey * 0.5);
        const cr = Math.cos(ex * 0.5), sr = Math.sin(ex * 0.5);
        quats.push([
          cr * cp * cy + sr * sp * sy,
          sr * cp * cy - cr * sp * sy,
          cr * sp * cy + sr * cp * sy,
          cr * cp * sy - sr * sp * cy,
        ]);
      }
    }

    streams[tag] = {
      tag: tag as 1 | 2 | 3 | 4 | 5,
      t: times,
      ex: [], ey: [], ez: [], // Euler not needed downstream
      quat: quats,
    };
  }

  return { streams };
}

const BleConnectionScreen: React.FC<BleConnectionScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { fetchPatients, fetchAssignedExercises } = usePatients();
  const params = route.params ?? {};
  const [bleService] = useState<MovellaBleService>(getMovellaBleService());
  // Connection state comes from the app-wide SensorContext (Sensors tab)
  const {
    sensors,
    connectedSensors,
    missingTags,
    isReady,
    setRecording,
    connectKit,
    autoConnecting,
    isRecording,
    reconnecting,
  } = useSensors();

  // Connect this phone's kit automatically when the recording screen opens
  useFocusEffect(
    useCallback(() => {
      if (!isReady && !isRecording) connectKit();
      // Only on focus
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Exercise state
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [exerciseData, setExerciseData] = useState<Map<string, FusionMeasurementData[]>>(new Map());
  const [exerciseStartTime, setExerciseStartTime] = useState<Date | null>(null);
  const [packetCounters, setPacketCounters] = useState<Map<string, number>>(new Map());
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bleAnalysisResult, setBleAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Testing Mode and Real-time Logs
  const [testingMode, setTestingMode] = useState(false);
  const [realTimeLogs, setRealTimeLogs] = useState<Array<{
    timestamp: string;
    sensorId: string;
    sensorName: string;
    deviceTag: string;
    packetCounter: number;
    euler: { x: number; y: number; z: number };
    freeAcc: { x: number; y: number; z: number };
  }>>([]);
  const logsScrollViewRef = useRef<ScrollView>(null);
  const noDataWarningShownRef = useRef(false);

  // CSV Modal state
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [csvModalContent, setCsvModalContent] = useState<string | null>(null);
  const [csvModalSensorName, setCsvModalSensorName] = useState<string>("");
  
  // Collapsible sections state
  const [exerciseSectionCollapsed, setExerciseSectionCollapsed] = useState(false);
  const [analysisSectionCollapsed, setAnalysisSectionCollapsed] = useState(true);
  
  // Use refs for callback data to avoid closure issues
  const firstTimestampsRef = useRef<Map<string, number>>(new Map());
  const exerciseDataRef = useRef<Map<string, FusionMeasurementData[]>>(new Map());
  const isExerciseActiveRef = useRef(false);
  const testingModeRef = useRef(false);
  testingModeRef.current = testingMode;
  // Shared clock (clockSync.ts): per-sensor clock state and unwrapped sensor times
  const clocksRef = useRef<Map<string, SensorClock>>(new Map());
  const sensorUsRef = useRef<Map<string, number[]>>(new Map());
  // Live feedback for the patient
  const repTrackerRef = useRef(new LiveRepTracker());
  const tagByIdRef = useRef<Map<string, DeviceTag>>(new Map());
  const [liveReps, setLiveReps] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    // Only listen for measurement data here. Discovery, connection, battery and
    // BLE errors are handled app-wide by SensorContext.
    const unsubscribe = bleService.addListener({
      onFusionMeasurementData: (sensorId, data) => {
        // Runs for every packet (5 sensors x 60 Hz): keep it light, no per-packet
        // logging or React state updates outside testing mode.
        if (isExerciseActiveRef.current) {
          const receivedMs = Date.now();

          // Shared clock: unwrap the sensor clock and track its offset to the phone clock
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

          let firstTimestamp = firstTimestampsRef.current.get(sensorId);
          if (firstTimestamp === undefined) {
            firstTimestamp = sensorUs;
            firstTimestampsRef.current.set(sensorId, firstTimestamp);
          }

          // Append in place (copying the array on every packet grows quadratically)
          let samples = exerciseDataRef.current.get(sensorId);
          if (!samples) {
            samples = [];
            exerciseDataRef.current.set(sensorId, samples);
          }
          const counter = samples.length + 1;
          samples.push({
            ...data,
            PacketCounter: counter,
            SampleTimeFine: sensorUs - firstTimestamp,
          });

          // Live repetition count
          let tag = tagByIdRef.current.get(sensorId);
          if (tag === undefined) {
            tag = bleService.getSensors().find((s) => s.id === sensorId)?.deviceTag;
            if (tag !== undefined) tagByIdRef.current.set(sensorId, tag);
          }
          if (tag !== undefined && data.quaternion) {
            const q = data.quaternion;
            repTrackerRef.current.push(Number(tag), receivedMs / 1000, [q.w, q.x, q.y, q.z]);
          }

          // Developer view only
          if (testingModeRef.current) {
            setPacketCounters((prev) => {
              const next = new Map(prev);
              next.set(sensorId, counter);
              return next;
            });
            const allSensors = bleService.getSensors();
            const sensor = allSensors.find((s) => s.id === sensorId);
            const sensorName = sensor?.name || `Sensor ${sensorId.substring(0, 8)}`;
            const deviceTagName = sensor?.deviceTag ? getDeviceTagName(sensor.deviceTag) : t("ble.tagNotAssigned");
            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
            setRealTimeLogs((prevLogs) => [
              ...prevLogs.slice(-99),
              {
                timestamp,
                sensorId,
                sensorName,
                deviceTag: deviceTagName,
                packetCounter: counter,
                euler: { x: data.Euler_X, y: data.Euler_Y, z: data.Euler_Z },
                freeAcc: { x: data.FreeAcc_X, y: data.FreeAcc_Y, z: data.FreeAcc_Z },
              },
            ]);
            setTimeout(() => {
              logsScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }

          noDataWarningShownRef.current = false;
        } else {
          console.warn(`⚠️ [UI] Received data but exercise is not active (isExerciseActiveRef.current=${isExerciseActiveRef.current})`);
        }
      },
    });

    return () => {
      unsubscribe();
      // Leaving mid-recording: stop streaming but keep sensors connected.
      // Uses the ref (state captured at mount time would always be false).
      if (isExerciseActiveRef.current) {
        isExerciseActiveRef.current = false;
        setRecording(false);
        // Stop measurements sequentially on unmount (Android BLE struggles with concurrent ops)
        const connectedSensors = bleService.getConnectedSensors();
        const stopSequentially = async () => {
          for (let i = 0; i < connectedSensors.length; i++) {
            try {
              await bleService.stopMeasurement(connectedSensors[i].id);
            } catch (e) {
              console.error(e);
            }
            if (Platform.OS === "android" && i < connectedSensors.length - 1) {
              await new Promise((r) => setTimeout(r, 150));
            }
          }
        };
        stopSequentially();
      }
    };
  }, [bleService, setRecording]);

  // Live feedback: refresh the count and the clock a few times a second
  useEffect(() => {
    if (!isExerciseActive) return;
    const started = Date.now();
    const timer = setInterval(() => {
      setLiveReps(repTrackerRef.current.reps);
      setElapsedSec((Date.now() - started) / 1000);
    }, 300);
    return () => clearInterval(timer);
  }, [isExerciseActive]);

  // Ready to record: all 5 body positions covered (normal), or 1+ sensor (testing mode)
  const hasAllSensorsConnected = useCallback(
    (testMode: boolean = false): boolean =>
      testMode ? connectedSensors.length >= 1 : isReady,
    [connectedSensors, isReady]
  );

  const openSensorSetup = useCallback(() => {
    navigation?.navigate("SensorSetup");
  }, [navigation]);

  const handleStartExercise = async () => {
    console.log(`🎬 [UI] handleStartExercise() called, testingMode: ${testingMode}`);
    
    if (!hasAllSensorsConnected(testingMode)) {
      if (testingMode) {
        Alert.alert(
          t("ble.alertSensorsRequired"),
          t("ble.sensorsRequiredTesting")
        );
      } else {
        Alert.alert(
          t("ble.alertSensorsRequired"),
          t("ble.sensorsRequiredAll")
        );
      }
      return;
    }

    try {
      const connectedSensors = bleService.getConnectedSensors();
      console.log(`🎬 [UI] Starting exercise with ${connectedSensors.length} sensors`);
      console.log(`🎬 [UI] Sensors: ${connectedSensors.map(s => `${s.name || s.id.substring(0, 8)} (${getDeviceTagName(s.deviceTag)})`).join(', ')}`);
      console.log(`🎬 [UI] Payload mode: ${PayloadMode.EXTENDED_QUATERNION} (EXTENDED_QUATERNION)`);
      
      // Initialize exercise state
      const startTime = new Date();
      setExerciseStartTime(startTime);
      setExerciseData(new Map());
      exerciseDataRef.current = new Map();
      firstTimestampsRef.current = new Map();
      clocksRef.current = new Map();
      sensorUsRef.current = new Map();
      repTrackerRef.current = new LiveRepTracker();
      tagByIdRef.current = new Map(
        connectedSensors
          .filter((s) => s.deviceTag !== undefined)
          .map((s) => [s.id, s.deviceTag as DeviceTag])
      );
      setLiveReps(0);
      setElapsedSec(0);
      setPacketCounters(new Map());
      setRealTimeLogs([]);
      noDataWarningShownRef.current = false;
      setIsExerciseActive(true);
      isExerciseActiveRef.current = true;
      setRecording(true);
      setCanAnalyze(false);
      setBleAnalysisResult(null);
      
      console.log(`🎬 [UI] Exercise state initialized, startTime: ${startTime.toISOString()}`);
      
      // Start measurement on sensors sequentially (Android BLE stack struggles with concurrent requests)
      for (let i = 0; i < connectedSensors.length; i++) {
        const sensor = connectedSensors[i];
        console.log(`🎬 [UI] Starting measurement on sensor: ${sensor.name || sensor.id.substring(0, 8)}`);
        await bleService.startMeasurement(sensor.id, PayloadMode.EXTENDED_QUATERNION);
        if (Platform.OS === "android" && i < connectedSensors.length - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      console.log(`🎬 [UI] All startMeasurement completed`);
      
      // Set timeout to warn if no data received after 5 seconds
      setTimeout(() => {
        if (isExerciseActiveRef.current && exerciseDataRef.current.size === 0 && !noDataWarningShownRef.current) {
          console.warn(`⚠️ [UI] No data received after 5 seconds!`);
          console.warn(`⚠️ [UI] exerciseDataRef.size: ${exerciseDataRef.current.size}`);
          console.warn(`⚠️ [UI] isExerciseActiveRef.current: ${isExerciseActiveRef.current}`);
          Alert.alert(
            t("ble.alertNoDataReceived"),
            t("ble.noDataReceivedMessage")
          );
          noDataWarningShownRef.current = true;
        }
      }, 5000);
    } catch (error) {
      console.error("❌ [UI] Error starting exercise:", error);
      console.error("❌ [UI] Error details:", error instanceof Error ? error.stack : String(error));
      Alert.alert(t("ble.alertError"), t("ble.failedStartExercise", { error: error instanceof Error ? error.message : String(error) }));
      setIsExerciseActive(false);
      isExerciseActiveRef.current = false;
      setRecording(false);
    }
  };

  const handleStopExercise = async () => {
    // Stop processing BLE data immediately to avoid race with subscription removal
    setIsExerciseActive(false);
    isExerciseActiveRef.current = false;
    setRecording(false);
    const sensorCount = exerciseDataRef.current.size;
    // Recorded data is kept in a ref while recording; publish it once for the sensor list
    setExerciseData(new Map(exerciseDataRef.current));

    const doStop = async () => {
      try {
        const connectedSensors = bleService.getConnectedSensors();
        // Sequential loop instead of Promise.all (Android BLE stack struggles with concurrent requests)
        for (let i = 0; i < connectedSensors.length; i++) {
          await bleService.stopMeasurement(connectedSensors[i].id);
          if (Platform.OS === "android" && i < connectedSensors.length - 1) {
            await new Promise((r) => setTimeout(r, 150));
          }
        }
      } catch (error) {
        console.error("Error stopping exercise:", error);
        Alert.alert(t("ble.alertError"), t("ble.failedStopExercise", { error: error instanceof Error ? error.message : String(error) }));
      }
      setCanAnalyze(sensorCount > 0);
      if (Platform.OS === "android") {
        try {
          ToastAndroid.show(sensorCount > 0 ? t("ble.toastExerciseStopped") : t("ble.toastNoDataRecorded"), ToastAndroid.SHORT);
        } catch (_) { /* ignore */ }
      } else {
        Alert.alert(
          t("ble.alertExerciseStopped"),
          sensorCount > 0
            ? t("ble.recordedFromSensors", { count: sensorCount })
            : t("ble.noDataWasRecorded")
        );
      }
    };

    if (Platform.OS === "android") {
      setTimeout(() => doStop(), 50);
    } else {
      await doStop();
    }
  };

  const handleClearLogs = () => {
    setRealTimeLogs([]);
  };

  const handleAnalyzeExercise = async () => {
    if (isAnalyzing) return;
    console.log("🔬 [UI] handleAnalyzeExercise() called");
    console.log("🔬 [UI] exerciseStartTime:", exerciseStartTime);
    console.log("🔬 [UI] exerciseDataRef.current.size:", exerciseDataRef.current.size);
    console.log("🔬 [UI] exerciseDataRef.current keys:", Array.from(exerciseDataRef.current.keys()));
    
    if (!exerciseStartTime || exerciseDataRef.current.size === 0) {
      console.error("❌ [UI] No data to analyze - exerciseStartTime or exerciseDataRef is empty");
      Alert.alert(t("ble.alertNoData"), t("ble.noExerciseDataToAnalyze"));
      return;
    }

    setIsAnalyzing(true);
    try {
      // Create device tag map
      const deviceTagMap = new Map<string, DeviceTag>();
      sensors.forEach((sensor) => {
        if (sensor.deviceTag && exerciseDataRef.current.has(sensor.id)) {
          deviceTagMap.set(sensor.id, sensor.deviceTag);
          console.log(`🔬 [UI] Added sensor ${sensor.id} with DeviceTag ${sensor.deviceTag} (${getDeviceTagName(sensor.deviceTag)})`);
        }
      });

      console.log(`🔬 [UI] deviceTagMap size: ${deviceTagMap.size}`);
      console.log(`🔬 [UI] deviceTagMap entries:`, Array.from(deviceTagMap.entries()).map(([id, tag]) => ({ id, tag })));

      if (deviceTagMap.size === 0) {
        console.error("❌ [UI] No sensors with device tags found");
        Alert.alert(t("ble.alertError"), t("ble.noDeviceTagsFound"));
        return;
      }

      // Log exercise data summary
      exerciseDataRef.current.forEach((data, sensorId) => {
        console.log(`🔬 [UI] Sensor ${sensorId}: ${data.length} samples`);
        if (data.length > 0) {
          console.log(`🔬 [UI]   First sample:`, {
            PacketCounter: data[0].PacketCounter,
            SampleTimeFine: data[0].SampleTimeFine,
            Euler_X: data[0].Euler_X,
            Euler_Y: data[0].Euler_Y,
            Euler_Z: data[0].Euler_Z,
          });
        }
      });

      // Build Session directly from BLE data — no ZIP/CSV serialisation needed.
      // This avoids the quat→Euler→quat round-trip that was introduced by the CSV export path.
      console.log("🔬 [UI] Building session from BLE data...");
      const clockStreams = new Map<string, { clock: SensorClock; sensorUs: number[] }>();
      for (const sensorId of Array.from(deviceTagMap.keys())) {
        const clock = clocksRef.current.get(sensorId);
        const sensorUs = sensorUsRef.current.get(sensorId);
        if (clock && sensorUs) clockStreams.set(sensorId, { clock, sensorUs });
      }
      const alignedTimes = clockStreams.size === deviceTagMap.size ? alignStreams(clockStreams) : undefined;
      if (alignedTimes) {
        const starts = Array.from(alignedTimes.entries()).map(
          ([id, t]) => `${getDeviceTagName(deviceTagMap.get(id))}: +${((t[0] ?? 0) * 1000).toFixed(0)} ms`
        );
        console.log(`🔬 [UI] Stream start offsets on the shared clock: ${starts.join(", ")}`);
      }
      const session = buildSessionFromBleData(
        exerciseDataRef.current,
        deviceTagMap,
        exerciseStartTime,
        alignedTimes
      );
      console.log(`🔬 [UI] Session built, streams: ${Object.keys(session.streams).join(', ')}`);

      // Analyze with local API
      console.log("🔬 [UI] Starting analysis with local API...");
      const localAnalysisApi = createLocalAnalysisApi();

      // Patient's own height/weight for the centre-of-mass model (defaults if not recorded)
      const analysisPatientId = user?.role === "patient" ? user.id : params.patientId;
      const body = await getPatientBodyMeasurements(analysisPatientId);
      console.log("🔬 [UI] Body measurements:", body);

      const result = await localAnalysisApi.analyzeSession(session, {
        bodyHeight_m: body.bodyHeight_m,
        bodyMass_kg: body.bodyMass_kg,
      });

      console.log("🔬 [UI] Analysis complete!");
      console.log("🔬 [UI] Analysis result:", JSON.stringify(result, null, 2));
      console.log("🔬 [UI] Missing sensors:", result.missingSensors);
      console.log("🔬 [UI] Knee left ROM:", result.knee.left?.rom);
      console.log("🔬 [UI] Knee right ROM:", result.knee.right?.rom);
      console.log("🔬 [UI] Hip left ROM:", result.hip.left?.rom);
      console.log("🔬 [UI] Hip right ROM:", result.hip.right?.rom);

      setBleAnalysisResult(result);

      // Auto-save to Azure (same as ZIP upload flow)
      if (user) {
        const patientId = user.role === "patient" ? user.id : params.patientId;
        const exerciseTypeId = params.exerciseTypeId;
        const exerciseName = params.exerciseName;

        if (patientId && exerciseTypeId) {
          try {
            const endTime = new Date();
            const session = await createSessionFromAnalysisResult(result, {
              patientId,
              exerciseTypeId,
              exerciseName,
              startTime: exerciseStartTime,
              endTime,
            });
            if (session) {
              console.log("🔬 [UI] Session saved to server:", session.id);
              setCanAnalyze(false);
              // Refresh dashboard before alert so data is ready when user navigates back
              await Promise.all([
                fetchPatients(),
                fetchAssignedExercises(patientId),
              ]);
              Alert.alert(
                t("ble.alertAnalysisComplete"),
                t("ble.resultsSaved", { missing: result.missingSensors.length > 0 ? result.missingSensors.join(", ") : t("ble.missingSensorsNone") })
              );
            } else {
              Alert.alert(
                t("ble.alertAnalysisComplete"),
                t("ble.saveFailed", { missing: result.missingSensors.length > 0 ? result.missingSensors.join(", ") : t("ble.missingSensorsNone") })
              );
            }
          } catch (saveError) {
            console.error("Error saving BLE results to server:", saveError);
            Alert.alert(
              t("ble.alertAnalysisComplete"),
              t("ble.couldNotSave", { error: saveError instanceof Error ? saveError.message : String(saveError) })
            );
          }
        } else {
          Alert.alert(
            t("ble.alertAnalysisComplete"),
            t("ble.completedNotSaved", { missing: result.missingSensors.length > 0 ? result.missingSensors.join(", ") : t("ble.missingSensorsNone") })
          );
        }
      } else {
        Alert.alert(
          t("ble.alertAnalysisComplete"),
          t("ble.completedSuccessfully", { missing: result.missingSensors.length > 0 ? result.missingSensors.join(", ") : t("ble.missingSensorsNone") })
        );
      }
    } catch (error) {
      console.error("❌ [UI] Error analyzing exercise:", error);
      console.error("❌ [UI] Error type:", typeof error);
      console.error("❌ [UI] Error message:", error instanceof Error ? error.message : String(error));
      console.error("❌ [UI] Error stack:", error instanceof Error ? error.stack : 'No stack');
      Alert.alert(
        t("ble.alertAnalysisError"),
        t("ble.failedAnalyzeExercise", { error: error instanceof Error ? error.message : String(error) })
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShowCsv = useCallback((sensorId: string) => {
    const data = exerciseDataRef.current.get(sensorId);
    if (!data || data.length === 0) {
      Alert.alert(t("ble.alertNoData"), t("ble.noRecordedSamples"));
      return;
    }

    if (!exerciseStartTime) {
      Alert.alert(t("ble.alertNoStartTime"), t("ble.noStartTimeMessage"));
      return;
    }

    const sensor = sensors.find((s) => s.id === sensorId);
    if (!sensor) {
      Alert.alert(t("ble.alertSensorNotFound"), t("ble.sensorNotFoundMessage"));
      return;
    }

    if (!sensor.deviceTag) {
      Alert.alert(t("ble.alertAssignDeviceTag"), t("ble.assignDeviceTagMessage"));
      return;
    }

    try {
      const deviceTagNum = typeof sensor.deviceTag === 'number' ? sensor.deviceTag : Number(sensor.deviceTag);
      const csv = createCSVForSensor(deviceTagNum, sensorId, data, exerciseStartTime);
      const displayName = sensor.hardwareDeviceTag
        ? `${sensor.name} (DOT tag ${sensor.hardwareDeviceTag})`
        : sensor.name || sensorId;
      setCsvModalSensorName(displayName);
      setCsvModalContent(csv);
      setCsvModalVisible(true);
    } catch (error) {
      console.error("❌ [UI] Error generating CSV preview:", error);
      Alert.alert(t("ble.alertError"), t("ble.failedCsvPreview"));
    }
  }, [exerciseStartTime, sensors]);

  const handleCloseCsvModal = useCallback(() => {
    setCsvModalVisible(false);
    setCsvModalContent(null);
    setCsvModalSensorName("");
  }, []);

  const getDeviceTagName = (tag?: DeviceTag): string => t(deviceTagLabelKey(tag));

  // Compact row per connected sensor: position, battery, samples, CSV preview
  const renderSensorItem = (item: MovellaSensor) => {
    const recordedSamples = exerciseData.get(item.id);
    const hasRecordedData = !!recordedSamples && recordedSamples.length > 0;

    return (
      <View
        key={item.id}
        style={[styles.sensorRow, { borderBottomColor: colors.border }]}
      >
        <Ionicons name="bluetooth" size={18} color={colors.success} />
        <View style={styles.sensorRowText}>
          <Text style={[styles.sensorRowName, { color: colors.text }]}>
            {getDeviceTagName(item.deviceTag)}
          </Text>
          <Text style={[styles.sensorRowMeta, { color: colors.textSecondary }]}>
            {item.name}
            {item.batteryLevel !== undefined ? ` · ${item.batteryLevel}%` : ""}
            {hasRecordedData ? ` · ${recordedSamples!.length} samples` : ""}
          </Text>
        </View>
        {hasRecordedData && (
          <TouchableOpacity
            style={[
              styles.csvButton,
              { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
            ]}
            onPress={() => handleShowCsv(item.id)}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            <Text style={[styles.csvButtonText, { color: colors.primary }]}>
              {t("ble.showCsv")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const connectedCount = connectedSensors.length;

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["left", "right", "bottom"]}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {params.exerciseName || t("navigation.recordExercise")}
        </Text>
      </View>

      {/* While recording (not testing mode): only what the patient needs */}
      {isExerciseActive && !testingMode && (
        <View style={[styles.livePanel, { backgroundColor: colors.card }]}>
          <Text style={[styles.liveLabel, { color: colors.textSecondary }]}>
            {t("ble.liveReps")}
          </Text>
          <Text
            style={[styles.liveReps, { color: colors.primary }]}
            accessibilityLabel={`${t("ble.liveReps")}: ${liveReps}`}
          >
            {liveReps}
          </Text>
          <View style={styles.liveTimeRow}>
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.liveTime, { color: colors.text }]}>
              {formatElapsed(elapsedSec)}
            </Text>
          </View>
          <View style={styles.liveStatusRow}>
            <Ionicons
              name={isReady ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={isReady ? colors.success : colors.warning || "#FF9500"}
            />
            <Text
              style={[
                styles.liveStatusText,
                { color: isReady ? colors.textSecondary : colors.warning || "#FF9500" },
              ]}
            >
              {isReady
                ? t("ble.liveSensorsOk")
                : reconnecting.size > 0
                ? t("ble.liveSensorReconnecting")
                : t("ble.liveSensorLost")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.liveStopButton, { backgroundColor: colors.error || "#FF3B30" }]}
            onPress={handleStopExercise}
          >
            <Ionicons name="stop" size={28} color={colors.white} />
            <Text style={[styles.liveStopText, { color: colors.white }]}>
              {t("ble.stopExercise")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!(isExerciseActive && !testingMode) && (
      <>
      {/* Sensor status: connection is managed in the Sensors tab */}
      <View
        style={[
          styles.sensorStatusCard,
          {
            backgroundColor: colors.card,
            borderColor: isReady ? colors.success : colors.warning || "#FF9500",
          },
        ]}
      >
        <View style={styles.sensorStatusHeader}>
          <Ionicons
            name={isReady ? "checkmark-circle" : "alert-circle-outline"}
            size={24}
            color={isReady ? colors.success : colors.warning || "#FF9500"}
          />
          <View style={styles.sensorStatusTextBlock}>
            <Text style={[styles.sensorStatusTitle, { color: colors.text }]}>
              {isReady ? t("sensors.readyTitle") : t("sensors.notReadyTitle")}
            </Text>
            <Text style={[styles.sensorStatusSubtitle, { color: colors.textSecondary }]}>
              {t("sensors.connectedCount", { count: connectedCount })}
            </Text>
            {!isReady && autoConnecting && (
              <Text style={[styles.sensorStatusSubtitle, { color: colors.primary }]}>
                {t("sensors.searchingKit")}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.manageSensorsButton,
              { borderColor: colors.primary, opacity: isExerciseActive ? 0.5 : 1 },
            ]}
            onPress={openSensorSetup}
            disabled={isExerciseActive}
          >
            <Ionicons name="settings-outline" size={16} color={colors.primary} />
            <Text style={[styles.manageSensorsText, { color: colors.primary }]}>
              {t("sensors.manageSensors")}
            </Text>
          </TouchableOpacity>
        </View>

        {!isReady && missingTags.length > 0 && (
          <Text style={[styles.sensorStatusMissing, { color: colors.textSecondary }]}>
            {t("sensors.missing")} {missingTags.map((tag) => getDeviceTagName(tag)).join(", ")}
          </Text>
        )}

        {connectedSensors.length > 0 ? (
          <View style={styles.sensorRows}>
            {connectedSensors.map(renderSensorItem)}
          </View>
        ) : (
          <Text style={[styles.sensorStatusMissing, { color: colors.textSecondary }]}>
            {t("sensors.goToSensorsTab")}
          </Text>
        )}
      </View>

      {/* Exercise Section */}
      <View style={styles.exerciseSection}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setExerciseSectionCollapsed(!exerciseSectionCollapsed)}
          >
            <Text style={[styles.collapseHeaderText, { color: colors.text }]}>
              {t("ble.exerciseControl")}
            </Text>
            <Ionicons
              name={exerciseSectionCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {!exerciseSectionCollapsed && (
            <View style={styles.exerciseSectionContent}>
          {/* Testing Mode Toggle */}
          <View style={styles.testingModeContainer}>
            <View style={styles.testingModeRow}>
              <Text style={[styles.testingModeLabel, { color: colors.text }]}>
                {t("ble.testingMode")}
              </Text>
              <Switch
                value={testingMode}
                onValueChange={setTestingMode}
                trackColor={{ false: colors.mediumGray, true: colors.primary + '80' }}
                thumbColor={testingMode ? colors.primary : colors.white}
              />
            </View>
            <Text style={[styles.testingModeHint, { color: colors.textSecondary }]}>
              {testingMode 
                ? "Exercise can start with 1+ sensors" 
                : "Requires all 5 sensors"}
            </Text>
          </View>
          
          {!isExerciseActive ? (
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                {
                  backgroundColor: hasAllSensorsConnected(testingMode) ? colors.primary : colors.mediumGray,
                },
              ]}
              onPress={handleStartExercise}
              disabled={!hasAllSensorsConnected(testingMode)}
            >
              <Ionicons name="play" size={20} color={colors.white} />
              <Text style={[styles.exerciseButtonText, { color: colors.white }]}>
                {t("ble.startExercise")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                { backgroundColor: colors.error || "#FF3B30" },
              ]}
              onPress={handleStopExercise}
            >
              <Ionicons name="stop" size={20} color={colors.white} />
              <Text style={[styles.exerciseButtonText, { color: colors.white }]}>
                {t("ble.stopExercise")}
              </Text>
            </TouchableOpacity>
          )}
          
          {isExerciseActive && (
            <>
              <View style={styles.exerciseIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.exerciseIndicatorText, { color: colors.text }]}>
                  {t("ble.recordingData")}
                </Text>
              </View>
              
              {/* Packet Counters */}
              {Array.from(packetCounters.entries()).length > 0 && (
                <View style={styles.packetCountersContainer}>
                  <Text style={[styles.packetCountersTitle, { color: colors.text }]}>
                    {t("ble.packetsReceived")}
                  </Text>
                        {sensors
                          .filter(s => s.connected && packetCounters.has(s.id))
                          .map((sensor) => (
                            <View key={sensor.id} style={styles.packetCounterRow}>
                              <Text style={[styles.packetCounterLabel, { color: colors.textSecondary }]}>
                                {sensor.name || `Sensor ${sensor.id.substring(0, 8)}`} (Tag {sensor.deviceTag}):
                              </Text>
                              <Text style={[styles.packetCounterValue, { color: colors.primary }]}>
                                {packetCounters.get(sensor.id) || 0}
                              </Text>
                            </View>
                          ))}
                </View>
              )}
              
              {/* Real-time Logs */}
              <View style={styles.logsContainer}>
                <View style={styles.logsHeader}>
                  <Text style={[styles.logsTitle, { color: colors.text }]}>
                    {t("ble.realTimeLogs")}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClearLogs}
                    style={styles.clearLogsButton}
                  >
                    <Text style={[styles.clearLogsButtonText, { color: colors.primary }]}>
                      {t("ble.clearLogs")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  ref={logsScrollViewRef}
                  style={styles.logsScrollView}
                  contentContainerStyle={styles.logsContent}
                  showsVerticalScrollIndicator={true}
                >
                  {realTimeLogs.length === 0 ? (
                    <Text style={[styles.noLogsText, { color: colors.textSecondary }]}>
                      {t("ble.waitingForData")}
                    </Text>
                  ) : (
                    realTimeLogs.map((log, index) => (
                      <View key={index} style={[styles.logEntry, { borderBottomColor: colors.border }]}>
                        <View style={styles.logHeader}>
                          <Text style={[styles.logTimestamp, { color: colors.textSecondary }]}>
                            {log.timestamp}
                          </Text>
                          <Text style={[styles.logSensorName, { color: colors.text }]}>
                            {log.sensorName}
                          </Text>
                          <Text style={[styles.logDeviceTag, { color: colors.primary }]}>
                            {log.deviceTag}
                          </Text>
                          <Text style={[styles.logPacketCounter, { color: colors.textSecondary }]}>
                            #{log.packetCounter}
                          </Text>
                        </View>
                        <Text style={[styles.logData, { color: colors.textSecondary }]}>
                          Euler: {log.euler.x.toFixed(2)}, {log.euler.y.toFixed(2)}, {log.euler.z.toFixed(2)}
                        </Text>
                        <Text style={[styles.logData, { color: colors.textSecondary }]}>
                          FreeAcc: {log.freeAcc.x.toFixed(2)}, {log.freeAcc.y.toFixed(2)}, {log.freeAcc.z.toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </>
          )}
          
          {canAnalyze && (
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                {
                  backgroundColor: isAnalyzing ? (colors.gray?.[400] ?? "#9E9E9E") : (colors.success || "#34C759"),
                  opacity: isAnalyzing ? 0.7 : 1,
                },
              ]}
              onPress={handleAnalyzeExercise}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="analytics" size={20} color={colors.white} />
              )}
              <Text style={[styles.analyzeButtonText, { color: colors.white }]}>
                {isAnalyzing ? t("ble.analyzing") : t("ble.analyzeExercise")}
              </Text>
            </TouchableOpacity>
          )}
          
          {!hasAllSensorsConnected(testingMode) && connectedCount > 0 && !testingMode && (
            <Text style={[styles.sensorWarning, { color: colors.warning || "#FF9500" }]}>
              {connectedCount >= 5
                ? t("ble.assignTagsToStart")
                : t("ble.moreSensorsNeeded", { count: 5 - connectedCount })}
            </Text>
          )}
            </View>
          )}
      </View>

      </>
      )}

      {/* Analysis Section */}
      {bleAnalysisResult && (
        <View style={[styles.analysisSection, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setAnalysisSectionCollapsed(!analysisSectionCollapsed)}
          >
            <Text style={[styles.collapseHeaderText, { color: colors.text }]}>
              {t("ble.analysisResultsTitle")}
            </Text>
            <Ionicons
              name={analysisSectionCollapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {!analysisSectionCollapsed && (
            <View style={styles.analysisSectionContent}>
              <LocalAnalysisResults result={bleAnalysisResult} />
            </View>
          )}
        </View>
      )}
      </ScrollView>
      <Modal
        visible={csvModalVisible}
        animationType="slide"
        onRequestClose={handleCloseCsvModal}
        presentationStyle="fullScreen"
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {csvModalSensorName || t("ble.csvPreview")}
            </Text>
            <TouchableOpacity
              onPress={handleCloseCsvModal}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <Text
              style={[
                styles.modalCsvContent,
                { color: colors.text },
              ]}
              selectable
            >
              {csvModalContent || ""}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  sensorStatusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sensorStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sensorStatusTextBlock: {
    flex: 1,
  },
  sensorStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sensorStatusSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sensorStatusMissing: {
    fontSize: 13,
    marginTop: 10,
  },
  manageSensorsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageSensorsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sensorRows: {
    marginTop: 10,
  },
  sensorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sensorRowText: {
    flex: 1,
  },
  sensorRowName: {
    fontSize: 14,
    fontWeight: "600",
  },
  sensorRowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  scanSection: {
    padding: 16,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  rescanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    backgroundColor: "transparent",
  },
  rescanButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 0,
  },
  collapseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  collapseHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sensorsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
  },
  analysisSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  analysisSectionContent: {
    padding: 16,
  },
  sensorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  sensorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sensorInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  sensorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sensorDetails: {
    flex: 1,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sensorMac: {
    fontSize: 12,
    marginBottom: 4,
  },
  sensorTag: {
    fontSize: 12,
    fontWeight: "500",
  },
  hardwareTag: {
    fontSize: 12,
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  batteryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  batteryText: {
    fontSize: 12,
  },
  sensorActions: {
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  csvButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  csvButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagSelector: {
    marginTop: 8,
  },
  tagLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  tagButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  exerciseSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
  },
  exerciseSectionContent: {
    padding: 16,
  },
  exerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  exerciseButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  exerciseIndicatorText: {
    fontSize: 14,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sensorWarning: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  livePanel: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  liveLabel: { fontSize: 22, fontWeight: "600" },
  liveReps: { fontSize: 120, fontWeight: "800", lineHeight: 136, marginVertical: 8 },
  liveTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveTime: { fontSize: 32, fontWeight: "600", fontVariant: ["tabular-nums"] },
  liveStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24 },
  liveStatusText: { fontSize: 18, fontWeight: "500", flexShrink: 1, textAlign: "center" },
  liveStopButton: {
    marginTop: 32,
    alignSelf: "stretch",
    minHeight: 72,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  liveStopText: { fontSize: 24, fontWeight: "700" },
  testingModeContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  testingModeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  testingModeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  testingModeHint: {
    fontSize: 12,
    marginTop: 4,
  },
  packetCountersContainer: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  packetCountersTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  packetCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  packetCounterLabel: {
    fontSize: 12,
    flex: 1,
  },
  packetCounterValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Restored: dropped by mistake in 934b681 (live log + CSV preview modal)
  logsContainer: {
    marginTop: 12,
    marginBottom: 12,
    maxHeight: 300,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  clearLogsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearLogsButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logsScrollView: {
    maxHeight: 250,
  },
  logsContent: {
    padding: 8,
  },
  noLogsText: {
    fontSize: 12,
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  logEntry: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  logHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  logTimestamp: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  logSensorName: {
    fontSize: 12,
    fontWeight: "600",
  },
  logDeviceTag: {
    fontSize: 11,
    fontWeight: "500",
  },
  logPacketCounter: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  logData: {
    fontSize: 11,
    fontFamily: "monospace",
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 6,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    paddingVertical: 16,
  },
  modalCsvContent: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});

export default BleConnectionScreen;
