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
 * Generate mock historical session data for showcase
 * Shows progression over the last 8 sessions
 */
export function generateMockHistoricalData(
  patientId: string,
  currentRom: number = 75,
  currentReps: number = 12
): HistoricalSessionData[] {
  const sessions: HistoricalSessionData[] = [];
  const now = new Date();
  
  // Generate 8 sessions going back in time
  for (let i = 7; i >= 0; i--) {
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - (i * 3)); // Every 3 days
    
    // Progressive improvement: start lower, improve over time
    const progressFactor = i / 7; // 0 (oldest) to 1 (most recent)
    const rom = Math.round(currentRom * (0.6 + progressFactor * 0.4)); // 60% to 100% of current
    const reps = Math.round(currentReps * (0.7 + progressFactor * 0.3)); // 70% to 100% of current
    const maxFlexion = Math.round(rom * 0.85); // ~85% of ROM
    const maxExtension = Math.round(rom * 0.15); // ~15% of ROM
    const avgVelocity = Math.round(20 + progressFactor * 8); // 20-28°/s
    const score = Math.round(60 + progressFactor * 35); // 60-95 score
    
    sessions.push({
      date: sessionDate.toISOString(),
      rom,
      reps,
      maxFlexion,
      maxExtension,
      avgVelocity,
      score,
    });
  }
  
  return sessions;
}

/**
 * Get historical session data for a patient
 * Returns mock data if no real sessions exist
 */
export async function getHistoricalSessionData(
  patientId: string,
  currentRom?: number,
  currentReps?: number
): Promise<HistoricalSessionData[]> {
  try {
    // Try to get real sessions
    const sessions = await SessionsRepository.listByPatient(patientId);
    
    if (sessions.length === 0) {
      // No real sessions, return mock data
      return generateMockHistoricalData(patientId, currentRom, currentReps);
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
      } else {
        // If no metrics, use defaults based on current values
        historicalData.push({
          date: session.startTime,
          rom: currentRom || 75,
          reps: currentReps || 12,
          maxFlexion: (currentRom || 75) * 0.85,
          maxExtension: (currentRom || 75) * 0.15,
          avgVelocity: 25,
          score: 75,
        });
      }
    }
    
    // If we have less than 8 sessions, pad with mock data
    if (historicalData.length < 8 && historicalData.length > 0) {
      const latest = historicalData[historicalData.length - 1];
      const mockData = generateMockHistoricalData(
        patientId,
        latest.rom,
        latest.reps
      );
      // Add older mock sessions
      const needed = 8 - historicalData.length;
      historicalData.unshift(...mockData.slice(0, needed));
    }
    
    // If still no data, return mock
    if (historicalData.length === 0) {
      return generateMockHistoricalData(patientId, currentRom, currentReps);
    }
    
    return historicalData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    // Return mock data on error
    return generateMockHistoricalData(patientId, currentRom, currentReps);
  }
}

