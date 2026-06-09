import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@theme/ThemeContext";

/** Shared metrics display - same layout as LocalAnalysisResults / live session. */
export interface MetricsDisplayCardProps {
  title: string;
  sideLabel: string;
  metrics: {
    rom?: number;
    maxFlexion?: number;
    maxExtension?: number;
    repetitions?: number;
    avgVelocity?: number;
    peakVelocity?: number;
    p95Velocity?: number;
    centerMassDisplacement?: number;
  };
}

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return !isNaN(n) ? n : null;
  }
  return null;
};

const MetricsDisplayCard: React.FC<MetricsDisplayCardProps> = ({ title, sideLabel, metrics }) => {
  const { colors } = useTheme();
  const rom = toNum(metrics.rom);
  const maxFlexion = toNum(metrics.maxFlexion);
  const maxExtension = toNum(metrics.maxExtension);
  const reps = toNum(metrics.repetitions);
  const avgVel = toNum(metrics.avgVelocity);
  const peakVel = toNum(metrics.peakVelocity);
  const p95Vel = toNum(metrics.p95Velocity);
  const com = toNum(metrics.centerMassDisplacement);

  const hasAny = rom !== null || maxFlexion !== null || maxExtension !== null || reps !== null || avgVel !== null || peakVel !== null || p95Vel !== null || com !== null;
  if (!hasAny) return null;

  const borderColor = (colors as any).border ?? colors.textSecondary + "40";
  const Row = ({ label, value }: { label: string; value: number | null }) =>
    value !== null ? (
      <View style={[styles.metricRow, { borderBottomColor: borderColor }]}>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      </View>
    ) : null;

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {sideLabel} {title}
      </Text>
      <View style={styles.metricsGrid}>
        <Row label="ROM (°)" value={rom} />
        <Row label="Max Flexion (°)" value={maxFlexion} />
        <Row label="Max Extension (°)" value={maxExtension} />
        {reps !== null && (
          <View style={[styles.metricRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Repetitions</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{reps}</Text>
          </View>
        )}
        <Row label="Avg Velocity (°/s)" value={avgVel} />
        <Row label="Peak Velocity (°/s)" value={peakVel} />
        <Row label="P95 Velocity (°/s)" value={p95Vel} />
        {com !== null && (
          <View style={[styles.metricRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Center of Mass (cm)</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{com.toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minWidth: 0,
    alignSelf: "stretch",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  metricsGrid: {
    gap: 0,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
    minWidth: 56,
    flexShrink: 0,
  },
});

export default MetricsDisplayCard;
