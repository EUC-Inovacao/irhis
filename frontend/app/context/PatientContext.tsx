import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import type { Patient, Session } from "../types";

import {
  getPatientSessions,
  createSession as createSessionApi,
  CreateSessionDto,
} from "@services/sessionService";

import {
  getDoctorsMePatients,
  getDoctorsMeDashboard,
  getDoctorsMeLatestFeedback,
  getDoctorsMeMetricsSummary,
  getDoctorsMeRecentActivity,
  getDoctorsMeTrends,
  type DoctorPatientItem,
  type DashboardKPIs,
  type LatestFeedbackItem,
  type MetricsSummaryItem,
  type RecentActivityItem,
  type TrendsData,
} from "@services/doctorService";

import { assignPatientToDoctor, getPatientById } from "@services/patientService";
import { useAuth } from "./AuthContext";

export type SessionAsExercise = {
  id: string;
  patientId: string;
  exerciseTypeId: string;
  assignedDate?: string;
  completed: 0 | 1;
  targetReps: number | null;
  targetSets: number | null;

  sessionId?: string;
  timeCreated?: string;

  exerciseType?: {
    id: string;
    name: string;
    category?: string;
    targetReps?: number | null;
    targetSets?: number | null;
    description?: string | null;
  };
};

export interface SessionsByPatient {
  assigned: Session[];
  completed: Session[];
}

interface PatientContextData {
  patients: Record<string, Patient>;
  loading: boolean;
  assignedExercises: Record<string, SessionAsExercise[]>;
  sessionsByPatient: Record<string, SessionsByPatient>;
  /** Doctor dashboard: list (confirmed + pending) from API */
  doctorPatientsItems: DoctorPatientItem[];
  /** Doctor dashboard KPIs from API */
  dashboardKpis: DashboardKPIs | null;
  /** Doctor dashboard: latest feedback entries */
  latestFeedback: LatestFeedbackItem[];
  /** Doctor dashboard: metrics summary */
  metricsSummary: MetricsSummaryItem[];
  /** Doctor dashboard: recent activity */
  recentActivity: RecentActivityItem[];
  /** Doctor dashboard: trends data */
  trends: TrendsData | null;
  /** Doctor dashboard load error */
  doctorDashboardError: string | null;
  fetchPatients: () => Promise<void>;
  fetchMetricsSummary: () => Promise<void>;
  fetchRecentActivity: () => Promise<void>;
  fetchTrends: () => Promise<void>;

  fetchPatientSessions: (patientId: string) => Promise<void>;
  fetchAssignedExercises: (patientId: string) => Promise<void>;
  createSession: (patientId: string, dto: CreateSessionDto) => Promise<Session>;

  assignPatient: (patientId: string) => Promise<void>;
  updatePatient: (patientId: string, updates: Partial<Patient>) => Promise<void>;
}

function sessionToExercise(session: Session, completed: boolean): SessionAsExercise {
  const exerciseTypeName =
    (session as any).exerciseTypeName ??
    (session as any).exerciseType ??
    "Exercise";

  const exerciseTypeId =
    (session as any).exerciseTypeId ??
    (session as any).exercise_id ??
    (session as any).exerciseType ??
    session.id;

  const createdAt =
    (session as any).timeCreated ??
    (session as any).created_at ??
    (session as any).startTime ??
    undefined;

  const repetitions =
    (session as any).repetitions ??
    (session as any).target_reps ??
    null;

  const sets =
    (session as any).targetSets ??
    (session as any).target_sets ??
    null;

  return {
    id: session.id,
    patientId: (session as any).patientId ?? "",
    exerciseTypeId: String(exerciseTypeId),
    assignedDate: createdAt,
    completed: completed ? 1 : 0,
    targetReps: repetitions,
    targetSets: sets ?? 3,
    sessionId: session.id,
    timeCreated: createdAt,
    exerciseType: {
      id: String(exerciseTypeId),
      name: String(exerciseTypeName),
      category: "general",
      targetReps: repetitions ?? 10,
      targetSets: sets ?? 3,
    },
  };
}

