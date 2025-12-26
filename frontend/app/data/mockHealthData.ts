import { ChartData } from 'react-native-chart-kit/dist/HelperTypes';

export const activityData = {
  move: {
    goal: 400,
    current: 320,
  },
  exercise: {
    goal: 30,
    current: 45,
  },
  stand: {
    goal: 12,
    current: 8,
  },
};

export const stepsData = {
  value: 8241,
  chartData: {
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    datasets: [
      {
        data: [6500, 7200, 8100, 7800, 9200, 8800, 8241],
      },
    ],
  } as ChartData,
};

export const heartRateData = {
    value: 75,
    chartData: {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [
            {
                data: [78, 80, 72, 75, 71, 74, 75],
            },
        ],
    } as ChartData,
}; 