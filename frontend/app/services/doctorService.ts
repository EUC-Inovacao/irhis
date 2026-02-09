import api from "./api";

/** Confirmed patient from GET /doctors/me/patients */
export interface DoctorPatientConfirmed {
  type: "patient";
  id: string;
  name: string;
  email: string;
  nif: string;
  status: "Confirmed";
  lastSessionAt?: string | null;
  lastFeedbackAt?: string | null;
  sessionCount?: number;
  lastAvgROM?: number | null;
  lastAvgVelocity?: number | null;
}

/** Pending invite from GET /doctors/me/patients */
export interface DoctorPatientPending {
  type: "pending";
  id: string;
  email: string;
  inviteeName: string;
  name: string;
  status: "Pending";
  timeCreated: string;
}

export type DoctorPatientItem = DoctorPatientConfirmed | DoctorPatientPending;

export interface DoctorsMePatientsResponse {
  items: DoctorPatientItem[];
  confirmed: DoctorPatientConfirmed[];
  pending: DoctorPatientPending[];
}

/** Dashboard KPI shapes (computed from API data where backend does not expose a dedicated endpoint) */
export interface DashboardKPIs {
  totalPatients: number;
  activePatients: number;
  pendingInvites: number;
  sessionsThisWeek: number;
}

export interface LatestFeedbackItem {
  patientId: string;
  patientName: string;
  pain: number;
  fatigue: number;
  difficulty: number;
  comments?: string;
  timestamp: string;
}

export interface MetricsSummaryItem {
  label: string;
  value: number;
  unit?: string;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface TrendsData {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
}

export async function getDoctorsMePatients(params?: {
  search?: string;
  nif?: string;
  sort?: string;
}): Promise<DoctorsMePatientsResponse> {
  const response = await api.get<DoctorsMePatientsResponse>("/doctors/me/patients", {
    params,
  });
  return response.data;
}

/**
 * Backend does not currently expose a /doctors/me/dashboard endpoint.
 * Compute minimal KPIs from /doctors/me/patients (endpoint-based, no mocks).
 */
export async function getDoctorsMeDashboard(): Promise<DashboardKPIs> {
  const patientsRes = await getDoctorsMePatients();
  const confirmed = patientsRes.confirmed ?? patientsRes.items.filter((x): x is DoctorPatientConfirmed => x.type === "patient");
  const pending = patientsRes.pending ?? patientsRes.items.filter((x): x is DoctorPatientPending => x.type === "pending");

  return {
    totalPatients: confirmed.length,
    activePatients: confirmed.length,
    pendingInvites: pending.length,
    sessionsThisWeek: 0, 
  };
}

export async function getDoctorsMeLatestFeedback(limit: number = 10): Promise<LatestFeedbackItem[]> {
  const patientsRes = await getDoctorsMePatients();
  const confirmed = patientsRes.confirmed ?? patientsRes.items.filter((x): x is DoctorPatientConfirmed => x.type === "patient");
  const slice = confirmed.slice(0, Math.max(0, limit));

  const results = await Promise.all(
    slice.map(async (p) => {
      try {
        const patientRes = await api.get<{ feedback?: Array<any> }>(`/patients/${p.id}`);
        const feedbackArr = Array.isArray(patientRes.data.feedback) ? patientRes.data.feedback : [];
        if (!feedbackArr.length) return null;

        const latest = feedbackArr
          .slice()
          .sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")))[0];

        if (!latest) return null;

        return {
          patientId: p.id,
          patientName: p.name,
          pain: Number(latest.pain ?? 0),
          fatigue: Number(latest.fatigue ?? 0),
          difficulty: Number(latest.difficulty ?? 0),
          comments: typeof latest.comments === "string" ? latest.comments : undefined,
          timestamp: String(latest.timestamp ?? new Date().toISOString()),
        } satisfies LatestFeedbackItem;
      } catch {
        return null;
      }
    })
  );

  return results.filter((x): x is LatestFeedbackItem => x !== null);
}

export async function getDoctorsMeMetricsSummary(): Promise<MetricsSummaryItem[]> {
  const response = await api.get<MetricsSummaryItem[]>("/doctors/me/metrics-summary");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getDoctorsMeRecentActivity(): Promise<RecentActivityItem[]> {
  const response = await api.get<RecentActivityItem[]>("/doctors/me/recent-activity");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getDoctorsMeTrends(): Promise<TrendsData | null> {
  try {
    const response = await api.get<TrendsData>("/doctors/me/trends");
    return response.data;
  } catch {
    return null;
  }
}
