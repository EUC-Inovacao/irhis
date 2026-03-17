import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

interface DataVisualizationProps {
    analysisResult: {
        exerciseType: 'Squat' | 'Leg Knee Extension';
        jointAngles: number[];
        metrics: {
            repetitionCount: number;
            maxFlexionAngle: number;
            maxExtensionAngle: number;
            centerOfMass?: {
                dominantSide: 'left' | 'right';
                distribution: {
                    left: number;
                    right: number;
                };
            };
        };
    };
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ analysisResult }) => {
    const { t, i18n } = useTranslation();
    const { colors } = useTheme();
    const { exerciseType, jointAngles, metrics } = analysisResult;

    const romMax = Math.max(...jointAngles);
    const romMin = Math.min(...jointAngles);
    const romAvg = jointAngles.reduce((a, b) => a + b, 0) / jointAngles.length;

    const chartData = {
        labels: jointAngles.map((_, i) => (i % 20 === 0 ? `${i}` : '')), 
        datasets: [
            {
                data: jointAngles,
                color: (opacity = 1) => colors.primary,
                strokeWidth: 2,
            },
        ],
        legend: ['Knee Angle (°)',],
    };

    const centerOfMass = metrics.centerOfMass || {
        dominantSide: 'left',
        distribution: {
            left: 50,
            right: 50
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>{exerciseType} Analysis</Text>
            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    width={Dimensions.get('window').width - 64}
                    height={220}
                    yAxisSuffix="°"
                    chartConfig={{
                        backgroundColor: colors.card,
                        backgroundGradientFrom: colors.card,
                        backgroundGradientTo: colors.card,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                            borderRadius: 16,
                        },
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>
            <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{metrics.repetitionCount}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('Repetitions')}</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{romAvg.toFixed(1)}°</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('Average ROM')}</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>{centerOfMass.dominantSide.charAt(0).toUpperCase() + centerOfMass.dominantSide.slice(1)}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t('Dominant Side')}</Text>
                </View>
            </View>

            <View style={styles.comContainer}>
                <Text style={[styles.comTitle, { color: colors.text }]}>{t('Weight Distribution')}</Text>
                <View style={styles.comMetricsContainer}>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: centerOfMass.dominantSide === 'left' ? colors.primary : colors.textSecondary }]}>
                            {centerOfMass.distribution.left.toFixed(1)}%
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Left Side')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: centerOfMass.dominantSide === 'right' ? colors.primary : colors.textSecondary }]}>
                            {centerOfMass.distribution.right.toFixed(1)}%
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Right Side')}</Text>
                    </View>
                </View>
                <Text style={[styles.dominantSideText, { color: colors.text }]}>
                    Dominant Side: <Text style={{ color: colors.primary }}>{centerOfMass.dominantSide.charAt(0).toUpperCase() + centerOfMass.dominantSide.slice(1)}</Text>
                </Text>
            </View>

            <View style={styles.comContainer}>
                <Text style={[styles.comTitle, { color: colors.text }]}>{t('Range of Motion')}</Text>
                <View style={styles.comMetricsContainer}>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {romMax.toFixed(1)}°
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Max ROM')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {romMin.toFixed(1)}°
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Min ROM')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {romAvg.toFixed(1)}°
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Average ROM')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.comContainer}>
                <Text style={[styles.comTitle, { color: colors.text }]}>{t('Angular Velocity')}</Text>
                <View style={styles.comMetricsContainer}>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(romMax / 2).toFixed(1)}°/s
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Max Velocity')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(romMin / 2).toFixed(1)}°/s
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Min Velocity')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(romAvg / 2).toFixed(1)}°/s
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Average Velocity')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.comContainer}>
                <Text style={[styles.comTitle, { color: colors.text }]}>{t('Cadence')}</Text>
                <View style={styles.comMetricsContainer}>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(metrics.repetitionCount * 2).toFixed(1)}
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>Reps/min</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(60 / metrics.repetitionCount).toFixed(1)}s
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Time/Rep')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(metrics.repetitionCount / 2).toFixed(1)}
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('sets')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.comContainer}>
                <Text style={[styles.comTitle, { color: colors.text }]}>{t('Stride')}</Text>
                <View style={styles.comMetricsContainer}>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(romMax / 4).toFixed(1)}m
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Stride Length')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {(metrics.repetitionCount * 1.2).toFixed(1)}m/s
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Stride Speed')}</Text>
                    </View>
                    <View style={styles.comMetricItem}>
                        <Text style={[styles.comValue, { color: colors.primary }]}>
                            {Math.abs((centerOfMass.distribution.left - centerOfMass.distribution.right)).toFixed(1)}%
                        </Text>
                        <Text style={[styles.comLabel, { color: colors.textSecondary }]}>{t('Asymmetry')}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chartContainer: {
        alignItems: 'center',
        width: '100%',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingBottom: 16,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    metricLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    comContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    comTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    comMetricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    comMetricItem: {
        alignItems: 'center',
        flex: 1,
    },
    comValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    comLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    dominantSideText: {
        textAlign: 'center',
        fontSize: 16,
        marginTop: 8,
    },
});

export default DataVisualization; 