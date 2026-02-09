import api from "./api";
import type { Patient, PatientDetails, RecoveryProcess, PatientFeedback } from "../types";

export type CreatePatientPayload = {
  name: string;
  email?: string;
  birthDate: string; 
  sex: "male" | "female";
  weight?: number;
  height?: number;
  bmi?: number;
  occupation?: "white" | "blue";
  education?: number;
  affectedRightKnee: boolean;
  affectedLeftKnee: boolean;
  affectedRightHip: boolean;
  affectedLeftHip: boolean;
  medicalHistory?: string;
  timeAfterSymptoms?: number;
  legDominance: "dominant" | "non-dominant";
  contralateralJointAffect?: boolean;
  physicallyActive?: boolean;
  coMorbiditiesNMS?: boolean;
  coMorbiditiesSystemic?: boolean;
};

function toPatientDetails(details: unknown): PatientDetails {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:27',message:'toPatientDetails input',data:{details},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const d = (details ?? {}) as Partial<PatientDetails>;
  
  // Helper to parse number from string or number
  const parseNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };
  
  const result = {
    age: parseNumber(d.age),
    sex: (d.sex as PatientDetails["sex"]) ?? "Other",
    height: parseNumber(d.height),
    weight: parseNumber(d.weight),
    bmi: parseNumber(d.bmi),
    clinicalInfo: typeof d.clinicalInfo === "string" ? d.clinicalInfo : "No information provided.",
    medicalHistory: (d as any).medicalHistory,
  };
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:42',message:'toPatientDetails output',data:{result},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  return result;
}

function toPatient(raw: any): Patient {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:40',message:'toPatient input',data:{raw},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const result = {
    id: String(raw?.id ?? raw?.ID ?? ""),
    name: String(raw?.name ?? raw?.Name ?? ""),
    details: toPatientDetails(raw?.details),
    recovery_process: Array.isArray(raw?.recovery_process) ? (raw.recovery_process as RecoveryProcess[]) : [],
    doctor: raw?.doctor ? { id: String(raw.doctor.id), name: String(raw.doctor.name ?? "") } : undefined,
    feedback: Array.isArray(raw?.feedback) ? (raw.feedback as PatientFeedback[]) : [],
  };
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:49',message:'toPatient output',data:{result},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return result;
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:51',message:'getPatientById called',data:{patientId},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const res = await api.get<any>(`/patients/${patientId}`);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:54',message:'getPatientById API response',data:{status:res.status,data:res.data},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const mapped = toPatient(res.data);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:57',message:'getPatientById mapped result',data:{mapped},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return mapped;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patientService.ts:60',message:'getPatientById error',data:{error:error?.message,status:error?.response?.status,data:error?.response?.data},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
  // Parse name into first_name and last_name
  const nameParts = payload.name.trim().split(/\s+/);
  const first_name = nameParts[0] || "";
  const last_name = nameParts.slice(1).join(" ") || "";
  
  // Map camelCase to snake_case and ensure required fields are not undefined
  const backendPayload = {
    first_name,
    last_name: last_name || undefined,
    birth_date: payload.birthDate,
    sex: payload.sex,
    weight: payload.weight ?? 0,  // Backend requires non-null
    height: payload.height ?? 0,    // Backend requires non-null
    bmi: payload.bmi ?? 0,          // Backend requires non-null
    occupation: payload.occupation || undefined,
    education: payload.education || undefined,
    affected_right_knee: payload.affectedRightKnee ? 1 : 0,
    affected_left_knee: payload.affectedLeftKnee ? 1 : 0,
    affected_right_hip: payload.affectedRightHip ? 1 : 0,
    affected_left_hip: payload.affectedLeftHip ? 1 : 0,
    medical_history: payload.medicalHistory || undefined,
    time_after_symptoms: payload.timeAfterSymptoms || undefined,
    leg_dominance: payload.legDominance, // "dominant" or "non-dominant"
    physically_active: payload.physicallyActive ? 1 : 0,
  };
  
  const res = await api.post<any>(`/patients/manual-registry`, backendPayload);
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
