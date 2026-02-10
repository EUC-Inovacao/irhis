import api from "./api";
import type { Session } from "../types";

export interface SessionsResponse {
  assigned: Session[];
  completed: Session[];
}

export interface CreateSessionDto {
  exerciseTypeId?: string;
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
  MinROM?: number;
  MaxROM?: number;
  Joint?: string;
  Side?: string;
  MinVelocity?: number;
  MaxVelocity?: number;
  P95Velocity?: number;
  CenterMassDisplacement?: number;
};

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return !isNaN(n) ? n : null;
  }
  return null;
}

function mapMetricRow(m: MetricRow) {
  const raw = m as Record<string, unknown>;
  return {
    Repetitions: toNum(m.Repetitions ?? raw.Repetitions) ?? m.Repetitions ?? null,
    AvgROM: toNum(m.AvgROM ?? raw.AvgROM ?? raw.avgROM) ?? null,
    MinROM: toNum(m.MinROM ?? raw.MinROM ?? raw.minROM ?? m.MaxExtension ?? raw.MaxExtension) ?? null,
    MaxROM: toNum(m.MaxROM ?? raw.MaxROM ?? raw.maxROM ?? m.MaxFlexion ?? raw.MaxFlexion) ?? null,
    AvgVelocity: toNum(m.AvgVelocity ?? raw.AvgVelocity ?? raw.avgVelocity) ?? null,
    Joint: (m.Joint ?? raw.Joint ?? raw.joint) ?? null,
    Side: (m.Side ?? raw.Side ?? raw.side) ?? null,
    MinVelocity: toNum(m.MinVelocity ?? raw.MinVelocity ?? raw.minVelocity) ?? null,
    MaxVelocity: toNum(m.MaxVelocity ?? raw.MaxVelocity ?? raw.maxVelocity) ?? null,
    P95Velocity: toNum(m.P95Velocity ?? raw.P95Velocity ?? raw.p95Velocity) ?? null,
    CenterMassDisplacement: toNum(m.CenterMassDisplacement ?? raw.CenterMassDisplacement ?? raw.centerMassDisplacement) ?? null,
  };
}

function toSession(row: SessionRow, metrics?: MetricRow, metricsList?: MetricRow[]): Session {
  const durationText =
    row.Duration === null || row.Duration === undefined
      ? null
      : typeof row.Duration === "string"
        ? row.Duration
        : String(row.Duration);

  const list = metricsList ?? (metrics ? [metrics] : []);
  const mappedMetrics = list.length > 0 ? list.map(mapMetricRow) : undefined;
  const primary = metrics ?? list[0];

  return {
    id: row.ID,
    exerciseType: row.ExerciseType ?? "",
    exerciseDescription: row.ExerciseDescription ?? "",
    repetitions: typeof row.Repetitions === "number" ? row.Repetitions : (primary?.Repetitions ?? null),
    duration: durationText,
    timeCreated: row.TimeCreated ?? new Date().toISOString(),
    metrics: mappedMetrics,
  };
}

