import api from "./api";
import type { FeedbackRecord } from "../storage/repositories";

/**
 * Get feedback for a patient from backend.
 * Backend currently exposes feedback embedded in GET /patients/:id
 */
export async function getPatientFeedback(patientId: string): Promise<FeedbackRecord[]> {
  try {
    const res = await api.get<{ feedback?: FeedbackRecord[] }>(`/patients/${patientId}`);
    const arr = res.data?.feedback;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Create (append) a feedback entry via backend PUT /patients/:id/feedback
 */
export async function createFeedback(
  patientId: string,
  feedback: Omit<FeedbackRecord, "id" | "patientId">
): Promise<void> {
  const feedbackRecord: FeedbackRecord = {
    id: `feedback_${patientId}_${Date.now()}`,
    patientId,
    ...feedback,
  };

  await api.put(`/patients/${patientId}/feedback`, { feedback: feedbackRecord });

  // Also save locally so SessionDetailScreen can display it
  try {
    const { FeedbackRepository } = await import("../storage/repositories");
    await FeedbackRepository.create(feedbackRecord);
  } catch {
    // Ignore local save errors
  }
}
