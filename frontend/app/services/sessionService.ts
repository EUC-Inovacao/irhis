import api from "./api";
import type { Session } from "../types";

export interface SessionsResponse {
  assigned: Session[];
  completed: Session[];
}

export interface CreateSessionDto {
  exerciseType?: string;
  exerciseDescription?: string;
  name?: string;
  instructions?: string;
  repetitions?: number;
  duration?: string;
}

export async function getPatientSessions(
  patientId: string
): Promise<SessionsResponse> {
  const response = await api.get<{ assigned: Session[]; completed: Session[] }>(
    `/patients/${patientId}/sessions`
  );
  return response.data;
}

export async function createSession(
  patientId: string,
  session: CreateSessionDto
): Promise<Session> {
  const payload = {
    exerciseType: session.exerciseType ?? session.name ?? "",
    exerciseDescription: session.exerciseDescription ?? session.instructions ?? "",
    repetitions: session.repetitions ?? null,
    duration: session.duration ?? null,
  };
  const response = await api.post<Session>(
    `/patients/${patientId}/sessions`,
    payload
  );
  return response.data;
}
