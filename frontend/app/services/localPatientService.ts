import { PatientsRepository, UsersRepository } from "../storage/repositories";
import type { Patient, PatientDetails } from "../types";

function buildDefaultRecoveryProcess(): Patient["recovery_process"] {
  return [
    {
      id: "knee-leg-extension",
      name: "Knee Leg Extension",
      completed: false,
      sessions: 0,
    },
  ];
}

function buildDefaultDetails(name: string): PatientDetails {
  return {
    age: 45,
    sex: "Other",
    height: 1.7,
    weight: 70,
    bmi: 24.2,
    clinicalInfo: "Post-surgical knee rehabilitation",
  };
}

export async function getOrCreateLocalPatient(
  userId: string,
  name = "Patient"
): Promise<Patient> {
  const now = new Date().toISOString();
  const existing = await PatientsRepository.getById(userId);
  if (!existing) {
    await PatientsRepository.upsert({
      id: userId,
      name,
      email: undefined,
      dateOfBirth: undefined,
      createdAt: now,
      doctorId: null,
    });
  }

  const record = existing || await PatientsRepository.getById(userId);
  if (!record) {
    throw new Error("Failed to create patient record");
  }

  // Map to app Patient shape
  const patient: Patient = {
    id: record.id,
    name: record.name,
    details: buildDefaultDetails(record.name),
    recovery_process: buildDefaultRecoveryProcess(),
  } as Patient;
  return patient;
}

export async function listLocalPatientsForDoctor(
  doctorId: string
): Promise<Patient[]> {
  // Return all local patients (doctors can see all patients)
  const rows = await PatientsRepository.list();
  const patients: Patient[] = [];
  
  for (const r of rows) {
    let doctor;
    if (r.doctorId) {
      const doctorRecord = await UsersRepository.findById(r.doctorId);
      if (doctorRecord) {
        doctor = { id: doctorRecord.id, name: doctorRecord.name };
      }
    }
    
    patients.push({
      id: r.id,
      name: r.name,
      details: buildDefaultDetails(r.name),
      recovery_process: buildDefaultRecoveryProcess(),
      doctor,
    } as Patient);
  }
  
  return patients;
}

export async function listLocalUnassignedPatients(): Promise<Patient[]> {
  const rows = await PatientsRepository.listUnassigned();
  const patients: Patient[] = [];
  
  for (const r of rows) {
    patients.push({
      id: r.id,
      name: r.name,
      details: buildDefaultDetails(r.name),
      recovery_process: buildDefaultRecoveryProcess(),
    } as Patient);
  }
  
  return patients;
}

export async function assignLocalPatientToDoctor(
  patientId: string,
  doctorId: string
): Promise<void> {
  await PatientsRepository.assignToDoctor(patientId, doctorId);
}
