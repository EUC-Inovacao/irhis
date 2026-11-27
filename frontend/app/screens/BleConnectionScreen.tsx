import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
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
import { buildSessionFromBleData } from "../analysis/bleSession";
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
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bleAnalysisResult, setBleAnalysisResult] = useState<AnalysisResult | null>(null);
  
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
  // Shared clock (clockSync.ts): per-sensor clock state and unwrapped sensor times
  const clocksRef = useRef<Map<string, SensorClock>>(new Map());
  const sensorUsRef = useRef<Map<string, number[]>>(new Map());
  // Live feedback for the patient
  const repTrackerRef = useRef(new LiveRepTracker());
  const tagByIdRef = useRef<Map<string, DeviceTag>>(new Map());
  const [liveReps, setLiveReps] = useState(0);
  const exerciseEndTimeRef = useRef<Date | null>(null);
  // Analysis and submission are separate steps
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sensorDetailsOpen, setSensorDetailsOpen] = useState(false);
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

  const openSensorSetup = useCallback(() => {
    navigation?.navigate("SensorSetup");
  }, [navigation]);

  const handleStartExercise = async () => {
    if (!isReady) {
      Alert.alert(t("ble.alertSensorsRequired"), t("ble.sensorsRequiredAll"));
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
      exerciseEndTimeRef.current = null;
      setSubmitted(false);
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
    exerciseEndTimeRef.current = new Date();
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

      setCanAnalyze(false);
      setSubmitted(false);
      setAnalysisSectionCollapsed(false);
      // Saving is a separate step: the user reviews the results, then submits
      Alert.alert(
        t("ble.alertAnalysisComplete"),
        t("ble.analysisReadyToSubmit", {
          missing: result.missingSensors.length > 0 ? result.missingSensors.join(", ") : t("ble.missingSensorsNone"),
        })
      );
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

  /** Send the analysed exercise to the backend (separate from the analysis). */
  const handleSubmitExercise = async () => {
    if (isSubmitting || submitted || !bleAnalysisResult || !exerciseStartTime) return;
    const patientId = user?.role === "patient" ? user.id : params.patientId;
    const exerciseTypeId = params.exerciseTypeId;
    if (!user || !patientId || !exerciseTypeId) {
      Alert.alert(t("ble.alertError"), t("ble.submitMissingContext"));
      return;
    }
    setIsSubmitting(true);
    try {
      const session = await createSessionFromAnalysisResult(bleAnalysisResult, {
        patientId,
        exerciseTypeId,
        exerciseName: params.exerciseName,
        startTime: exerciseStartTime,
        endTime: exerciseEndTimeRef.current ?? new Date(),
      });
      if (!session) {
        Alert.alert(t("ble.alertError"), t("ble.submitFailed"));
        return;
      }
      console.log("📤 [UI] Exercise submitted:", session.id);
      setSubmitted(true);
      // Refresh dashboard data so it is up to date when the user goes back
      await Promise.all([fetchPatients(), fetchAssignedExercises(patientId)]);
      Alert.alert(t("ble.alertSubmitted"), t("ble.submittedMessage"));
    } catch (error) {
      console.error("❌ [UI] Error submitting exercise:", error);
      Alert.alert(
        t("ble.alertError"),
        t("ble.couldNotSave", { error: error instanceof Error ? error.message : String(error) })
      );
    } finally {
      setIsSubmitting(false);
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
      {isExerciseActive && (
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

      {!isExerciseActive && (
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

        {connectedSensors.length > 0 ? (
          <>
            <TouchableOpacity
              style={styles.sensorDetailsToggle}
              onPress={() => setSensorDetailsOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: sensorDetailsOpen }}
            >
              <Text style={[styles.sensorDetailsToggleText, { color: colors.primary }]}>
                {sensorDetailsOpen ? t("ble.hideSensorDetails") : t("ble.showSensorDetails")}
              </Text>
              <Ionicons
                name={sensorDetailsOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
            {sensorDetailsOpen && (
              <>
                {!isReady && missingTags.length > 0 && (
                  <Text style={[styles.sensorStatusMissing, { color: colors.textSecondary }]}>
                    {t("sensors.missing")} {missingTags.map((tag) => getDeviceTagName(tag)).join(", ")}
                  </Text>
                )}
                <View style={styles.sensorRows}>
                  {connectedSensors.map(renderSensorItem)}
                </View>
              </>
            )}
          </>
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
          {!isExerciseActive ? (
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                {
                  backgroundColor: isReady ? colors.primary : colors.mediumGray,
                },
              ]}
              onPress={handleStartExercise}
              disabled={!isReady}
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
          
          {bleAnalysisResult && !canAnalyze && (
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                {
                  backgroundColor: submitted
                    ? colors.success || "#34C759"
                    : isSubmitting
                    ? colors.gray?.[400] ?? "#9E9E9E"
                    : colors.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmitExercise}
              disabled={isSubmitting || submitted}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name={submitted ? "checkmark-circle" : "cloud-upload-outline"}
                  size={20}
                  color={colors.white}
                />
              )}
              <Text style={[styles.analyzeButtonText, { color: colors.white }]}>
                {submitted
                  ? t("ble.exerciseSubmitted")
                  : isSubmitting
                  ? t("ble.submittingExercise")
                  : t("ble.submitExercise")}
              </Text>
            </TouchableOpacity>
          )}

          {!isReady && connectedCount > 0 && (
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
  sensorDetailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 12,
    paddingVertical: 4,
  },
  sensorDetailsToggleText: { fontSize: 14, fontWeight: "600" },
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
  // Restored: dropped by mistake in 934b681 (live log + CSV preview modal)
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
