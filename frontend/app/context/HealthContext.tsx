import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { HealthData, DailyHealthData, HealthDevice } from '../types';
import HealthService from '../services/healthService';

interface HealthContextData {
  healthData: HealthData | null;
  dailyData: DailyHealthData | null;
  devices: HealthDevice[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectDevice: () => Promise<void>;
  refreshHealthData: () => Promise<void>;
}

const HealthContext = createContext<HealthContextData>({} as HealthContextData);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [dailyData, setDailyData] = useState<DailyHealthData | null>(null);
  const [devices, setDevices] = useState<HealthDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeHealth = async () => {
    try {
      const initialized = await HealthService.initialize();
      if (initialized) {
        const connectedDevices = await HealthService.getConnectedDevices();
        setDevices(connectedDevices);
        setIsConnected(connectedDevices.length > 0);
        if (connectedDevices.length > 0) {
          await refreshHealthData();
        }
      }
    } catch (err) {
      setError('Failed to initialize health services');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const connectDevice = async () => {
    try {
      setIsLoading(true);
      const initialized = await HealthService.initialize();
      if (initialized) {
        const connectedDevices = await HealthService.getConnectedDevices();
        setDevices(connectedDevices);
        setIsConnected(connectedDevices.length > 0);
        if (connectedDevices.length > 0) {
          await refreshHealthData();
          Alert.alert('Success', 'Device connected successfully');
        } else {
          Alert.alert('Error', 'No compatible devices found');
        }
      } else {
        Alert.alert('Error', 'Failed to initialize health services');
      }
    } catch (err) {
      setError('Failed to connect device');
      Alert.alert('Error', 'Failed to connect device');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshHealthData = async () => {
    try {
      setIsLoading(true);
      const [today, daily] = await Promise.all([
        HealthService.getTodayHealthData(),
        HealthService.getDailyHealthData(new Date().toISOString().split('T')[0]),
      ]);
      
      if (today) {
        setHealthData(today);
      }
      if (daily) {
        setDailyData(daily);
      }
    } catch (err) {
      setError('Failed to fetch health data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeHealth();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const interval = setInterval(refreshHealthData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <HealthContext.Provider
      value={{
        healthData,
        dailyData,
        devices,
        isConnected,
        isLoading,
        error,
        connectDevice,
        refreshHealthData,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}; 