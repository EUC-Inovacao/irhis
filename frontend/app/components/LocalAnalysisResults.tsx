import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@theme/ThemeContext";
import { AnalysisResult } from "@types";

interface LocalAnalysisResultsProps {
  result: AnalysisResult;
}

const LocalAnalysisResults: React.FC<LocalAnalysisResultsProps> = ({
  result,
}) => {
  const { colors } = useTheme();

  const renderMetricCard = (title: string, metrics: any, side: string) => (
    <View
      key={`${title}-${side}`}
      style={[styles.metricCard, { backgroundColor: colors.card }]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {side} {title}
      </Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            ROM (°)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.rom.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Max Flexion (°)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.maxFlexion.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Max Extension (°)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.maxExtension.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Avg Velocity (°/s)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.avgVelocity.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Peak Velocity (°/s)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.peakVelocity.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            P95 Velocity (°/s)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.p95Velocity.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAsymmetryCard = () => (
    <View style={[styles.asymmetryCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        Asymmetry Analysis
      </Text>
      <View style={styles.asymmetryGrid}>
        <View style={styles.asymmetrySection}>
          <Text style={[styles.asymmetrySectionTitle, { color: colors.text }]}>
            Knee
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              ROM Difference (°)
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {result.asymmetry.romDifference_knee.toFixed(1)}
            </Text>
          </View>
          {/* ROM-only asymmetry per spec */}
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Dominant Side
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    result.asymmetry.dominantSide_knee === "balanced"
                      ? colors.primary
                      : colors.text,
                },
              ]}
            >
              {result.asymmetry.dominantSide_knee}
            </Text>
          </View>
        </View>

        <View style={styles.asymmetrySection}>
          <Text style={[styles.asymmetrySectionTitle, { color: colors.text }]}>
            Hip
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              ROM Difference (°)
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {result.asymmetry.romDifference_hip.toFixed(1)}
            </Text>
          </View>
          {/* ROM-only asymmetry per spec */}
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Dominant Side
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    result.asymmetry.dominantSide_hip === "balanced"
                      ? colors.primary
                      : colors.text,
                },
              ]}
            >
              {result.asymmetry.dominantSide_hip}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCoMCard = () => (
    <View style={[styles.comCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        Center of Mass (CoM)
      </Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Vertical Amplitude (cm)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.com.verticalAmp_cm.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            ML Amplitude (cm)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.com.mlAmp_cm.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            AP Amplitude (cm)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.com.apAmp_cm.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            RMS Displacement (cm)
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.com.rms_cm.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderMissingSensors = () => {
    if (result.missingSensors && result.missingSensors.length === 0)
      return null;

    return (
      <View
        style={[styles.missingSensorsCard, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Missing Sensors
        </Text>
        <View style={styles.missingSensorsList}>
          {result.missingSensors?.map(
            (
              sensor:
                | string
                | number
                | bigint
                | boolean
                | React.ReactElement<
                    unknown,
                    string | React.JSXElementConstructor<any>
                  >
                | Iterable<React.ReactNode>
                | React.ReactPortal
                | Promise<
                    | string
                    | number
                    | bigint
                    | boolean
                    | React.ReactPortal
                    | React.ReactElement<
                        unknown,
                        string | React.JSXElementConstructor<any>
                      >
                    | Iterable<React.ReactNode>
                    | null
                    | undefined
                  >
                | null
                | undefined,
              index: React.Key | null | undefined
            ) => (
              <Text
                key={index}
                style={[styles.missingSensor, { color: colors.textSecondary }]}
              >
                • {sensor}
              </Text>
            )
          )}
        </View>
        <Text
          style={[styles.missingSensorsNote, { color: colors.textSecondary }]}
        >
          Analysis performed with available sensors. Some metrics may be
          unavailable.
        </Text>
      </View>
    );
  };

  // No UI warnings per spec

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Local Analysis Results
      </Text>

      {/* Missing Sensors */}
      {renderMissingSensors()}

      {/* Knee Analysis */}
      <View style={styles.jointSection}>
        <Text style={[styles.jointSectionTitle, { color: colors.text }]}>
          Knee Analysis
        </Text>
        <View style={styles.jointGrid}>
          {renderMetricCard("Knee", result.knee.left, "Left")}
          {renderMetricCard("Knee", result.knee.right, "Right")}
        </View>
      </View>

      {/* Hip Analysis */}
      <View style={styles.jointSection}>
        <Text style={[styles.jointSectionTitle, { color: colors.text }]}>
          Hip Analysis
        </Text>
        <View style={styles.jointGrid}>
          {renderMetricCard("Hip", result.hip.left, "Left")}
          {renderMetricCard("Hip", result.hip.right, "Right")}
        </View>
      </View>

      {/* Movement Analysis */}
      <View style={styles.jointSection}>
        <Text style={[styles.jointSectionTitle, { color: colors.text }]}>
          Movement Analysis
        </Text>
        <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Overall Movement
          </Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricRow}>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Repetitions
              </Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {result.knee.left.repetitions || 0}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Asymmetry Analysis */}
      {renderAsymmetryCard()}

      {/* Center of Mass Analysis */}
      {renderCoMCard()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  jointSection: {
    marginBottom: 24,
  },
  jointSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  jointGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  metricsGrid: {
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  asymmetryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  asymmetryGrid: {
    flexDirection: "row",
    gap: 16,
  },
  asymmetrySection: {
    flex: 1,
  },
  asymmetrySectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  comCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  perCycleSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  perCycleTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  cycleCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cycleLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  missingSensorsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  missingSensorsList: {
    marginBottom: 12,
  },
  missingSensor: {
    fontSize: 14,
    marginBottom: 4,
  },
  missingSensorsNote: {
    fontSize: 12,
    fontStyle: "italic",
  },
  warningsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  warningsList: {
    gap: 8,
  },
  warning: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LocalAnalysisResults;
