import './app/i18n';
import React, { useEffect } from "react";
import AppNavigator from "./app/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./app/theme/ThemeContext";
import { AuthProvider } from "./app/context/AuthContext";
import { PatientProvider } from "./app/context/PatientContext";
import { HealthProvider } from "./app/context/HealthContext";
import { HealthGoalsProvider } from "./app/context/HealthGoalsContext";
import healthService from "./app/services/healthService";

export default function App() {
  useEffect(() => {
    return () => {
      try {
        healthService.cleanup();
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PatientProvider>
            <HealthGoalsProvider>
              <HealthProvider>
                <AppNavigator />
              </HealthProvider>
            </HealthGoalsProvider>
          </PatientProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
