import { PatientsRepository, SessionsRepository, MetricsRepository, FeedbackRepository, UsersRepository } from '../storage/repositories';
import { executeSql } from '../storage/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Confirmed patient from GET /doctors/me/patients */
export interface DoctorPatientConfirmed {
  type: "patient";
  id: string;
  name: string;
  email: string;
  nif: string;
  status: "Confirmed";
  lastSessionAt?: string;
  lastFeedbackAt?: string;
  sessionCount?: number;
  lastAvgROM?: number;
  lastAvgVelocity?: number;
}

/** Pending invite from GET /doctors/me/patients */
export interface DoctorPatientPending {
  type: "pending";
  id: string;
  email: string;
  inviteeName: string;
  name: string;
  status: "Pending";
  timeCreated: string;
}

export type DoctorPatientItem = DoctorPatientConfirmed | DoctorPatientPending;

export interface DoctorsMePatientsResponse {
  items: DoctorPatientItem[];
  confirmed: DoctorPatientConfirmed[];
  pending: DoctorPatientPending[];
}

async function getCurrentDoctorId(): Promise<string> {
  const userStr = await AsyncStorage.getItem('@IRHIS:user');
  if (!userStr) {
    throw new Error('User not logged in');
  }
  const user = JSON.parse(userStr);
  if (user.role !== 'doctor') {
    throw new Error('User is not a doctor');
  }
  return user.id;
}

export async function getDoctorsMePatients(params?: {
  search?: string;
  nif?: string;
  sort?: string;
}): Promise<DoctorsMePatientsResponse> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    // Get patient details and sessions
    const confirmed: DoctorPatientConfirmed[] = await Promise.all(
      doctorPatients.map(async (patient) => {
        const sessions = await SessionsRepository.listByPatient(patient.id);
        const feedback = await FeedbackRepository.listByPatient(patient.id);
        
        // Get latest session
        const latestSession = sessions.length > 0 ? sessions[0] : null;
        const latestFeedback = feedback.length > 0 ? feedback[0] : null;
        
        // Calculate average ROM from metrics
        let lastAvgROM: number | undefined;
        if (latestSession) {
          const metrics = await MetricsRepository.getBySession(latestSession.id);
          if (metrics) {
            lastAvgROM = metrics.rom;
          }
        }
        
        return {
          type: "patient" as const,
          id: patient.id,
          name: patient.name,
          email: patient.email || '',
          nif: '', // NIF not stored in local schema
          status: "Confirmed" as const,
          lastSessionAt: latestSession?.startTime,
          lastFeedbackAt: latestFeedback?.timestamp,
          sessionCount: sessions.length,
          lastAvgROM,
        };
      })
    );
    
    // Apply search filter if provided
    let filtered = confirmed;
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filtered = confirmed.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sort if provided
    if (params?.sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // No pending invites in local storage - return empty
    const pending: DoctorPatientPending[] = [];
    
    return {
      items: [...filtered, ...pending],
      confirmed: filtered,
      pending,
    };
  } catch (error) {
    console.error('Failed to get doctors patients:', error);
    throw error;
  }
}

export interface DashboardKPIs {
  totalPatients: number;
  activePatients: number;
  completedPatients: number;
  avgProgress: number;
}

export async function getDoctorsMeDashboard(): Promise<DashboardKPIs> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    const totalPatients = doctorPatients.length;
    
    // Calculate active patients (have sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let activePatients = 0;
    let completedPatients = 0;
    let totalProgress = 0;
    
    for (const patient of doctorPatients) {
      const sessions = await SessionsRepository.listByPatient(patient.id);
      const recentSessions = sessions.filter(s => 
        new Date(s.startTime) >= thirtyDaysAgo
      );
      
      if (recentSessions.length > 0) {
        activePatients++;
      }
      
      // Check if patient has completed exercises (simplified logic)
      const completedSessions = sessions.filter(s => s.endTime !== null);
      if (completedSessions.length > 0) {
        completedPatients++;
      }
      
      // Calculate progress (simplified: based on completed sessions)
      const progress = sessions.length > 0 
        ? (completedSessions.length / sessions.length) * 100 
        : 0;
      totalProgress += progress;
    }
    
    const avgProgress = totalPatients > 0 ? totalProgress / totalPatients : 0;
    
    return {
      totalPatients,
      activePatients,
      completedPatients,
      avgProgress: Math.round(avgProgress),
    };
  } catch (error) {
    console.error('Failed to get dashboard KPIs:', error);
    throw error;
  }
}

export interface LatestFeedbackItem {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  pain?: number;
  fatigue?: number;
  difficulty?: number;
  comments?: string;
  timeCreated: string;
}

export async function getDoctorsMeLatestFeedback(): Promise<LatestFeedbackItem[]> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    // Get all feedback for doctor's patients
    const allFeedback: LatestFeedbackItem[] = [];
    
    for (const patient of doctorPatients) {
      const feedback = await FeedbackRepository.listByPatient(patient.id);
      for (const fb of feedback) {
        allFeedback.push({
          id: fb.id,
          sessionId: fb.sessionId || '',
          patientId: fb.patientId,
          patientName: patient.name,
          pain: fb.pain,
          fatigue: fb.fatigue,
          difficulty: fb.difficulty,
          comments: fb.comments,
          timeCreated: fb.timestamp,
        });
      }
    }
    
    // Sort by timeCreated descending and return latest 10
    allFeedback.sort((a, b) => 
      new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );
    
    return allFeedback.slice(0, 10);
  } catch (error) {
    console.error('Failed to get latest feedback:', error);
    throw error;
  }
}

