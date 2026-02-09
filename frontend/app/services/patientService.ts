import api from "./api";
import type { Patient, PatientDetails, RecoveryProcess, PatientFeedback } from "../types";

export type CreatePatientPayload = {
  name: string;
  email: string;
  birthDate: string; 
  sex: "male" | "female";
};

function toPatientDetails(details: unknown): PatientDetails {
  const d = (details ?? {}) as Partial<PatientDetails>;
  return {
    age: typeof d.age === "number" ? d.age : 0,
    sex: (d.sex as PatientDetails["sex"]) ?? "Other",
    height: typeof d.height === "number" ? d.height : 0,
    weight: typeof d.weight === "number" ? d.weight : 0,
    bmi: typeof d.bmi === "number" ? d.bmi : 0,
    clinicalInfo: typeof d.clinicalInfo === "string" ? d.clinicalInfo : "No information provided.",
    medicalHistory: (d as any).medicalHistory,
  };
}

function toPatient(raw: any): Patient {
  return {
    id: String(raw?.id ?? raw?.ID ?? ""),
    name: String(raw?.name ?? raw?.Name ?? ""),
    details: toPatientDetails(raw?.details),
    recovery_process: Array.isArray(raw?.recovery_process) ? (raw.recovery_process as RecoveryProcess[]) : [],
    doctor: raw?.doctor ? { id: String(raw.doctor.id), name: String(raw.doctor.name ?? "") } : undefined,
    feedback: Array.isArray(raw?.feedback) ? (raw.feedback as PatientFeedback[]) : [],
  };
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  try {
    const res = await api.get<any>(`/patients/${patientId}`);
    return toPatient(res.data);
  } catch {
    return null;
  }
}

export async function getUnassignedPatients(): Promise<Patient[]> {
  const res = await api.get<any[]>(`/patients/unassigned`);
  return Array.isArray(res.data) ? res.data.map(toPatient) : [];
}

export async function assignPatientToDoctor(patientId: string): Promise<void> {
  await api.post(`/patients/${patientId}/assign-doctor`, {});
}

export async function createNewPatient(payload: CreatePatientPayload): Promise<Patient> {
  const res = await api.post<any>(`/patients/manual-registry`, payload);
  return toPatient(res.data);
}

export async function updateRecoveryProcess(patientId: string, recovery_process: RecoveryProcess[]): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/recovery-process`, { recovery_process });
  return toPatient(res.data);
}

export async function updatePatientDetails(patientId: string, details: Partial<PatientDetails>): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/details`, { details });
  return toPatient(res.data);
}

export async function updatePatientFeedback(patientId: string, feedback: PatientFeedback | PatientFeedback[]): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/feedback`, { feedback });
  return toPatient(res.data);
}
