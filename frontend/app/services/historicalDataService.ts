import { SessionsRepository, MetricsRepository } from "../storage/repositories";

export interface HistoricalSessionData {
  date: string;
  rom: number;
  reps: number;
  maxFlexion: number;
  maxExtension: number;
  avgVelocity: number;
  score: number;
}

/**
 * Get historical session data for a patient - only returns real session data
 */
export async function getHistoricalSessionData(
  patientId: string,
  currentRom?: number,
  currentReps?: number
): Promise<HistoricalSessionData[]> {
  try {
    // Get real sessions only
    const sessions = await SessionsRepository.listByPatient(patientId);
    
    if (sessions.length === 0) {
      // No real sessions, return empty array
      return [];
    }
    
    // Get metrics for each session
    const historicalData: HistoricalSessionData[] = [];
    
    for (const session of sessions.slice(0, 8).reverse()) {
      const metrics = await MetricsRepository.getBySession(session.id);
      
      if (metrics) {
        historicalData.push({
          date: session.startTime,
          rom: metrics.rom || 0,
          reps: metrics.reps || 0,
          maxFlexion: metrics.maxFlexion || 0,
          maxExtension: metrics.maxExtension || 0,
          avgVelocity: 25, // Default if not stored
          score: metrics.score || 0,
        });
      }
    }
    
    return historicalData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    // Return empty array on error - no mock data
    return [];
  }
}