// Invite functions - not supported in local storage, return empty/stub
export interface InviteListItem {
  id: string;
  token: string;
  email: string;
  inviteeName: string;
  role: string;
  status: string;
  expiresAt?: string;
  timeCreated: string;
}

export async function getDoctorInvites(doctorId: string): Promise<{
  items: InviteListItem[];
}> {
  // Invites not supported in local storage
  return { items: [] };
}

export interface CreateInvitePayload {
  email: string;
  inviteeName: string;
  role: "Patient" | "Doctor";
}

export interface CreateInviteResponse {
  id: string;
  token: string;
  email: string;
  inviteeName: string;
  role: string;
  status: string;
  expiresAt: string;
}

export async function createInvite(
  payload: CreateInvitePayload
): Promise<CreateInviteResponse> {
  // Invites not supported in local storage - throw error or return stub
  throw new Error('Invites are not supported in local storage mode. Use Create Account instead.');
}

export async function resendInvite(inviteId: string): Promise<{ token: string }> {
  throw new Error('Invites are not supported in local storage mode.');
}

export async function revokeInvite(inviteId: string): Promise<void> {
  throw new Error('Invites are not supported in local storage mode.');
}

export interface MetricsSummaryItem {
  patientId: string;
  patientName: string;
  joint: string;
  side: string;
  avgROM?: number;
  avgVelocity?: number;
  date: string;
  exerciseType: string;
}

export async function getDoctorsMeMetricsSummary(): Promise<MetricsSummaryItem[]> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    const summary: MetricsSummaryItem[] = [];
    
    for (const patient of doctorPatients) {
      const sessions = await SessionsRepository.listByPatient(patient.id);
      
      for (const session of sessions) {
        const metrics = await MetricsRepository.getBySession(session.id);
        if (metrics && metrics.rom) {
          summary.push({
            patientId: patient.id,
            patientName: patient.name,
            joint: 'knee', // Simplified - would need to be stored in session
            side: session.side || 'both',
            avgROM: metrics.rom,
            date: session.startTime,
            exerciseType: session.exerciseType,
          });
        }
      }
    }
    
    return summary;
  } catch (error) {
    console.error('Failed to get metrics summary:', error);
    throw error;
  }
}

export interface RecentActivityItem {
  type: "session" | "feedback";
  patientId: string;
  patientName: string;
  label: string;
  date: string;
  sessionId?: string;
}

export async function getDoctorsMeRecentActivity(): Promise<RecentActivityItem[]> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    const activities: RecentActivityItem[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const patient of doctorPatients) {
      // Get recent sessions
      const sessions = await SessionsRepository.listByPatient(patient.id);
      const recentSessions = sessions.filter(s => 
        new Date(s.startTime) >= sevenDaysAgo
      );
      
      for (const session of recentSessions) {
        activities.push({
          type: "session",
          patientId: patient.id,
          patientName: patient.name,
          label: `Session: ${session.exerciseType}`,
          date: session.startTime,
          sessionId: session.id,
        });
      }
      
      // Get recent feedback
      const feedback = await FeedbackRepository.listByPatient(patient.id);
      const recentFeedback = feedback.filter(f => 
        new Date(f.timestamp) >= sevenDaysAgo
      );
      
      for (const fb of recentFeedback) {
        activities.push({
          type: "feedback",
          patientId: patient.id,
          patientName: patient.name,
          label: `Feedback submitted`,
          date: fb.timestamp,
          sessionId: fb.sessionId,
        });
      }
    }
    
    // Sort by date descending
    activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return activities.slice(0, 20); // Return latest 20
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    throw error;
  }
}

export interface TrendsData {
  avgPain: number;
  avgFatigue: number;
  avgDifficulty: number;
}

export async function getDoctorsMeTrends(): Promise<TrendsData> {
  try {
    const doctorId = await getCurrentDoctorId();
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalPain = 0;
    let totalFatigue = 0;
    let totalDifficulty = 0;
    let count = 0;
    
    for (const patient of doctorPatients) {
      const feedback = await FeedbackRepository.listByPatient(patient.id);
      const recentFeedback = feedback.filter(f => 
        new Date(f.timestamp) >= thirtyDaysAgo
      );
      
      for (const fb of recentFeedback) {
        totalPain += fb.pain;
        totalFatigue += fb.fatigue;
        totalDifficulty += fb.difficulty;
        count++;
      }
    }
    
    return {
      avgPain: count > 0 ? Math.round(totalPain / count) : 0,
      avgFatigue: count > 0 ? Math.round(totalFatigue / count) : 0,
      avgDifficulty: count > 0 ? Math.round(totalDifficulty / count) : 0,
    };
  } catch (error) {
    console.error('Failed to get trends:', error);
    throw error;
  }
}
