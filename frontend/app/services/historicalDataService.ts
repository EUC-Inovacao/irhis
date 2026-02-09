import api from "./api";

export interface HistoricalSessionData {
  date: string;
  rom: number;
  reps: number;
  maxFlexion: number;
  maxExtension: number;
  avgVelocity: number;
  score: number;
}

export async function getHistoricalSessionData(
  patientId: string,
  _currentRom?: number,
  _currentReps?: number
): Promise<HistoricalSessionData[]> {
  try {
    const res = await api.get<any[]>(`/patients/${patientId}/metrics`, { params: { limit: 50 } });
    const metrics = Array.isArray(res.data) ? res.data : [];

    return metrics
      .slice()
      .reverse()
      .map((m) => {
        const date = String(m.TimeCreated ?? m.timestamp ?? new Date().toISOString());
        const romVal = Number(m.AvgROM ?? 0);
        const repsVal = Number(m.Repetitions ?? 0);
        const maxFlexion = Number(m.MaxFlexion ?? 0);
        const maxExtension = Number(m.MaxExtension ?? 0);
        const avgVelocity = Number(m.AvgVelocity ?? 0);

        const score = Math.max(0, Math.min(100, Math.round((romVal * 0.6) + (repsVal * 2) + (avgVelocity * 5))));

        return {
          date,
          rom: romVal,
          reps: repsVal,
          maxFlexion,
          maxExtension,
          avgVelocity,
          score,
        } satisfies HistoricalSessionData;
      });
  } catch {
    return [];
  }
}

