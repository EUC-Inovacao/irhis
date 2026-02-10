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
  completedPatients: number;
  pendingInvites: number;
  sessionsThisWeek: number;
  avgProgress?: number;
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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctorService.ts:78',message:'getDoctorsMePatients called',data:{params},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await api.get<DoctorsMePatientsResponse>("/doctors/me/patients", {
      params,
    });
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctorService.ts:82',message:'getDoctorsMePatients response received',data:{status:response.status,itemsCount:response.data?.items?.length,confirmedCount:response.data?.confirmed?.length,hasItems:!!response.data?.items,responseData:response.data},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctorService.ts:87',message:'getDoctorsMePatients error',data:{errorMessage:error?.message,errorStatus:error?.response?.status,errorData:error?.response?.data,isAxiosError:!!error?.isAxiosError},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

/** Compute KPIs from patients response (no extra API call). */
export function computeDashboardKpis(patientsRes: DoctorsMePatientsResponse): DashboardKPIs {
  const confirmed = patientsRes.confirmed ?? patientsRes.items.filter((x): x is DoctorPatientConfirmed => x.type === "patient");
  const pending = patientsRes.pending ?? patientsRes.items.filter((x): x is DoctorPatientPending => x.type === "pending");
  const completedPatients = confirmed.filter((p) => (p.sessionCount ?? 0) > 0).length;
  return {
    totalPatients: confirmed.length,
    activePatients: confirmed.length,
    completedPatients,
    pendingInvites: pending.length,
    sessionsThisWeek: 0,
  };
}

/** Legacy: fetch patients then compute KPIs. Prefer computeDashboardKpis(patientsRes) when you already have patients. */
export async function getDoctorsMeDashboard(): Promise<DashboardKPIs> {
  const patientsRes = await getDoctorsMePatients();
  return computeDashboardKpis(patientsRes);
}

/** Fetch latest feedback for patients. Pass patientsRes to avoid redundant getDoctorsMePatients call. */
export async function getDoctorsMeLatestFeedback(
  limit: number = 5,
  patientsRes?: DoctorsMePatientsResponse
): Promise<LatestFeedbackItem[]> {
  const resolved = patientsRes ?? await getDoctorsMePatients();
  const confirmed = resolved.confirmed ?? resolved.items.filter((x): x is DoctorPatientConfirmed => x.type === "patient");
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
