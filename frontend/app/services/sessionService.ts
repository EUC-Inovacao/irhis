import api from "./api";
import type { Session } from "../types";

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

type SessionRow = {
  ID: string;
  ExerciseType?: string;
  ExerciseDescription?: string;
  Repetitions?: number;
  Duration?: string | number | null;
  TimeCreated?: string;
};

type MetricRow = {
  SessionID?: string;
  AvgROM?: number;
  AvgVelocity?: number;
  Repetitions?: number;
  MaxFlexion?: number;
  MaxExtension?: number;
};

function toSession(row: SessionRow, metrics?: MetricRow): Session {
  const durationText =
    row.Duration === null || row.Duration === undefined
      ? null
      : typeof row.Duration === "string"
        ? row.Duration
        : String(row.Duration);

  return {
    id: row.ID,
    exerciseType: row.ExerciseType ?? "",
    exerciseDescription: row.ExerciseDescription ?? "",
    repetitions: typeof row.Repetitions === "number" ? row.Repetitions : (metrics?.Repetitions ?? null),
    duration: durationText,
    timeCreated: row.TimeCreated ?? new Date().toISOString(),
    metrics: metrics
      ? [
          {
            Repetitions: metrics.Repetitions ?? null,
            AvgROM: metrics.AvgROM ?? null,
            MinROM: metrics.MaxExtension ?? null,
            MaxROM: metrics.MaxFlexion ?? null,
          },
        ]
      : undefined,
  };
}

export async function getPatientSessions(patientId: string): Promise<SessionsResponse> {
  const [sessionsRes, metricsRes] = await Promise.all([
    api.get<SessionRow[]>(`/patients/${patientId}/sessions`),
    api.get<MetricRow[]>(`/patients/${patientId}/metrics`, { params: { limit: 200 } }).catch(() => ({ data: [] as MetricRow[] })),
  ]);

  const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
  const metrics = Array.isArray(metricsRes.data) ? metricsRes.data : [];

  const metricsBySessionId = new Map<string, MetricRow>();
  for (const m of metrics) {
    const sid = typeof m.SessionID === "string" ? m.SessionID : "";
    if (sid) metricsBySessionId.set(sid, m);
  }

  const assigned: Session[] = [];
  const completed: Session[] = [];

  for (const s of sessions) {
    const m = metricsBySessionId.get(s.ID);
    const mapped = toSession(s, m);
    if (m) completed.push(mapped);
    else assigned.push(mapped);
  }

  return { assigned, completed };
}

export async function createSession(patientId: string, dto: CreateSessionDto): Promise<Session> {
  const payload = {
    exerciseType: dto.exerciseType ?? dto.name ?? "",
    exerciseDescription: dto.exerciseDescription ?? dto.instructions ?? "",
    repetitions: dto.repetitions ?? null,
    duration: dto.duration ?? null,
  };

  const res = await api.post<SessionRow>(`/patients/${patientId}/sessions`, payload);
  const row = res.data;
  return toSession(row);
}

export async function updateSession(sessionId: string, dto: UpdateSessionDto): Promise<void> {
  await api.put(`/sessions/${sessionId}`, dto);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/sessions/${sessionId}`);
}
