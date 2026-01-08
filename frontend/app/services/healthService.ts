import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { HealthData, DailyHealthData, HealthDevice } from '../types';

class HealthService {
  private static instance: HealthService;
  private isInitialized = false;
  private connectedDevices: HealthDevice[] = [];
  private pedometerSubscription: { remove: () => void } | null = null;
  private lastStepCount = 0;
  private lastStepTimestamp = new Date();
  private activityRecognitionSubscription: any = null;

  private constructor() {
    if (Platform.OS === 'ios') {
      this.connectedDevices = [{
        id: 'apple-watch',
        name: 'Apple Watch',
        type: 'APPLE_WATCH',
        connected: false,
        lastSync: new Date().toISOString(),
      }];
    } else if (Platform.OS === 'android') {
      this.connectedDevices = [{
        id: 'google-fit',
        name: 'Google Fit',
        type: 'ANDROID_FITNESS',
        connected: false,
        lastSync: new Date().toISOString(),
      }];
    }
  }

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      if (Platform.OS === 'ios') {
        const hasStepTracking = await Pedometer.isAvailableAsync();
        if (!hasStepTracking) {
          console.log('Step tracking is not available on this device');
          return false;
        }
        this.startStepTracking();
      } else if (Platform.OS === 'android') {
        // On Android, we'll use a combination of:
        // 1. Step Counter Sensor for steps
        // 2. Activity Recognition for activity type
        // 3. Location for distance (if permitted)
        await this.initializeAndroidSensors();
      }

