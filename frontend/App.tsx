import React, { useEffect } from "react";
import AppNavigator from "./app/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./app/theme/ThemeContext";
import { AuthProvider } from "./app/context/AuthContext";
import { PatientProvider } from "./app/context/PatientContext";
import { HealthProvider } from "./app/context/HealthContext";
import { HealthGoalsProvider } from "./app/context/HealthGoalsContext";
import healthService from "./app/services/healthService";
import { runMigrations } from "./app/storage/db";
import { seedPresetUsers } from "./app/storage/seed";
import { seedExerciseTypes } from "./app/storage/exerciseSeed";

export default function App() {
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Starting app initialization...");
        await runMigrations();
        console.log("Migrations completed");
        await seedPresetUsers();
        console.log("Users seeded");
        await seedExerciseTypes();
        console.log("Exercise types seeded");
        console.log("App initialization completed successfully");
      } catch (e) {
        console.error("DB initialization failed", e);
        // Don't throw - allow app to continue even if initialization fails
      }
    };
    initialize();
    
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
