import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { JointPositions, SegmentOrientations, GaitParameters } from '../types';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface MovementDataDisplayProps {
  jointPositions?: JointPositions[];
  segmentOrientations?: SegmentOrientations[];
  gaitParameters?: GaitParameters[];
}

const MovementDataDisplay: React.FC<MovementDataDisplayProps> = ({
  jointPositions,
  segmentOrientations,
  gaitParameters,
}) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const formatNumber = (num: number) => num.toFixed(3);

  const renderJointPositions = () => {
    if (!jointPositions?.length) {
      return null;
    }
    const latestPosition = jointPositions[jointPositions.length - 1];

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>3D Joint Positions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { color: colors.text }]}>Joint</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>X</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Y</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Z</Text>
          </View>
          {Object.entries(latestPosition).map(([joint, position]) => {
            if (joint === 'timestamp') {
              return null;
            }
            return (
              <View key={joint} style={styles.tableRow}>
                <Text style={[styles.cell, { color: colors.text }]}>{joint}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(position.x)}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(position.y)}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(position.z)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSegmentOrientations = () => {
    if (!segmentOrientations?.length) {
      return null;
    }
    const latestOrientation = segmentOrientations[segmentOrientations.length - 1];

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Segment Orientations (Quaternions)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { color: colors.text }]}>Segment</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Qx</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Qy</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Qz</Text>
            <Text style={[styles.headerCell, { color: colors.text }]}>Qw</Text>
          </View>
          {Object.entries(latestOrientation).map(([segment, orientation]) => {
            if (segment === 'timestamp') {
              return null;
            }
            return (
              <View key={segment} style={styles.tableRow}>
                <Text style={[styles.cell, { color: colors.text }]}>{segment}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(orientation.qx)}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(orientation.qy)}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(orientation.qz)}</Text>
                <Text style={[styles.cell, { color: colors.textSecondary }]}>{formatNumber(orientation.qw)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderGaitParameters = () => {
    if (!gaitParameters?.length) {
      return null;
    }

    const chartData = {
      labels: gaitParameters.slice(-6).map((_, i) => `T${i + 1}`),
      datasets: [
        {
          data: gaitParameters.slice(-6).map(p => p.cadence),
          color: () => colors.primary,
        },
      ],
    };

    const latestParams = gaitParameters[gaitParameters.length - 1];

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gait Parameters</Text>
        <View style={styles.parameterRow}>
          <Text style={[styles.parameterLabel, { color: colors.text }]}>Step Length:</Text>
          <Text style={[styles.parameterValue, { color: colors.textSecondary }]}>
            {formatNumber(latestParams.stepLength)} m
          </Text>
        </View>
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Cadence Over Time</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.textSecondary,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderJointPositions()}
      {renderSegmentOrientations()}
      {renderGaitParameters()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerCell: {
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  parameterValue: {
    fontSize: 16,
  },
  chartContainer: {
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default MovementDataDisplay; 