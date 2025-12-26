import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await AsyncStorage.getItem('@health_goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Error loading health goals:', error);
    }
  };

  const updateGoals = async (newGoals: Partial<HealthGoals>) => {
    try {
      const updatedGoals = { ...goals, ...newGoals };
      await AsyncStorage.setItem('@health_goals', JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error saving health goals:', error);
    }
  };

  const resetToDefaults = async () => {
    try {
      await AsyncStorage.setItem('@health_goals', JSON.stringify(defaultGoals));
      setGoals(defaultGoals);
    } catch (error) {
      console.error('Error resetting health goals:', error);
    }
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