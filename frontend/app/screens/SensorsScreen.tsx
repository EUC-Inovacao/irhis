import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/ThemeContext";
import { DeviceTag, MovellaSensor } from "@services/movellaBleService";
import {
  REQUIRED_TAGS,
  deviceTagLabelKey,
  useSensors,
} from "@context/SensorContext";
import ErrorBoundary from "@components/ErrorBoundary";
import { useAuth } from "@context/AuthContext";
import { parseSensorTag, sameKit } from "@services/sensorTags";

/**
 * Sensors tab: discover, connect, and assign body positions to Movella DOT
 * sensors. Independent of exercises; recording screens only check readiness.
 */
const SensorsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDoctor = user?.role?.toLowerCase() === "doctor";
  const {
    sensors,
    connectedSensors,
    scanning,
    connecting,
    bleAvailable,
    missingTags,
    isReady,
    isRecording,
    startScan,
    stopScan,
    rescan,
    connect,
    disconnect,
    assignTag,
    kitId,
    connectKit,
    autoConnecting,
    reconnecting,
  } = useSensors();

  // Connect this phone's kit automatically whenever the tab is opened
  useFocusEffect(
    useCallback(() => {
      if (!isReady && !isRecording && !scanning) connectKit();
      // Only on focus: re-running on every state change would restart scans
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const coveredCount = REQUIRED_TAGS.length - missingTags.length;

  const renderSensor = useCallback(
    (item: MovellaSensor) => {
      const isConnecting = connecting.has(item.id);
      const isReconnecting = reconnecting.has(item.id);
      return (
        <View
          key={item.id}
          style={[
            styles.sensorCard,
            {
              backgroundColor: colors.card,
              borderColor: item.connected ? colors.success : colors.mediumGray,
              borderWidth: item.connected ? 2 : 1,
            },
          ]}
        >
          <View style={styles.sensorHeader}>
            <View style={styles.sensorInfo}>
              <View
                style={[
                  styles.sensorIcon,
                  {
                    backgroundColor: item.connected
                      ? colors.success + "15"
                      : colors.purple[100],
                  },
                ]}
              >
                <Ionicons
                  name={item.connected ? "bluetooth" : "bluetooth-outline"}
                  size={24}
                  color={item.connected ? colors.success : colors.purple[500]}
                />
              </View>
              <View style={styles.sensorDetails}>
                <Text style={[styles.sensorName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.sensorMac, { color: colors.textSecondary }]}>
                  {item.macAddress}
                </Text>
                <Text
                  style={[
                    styles.sensorTag,
                    { color: item.deviceTag ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {t(deviceTagLabelKey(item.deviceTag))}
                </Text>
                <Text style={[styles.hardwareTag, { color: colors.textSecondary }]}>
                  {(() => {
                    const registered = parseSensorTag(item.hardwareDeviceTag);
                    if (registered && sameKit(registered.kitId, kitId)) {
                      return t("sensors.registeredAs", {
                        kit: registered.kitId,
                        position: t(deviceTagLabelKey(registered.position)),
                      });
                    }
                    if (registered) {
                      return `${t("sensors.registeredOtherKit", { kit: registered.kitId })} · ${t("sensors.thisPhoneKit", { kit: kitId })}`;
                    }
                    return `DOT tag: ${item.hardwareDeviceTag ?? "—"}`;
                  })()}
                </Text>
              </View>
            </View>
            <View style={styles.sensorStatusColumn}>
              {!item.connected && isReconnecting && (
                <View style={styles.connectedBadge}>
                  <ActivityIndicator size="small" color={colors.warning || "#FF9500"} />
                  <Text style={[styles.statusText, { color: colors.warning || "#FF9500" }]}>
                    {t("sensors.reconnecting")}
                  </Text>
                </View>
              )}
              {item.connected && (
                <View style={styles.connectedBadge}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {t("ble.connected")}
                  </Text>
                </View>
              )}
              {item.batteryLevel !== undefined && (
                <View style={styles.batteryInfo}>
                  <Ionicons
                    name="battery-half-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.batteryText, { color: colors.textSecondary }]}>
                    {item.batteryLevel}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sensorActions}>
            {!item.connected ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary, opacity: isConnecting ? 0.6 : 1 },
                ]}
                onPress={() => connect(item.id)}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="link" size={16} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      {t("ble.connect")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.tagSelector}>
                  <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>
                    {item.deviceTag ? t("ble.editTag") : t("ble.assignTag")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {REQUIRED_TAGS.map((tag: DeviceTag) => {
                      const selected = item.deviceTag === tag;
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.tagButton,
                            {
                              backgroundColor: selected ? colors.primary : colors.background,
                              borderColor: selected ? colors.primary : colors.mediumGray,
                              opacity: isRecording ? 0.5 : 1,
                            },
                          ]}
                          onPress={() => assignTag(item.id, tag)}
                          disabled={isRecording}
                        >
                          <Text
                            style={[
                              styles.tagButtonText,
                              {
                                color: selected ? colors.white : colors.text,
                                fontWeight: selected ? "600" : "500",
                              },
                            ]}
                          >
                            {t(deviceTagLabelKey(tag))}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.error || "#FF3B30",
                      opacity: isRecording ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => disconnect(item.id)}
                  disabled={isRecording}
                >
                  <Ionicons name="close" size={16} color={colors.white} />
                  <Text style={[styles.actionButtonText, { color: colors.white }]}>
                    {t("ble.disconnect")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    },
    [colors, connecting, connect, disconnect, assignTag, isRecording, kitId, t]
  );

  // Connected sensors first, then by name
  const sortedSensors = [...sensors].sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <ErrorBoundary>
      <SafeAreaView
        edges={["left", "right"]}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Readiness summary */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.card,
                borderColor: isReady ? colors.success : colors.mediumGray,
              },
            ]}
          >
            <View style={styles.statusRow}>
              <Ionicons
                name={isReady ? "checkmark-circle" : "alert-circle-outline"}
                size={28}
                color={isReady ? colors.success : colors.warning || "#FF9500"}
              />
              <View style={styles.statusTextBlock}>
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  {isReady ? t("sensors.readyTitle") : t("sensors.notReadyTitle")}
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                  {missingTags.length > 0
                    ? t("sensors.countSummaryMissing", {
                        connected: coveredCount,
                        total: REQUIRED_TAGS.length,
                        missing: missingTags.length,
                      })
                    : t("sensors.countSummary", {
                        connected: coveredCount,
                        total: REQUIRED_TAGS.length,
                      })}
                </Text>
              </View>
            </View>
            {isRecording && (
              <Text style={[styles.recordingNote, { color: colors.warning || "#FF9500" }]}>
                {t("sensors.recordingInProgressMessage")}
              </Text>
            )}
          </View>

          {/* Controls: 2 x 2 grid
              [ Search sensors ] [ Restart search ]
              [ Connect kit    ] [ Register kit   ]  (register: doctors only) */}
          <View style={styles.controls}>
            <View style={styles.controlRow}>
              {!scanning ? (
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.controlFilled,
                    { backgroundColor: isRecording ? colors.mediumGray : colors.primary },
                  ]}
                  onPress={startScan}
                  disabled={isRecording}
                >
                  <Ionicons name="search" size={18} color={colors.white} />
                  <Text style={[styles.controlText, { color: colors.white }]} numberOfLines={2}>
                    {t("ble.startScanning")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.controlFilled,
                    { backgroundColor: colors.error || "#FF3B30" },
                  ]}
                  onPress={stopScan}
                >
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={[styles.controlText, { color: colors.white }]} numberOfLines={2}>
                    {t("ble.scanning")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { borderColor: scanning || isRecording ? colors.mediumGray : colors.primary },
                ]}
                onPress={rescan}
                disabled={scanning || isRecording}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={scanning || isRecording ? colors.mediumGray : colors.primary}
                />
                <Text
                  style={[
                    styles.controlText,
                    { color: scanning || isRecording ? colors.mediumGray : colors.primary },
                  ]}
                  numberOfLines={2}
                >
                  {t("ble.rescanSensors")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.controlFilled,
                  {
                    backgroundColor: isReady
                      ? colors.success
                      : isRecording
                      ? colors.mediumGray
                      : colors.primary,
                  },
                ]}
                onPress={connectKit}
                disabled={autoConnecting || isReady || isRecording}
              >
                {autoConnecting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons
                    name={isReady ? "checkmark-circle" : "flash-outline"}
                    size={18}
                    color={colors.white}
                  />
                )}
                <Text style={[styles.controlText, { color: colors.white }]} numberOfLines={2}>
                  {isReady
                    ? t("sensors.kitConnected", { kit: kitId })
                    : autoConnecting
                    ? t("sensors.connectingKit", {
                        kit: kitId,
                        covered: coveredCount,
                        total: REQUIRED_TAGS.length,
                      })
                    : t("sensors.connectKit", { kit: kitId })}
                </Text>
              </TouchableOpacity>
              {isDoctor && (
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { borderColor: isRecording ? colors.mediumGray : colors.primary },
                  ]}
                  onPress={() => navigation?.navigate("RegisterKit")}
                  disabled={isRecording}
                >
                  <Ionicons
                    name="pricetags-outline"
                    size={18}
                    color={isRecording ? colors.mediumGray : colors.primary}
                  />
                  <Text
                    style={[
                      styles.controlText,
                      { color: isRecording ? colors.mediumGray : colors.primary },
                    ]}
                    numberOfLines={2}
                  >
                    {t("sensors.registerKit")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!bleAvailable && sensors.length === 0 && !scanning && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.warning || "#FF9500"} />
              <Text style={[styles.warningText, { color: colors.text }]}>
                {t("sensors.bluetoothHint")}
              </Text>
            </View>
          )}

          {/* Sensor list */}
          <View style={styles.listSection}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              {t("ble.sensorsSection", { total: sensors.length })}
            </Text>
            {sortedSensors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bluetooth-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t("ble.noSensorsFound")}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  {t("sensors.emptyHint")}
                </Text>
              </View>
            ) : (
              sortedSensors.map(renderSensor)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 18, fontWeight: "700" },
  statusSubtitle: { fontSize: 14, marginTop: 2 },
  recordingNote: { marginTop: 12, fontSize: 13, fontWeight: "500" },
  controls: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },
  controlRow: { flexDirection: "row", gap: 12 },
  controlButton: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    backgroundColor: "transparent",
  },
  controlFilled: { borderColor: "transparent" },
  controlText: { fontSize: 15, fontWeight: "600", textAlign: "center", flexShrink: 1 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    gap: 8,
  },
  warningText: { flex: 1, fontSize: 14 },
  listSection: { paddingHorizontal: 16 },
  listTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  sensorCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  sensorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sensorInfo: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  sensorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sensorDetails: { flex: 1 },
  sensorName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  sensorMac: { fontSize: 12, marginBottom: 4 },
  sensorTag: { fontSize: 13, fontWeight: "600" },
  hardwareTag: { fontSize: 12, marginTop: 2 },
  sensorStatusColumn: { alignItems: "flex-end", gap: 6 },
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "500" },
  batteryInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  batteryText: { fontSize: 12 },
  sensorActions: { gap: 8 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: { fontSize: 14, fontWeight: "600" },
  tagSelector: { marginBottom: 4 },
  tagLabel: { fontSize: 12, marginBottom: 8 },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  tagButtonText: { fontSize: 13 },
  emptyContainer: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
});

export default SensorsScreen;
