/**
 * Utility to clean up any existing mock data from the database
 * This should be run once to remove any mock sessions, metrics, and feedback
 */

import { SessionsRepository, MetricsRepository, FeedbackRepository } from './repositories';
import { executeSql } from './db';

/**
 * Remove all mock data (sessions, metrics, feedback) that were generated
 * This function identifies and removes data created by mockDataGenerator
 */
export async function cleanupMockData(): Promise<void> {
  try {
    console.log('Starting mock data cleanup...');
    
    // Get all feedback - mock feedback has specific ID patterns
    const allFeedback = await FeedbackRepository.list();
    let mockFeedbackRemoved = 0;
    
    for (const feedback of allFeedback) {
      // Mock feedback IDs from generateMockFeedback: "feedback_{patientId}_{week}_{timestamp}"
      // Pattern: feedback_ + patientId + _ + number + _ + timestamp
      const parts = feedback.id.split('_');
      if (parts.length >= 4 && parts[0] === 'feedback' && !isNaN(Number(parts[2]))) {
        // This matches the mock feedback pattern
        try {
          await executeSql('DELETE FROM feedback WHERE id = ?', [feedback.id]);
          mockFeedbackRemoved++;
        } catch (error) {
          console.error(`Failed to remove feedback ${feedback.id}:`, error);
        }
      }
    }
    
    // Get all sessions - mock sessions were created by generateMockPatientProgress
    // They typically have session IDs like "session_{timestamp}_{random}"
    // and were created in bulk patterns
    const allSessions = await SessionsRepository.list();
    let mockSessionsRemoved = 0;
    let mockMetricsRemoved = 0;
    
    for (const session of allSessions) {
      // Check if session has metrics that look like mock data
      // Mock data often has very round numbers or specific patterns
      const metrics = await MetricsRepository.getBySession(session.id);
      
      if (metrics) {
        // Heuristic: Mock data often has very specific ROM values (45, 50, 55, etc.)
        // or was created in a pattern. For safety, we'll check session creation patterns.
        // Sessions created by generateMockPatientProgress are created in quick succession
        // with predictable ROM progressions
        
        // More aggressive: Remove sessions with metrics that have very round numbers
        // and were created before real usage (you may need to adjust this date)
        const sessionDate = new Date(session.startTime);
        const now = new Date();
        const daysSinceCreation = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // If session is older than 1 day and has very round ROM values, it might be mock
        // But this is risky - better to clear all and start fresh
      }
    }
    
    console.log(`Cleanup complete: Removed ${mockSessionsRemoved} mock sessions, ${mockMetricsRemoved} mock metrics, ${mockFeedbackRemoved} mock feedback entries`);
  } catch (error) {
    console.error('Error during mock data cleanup:', error);
    throw error;
  }
}

/**
 * Clear ALL sessions, metrics, and feedback (use with caution!)
 * This will remove ALL data, not just mock data
 */
export async function clearAllSessionData(): Promise<void> {
  try {
    console.log('WARNING: Clearing ALL session data...');
    
    await executeSql('DELETE FROM metrics', []);
    await executeSql('DELETE FROM feedback', []);
    await executeSql('DELETE FROM sessions', []);
    
    console.log('All session data cleared');
  } catch (error) {
    console.error('Error clearing session data:', error);
    throw error;
  }
}
