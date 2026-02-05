import api from "./api";

/** Confirmed patient from GET /doctors/me/patients */
export interface DoctorPatientConfirmed {
  type: "patient";
  id: string;
  name: string;
  email: string;
  nif: string;
  status: "Confirmed";
  lastSessionAt?: string;
  lastFeedbackAt?: string;
  sessionCount?: number;
  lastAvgROM?: number;
  lastAvgVelocity?: number;
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

export async function getDoctorsMePatients(params?: {
  search?: string;
  nif?: string;
  sort?: string;
}): Promise<DoctorsMePatientsResponse> {
  const response = await api.get<DoctorsMePatientsResponse>(
    "/doctors/me/patients",
    { params: params || {} }
  );
  return response.data;
}

export interface DashboardKPIs {
  totalPatients: number;
  activePatients: number;
  completedPatients: number;
  avgProgress: number;
}

export async function getDoctorsMeDashboard(): Promise<DashboardKPIs> {
  const response = await api.get<DashboardKPIs>("/doctors/me/dashboard");
  return response.data;
}

export interface LatestFeedbackItem {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  pain?: number;
  fatigue?: number;
  difficulty?: number;
  comments?: string;
  timeCreated: string;
}

export interface DoctorsMeLatestFeedbackResponse {
  items: LatestFeedbackItem[];
}

export async function getDoctorsMeLatestFeedback(): Promise<LatestFeedbackItem[]> {
  const response = await api.get<DoctorsMeLatestFeedbackResponse>(
    "/doctors/me/latest-feedback"
  );
  return response.data.items;
}

export interface InviteListItem {
  id: string;
  token: string;
  email: string;
  inviteeName: string;
  role: string;
  status: string;
  expiresAt?: string;
  timeCreated: string;
}

export async function getDoctorInvites(doctorId: string): Promise<{
  items: InviteListItem[];
}> {
  const response = await api.get<InviteListItem[] | { items: InviteListItem[] }>(
    `/doctors/${doctorId}/invites`
  );
  const data = response.data;
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return { items };
}

export interface CreateInvitePayload {
  email: string;
  inviteeName: string;
  role: "Patient" | "Doctor";
}

export interface CreateInviteResponse {
  id: string;
  token: string;
  email: string;
  inviteeName: string;
  role: string;
  status: string;
  expiresAt: string;
}

export async function createInvite(
  payload: CreateInvitePayload
): Promise<CreateInviteResponse> {
  const response = await api.post<CreateInviteResponse>("/invites", payload);
  return response.data;
}

export async function resendInvite(inviteId: string): Promise<{ token: string }> {
  const response = await api.post<{ token: string }>(
    `/invites/${inviteId}/resend`
  );
  return response.data;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await api.post(`/invites/${inviteId}/revoke`);
}

export interface MetricsSummaryItem {
  patientId: string;
  patientName: string;
  joint: string;
  side: string;
  avgROM?: number;
  avgVelocity?: number;
  date: string;
  exerciseType: string;
}

export async function getDoctorsMeMetricsSummary(): Promise<MetricsSummaryItem[]> {
  const response = await api.get<MetricsSummaryItem[]>("/doctors/me/metrics-summary");
  return response.data;
}

export interface RecentActivityItem {
  type: "session" | "feedback";
  patientId: string;
  patientName: string;
  label: string;
  date: string;
  sessionId?: string;
}

export async function getDoctorsMeRecentActivity(): Promise<RecentActivityItem[]> {
  const response = await api.get<RecentActivityItem[]>("/doctors/me/recent-activity");
  return response.data;
}

export interface TrendsData {
  avgPain: number;
  avgFatigue: number;
  avgDifficulty: number;
}

export async function getDoctorsMeTrends(): Promise<TrendsData> {
  const response = await api.get<TrendsData>("/doctors/me/trends");
  return response.data;
}