export async function getPatientSessions(patientId: string): Promise<SessionsResponse> {
  const [sessionsRes, metricsRes] = await Promise.all([
    api.get<SessionRow[]>(`/patients/${patientId}/sessions`),
    api.get<MetricRow[]>(`/patients/${patientId}/metrics`, { params: { limit: 50 } }).catch(() => ({ data: [] as MetricRow[] })),
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

export async function getSessionHistory(
  patientId: string,
  exerciseTypeId?: string
): Promise<Session[]> {
  const { assigned, completed } = await getPatientSessions(patientId);
  const all = [...assigned, ...completed];
  if (!exerciseTypeId) return all;
  return all.filter((s: any) => {
    const typeId =
      s.exerciseTypeId ??
      s.exercise_id ??
      s.exerciseType;
    return String(typeId ?? "") === String(exerciseTypeId);
  });
}

export async function getLatestSession(
  patientId: string,
  exerciseTypeId?: string
): Promise<Session | null> {
  const history = await getSessionHistory(patientId, exerciseTypeId);
  if (!history.length) return null;
  return history[0];
}

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
  if (!sessions.length) {
    return {
      totalSessions: 0,
      totalReps: 0,
      averageROM: 0,
      averageScore: 0,
    };
  }

  const withMetrics = sessions.filter((s: any) => Array.isArray(s.metrics) && s.metrics[0]);
  const totalReps = withMetrics.reduce(
    (sum, s: any) => sum + (s.metrics?.[0]?.Repetitions ?? 0),
    0
  );
  const totalROM = withMetrics.reduce(
    (sum, s: any) => sum + (s.metrics?.[0]?.AvgROM ?? 0),
    0
  );
  const totalScore = withMetrics.reduce(
    (sum, s: any) => sum + (s.metrics?.[0]?.Score ?? 0),
    0
  );

  const averageROM = withMetrics.length ? totalROM / withMetrics.length : 0;
  const averageScore = withMetrics.length ? totalScore / withMetrics.length : 0;

  return {
    totalSessions: sessions.length,
    totalReps,
    averageROM,
    averageScore,
    lastSessionDate: (sessions[0] as any).timeCreated,
  };
}

export interface CreateSessionWithMetricsDto extends CreateSessionDto {
  /** If provided, add metrics to this existing session instead of creating a new one. */
  existingSessionId?: string;
  metrics?: {
    rom?: number;
    maxFlexion?: number;
    maxExtension?: number;
    reps?: number;
    score?: number;
    avgVelocity?: number;
    maxVelocity?: number;
    p95Velocity?: number;
    centerMassDisplacement?: number;
  };
}

export async function createSessionWithMetrics(
  patientId: string,
  dto: CreateSessionWithMetricsDto
): Promise<Session> {
  let session: Session;

  if (dto.existingSessionId) {
    const res = await api.get<SessionRow>(`/sessions/${dto.existingSessionId}`);
    session = toSession(res.data);
  } else {
    session = await createSession(patientId, dto);
  }

  if (dto.metrics) {
    try {
      await api.post(`/sessions/${session.id}/metrics`, {
        AvgROM: dto.metrics.rom,
        MaxFlexion: dto.metrics.maxFlexion,
        MaxExtension: dto.metrics.maxExtension,
        Repetitions: dto.metrics.reps,
        Score: dto.metrics.score,
        avg_velocity: dto.metrics.avgVelocity,
        max_velocity: dto.metrics.maxVelocity,
        p95_velocity: dto.metrics.p95Velocity,
        center_mass_displacement: dto.metrics.centerMassDisplacement,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message;
      const tb = e?.response?.data?.traceback;
      console.error("Failed to persist session metrics:", msg, tb || "");
    }
  }

  return session;
}

/** Find an existing session for this patient+exercise that has no metrics (uncompleted). */
export async function findUncompletedSession(
  patientId: string,
  exerciseTypeId: string
): Promise<Session | null> {
  const { assigned } = await getPatientSessions(patientId);
  const match = assigned.find(
    (s: any) =>
      String(s.exerciseTypeId ?? s.exerciseType ?? "") === String(exerciseTypeId)
  );
  return match ?? null;
}

export async function createSession(patientId: string, dto: CreateSessionDto): Promise<Session> {
  const exerciseType = dto.exerciseTypeId ?? dto.exerciseType ?? dto.name ?? "";
  const exerciseDescription =
    dto.exerciseDescription ??
    dto.instructions ??
    (exerciseType ? exerciseType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");
  const payload = {
    exerciseType,
    exerciseDescription,
    repetitions: dto.repetitions ?? null,
    duration: dto.duration ?? null,
  };

  const res = await api.post<SessionRow>(`/patients/${patientId}/sessions`, payload);
  const row = res.data;
  return toSession(row);
}

export async function getSessionById(sessionId: string): Promise<Session> {
  const [sessionRes, metricsRes] = await Promise.all([
    api.get<SessionRow>(`/sessions/${sessionId}`),
    api.get<MetricRow[]>(`/sessions/${sessionId}/metrics`).catch(() => ({ data: [] as MetricRow[] })),
  ]);
  const row = sessionRes.data;
  const metricsList = Array.isArray(metricsRes.data) ? metricsRes.data : [];
  return toSession(row, metricsList[0], metricsList);
}

export async function updateSession(sessionId: string, dto: UpdateSessionDto): Promise<void> {
  await api.put(`/sessions/${sessionId}`, dto);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/sessions/${sessionId}`);
}
