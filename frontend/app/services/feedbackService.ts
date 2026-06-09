import api from "./api";

export interface PatientFeedback {
  id?: string;
  patientId?: string;
  sessionId?: string;
  timestamp: string;
  pain: number;
  fatigue: number;
  difficulty: number;
  comments?: string;
}

function normalizeFeedback(raw: any): PatientFeedback {
  return {
    id: raw?.id ? String(raw.id) : raw?.ID ? String(raw.ID) : undefined,
    patientId: raw?.patientId ? String(raw.patientId) : raw?.PatientID ? String(raw.PatientID) : undefined,
    sessionId: raw?.sessionId ? String(raw.sessionId) : raw?.SessionID ? String(raw.SessionID) : undefined,
    timestamp: String(raw?.timestamp ?? raw?.FeedbackTime ?? raw?.TimeCreated ?? new Date().toISOString()),
    pain: Number(raw?.pain ?? raw?.Pain ?? 0),
    fatigue: Number(raw?.fatigue ?? raw?.Fatigue ?? 0),
    difficulty: Number(raw?.difficulty ?? raw?.Difficulty ?? 0),
    comments: typeof (raw?.comments ?? raw?.Comments) === "string" ? (raw.comments ?? raw.Comments) : undefined,
  };
}

/**
 * Get feedback for a patient from backend.
 * Backend currently exposes feedback embedded in GET /patients/:id
 */
export async function getPatientFeedback(patientId: string): Promise<PatientFeedback[]> {
  try {
    const res = await api.get<{ feedback?: unknown[] }>(`/patients/${patientId}`);
    const arr = res.data?.feedback;
    return Array.isArray(arr) ? arr.map(normalizeFeedback) : [];
  } catch {
    return [];
  }
}

export async function getStoredSessionFeedback(
  patientId: string,
  sessionId: string
): Promise<PatientFeedback[]> {
  try {
    const allFeedback = await getPatientFeedback(patientId);
    return allFeedback.filter((feedback) => feedback.sessionId === sessionId);
  } catch {
    return [];
  }
}

/**
 * Create (append) a feedback entry via backend PUT /patients/:id/feedback
 */
export async function createFeedback(
  patientId: string,
  feedback: Omit<PatientFeedback, "id" | "patientId">
): Promise<void> {
  const feedbackRecord: PatientFeedback = {
    id: `feedback_${patientId}_${Date.now()}`,
    patientId,
    ...feedback,
  };

  try {
    await api.put(`/patients/${patientId}/feedback`, { feedback: feedbackRecord });
  } catch (error) {
    throw error;
  }
}
