import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/ThemeContext";
import { useAuth } from "@context/AuthContext";
import { usePatients } from "@context/PatientContext";
import { useSensors } from "@context/SensorContext";
import { buildTodayPlan, PlannedExercise } from "../exercises/todayPlan";
import type { Side } from "../exercises/catalog";
import { useExerciseRecorder } from "../hooks/useExerciseRecorder";
import { createSessionFromAnalysisResult } from "@services/sessionService";
import type { AnalysisResult } from "../types";

type Phase =
  | "intro"
  | "preparing"
  | "countdown"
  | "counting"
  | "switchSide"
  | "completed"
  | "saving"
  | "saveFailed"
  | "next";

const COUNTDOWN_FROM = 3;
/** Longest wait for all sensors to start streaming before the countdown. */
const STREAM_WAIT_MS = 4000;

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  squat: "body-outline",
  "knee-extension": "accessibility-outline",
  march: "walk-outline",
};

/**
 * Guided flow, step 2: one exercise from start to saved result, for a patient
 * using the app alone. Intro, "stay still" + 3-2-1 (the analysis uses the
 * first seconds as the reference posture), a large live count with a
 * "Terminei" button that always works, automatic analysis and saving, then the
 * next exercise. A count below the target is never shown as a failure: the
 * live count is a guide, the saved result comes from the full analysis.
 */
const GuidedExerciseScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { sessionsByPatient, fetchAssignedExercises } = usePatients();
  const { isReady, reconnecting, connectKit, autoConnecting, connectedSensors } = useSensors();
  const recorder = useExerciseRecorder();
  // The patient is away from the phone during the exercise: never let it lock
  useKeepAwake("guided-exercise");

  const plan = useMemo(() => {
    const sessions = user ? sessionsByPatient?.[user.id] : undefined;
    return sessions ? buildTodayPlan(sessions) : [];
  }, [sessionsByPatient, user]);
  const exercise: PlannedExercise | undefined = plan.find((p) => p.key === route.params?.exerciseKey);
  const mode = exercise?.protocol?.counting;
  const sides: (Side | undefined)[] = exercise?.protocol?.sides ?? [undefined];

  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [sideIndex, setSideIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const resultRef = useRef<AnalysisResult | null>(null);
  const finishingRef = useRef(false);
  const side = sides[sideIndex];
  const target = exercise?.targetReps ?? 10;
  const name = exercise ? (exercise.protocol ? t(exercise.protocol.nameKey) : exercise.storedName) : "";

  const patientId = user?.id;

  // ---- saving ------------------------------------------------------------
  const save = useCallback(async () => {
    if (!exercise || !patientId || !resultRef.current) return;
    setPhase("saving");
    try {
      const session = await createSessionFromAnalysisResult(resultRef.current, {
        patientId,
        exerciseTypeId: exercise.exerciseTypeId,
        exerciseName: name,
        startTime: recorder.startTime() ?? new Date(),
        endTime: recorder.endTime() ?? new Date(),
      });
      if (!session) throw new Error("save failed");
      await fetchAssignedExercises(patientId);
      setPhase("next");
    } catch (error) {
      console.warn("[Guided] Could not save exercise:", error);
      setPhase("saveFailed");
    }
  }, [exercise, fetchAssignedExercises, name, patientId, recorder]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase("completed");
    await recorder.stop();
    // Let the patient see "Exercício completado" for a moment
    await new Promise((r) => setTimeout(r, 1500));
    setPhase("saving");
    try {
      resultRef.current = await recorder.analyze(patientId);
    } catch (error) {
      console.warn("[Guided] Analysis failed:", error);
      resultRef.current = null;
      setPhase("saveFailed");
      return;
    }
    await save();
  }, [patientId, recorder, save]);

  // ---- target reached / Terminei -------------------------------------------
  const completeCurrentSide = useCallback(() => {
    if (sideIndex < sides.length - 1) {
      setPhase("switchSide");
    } else {
      finish();
    }
  }, [finish, sideIndex, sides.length]);

  // ---- start: stay still, wait for data, 3-2-1 -------------------------------
  const begin = useCallback(async () => {
    if (!isReady) return;
    finishingRef.current = false;
    resultRef.current = null;
    setSideIndex(0);
    setReps(0);
    setPhase("preparing");
    try {
      await recorder.start();
    } catch (error) {
      console.warn("[Guided] Could not start recording:", error);
      setPhase("intro");
      return;
    }
    const expected = connectedSensors.length;
    const waitStart = Date.now();
    while (recorder.sensorsStreaming() < expected && Date.now() - waitStart < STREAM_WAIT_MS) {
      await new Promise((r) => setTimeout(r, 200));
    }
    setCountdown(COUNTDOWN_FROM);
    setPhase("countdown");
  }, [connectedSensors.length, isReady, recorder]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("counting");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // ---- live count ----------------------------------------------------------------
  useEffect(() => {
    if (phase !== "counting") return;
    const timer = setInterval(() => {
      const n = recorder.repsFor(mode, side);
      setReps(n);
      if (n >= target) completeCurrentSide();
    }, 250);
    return () => clearInterval(timer);
  }, [completeCurrentSide, mode, phase, recorder, side, target]);

  // ---- next exercise ---------------------------------------------------------------
  const nextExercise = useMemo(() => {
    if (!exercise) return undefined;
    const idx = plan.findIndex((p) => p.key === exercise.key);
    const after = plan.slice(idx + 1).find((p) => !p.doneToday);
    return after ?? plan.slice(0, Math.max(0, idx)).find((p) => !p.doneToday);
  }, [exercise, plan]);

  const goHome = useCallback(() => navigation?.popToTop(), [navigation]);

  // ---- rendering -----------------------------------------------------------------------
  const BigButton = ({ label, onPress, kind = "primary", disabled = false, icon }: {
    label: string;
    onPress: () => void;
    kind?: "primary" | "secondary";
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
  }) => (
    <TouchableOpacity
      style={[
        styles.bigButton,
        kind === "primary"
          ? { backgroundColor: disabled ? colors.mediumGray : colors.primary }
          : { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {icon && <Ionicons name={icon} size={30} color={kind === "primary" ? "#FFFFFF" : colors.text} />}
      <Text style={[styles.bigButtonText, { color: kind === "primary" ? "#FFFFFF" : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const sensorLine = !isReady && (
    <View style={styles.sensorWarning}>
      <Ionicons name="alert-circle" size={24} color={colors.warning} />
      <Text style={[styles.sensorWarningText, { color: colors.warning }]}>
        {reconnecting.size > 0 || autoConnecting ? t("ble.liveSensorReconnecting") : t("ble.liveSensorLost")}
      </Text>
    </View>
  );

  if (!exercise) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  let body: React.ReactNode = null;

  switch (phase) {
    case "intro":
      body = (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.illustration, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name={ICONS[mode ?? ""] ?? "fitness-outline"} size={120} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
          {exercise.protocol && (
            <Text style={[styles.instruction, { color: colors.text }]}>{t(exercise.protocol.instructionKey)}</Text>
          )}
          <Text style={[styles.targetText, { color: colors.primary }]}>
            {mode === "knee-extension"
              ? t("guided.targetPerLeg", { count: target })
              : t("guided.target", { count: target })}
          </Text>
          {!isReady && (
            <>
              <Text style={[styles.instruction, { color: colors.warning }]}>{t("guided.sensorsNotReady")}</Text>
              <BigButton label={t("guided.tryAgain")} onPress={() => connectKit()} kind="secondary" icon="bluetooth" />
            </>
          )}
          <BigButton label={t("guided.start")} onPress={begin} disabled={!isReady} icon="play" />
          <TouchableOpacity style={styles.link} onPress={goHome}>
            <Text style={[styles.linkText, { color: colors.primary }]}>{t("guided.backHome")}</Text>
          </TouchableOpacity>
        </ScrollView>
      );
      break;

    case "preparing":
    case "countdown":
      body = (
        <View style={[styles.center, styles.fill]}>
          <Text style={[styles.title, { color: colors.text, textAlign: "center" }]}>{t("guided.stayStill")}</Text>
          {phase === "preparing" ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={[styles.countdown, { color: colors.primary }]}>{countdown}</Text>
          )}
          {mode === "knee-extension" && (
            <Text style={[styles.instruction, { color: colors.text, textAlign: "center" }]}>{t("guided.rightLegFirst")}</Text>
          )}
        </View>
      );
      break;

    case "counting":
      body = (
        <View style={styles.fill}>
          {side && (
            <Text style={[styles.sideLabel, { color: colors.text }]}>
              {side === "right" ? t("guided.rightLeg") : t("guided.leftLeg")}
            </Text>
          )}
          <View style={[styles.center, styles.fill]}>
            <Text style={[styles.countText, { color: colors.primary }]} accessibilityLabel={`${Math.min(reps, target)} / ${target}`}>
              {Math.min(reps, target)}
              <Text style={[styles.countTarget, { color: colors.textSecondary }]}>/{target}</Text>
            </Text>
            <Text style={[styles.instruction, { color: colors.textSecondary, textAlign: "center" }]}>{t("ble.liveReps")}</Text>
          </View>
          {sensorLine}
          <BigButton label={t("guided.finished")} onPress={completeCurrentSide} icon="checkmark" />
        </View>
      );
      break;

    case "switchSide":
      body = (
        <View style={styles.fill}>
          <View style={[styles.center, styles.fill]}>
            <Ionicons name="swap-horizontal" size={96} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text, textAlign: "center", marginTop: 16 }]}>{t("guided.nowLeftLeg")}</Text>
            <Text style={[styles.instruction, { color: colors.textSecondary, textAlign: "center" }]}>{t("guided.nowLeftLegHint")}</Text>
          </View>
          <BigButton
            label={t("guided.continue")}
            onPress={() => {
              setSideIndex((i) => i + 1);
              setReps(0);
              setPhase("counting");
            }}
            icon="arrow-forward"
          />
        </View>
      );
      break;

    case "completed":
      body = (
        <View style={[styles.center, styles.fill]}>
          <Ionicons name="checkmark-circle" size={120} color={colors.success} />
          <Text style={[styles.title, { color: colors.text, textAlign: "center", marginTop: 16 }]}>{t("guided.exerciseCompleted")}</Text>
        </View>
      );
      break;

    case "saving":
      body = (
        <View style={[styles.center, styles.fill]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.instruction, { color: colors.text, textAlign: "center", marginTop: 24 }]}>{t("guided.saving")}</Text>
        </View>
      );
      break;

    case "saveFailed":
      body = (
        <View style={styles.fill}>
          <View style={[styles.center, styles.fill]}>
            <Ionicons name="cloud-offline-outline" size={96} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text, textAlign: "center", marginTop: 16 }]}>{t("guided.notSavedTitle")}</Text>
            <Text style={[styles.instruction, { color: colors.textSecondary, textAlign: "center" }]}>
              {resultRef.current ? t("guided.notSavedHint") : t("guided.noDataHint")}
            </Text>
          </View>
          {resultRef.current ? (
            <BigButton label={t("guided.tryAgain")} onPress={save} icon="refresh" />
          ) : (
            <BigButton label={t("guided.repeatExercise")} onPress={() => setPhase("intro")} icon="refresh" />
          )}
          <BigButton label={t("guided.backHome")} onPress={goHome} kind="secondary" />
        </View>
      );
      break;

    case "next":
      body = (
        <View style={styles.fill}>
          <View style={[styles.center, styles.fill]}>
            <Ionicons name="checkmark-done-circle" size={96} color={colors.success} />
            <Text style={[styles.savedText, { color: colors.success }]}>{t("guided.saved")}</Text>
            <Text style={[styles.title, { color: colors.text, textAlign: "center", marginTop: 16 }]}>
              {nextExercise
                ? t("guided.nextQuestion", {
                    name: nextExercise.protocol ? t(nextExercise.protocol.nameKey) : nextExercise.storedName,
                  })
                : t("guided.allDoneToday")}
            </Text>
          </View>
          {nextExercise && (
            <BigButton
              label={t("guided.yes")}
              onPress={() => navigation?.replace("GuidedExercise", { exerciseKey: nextExercise.key })}
              icon="arrow-forward"
            />
          )}
          <BigButton label={t("guided.backHome")} onPress={goHome} kind={nextExercise ? "secondary" : "primary"} />
        </View>
      );
      break;
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>{body}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 20 },
  scroll: { paddingBottom: 40 },
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  illustration: { borderRadius: 24, alignItems: "center", justifyContent: "center", paddingVertical: 32, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "700", lineHeight: 38 },
  instruction: { fontSize: 20, lineHeight: 28, marginTop: 12 },
  targetText: { fontSize: 24, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  countdown: { fontSize: 160, fontWeight: "800", lineHeight: 180, marginTop: 16 },
  sideLabel: { fontSize: 26, fontWeight: "700", textAlign: "center", marginTop: 8 },
  countText: { fontSize: 150, fontWeight: "800", lineHeight: 170 },
  countTarget: { fontSize: 64, fontWeight: "700" },
  sensorWarning: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 },
  sensorWarningText: { fontSize: 18, fontWeight: "600", flexShrink: 1, textAlign: "center" },
  savedText: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  bigButton: {
    minHeight: 76,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  bigButtonText: { fontSize: 26, fontWeight: "700" },
  link: { alignItems: "center", paddingVertical: 18 },
  linkText: { fontSize: 18, fontWeight: "600" },
});

export default GuidedExerciseScreen;
