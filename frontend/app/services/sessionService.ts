import api from "./api";
import type { Session } from "../types";
import type { AnalysisResult } from "../types";

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
  // Prefer reps from knee metric (not hip/com) - hip often has 0
  const kneeMetric = Array.isArray(list) ? list.find((m: any) => (m.Joint ?? m.joint ?? "").toLowerCase() === "knee") : null;
  const repsFromKnee = kneeMetric ? (kneeMetric.Repetitions ?? (kneeMetric as any).repetitions) : null;
  const sessionReps = typeof row.Repetitions === "number" ? row.Repetitions : (repsFromKnee ?? primary?.Repetitions ?? null);

  return {
    id: row.ID,
    exerciseType: row.ExerciseType ?? "",
    exerciseDescription: row.ExerciseDescription ?? "",
    repetitions: sessionReps,
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
    if (!sid) continue;
    const existing = metricsBySessionId.get(sid);
    const joint = String(m.Joint ?? (m as any).joint ?? "").toLowerCase();
    const existingJoint = existing ? String((existing as any).Joint ?? (existing as any).joint ?? "").toLowerCase() : "";
    if (!existing || (joint === "knee" && existingJoint !== "knee")) {
      metricsBySessionId.set(sid, m);
    }
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
  /** Single aggregated metrics (legacy) */
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
  /** Per-joint metrics (knee left, knee right, hip left, hip right, COM) - shown in session details */
  metricsPerJoint?: Array<{
    joint: string;
    side: string;
    rom?: number;
    maxFlexion?: number;
    maxExtension?: number;
    reps?: number;
    avgVelocity?: number;
    maxVelocity?: number;
    p95Velocity?: number;
    centerMassDisplacement?: number;
  }>;
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

  if (dto.metricsPerJoint && dto.metricsPerJoint.length > 0) {
    for (const m of dto.metricsPerJoint) {
      try {
        await api.post(`/sessions/${session.id}/metrics`, {
          joint: m.joint,
          side: m.side,
          avg_rom: m.rom,
          max_rom: m.maxFlexion,
          min_rom: m.maxExtension,
          repetitions: m.reps,
          avg_velocity: m.avgVelocity,
          max_velocity: m.maxVelocity,
          p95_velocity: m.p95Velocity,
          center_mass_displacement: m.centerMassDisplacement,
        });
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? e?.message;
        console.error("Failed to persist metric:", m.joint, m.side, msg);
      }
    }
    // Update session with knee reps (hip often has 0) when using existing session
    const kneeReps = dto.metricsPerJoint.find((m) => m.joint?.toLowerCase() === "knee")?.reps;
    const repsToSet = dto.repetitions ?? kneeReps;
    if (repsToSet != null) {
      if (dto.existingSessionId) {
        try {
          await updateSession(session.id, { repetitions: repsToSet });
        } catch (e: any) {
          console.error("Failed to update session reps:", e?.message);
        }
      }
      (session as any).repetitions = repsToSet;
      (session as any).Repetitions = repsToSet;
    }
  } else if (dto.metrics) {
    try {
      await api.post(`/sessions/${session.id}/metrics`, {
        joint: "knee",
        side: "left",
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

/** Create session and persist metrics from local analysis result. Used by both BLE and ZIP flows. */
export async function createSessionFromAnalysisResult(
  result: AnalysisResult,
  options: {
    patientId: string;
    exerciseTypeId: string;
    exerciseName?: string;
    startTime: Date;
    endTime: Date;
  }
): Promise<Session | null> {
  const { patientId, exerciseTypeId, exerciseName, startTime, endTime } = options;

  const leftRom = result.knee.left?.rom || 0;
  const rightRom = result.knee.right?.rom || 0;
  const avgRom = (leftRom + rightRom) / 2 || leftRom || rightRom || 0;

  const leftMaxFlexion = result.knee.left?.maxFlexion || 0;
  const rightMaxFlexion = result.knee.right?.maxFlexion || 0;
  const avgMaxFlexion = (leftMaxFlexion + rightMaxFlexion) / 2 || leftMaxFlexion || rightMaxFlexion || 0;

  const leftMaxExtension = result.knee.left?.maxExtension || 0;
  const rightMaxExtension = result.knee.right?.maxExtension || 0;
  const avgMaxExtension = (leftMaxExtension + rightMaxExtension) / 2 || leftMaxExtension || rightMaxExtension || 0;

  const leftAvgVel = result.knee.left?.avgVelocity ?? 0;
  const rightAvgVel = result.knee.right?.avgVelocity ?? 0;
  const avgVelocity = (leftAvgVel + rightAvgVel) / 2 || leftAvgVel || rightAvgVel || 0;

  const leftPeakVel = result.knee.left?.peakVelocity ?? 0;
  const rightPeakVel = result.knee.right?.peakVelocity ?? 0;
  const maxVelocity = Math.max(leftPeakVel, rightPeakVel) || leftPeakVel || rightPeakVel || 0;

  const leftP95 = result.knee.left?.p95Velocity ?? 0;
  const rightP95 = result.knee.right?.p95Velocity ?? 0;
  const p95Velocity = Math.max(leftP95, rightP95) || leftP95 || rightP95 || 0;

  const reps = result.knee.left?.repetitions || result.knee.right?.repetitions || 0;
  const score = Math.min(100, Math.max(0, 60 + (avgRom / 90) * 35));

  const centerMassDisplacement = result.com?.rms_cm ?? result.com?.apAmp_cm ?? 0;

  const metricsPerJoint: Array<{
    joint: string;
    side: string;
    rom?: number;
    maxFlexion?: number;
    maxExtension?: number;
    reps?: number;
    avgVelocity?: number;
    maxVelocity?: number;
    p95Velocity?: number;
    centerMassDisplacement?: number;
  }> = [];

  if (result.knee?.left) {
    const k = result.knee.left;
    metricsPerJoint.push({
      joint: "knee",
      side: "left",
      rom: k.rom,
      maxFlexion: k.maxFlexion,
      maxExtension: k.maxExtension,
      reps: k.repetitions,
      avgVelocity: k.avgVelocity,
      maxVelocity: k.peakVelocity,
      p95Velocity: k.p95Velocity,
    });
  }
  if (result.knee?.right) {
    const k = result.knee.right;
    metricsPerJoint.push({
      joint: "knee",
      side: "right",
      rom: k.rom,
      maxFlexion: k.maxFlexion,
      maxExtension: k.maxExtension,
      reps: k.repetitions,
      avgVelocity: k.avgVelocity,
      maxVelocity: k.peakVelocity,
      p95Velocity: k.p95Velocity,
    });
  }
  if (result.hip?.left) {
    const h = result.hip.left;
    metricsPerJoint.push({
      joint: "hip",
      side: "left",
      rom: h.rom,
      maxFlexion: h.maxFlexion,
      maxExtension: h.maxExtension,
      reps: h.repetitions,
      avgVelocity: h.avgVelocity,
      maxVelocity: h.peakVelocity,
      p95Velocity: h.p95Velocity,
    });
  }
  if (result.hip?.right) {
    const h = result.hip.right;
    metricsPerJoint.push({
      joint: "hip",
      side: "right",
      rom: h.rom,
      maxFlexion: h.maxFlexion,
      maxExtension: h.maxExtension,
      reps: h.repetitions,
      avgVelocity: h.avgVelocity,
      maxVelocity: h.peakVelocity,
      p95Velocity: h.p95Velocity,
    });
  }
  if (result.com && (result.com.rms_cm || result.com.apAmp_cm)) {
    const cm = result.com.rms_cm ?? result.com.apAmp_cm ?? 0;
    const firstKnee = metricsPerJoint.find((m) => m.joint?.toLowerCase() === "knee");
    if (firstKnee) {
      firstKnee.centerMassDisplacement = Math.round(cm * 100) / 100;
    } else {
      metricsPerJoint.push({
        joint: "knee",
        side: "left",
        centerMassDisplacement: Math.round(cm * 100) / 100,
        reps: Math.round(reps),
      });
    }
  }

  const existingSession = await findUncompletedSession(patientId, exerciseTypeId);

  try {
    const session = await createSessionWithMetrics(patientId, {
      patientId,
      exerciseTypeId,
      exerciseDescription: exerciseName,
      existingSessionId: existingSession?.id ?? undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      repetitions: reps,
      metricsPerJoint: metricsPerJoint.length > 0 ? metricsPerJoint : undefined,
      metrics: metricsPerJoint.length === 0 ? {
        rom: Math.round(avgRom * 10) / 10,
        maxFlexion: Math.round(avgMaxFlexion * 10) / 10,
        maxExtension: Math.round(avgMaxExtension * 10) / 10,
        reps: Math.round(reps),
        score: Math.round(score),
        avgVelocity: avgVelocity ? Math.round(avgVelocity * 10) / 10 : undefined,
        maxVelocity: maxVelocity ? Math.round(maxVelocity * 10) / 10 : undefined,
        p95Velocity: p95Velocity ? Math.round(p95Velocity * 10) / 10 : undefined,
        centerMassDisplacement: centerMassDisplacement ? Math.round(centerMassDisplacement * 100) / 100 : undefined,
      } : undefined,
    });
    return session;
  } catch (error: any) {
    console.error("Error creating session from analysis:", error);
    return null;
  }
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
