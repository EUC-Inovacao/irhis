import {
  SessionsRepository,
  MetricsRepository,
  SessionRecord,
  MetricsRecord,
} from "../storage/repositories";
import { ExerciseTypesRepository } from "../storage/repositories";

export interface SessionData {
  patientId: string;
  exerciseTypeId?: string;
  exerciseType?: string; // Fallback name if exerciseTypeId not provided
  startTime: string;
  endTime?: string;
  side?: "left" | "right";
  notes?: string;
  metrics?: {
    rom?: number;
    maxFlexion?: number;
    maxExtension?: number;
    reps?: number;
    score?: number;
  };
}

export interface SessionWithMetrics extends SessionRecord {
  metrics?: MetricsRecord;
}

/**
 * Create a session with metrics
 */
export async function createSession(
  sessionData: SessionData
): Promise<SessionWithMetrics> {
  // Get exercise type name if exerciseTypeId provided
  let exerciseTypeName = sessionData.exerciseType || "Unknown Exercise";
  if (sessionData.exerciseTypeId) {
    const exerciseType = await ExerciseTypesRepository.getById(
      sessionData.exerciseTypeId
    );
    if (exerciseType) {
      exerciseTypeName = exerciseType.name;
    }
  }

  const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const metricsId = `metrics_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  // Create session
  const session: SessionRecord = {
    id: sessionId,
    patientId: sessionData.patientId,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,
    exerciseType: exerciseTypeName,
    exerciseTypeId: sessionData.exerciseTypeId,
    side: sessionData.side,
    notes: sessionData.notes,
  };

  await SessionsRepository.create(session);

  // Create metrics if provided
  let metrics: MetricsRecord | undefined;
  if (sessionData.metrics) {
    metrics = {
      id: metricsId,
      sessionId: sessionId,
      rom: sessionData.metrics.rom,
      maxFlexion: sessionData.metrics.maxFlexion,
      maxExtension: sessionData.metrics.maxExtension,
      reps: sessionData.metrics.reps,
      score: sessionData.metrics.score,
    };

    await MetricsRepository.create(metrics);
  }

  return {
    ...session,
    metrics,
  };
}

/**
 * Get session history for a patient
 */
export async function getSessionHistory(
  patientId: string,
  exerciseTypeId?: string
): Promise<SessionWithMetrics[]> {
  const sessions = await SessionsRepository.listByPatient(patientId);

  // Filter by exercise type if provided
  const filteredSessions = exerciseTypeId
    ? sessions.filter((s) => s.exerciseTypeId === exerciseTypeId)
    : sessions;

  // Enrich with metrics
  const sessionsWithMetrics = await Promise.all(
    filteredSessions.map(async (session) => {
      const metrics = await MetricsRepository.getBySession(session.id);
      return {
        ...session,
        metrics: metrics ?? undefined,
      };
    })
  );

  return sessionsWithMetrics;
}

/**
 * Get latest session for a patient
 */
export async function getLatestSession(
  patientId: string,
  exerciseTypeId?: string
): Promise<SessionWithMetrics | null> {
  const history = await getSessionHistory(patientId, exerciseTypeId);
  return history.length > 0 ? history[0] : null;
}

/**
 * Calculate session statistics for a patient
 */
export interface SessionStats {
  totalSessions: number;
  totalReps: number;
  averageROM: number;
  averageScore: number;
  lastSessionDate?: string;
}

export async function getSessionStats(
  patientId: string,
  exerciseTypeId?: string
): Promise<SessionStats> {
  const sessions = await getSessionHistory(patientId, exerciseTypeId);

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalReps: 0,
      averageROM: 0,
      averageScore: 0,
    };
  }

  const sessionsWithMetrics = sessions.filter((s) => s.metrics);

  const totalReps = sessionsWithMetrics.reduce(
    (sum, s) => sum + (s.metrics?.reps || 0),
    0
  );

  const totalROM = sessionsWithMetrics.reduce(
    (sum, s) => sum + (s.metrics?.rom || 0),
    0
  );

  const totalScore = sessionsWithMetrics.reduce(
    (sum, s) => sum + (s.metrics?.score || 0),
    0
  );

  const averageROM =
    sessionsWithMetrics.length > 0
      ? totalROM / sessionsWithMetrics.length
      : 0;

  const averageScore =
    sessionsWithMetrics.length > 0
      ? totalScore / sessionsWithMetrics.length
      : 0;

  return {
    totalSessions: sessions.length,
    totalReps,
    averageROM,
    averageScore,
    lastSessionDate: sessions[0]?.startTime,
  };
}

