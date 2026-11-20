import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/ThemeContext";
import { DeviceTag, MovellaSensor } from "@services/movellaBleService";
import { MAX_KIT_ID_LENGTH, parseSensorTag, sameKit } from "@services/sensorTags";
import { REQUIRED_TAGS, deviceTagLabelKey, useSensors } from "@context/SensorContext";
import ErrorBoundary from "@components/ErrorBoundary";

/**
 * Clinician screen to register a sensor kit once:
 * blink a sensor to find it, pick its body position, and the app stores
 * "<kit>-<position>" (e.g. "K01-RTHIGH") on the sensor. From then on the
 * position is recognised automatically whenever that sensor connects.
 */
const RegisterKitScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { connectedSensors, kitId, setKitId, identify, registerSensor, isRecording } =
    useSensors();

  const [kitInput, setKitInput] = useState(kitId);
  const [busy, setBusy] = useState<string | null>(null); // sensorId being written / blinked
  useEffect(() => setKitInput(kitId), [kitId]);

  // Positions of this kit already stored on connected sensors
  const registeredPositions = useMemo(() => {
    const map = new Map<DeviceTag, MovellaSensor>();
    for (const s of connectedSensors) {
      const parsed = parseSensorTag(s.hardwareDeviceTag);
      if (parsed && sameKit(parsed.kitId, kitId)) map.set(parsed.position, s);
    }
    return map;
  }, [connectedSensors, kitId]);

  const saveKit = async () => {
    const ok = await setKitId(kitInput);
    if (!ok) {
      Alert.alert(t("sensors.kitInvalidTitle"), t("sensors.kitInvalidMessage"));
      setKitInput(kitId);
    }
  };

  const onIdentify = async (sensorId: string) => {
    setBusy(sensorId);
    await identify(sensorId);
    setBusy(null);
  };

  const doRegister = async (sensor: MovellaSensor, position: DeviceTag) => {
    setBusy(sensor.id);
    await registerSensor(sensor.id, position);
    setBusy(null);
  };

  const onPickPosition = (sensor: MovellaSensor, position: DeviceTag) => {
    const holder = registeredPositions.get(position);
    if (holder && holder.id !== sensor.id) {
      Alert.alert(
        t("sensors.positionTakenTitle"),
        t("sensors.positionTakenMessage", {
          position: t(deviceTagLabelKey(position)),
          sensor: holder.name,
        }),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("sensors.replace"), onPress: () => doRegister(sensor, position) },
        ]
      );
      return;
    }
    doRegister(sensor, position);
  };

  const renderSensor = (sensor: MovellaSensor) => {
    const parsed = parseSensorTag(sensor.hardwareDeviceTag);
    const ofThisKit = parsed && sameKit(parsed.kitId, kitId);
    const isBusy = busy === sensor.id;
    return (
      <View
        key={sensor.id}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: ofThisKit ? colors.success : colors.mediumGray },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sensorName, { color: colors.text }]}>{sensor.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {sensor.macAddress}
              {sensor.batteryLevel !== undefined ? ` · ${sensor.batteryLevel}%` : ""}
            </Text>
            <Text style={[styles.status, { color: ofThisKit ? colors.success : colors.textSecondary }]}>
              {ofThisKit
                ? t("sensors.registeredAs", { kit: parsed!.kitId, position: t(deviceTagLabelKey(parsed!.position)) })
                : parsed
                ? t("sensors.registeredOtherKit", { kit: parsed.kitId })
                : t("sensors.notRegistered", { name: sensor.hardwareDeviceTag ?? "—" })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.blinkButton, { borderColor: colors.primary }]}
            onPress={() => onIdentify(sensor.id)}
            disabled={isBusy}
          >
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={[styles.blinkText, { color: colors.primary }]}>{t("sensors.blink")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.pickLabel, { color: colors.textSecondary }]}>
          {t("sensors.chooseRegisteredPosition")}
        </Text>
        <View style={styles.chips}>
          {REQUIRED_TAGS.map((position) => {
            const selected = ofThisKit && parsed!.position === position;
            return (
              <TouchableOpacity
                key={position}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.background,
                    borderColor: selected ? colors.primary : colors.mediumGray,
                    opacity: isBusy || isRecording ? 0.5 : 1,
                  },
                ]}
                onPress={() => onPickPosition(sensor, position)}
                disabled={isBusy || isRecording}
              >
                <Text style={[styles.chipText, { color: selected ? colors.white : colors.text }]}>
                  {t(deviceTagLabelKey(position))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isBusy && <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />}
      </View>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Kit */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("sensors.kitTitle")}</Text>
            <Text style={[styles.help, { color: colors.textSecondary }]}>{t("sensors.kitHelp")}</Text>
            <View style={styles.kitRow}>
              <TextInput
                value={kitInput}
                onChangeText={setKitInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={MAX_KIT_ID_LENGTH}
                style={[styles.kitInput, { color: colors.text, borderColor: colors.mediumGray }]}
                placeholder="K01"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: kitInput === kitId ? 0.5 : 1 }]}
                onPress={saveKit}
                disabled={kitInput === kitId}
              >
                <Text style={[styles.saveText, { color: colors.white }]}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.progress, { color: colors.text }]}>
              {t("sensors.kitProgress", { count: registeredPositions.size, total: REQUIRED_TAGS.length, kit: kitId })}
            </Text>
          </View>

          {/* Instructions */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("sensors.registerHowTitle")}</Text>
            <Text style={[styles.help, { color: colors.textSecondary }]}>{t("sensors.registerHowSteps")}</Text>
            <Text style={[styles.help, { color: colors.textSecondary, marginTop: 8 }]}>{t("sensors.placementHint")}</Text>
          </View>

          {/* Sensors */}
          {connectedSensors.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bluetooth-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.help, { color: colors.textSecondary, textAlign: "center" }]}>
                {t("sensors.registerNoSensors")}
              </Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => navigation?.goBack()}
              >
                <Text style={[styles.saveText, { color: colors.white }]}>{t("sensors.backToSensors")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            connectedSensors.map(renderSensor)
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  section: { borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  help: { fontSize: 14, lineHeight: 20 },
  kitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  kitInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "600" },
  progress: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sensorName: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  status: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  blinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  blinkText: { fontSize: 13, fontWeight: "600" },
  pickLabel: { fontSize: 12, marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "500" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
});

export default RegisterKitScreen;
