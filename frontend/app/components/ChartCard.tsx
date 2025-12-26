import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartData } from 'react-native-chart-kit/dist/HelperTypes';
import { useTheme } from '../theme/ThemeContext';
import { lightColors } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

interface ChartCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  chartData: ChartData;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, value, icon, chartData }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
      <LineChart
        data={chartData}
        width={screenWidth - 64}
        height={120}
        withVerticalLabels={true}
        withHorizontalLabels={false}
        withInnerLines={false}
        withOuterLines={false}
        withShadow={false}
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
            r: '0',
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  chart: {
    marginLeft: -10,
    borderRadius: 12,
  },
});

export default ChartCard; 