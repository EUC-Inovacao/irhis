import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { lightColors } from '../theme/colors';

interface RingProps {
  center: number;
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string[];
  gradientId: string;
}

const Ring: React.FC<RingProps> = ({ center, radius, strokeWidth, progress, color, gradientId }) => {
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color[0]} />
          <Stop offset="100%" stopColor={color[1]} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={center}
        cy={center}
        r={innerRadius}
        strokeWidth={strokeWidth}
        stroke={`url(#${gradientId})`}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        rotation="-90"
        originX={center}
        originY={center}
        strokeLinecap="round"
      />
    </>
  );
};

interface ActivityRingsProps {
  data: {
    move: { goal: number; current: number };
    exercise: { goal: number; current: number };
    stand: { goal: number; current: number };
  };
  size?: number;
}

const ActivityRings: React.FC<ActivityRingsProps> = ({ data, size = 200 }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const strokeWidth = 20;
  const spaceBetweenRings = 2;

  const moveProgress = Math.min(data.move.current / data.move.goal, 1);
  const exerciseProgress = Math.min(data.exercise.current / data.exercise.goal, 1);
  const standProgress = Math.min(data.stand.current / data.stand.goal, 1);
  
  const center = size / 2;
  const radius1 = size / 2;
  const radius2 = radius1 - strokeWidth - spaceBetweenRings;
  const radius3 = radius2 - strokeWidth - spaceBetweenRings;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background Rings */}
          <Circle cx={center} cy={center} r={radius1 - strokeWidth / 2} stroke={colors.mediumGray} strokeWidth={strokeWidth} fill="transparent" opacity={0.3} />
          <Circle cx={center} cy={center} r={radius2 - strokeWidth / 2} stroke={colors.mediumGray} strokeWidth={strokeWidth} fill="transparent" opacity={0.3} />
          <Circle cx={center} cy={center} r={radius3 - strokeWidth / 2} stroke={colors.mediumGray} strokeWidth={strokeWidth} fill="transparent" opacity={0.3} />

          {/* Progress Rings */}
          <Ring center={center} radius={radius1} strokeWidth={strokeWidth} progress={moveProgress} color={['#FF3B30', '#FF9500']} gradientId="move" />
          <Ring center={center} radius={radius2} strokeWidth={strokeWidth} progress={exerciseProgress} color={['#34C759', '#30D158']} gradientId="exercise" />
          <Ring center={center} radius={radius3} strokeWidth={strokeWidth} progress={standProgress} color={['#00C7BE', '#30D158']} gradientId="stand" />
        </Svg>
      </View>
      <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF3B30'}]}>{data.move.current}</Text>
              <Text style={styles.summaryLabel}>Move</Text>
          </View>
           <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#34C759'}]}>{data.exercise.current}</Text>
              <Text style={styles.summaryLabel}>Exercise</Text>
          </View>
           <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#00C7BE'}]}>{data.stand.current}</Text>
              <Text style={styles.summaryLabel}>Stand</Text>
          </View>
      </View>
    </View>
  );
};

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  summaryItem: {
      alignItems: 'center',
  },
  summaryValue: {
      fontSize: 22,
      fontWeight: 'bold',
  },
  summaryLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
  }
});

export default ActivityRings; 