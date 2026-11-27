import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/ThemeContext";
import { useAuth } from "@context/AuthContext";
import { usePatients } from "@context/PatientContext";
import { REQUIRED_TAGS, deviceTagLabelKey, useSensors } from "@context/SensorContext";
import { buildTodayPlan } from "../exercises/todayPlan";

const PLACEMENT_IMAGE = require("../../assets/images/sensor-placement-back.png");

/**
 * Guided flow, step 1: check the sensors are on and placed, then connect the
 * kit. Designed for patients using the app alone: one action at a time, large
 * text, plain words. Moves on to the first exercise not done today.
 */
const GuidedConnectScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sessionsByPatient } = usePatients();
  const {
    sensors,
    connectedSensors,
    connecting,
    isReady,
    isRecording,
    autoConnecting,
    connectKit,
    kitPositionOf,
  } = useSensors();
  const [checklistDone, setChecklistDone] = useState(false);

  const plan = useMemo(() => {
    const sessions = user ? sessionsByPatient?.[user.id] : undefined;
    return sessions ? buildTodayPlan(sessions) : [];
  }, [sessionsByPatient, user]);

  const startConnecting = useCallback(() => {
    setChecklistDone(true);
    if (!isReady && !isRecording) connectKit();
  }, [connectKit, isReady, isRecording]);

  // If the kit drops out while on this screen, look for it again
  useEffect(() => {
    if (checklistDone && !isReady && !autoConnecting && !isRecording && connectedSensors.length > 0) {
      const timer = setTimeout(() => connectKit(), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [checklistDone, isReady, autoConnecting, isRecording, connectedSensors.length, connectKit]);

  const handleStart = useCallback(() => {
    const next = plan.find((p) => !p.doneToday) ?? plan[0];
    if (!next || !user) return;
    // Recording uses the existing screen until the guided exercise screens are in
    navigation?.navigate("BleConnection", {
      patientId: user.id,
      exerciseTypeId: next.exerciseTypeId,
      exerciseName: next.protocol ? t(next.protocol.nameKey) : next.storedName,
    });
  }, [navigation, plan, t, user]);

  if (!checklistDone) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: colors.text }]}>{t("guided.checklistTitle")}</Text>
          <View style={[styles.imageCard, { backgroundColor: colors.white }]}>
            <Image
              source={PLACEMENT_IMAGE}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={t("guided.placementImageAlt")}
            />
          </View>
          {[t("guided.checkStep1"), t("guided.checkStep2"), t("guided.checkStep3")].map((line, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={[styles.checkNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.checkNumberText}>{i + 1}</Text>
              </View>
              <Text style={[styles.checkText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.bigButton, { backgroundColor: colors.primary }]}
            onPress={startConnecting}
            accessibilityRole="button"
          >
            <Text style={styles.bigButtonText}>{t("guided.checklistContinue")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isReady) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.readyBox}>
          <Ionicons name="checkmark-circle" size={96} color={colors.success} />
          <Text style={[styles.readyText, { color: colors.text }]}>{t("guided.allConnected")}</Text>
          <TouchableOpacity
            style={[styles.bigButton, styles.readyButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            disabled={plan.length === 0}
            accessibilityRole="button"
          >
            <Text style={styles.bigButtonText}>{t("guided.start")}</Text>
            <Ionicons name="arrow-forward-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>{t("guided.connectingTitle")}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("guided.connectingHint")}</Text>
        {REQUIRED_TAGS.map((tag, index) => {
          const connected = connectedSensors.some((s) => s.deviceTag === tag);
          const busy =
            !connected &&
            (autoConnecting ||
              sensors.some((s) => connecting.has(s.id) && kitPositionOf(s) === tag));
          return (
            <View
              key={tag}
              style={[
                styles.sensorRow,
                {
                  backgroundColor: connected ? colors.success + "1F" : colors.card,
                  borderColor: connected ? colors.success : colors.border,
                },
              ]}
            >
              <Text style={[styles.sensorNumber, { color: colors.textSecondary }]}>{index + 1}</Text>
              <Text style={[styles.sensorName, { color: colors.text }]}>{t(deviceTagLabelKey(tag))}</Text>
              {connected ? (
                <View style={styles.sensorStatus}>
                  <Ionicons name="checkmark-circle" size={30} color={colors.success} />
                  <Text style={[styles.sensorStatusText, { color: colors.success }]}>{t("guided.sensorConnected")}</Text>
                </View>
              ) : busy ? (
                <View style={styles.sensorStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.sensorStatusText, { color: colors.textSecondary }]}>{t("guided.sensorSearching")}</Text>
                </View>
              ) : (
                <View style={styles.sensorStatus}>
                  <Ionicons name="ellipse-outline" size={26} color={colors.textSecondary} />
                  <Text style={[styles.sensorStatusText, { color: colors.textSecondary }]}>{t("guided.sensorNotFound")}</Text>
                </View>
              )}
            </View>
          );
        })}
        {!autoConnecting && (
          <>
            <Text style={[styles.subtitle, { color: colors.text, marginTop: 8 }]}>{t("guided.notFoundHint")}</Text>
            <TouchableOpacity
              style={[styles.bigButton, { backgroundColor: colors.primary }]}
              onPress={() => connectKit()}
              accessibilityRole="button"
            >
              <Text style={styles.bigButtonText}>{t("guided.tryAgain")}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.helpLink} onPress={() => navigation?.navigate("SensorSetup")}>
          <Text style={[styles.helpLinkText, { color: colors.primary }]}>{t("guided.manageSensors")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 18, lineHeight: 26, marginBottom: 16 },
  imageCard: { borderRadius: 16, padding: 12, alignItems: "center", marginVertical: 12 },
  image: { width: "100%", height: 300 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  checkNumber: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  checkNumberText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  checkText: { flex: 1, fontSize: 20, lineHeight: 28 },
  bigButton: {
    minHeight: 72,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  bigButtonText: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  sensorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  sensorNumber: { fontSize: 20, fontWeight: "700", width: 22 },
  sensorName: { flex: 1, fontSize: 20, fontWeight: "600" },
  sensorStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  sensorStatusText: { fontSize: 16, fontWeight: "600" },
  readyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  readyText: { fontSize: 30, fontWeight: "700", textAlign: "center", marginTop: 16, lineHeight: 40 },
  readyButton: { alignSelf: "stretch", marginTop: 48 },
  helpLink: { alignItems: "center", paddingVertical: 16, marginTop: 8 },
  helpLinkText: { fontSize: 16, fontWeight: "600" },
});

export default GuidedConnectScreen;
