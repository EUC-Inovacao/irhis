import { SessionsRepository, MetricsRepository } from '../storage/repositories';
import type { Session } from '../types';

export interface SessionsResponse {
  assigned: Session[];
  completed: Session[];
}

export interface CreateSessionDto {
  exerciseType?: string;
  exerciseDescription?: string;
  name?: string;
  instructions?: string;
  repetitions?: number;
  duration?: string;
}

export interface UpdateSessionDto {
  exercise_type?: string;
  exercise_description?: string;
  repetitions?: number;
  duration?: number;
}

// Helper to convert SessionRecord to Session type
function toSession(record: any, metrics?: any): Session {
  return {
    id: record.id,
    exerciseType: record.exerciseType,
    exerciseDescription: record.notes || '',
    repetitions: metrics?.reps || null,
    duration: record.endTime ? calculateDuration(record.startTime, record.endTime) : null,
    timeCreated: record.startTime,
    metrics: metrics ? [{
      Repetitions: metrics.reps,
      AvgROM: metrics.rom,
      MinROM: metrics.maxExtension,
      MaxROM: metrics.maxFlexion,
    }] : undefined,
  };
}

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  return `${diffMins} minutes`;
}

export async function getPatientSessions(
  patientId: string
): Promise<SessionsResponse> {
  try {
    const sessions = await SessionsRepository.listByPatient(patientId);
    
    // Get metrics for each session
    const sessionsWithMetrics = await Promise.all(
      sessions.map(async (session) => {
        const metrics = await MetricsRepository.getBySession(session.id);
        return { session, metrics };
      })
    );
    
    // Separate into assigned (no endTime) and completed (has endTime)
    const assigned: Session[] = [];
    const completed: Session[] = [];
    
    for (const { session, metrics } of sessionsWithMetrics) {
      const sessionObj = toSession(session, metrics);
      if (session.endTime) {
        completed.push(sessionObj);
      } else {
        assigned.push(sessionObj);
      }
    }
    
    return { assigned, completed };
  } catch (error) {
    console.error('Failed to get patient sessions:', error);
    throw error;
  }
}

export async function createSession(
  patientId: string,
  sessionData: CreateSessionDto
): Promise<Session> {
  try {
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const startTime = new Date().toISOString();
    
    const sessionRecord = {
      id: sessionId,
      patientId,
      startTime,
      endTime: null,
      exerciseType: sessionData.exerciseType ?? sessionData.name ?? '',
      side: null,
      notes: sessionData.exerciseDescription ?? sessionData.instructions ?? '',
      exerciseTypeId: null,
    };
    
    await SessionsRepository.create(sessionRecord);
    
    return toSession(sessionRecord);
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export async function getSessionById(sessionId: string): Promise<Session> {
  try {
    // We need to find the session by querying directly since we don't have a direct getById
    const { executeSql } = require('../storage/db');
    const result = await executeSql(
      'SELECT * FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    );
    
    const session = result.rows._array?.[0];
    if (!session) {
      throw new Error('Session not found');
    }
    
    const metrics = await MetricsRepository.getBySession(sessionId);
    return toSession(session, metrics || undefined);
  } catch (error) {
    console.error('Failed to get session by ID:', error);
    throw error;
  }
}

export async function updateSession(
  sessionId: string,
  data: UpdateSessionDto
): Promise<Session> {
  try {
    // Get existing session using executeSql
    const { executeSql } = require('../storage/db');
    const result = await executeSql(
      'SELECT * FROM sessions WHERE id = ? LIMIT 1',
      [sessionId]
    );
    
    const session = result.rows._array?.[0];
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Update session using executeSql directly since we don't have an update method
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.exercise_type !== undefined) {
      updates.push('exerciseType = ?');
      values.push(data.exercise_type);
    }
    if (data.exercise_description !== undefined) {
      updates.push('notes = ?');
      values.push(data.exercise_description);
    }
    if (data.duration !== undefined) {
      // Calculate endTime from duration
      const startTime = new Date(session.startTime);
      const endTime = new Date(startTime.getTime() + (data.duration * 60000)); // duration in minutes
      updates.push('endTime = ?');
      values.push(endTime.toISOString());
    }
    
    if (updates.length > 0) {
      values.push(sessionId);
      await executeSql(
        `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
    
    // Update metrics if repetitions provided
    if (data.repetitions !== undefined) {
      const existingMetrics = await MetricsRepository.getBySession(sessionId);
      if (existingMetrics) {
        await executeSql(
          'UPDATE metrics SET reps = ? WHERE sessionId = ?',
          [data.repetitions, sessionId]
        );
      } else {
        // Create new metrics record
        const metricsId = `metrics_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        await MetricsRepository.create({
          id: metricsId,
          sessionId,
          reps: data.repetitions,
        });
      }
    }
    
    // Get updated session
    return await getSessionById(sessionId);
  } catch (error) {
    console.error('Failed to update session:', error);
    throw error;
  }
}