export const PatientContext = createContext<PatientContextData>({
  patients: {},
  loading: true,
  assignedExercises: {},
  sessionsByPatient: {},
  doctorPatientsItems: [],
  dashboardKpis: null,
  latestFeedback: [],
  metricsSummary: [],
  recentActivity: [],
  trends: null,
  doctorDashboardError: null,
  fetchPatients: async () => {},
  fetchMetricsSummary: async () => {},
  fetchRecentActivity: async () => {},
  fetchTrends: async () => {},

  fetchPatientSessions: async () => {},
  fetchAssignedExercises: async () => {},
  createSession: async () => ({} as Session),

  assignPatient: async () => {},
  updatePatient: async () => {},
});

export const PatientProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [assignedExercises, setAssignedExercises] = useState<
    Record<string, SessionAsExercise[]>
  >({});
  const [sessionsByPatient, setSessionsByPatient] = useState<
    Record<string, SessionsByPatient>
  >({});
  const [doctorPatientsItems, setDoctorPatientsItems] = useState<
    DoctorPatientItem[]
  >([]);
  const [dashboardKpis, setDashboardKpis] = useState<DashboardKPIs | null>(
    null
  );
  const [latestFeedback, setLatestFeedback] = useState<LatestFeedbackItem[]>(
    []
  );
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummaryItem[]>(
    []
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    []
  );
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [doctorDashboardError, setDoctorDashboardError] = useState<string | null>(
    null
  );

  const fetchPatientSessions = useCallback(async (patientId: string) => {
    try {
      const { assigned, completed } = await getPatientSessions(patientId);
      setSessionsByPatient((prev) => ({
        ...prev,
        [patientId]: { assigned, completed },
      }));

      const allExercises: SessionAsExercise[] = [
        ...assigned.map((s) => sessionToExercise(s, false)),
        ...completed.map((s) => sessionToExercise(s, true)),
      ];
      setAssignedExercises((prev) => ({
        ...prev,
        [patientId]: allExercises,
      }));
    } catch (error) {
      console.error(
        `Failed to fetch sessions for patient ${patientId}:`,
        error
      );
      setSessionsByPatient((prev) => ({
        ...prev,
        [patientId]: { assigned: [], completed: [] },
      }));
      setAssignedExercises((prev) => ({ ...prev, [patientId]: [] }));
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:228',message:'fetchPatients called',data:{userId:user?.id,userRole:user?.role},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    setDoctorDashboardError(null);
    try {
      if (user.role?.toLowerCase() === "doctor") {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:234',message:'fetchPatients doctor branch - calling getDoctorsMePatients',data:{userId:user.id},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const [
          patientsRes,
          kpisRes,
          feedbackRes,
          metricsRes,
          activityRes,
          trendsRes,
        ] = await Promise.all([
          getDoctorsMePatients(),
          getDoctorsMeDashboard().catch(() => null),
          getDoctorsMeLatestFeedback().catch(() => []),
          getDoctorsMeMetricsSummary().catch(() => []),
          getDoctorsMeRecentActivity().catch(() => []),
          getDoctorsMeTrends().catch(() => null),
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:249',message:'fetchPatients doctor branch - received patientsRes',data:{itemsCount:patientsRes?.items?.length,confirmedCount:patientsRes?.confirmed?.length,hasItems:!!patientsRes?.items,patientsRes},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setDoctorPatientsItems(patientsRes.items);
        setDashboardKpis(kpisRes);
        setLatestFeedback(Array.isArray(feedbackRes) ? feedbackRes : []);
        setMetricsSummary(Array.isArray(metricsRes) ? metricsRes : []);
        setRecentActivity(Array.isArray(activityRes) ? activityRes : []);
        setTrends(trendsRes);
        const confirmed =
          patientsRes.confirmed ??
          patientsRes.items.filter((x: any) => x.type === "patient");
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:257',message:'fetchPatients doctor branch - confirmed patients',data:{confirmedCount:confirmed?.length,confirmed},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const patientsById: Record<string, Patient> = {};
        // Load full patient data for each confirmed patient in parallel
        const patientPromises = confirmed.map(async (c: any) => {
          try {
            const fullPatient = await getPatientById(c.id);
            if (fullPatient) {
              return { id: c.id, patient: fullPatient };
            } else {
              // Fallback if patient not found
              return {
                id: c.id,
                patient: {
                  id: c.id,
                  name: c.name,
                  details: {
                    age: 0,
                    sex: 'Other' as const,
                    height: 0,
                    weight: 0,
                    bmi: 0,
                    clinicalInfo: 'No information provided.',
                  },
                  recovery_process: [],
                },
              };
            }
          } catch (err) {
            console.error(`Failed to load patient ${c.id}:`, err);
            return {
              id: c.id,
              patient: {
                id: c.id,
                name: c.name,
                details: {
                  age: 0,
                  sex: 'Other' as const,
                  height: 0,
                  weight: 0,
                  bmi: 0,
                  clinicalInfo: 'No information provided.',
                },
                recovery_process: [],
              },
            };
          }
        });
        
        const patientResults = await Promise.all(patientPromises);
        for (const result of patientResults) {
          patientsById[result.id] = result.patient;
        }
        setPatients(patientsById);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:299',message:'fetchPatients doctor branch - setPatients called',data:{patientsByIdCount:Object.keys(patientsById).length,patientsById},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        await Promise.all(
          confirmed.map((c: any) => fetchPatientSessions(c.id).catch(() => undefined))
        );
      } else {
        const fullPatient = await getPatientById(user.id);

        if (fullPatient) {
          setPatients({ [fullPatient.id]: fullPatient });
          await fetchPatientSessions(fullPatient.id);
        } else {
          setPatients({});
        }

        setDoctorPatientsItems([]);
        setDashboardKpis(null);
        setLatestFeedback([]);
        setMetricsSummary([]);
        setRecentActivity([]);
        setTrends(null);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PatientContext.tsx:320',message:'fetchPatients error caught',data:{errorMessage:(error as Error)?.message,errorString:String(error),userRole:user?.role},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error("Failed to fetch patients:", error);
      if (user?.role?.toLowerCase() === "doctor") {
        setDoctorDashboardError(
          (error as Error)?.message || "Failed to load dashboard"
        );
        setDoctorPatientsItems([]);
        setDashboardKpis(null);
        setLatestFeedback([]);
        setMetricsSummary([]);
        setRecentActivity([]);
        setTrends(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchPatientSessions]);

  const createSession = useCallback(
    async (patientId: string, dto: CreateSessionDto): Promise<Session> => {
      const session = await createSessionApi(patientId, dto);
      await fetchPatientSessions(patientId);
      return session;
    },
    [fetchPatientSessions]
  );

  useEffect(() => {
    if (user) fetchPatients();
  }, [user, fetchPatients]);

  const assignPatient = async (patientId: string) => {
    await assignPatientToDoctor(patientId);
    await fetchPatients();
  };

  const updatePatient = async (patientId: string, updates: Partial<Patient>) => {
    setPatients((prev) => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        ...updates,
      },
    }));
  };

  const fetchMetricsSummary = useCallback(async () => {
    if (user?.role !== "doctor") return;
    try {
      const data = await getDoctorsMeMetricsSummary();
      setMetricsSummary(data);
    } catch (error) {
      console.error("Failed to fetch metrics summary:", error);
      setMetricsSummary([]);
    }
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (user?.role !== "doctor") return;
    try {
      const data = await getDoctorsMeRecentActivity();
      setRecentActivity(data);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      setRecentActivity([]);
    }
  }, [user]);

  const fetchTrends = useCallback(async () => {
    if (user?.role !== "doctor") return;
    try {
      const data = await getDoctorsMeTrends();
      setTrends(data);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      setTrends(null);
    }
  }, [user]);

  return (
    <PatientContext.Provider
      value={{
        patients,
        loading,
        assignedExercises,
        sessionsByPatient,
        doctorPatientsItems,
        dashboardKpis,
        latestFeedback,
        metricsSummary,
        recentActivity,
        trends,
        doctorDashboardError,
        fetchPatients,
        fetchPatientSessions,
        fetchAssignedExercises: fetchPatientSessions, // Alias for backward compatibility
        createSession,
        assignPatient,
        updatePatient,
        fetchMetricsSummary,
        fetchRecentActivity,
        fetchTrends,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export function usePatients() {
  return useContext(PatientContext);
}
