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

  try {
    await api.put(`/patients/${patientId}/feedback`, { feedback: feedbackRecord });
  } catch (e: any) {
    const errData = e?.response?.data || {};
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedbackService.ts:createFeedback',message:'Feedback 500',data:{error:errData?.error,traceback:errData?.traceback?.slice?.(0,500),status:e?.response?.status},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    throw e;
  }

  // Also save locally so SessionDetailScreen can display it
  try {
    const { FeedbackRepository } = await import("../storage/repositories");
    await FeedbackRepository.create(feedbackRecord);
  } catch {
    // Ignore local save errors
  }
}
