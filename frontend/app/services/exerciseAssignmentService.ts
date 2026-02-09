import api from "./api";

export interface AssignSessionPayload {
  exerciseId: string;
  startDate: string;   
  endDate: string;     
  frequency: number;
  notes?: string;
}

export async function assignPatientSession(
  patientId: string,
  payload: AssignSessionPayload
): Promise<void> {
  await api.post(`/patients/${patientId}/sessions`, {
    exercise_id: payload.exerciseId,
    start_date: payload.startDate,
    end_date: payload.endDate,
    frequency: payload.frequency,
    notes: payload.notes ?? ""
  });
}
