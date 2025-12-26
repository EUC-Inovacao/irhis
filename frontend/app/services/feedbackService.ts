import { FeedbackRepository, FeedbackRecord } from "../storage/repositories";

export interface FeedbackWithProgression extends FeedbackRecord {
  date: Date;
}

/**
 * Generate mock feedback data showing improvement over time
 */
export async function generateMockFeedback(
  patientId: string,
  weeks: number = 8
): Promise<FeedbackRecord[]> {
  const feedback: FeedbackRecord[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  let pain = 7; // Starting pain level
  let fatigue = 6;
  let difficulty = 7;

  const comments = [
    "Feeling some discomfort during exercises.",
    "Pain has decreased slightly this week.",
    "Making good progress, exercises getting easier.",
    "Much better this week, less pain overall.",
    "Feeling stronger, can do more reps now.",
    "Almost back to normal, minimal pain.",
    "Excellent progress, exercises feel natural.",
    "Feeling great, recovery going well!",
  ];

  for (let week = 0; week < weeks; week++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + week * 7);

    // Progressive improvement with some variation
    const progressFactor = week / weeks;
    
    // Pain: 7 → 2 (decreasing)
    pain = Math.max(2, 7 - progressFactor * 5 + (Math.random() - 0.5) * 1);
    
    // Fatigue: 6 → 3 (decreasing)
    fatigue = Math.max(3, 6 - progressFactor * 3 + (Math.random() - 0.5) * 1);
    
    // Difficulty: 7 → 2 (decreasing)
    difficulty = Math.max(2, 7 - progressFactor * 5 + (Math.random() - 0.5) * 1);

    const feedbackRecord: FeedbackRecord = {
      id: `feedback_${patientId}_${week}_${Date.now()}`,
      patientId,
      sessionId: `session_${patientId}_${week}`,
      timestamp: date.toISOString(),
      pain: Math.round(pain),
      fatigue: Math.round(fatigue),
      difficulty: Math.round(difficulty),
      comments: comments[week] || "Regular check-in.",
    };

    feedback.push(feedbackRecord);
  }

  return feedback;
}

/**
 * Get feedback for a patient, generating mock data if none exists
 */
export async function getPatientFeedback(
  patientId: string
): Promise<FeedbackRecord[]> {
  try {
    const existingFeedback = await FeedbackRepository.listByPatient(patientId);
    
    if (existingFeedback.length >= 5) {
      // Already have enough feedback, return it
      return existingFeedback;
    }

    // Generate mock feedback if none exists or not enough
    const mockFeedback = await generateMockFeedback(patientId, 8);
    
    // Save mock feedback to database (only if not already exists)
    for (const feedback of mockFeedback) {
      try {
        const exists = await FeedbackRepository.getById(feedback.id);
        if (!exists) {
          await FeedbackRepository.create(feedback);
        }
      } catch (error) {
        // Ignore duplicates or errors
        console.log("Feedback already exists or error:", feedback.id);
      }
    }

    // Return all feedback (existing + newly created)
    return await FeedbackRepository.listByPatient(patientId);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    // Return empty array on error
    return [];
  }
}

/**
 * Create feedback entry
 */
export async function createFeedback(
  patientId: string,
  feedback: Omit<FeedbackRecord, "id" | "patientId">
): Promise<FeedbackRecord> {
  const feedbackRecord: FeedbackRecord = {
    id: `feedback_${patientId}_${Date.now()}`,
    patientId,
    ...feedback,
  };

  await FeedbackRepository.create(feedbackRecord);
  return feedbackRecord;
}

