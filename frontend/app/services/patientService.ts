import api from "./api";
import type {
  Patient,
  PatientDetails,
  RecoveryProcess,
  PatientFeedback,
} from "../types";

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

function computeAgeFromBirthDate(
  birthDate: string | null | undefined
): number {
  const normalizedBirthDate = normalizeBirthDate(birthDate);
  if (!normalizedBirthDate) return 0;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedBirthDate);
  if (!match) return 0;

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return 0;

  const today = new Date();
  let age = today.getFullYear() - year;
  const mDiff = today.getMonth() + 1 - month;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) age--;

  return age >= 0 ? age : 0;
}

function normalizeBirthDate(
  birthDate: string | null | undefined
): string | undefined {
  if (!birthDate) return undefined;

  const trimmedBirthDate = birthDate.trim();
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmedBirthDate);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(trimmedBirthDate);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toPatientDetails(details: unknown): PatientDetails {
  fetch(
    "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "patientService.ts:27",
        message: "toPatientDetails input",
        data: { details },
        timestamp: Date.now(),
        runId: "run1",
        hypothesisId: "C",
      }),
    }
  ).catch(() => {});

  const d = (details ?? {}) as Partial<PatientDetails & { birthDate?: string }>;

  const parseNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const normalizedBirthDate = normalizeBirthDate(d.birthDate);
  const rawAge = parseNumber(d.age);
  const ageFromBirth = computeAgeFromBirthDate(normalizedBirthDate);
  const age = ageFromBirth > 0 ? ageFromBirth : rawAge;

  const result: PatientDetails = {
    age,
    birthDate: normalizedBirthDate,
    sex: (d.sex as PatientDetails["sex"]) ?? "Other",
    height: parseNumber(d.height),
    weight: parseNumber(d.weight),
    bmi: parseNumber(d.bmi),
    clinicalInfo:
      typeof d.clinicalInfo === "string"
        ? d.clinicalInfo
        : "No information provided.",
    medicalHistory: (d as any).medicalHistory,
  };

  fetch(
    "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "patientService.ts:42",
        message: "toPatientDetails output",
        data: { result },
        timestamp: Date.now(),
        runId: "run1",
        hypothesisId: "C",
      }),
    }
  ).catch(() => {});

  return result;
}

function toPatient(raw: any): Patient {
  fetch(
    "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "patientService.ts:40",
        message: "toPatient input",
        data: { raw },
        timestamp: Date.now(),
        runId: "run1",
        hypothesisId: "D",
      }),
    }
  ).catch(() => {});

  const result = {
    id: String(raw?.id ?? raw?.ID ?? ""),
    name: String(raw?.name ?? raw?.Name ?? ""),
    details: toPatientDetails(raw?.details),
    recovery_process: Array.isArray(raw?.recovery_process)
      ? (raw.recovery_process as RecoveryProcess[])
      : [],
    doctor: raw?.doctor
      ? { id: String(raw.doctor.id), name: String(raw.doctor.name ?? "") }
      : undefined,
    feedback: Array.isArray(raw?.feedback)
      ? (raw.feedback as PatientFeedback[])
      : [],
  };

  fetch(
    "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "patientService.ts:49",
        message: "toPatient output",
        data: { result },
        timestamp: Date.now(),
        runId: "run1",
        hypothesisId: "D",
      }),
    }
  ).catch(() => {});

  return result;
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  fetch(
    "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "patientService.ts:51",
        message: "getPatientById called",
        data: { patientId },
        timestamp: Date.now(),
        runId: "run1",
        hypothesisId: "E",
      }),
    }
  ).catch(() => {});

  try {
    const res = await api.get<any>(`/patients/${patientId}`);

    fetch(
      "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "patientService.ts:54",
          message: "getPatientById API response",
          data: { status: res.status, data: res.data },
          timestamp: Date.now(),
          runId: "run1",
          hypothesisId: "E",
        }),
      }
    ).catch(() => {});

    const mapped = toPatient(res.data);

    fetch(
      "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "patientService.ts:57",
          message: "getPatientById mapped result",
          data: { mapped },
          timestamp: Date.now(),
          runId: "run1",
          hypothesisId: "E",
        }),
      }
    ).catch(() => {});

    return mapped;
  } catch (error: any) {
    fetch(
      "http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "patientService.ts:60",
          message: "getPatientById error",
          data: {
            error: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
          },
          timestamp: Date.now(),
          runId: "run1",
          hypothesisId: "E",
        }),
      }
    ).catch(() => {});

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

export async function createNewPatient(
  payload: CreatePatientPayload
): Promise<Patient> {
  const nameParts = payload.name.trim().split(/\s+/);
  const first_name = nameParts[0] || "";
  const last_name = nameParts.slice(1).join(" ") || "";

  const backendPayload = {
    first_name,
    last_name: last_name || undefined,
    birth_date: payload.birthDate,
    sex: payload.sex,
    weight: payload.weight ?? 0,
    height: payload.height ?? 0,
    bmi: payload.bmi ?? 0,
    occupation: payload.occupation || undefined,
    education: payload.education || undefined,
    affected_right_knee: payload.affectedRightKnee ? 1 : 0,
    affected_left_knee: payload.affectedLeftKnee ? 1 : 0,
    affected_right_hip: payload.affectedRightHip ? 1 : 0,
    affected_left_hip: payload.affectedLeftHip ? 1 : 0,
    medical_history: payload.medicalHistory || undefined,
    time_after_symptoms: payload.timeAfterSymptoms || undefined,
    leg_dominance: payload.legDominance,
    physically_active: payload.physicallyActive ? 1 : 0,
  };

  const res = await api.post<any>(`/patients/manual-registry`, backendPayload);
  return toPatient(res.data);
}

export async function updateRecoveryProcess(
  patientId: string,
  recovery_process: RecoveryProcess[]
): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/recovery-process`, {
    recovery_process,
  });
  return toPatient(res.data);
}

export async function updatePatientDetails(
  patientId: string,
  details: Partial<PatientDetails>
): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/details`, { details });
  return toPatient(res.data);
}

export async function updatePatientFeedback(
  patientId: string,
  feedback: PatientFeedback | PatientFeedback[]
): Promise<Patient> {
  const res = await api.put<any>(`/patients/${patientId}/feedback`, {
    feedback,
  });
  return toPatient(res.data);
}
