import api from "./api";

/** Confirmed patient from GET /doctors/me/patients */
export interface DoctorPatientConfirmed {
  type: "patient";
  id: string;
  name: string;
  email: string;
  nif: string;
  status: "Confirmed";
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