      this.isInitialized = true;
      this.connectedDevices[0].connected = true;
      this.connectedDevices[0].lastSync = new Date().toISOString();
      return true;
    } catch (error) {
      console.error('Error initializing health tracking:', error);
      return false;
    }
  }

  private async initializeAndroidSensors() {
    try {
      // Start step tracking using Pedometer (works on both platforms)
      const hasStepTracking = await Pedometer.isAvailableAsync();
      if (hasStepTracking) {
        this.startStepTracking();
      }

      // Note: For a production app, you would:
      // 1. Add native Android module for Activity Recognition
      // 2. Request necessary permissions
      // 3. Initialize Google Fit API
      // 4. Set up background tracking service
      
      // For now, we'll use the same step tracking as iOS
      // and simulate other metrics based on steps
    } catch (error) {
      console.error('Error initializing Android sensors:', error);
      throw error;
    }
  }

  private startStepTracking() {
    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
    }

    this.pedometerSubscription = Pedometer.watchStepCount(result => {
      const now = new Date();
      const timeDiff = (now.getTime() - this.lastStepTimestamp.getTime()) / 1000;
      const stepDiff = result.steps - this.lastStepCount;
      
      const caloriesPerStep = 0.04;
      const caloriesBurned = stepDiff * caloriesPerStep;

      const stepLength = 0.762;
      const distanceCovered = stepDiff * stepLength;

      this.lastStepCount = result.steps;
      this.lastStepTimestamp = now;

      this._latestData = {
        steps: result.steps,
        calories: Math.round(caloriesBurned),
        distance: Math.round(distanceCovered),
        activeMinutes: Math.round(timeDiff / 60),
        timestamp: now.toISOString(),
      };
    });
  }

  private _latestData: Partial<HealthData> = {};

  public async getConnectedDevices(): Promise<HealthDevice[]> {
    return this.connectedDevices;
  }

  public async getTodayHealthData(): Promise<HealthData | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      let steps = 0;
      
      // On Android, getStepCountAsync with date ranges may not be supported
      // Use watchStepCount subscription data as fallback
      if (Platform.OS === 'android') {
        // For Android, prefer using the latest step count from watchStepCount
        steps = this._latestData.steps || this.lastStepCount || 0;
        
        // Try to get step count for today if available, but don't fail if it's not supported
        try {
          const result = await Pedometer.getStepCountAsync(startDate, endDate);
          if (result?.steps !== undefined && result.steps > 0) {
            steps = result.steps;
          }
        } catch (error: any) {
          // getStepCountAsync not supported on this Android device/version
          // Use fallback from watchStepCount subscription
          // Suppress expected Android limitation warnings - this is normal behavior
          const isExpectedAndroidLimitation = error?.message?.includes('not supported on Android') || 
                                             error?.message?.includes('date range');
          if (!isExpectedAndroidLimitation && __DEV__) {
            // Only log unexpected errors in development
            console.warn('Pedometer.getStepCountAsync error on Android:', error);
          }
        }
      } else {
        // iOS - use getStepCountAsync as before
        try {
          const result = await Pedometer.getStepCountAsync(startDate, endDate);
          steps = result?.steps || this._latestData.steps || 0;
        } catch (error) {
          console.warn('Error getting step count, using fallback:', error);
          steps = this._latestData.steps || this.lastStepCount || 0;
        }
      }

      const caloriesPerStep = 0.04;
      const stepLength = 0.762;
      const calories = Math.round(steps * caloriesPerStep);
      const distance = Math.round(steps * stepLength);

      const activeMinutes = Math.round(calories / 7);

      // Mock heart rate data since we can't access it directly
      const heartRate = Platform.select({
        ios: {
          current: Math.floor(Math.random() * 20) + 70,
          min: 65,
          max: 120,
          resting: 65,
        },
        android: {
          // On Android, we estimate heart rate based on activity level
          current: Math.floor(activeMinutes > 10 ? Math.random() * 30 + 90 : Math.random() * 20 + 70),
          min: 65,
          max: activeMinutes > 10 ? 140 : 100,
          resting: 65,
        },
        default: {
          current: 70,
          min: 65,
          max: 120,
          resting: 65,
        }
      });

      return {
        steps,
        calories,
        distance,
        activeMinutes,
        heartRate,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching health data:', error);
      return null;
    }
  }

  public async getDailyHealthData(date: string): Promise<DailyHealthData | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      let steps = 0;
      
      // On Android, getStepCountAsync with date ranges may not be supported
      // Use watchStepCount subscription data as fallback
      if (Platform.OS === 'android') {
        // For Android, check if the requested date is today
        const today = new Date();
        const isToday = date === today.toISOString().split('T')[0];
        
        if (isToday) {
          // If requesting today's data, use the latest step count from watchStepCount
          steps = this._latestData.steps || this.lastStepCount || 0;
        } else {
          // For past dates on Android, we can't reliably get historical data
          // Return 0 or use a fallback - this is a limitation of the Android Pedometer API
          // Suppress warning - this is expected behavior on Android
          steps = 0;
        }
        
        // Try to get step count if available, but don't fail if it's not supported
        try {
          const result = await Pedometer.getStepCountAsync(startDate, endDate);
          if (result?.steps !== undefined && result.steps > 0) {
            steps = result.steps;
          }
        } catch (error: any) {
          // getStepCountAsync not supported on this Android device/version
          // Use fallback from watchStepCount subscription or 0 for historical dates
          // Suppress expected Android limitation warnings - this is normal behavior
          const isExpectedAndroidLimitation = error?.message?.includes('not supported on Android') || 
                                             error?.message?.includes('date range');
          if (!isExpectedAndroidLimitation && __DEV__) {
            // Only log unexpected errors in development
            console.warn('Pedometer.getStepCountAsync error on Android:', error);
          }
        }
      } else {
        // iOS - use getStepCountAsync as before
        try {
          const result = await Pedometer.getStepCountAsync(startDate, endDate);
          steps = result?.steps || 0;
        } catch (error) {
          console.warn('Error getting daily step count, using fallback:', error);
          // For iOS, if it's today, use latest data; otherwise return 0
          const today = new Date();
          const isToday = date === today.toISOString().split('T')[0];
          steps = isToday ? (this._latestData.steps || this.lastStepCount || 0) : 0;
        }
      }

      const caloriesPerStep = 0.04;
      const stepLength = 0.762;
      const calories = Math.round(steps * caloriesPerStep);
      const distance = Math.round(steps * stepLength);
      const activeMinutes = Math.round(calories / 7);

      const heartRate = Platform.select({
        ios: {
          average: 75,
          min: 65,
          max: 120,
          resting: 65,
        },
        android: {
          // On Android, we estimate heart rate based on activity level
          average: activeMinutes > 10 ? 85 : 75,
          min: 65,
          max: activeMinutes > 10 ? 140 : 100,
          resting: 65,
        },
        default: {
          average: 75,
          min: 65,
          max: 120,
          resting: 65,
        }
      });

      return {
        date,
        steps,
        calories,
        distance,
        activeMinutes,
        heartRate,
        goals: Platform.select({
          ios: {
            steps: 10000,
            calories: 400,
            activeMinutes: 30,
          },
          android: {
            // Google Fit default goals
            steps: 10000,
            calories: 500,
            activeMinutes: 45,
          },
          default: {
            steps: 10000,
            calories: 400,
            activeMinutes: 30,
          }
        }),
      };
    } catch (error) {
      console.error('Error fetching daily health data:', error);
      return null;
    }
  }

  public cleanup() {
    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
      this.pedometerSubscription = null;
    }
    if (this.activityRecognitionSubscription) {
      this.activityRecognitionSubscription.remove();
      this.activityRecognitionSubscription = null;
    }
  }
}

export default HealthService.getInstance(); 