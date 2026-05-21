import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';

interface HealthGoals {
  steps: number;
  calories: number;
  activeMinutes: number;
}

interface HealthGoalsContextData {
  goals: HealthGoals;
  updateGoals: (newGoals: Partial<HealthGoals>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const defaultGoals: HealthGoals = Platform.select({
  ios: {
    steps: 10000,
    calories: 400,
    activeMinutes: 30,
  },
  android: {
    steps: 10000,
    calories: 500,
    activeMinutes: 45,
  },
  default: {
    steps: 10000,
    calories: 400,
    activeMinutes: 30,
  },
});

const HealthGoalsContext = createContext<HealthGoalsContextData>({} as HealthGoalsContextData);

export const HealthGoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<HealthGoals>(defaultGoals);

  const updateGoals = async (newGoals: Partial<HealthGoals>) => {
    setGoals((currentGoals) => ({ ...currentGoals, ...newGoals }));
  };

  const resetToDefaults = async () => {
    setGoals(defaultGoals);
  };

  return (
    <HealthGoalsContext.Provider value={{ goals, updateGoals, resetToDefaults }}>
      {children}
    </HealthGoalsContext.Provider>
  );
};

export const useHealthGoals = () => {
  const context = useContext(HealthGoalsContext);
  if (!context) {
    throw new Error('useHealthGoals must be used within a HealthGoalsProvider');
  }
  return context;
}; 
