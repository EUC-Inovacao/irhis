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
  getOrCreateLocalPatient,
  assignLocalPatientToDoctor,
} from "@services/localPatientService";
import {
  getAssignedExercises,
  AssignedExerciseWithDetails,
} from "@services/exerciseAssignmentService";
import {
  getPatientSessions,
  createSession as createSessionApi,
  CreateSessionDto,
} from "@services/sessionService";
import {
  getDoctorsMePatients,
  getDoctorsMeDashboard,
  getDoctorsMeLatestFeedback,
  type DoctorPatientItem,
  type DashboardKPIs,
  type LatestFeedbackItem,
} from "@services/doctorService";
import { useAuth } from "./AuthContext";

/** Session-based exercise shape compatible with AssignedExerciseWithDetails for list/card display */
export type SessionAsExercise = AssignedExerciseWithDetails & {
  sessionId?: string;
  timeCreated?: string;
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
  /** Doctor dashboard load error */
  doctorDashboardError: string | null;
  fetchPatients: () => Promise<void>;
  fetchAssignedExercises: (patientId: string) => Promise<void>;
  fetchPatientSessions: (patientId: string) => Promise<void>;
  createSession: (patientId: string, dto: CreateSessionDto) => Promise<Session>;
  assignPatient: (patientId: string) => Promise<void>;
  updatePatient: (
    patientId: string,
    updates: Partial<Patient>
  ) => Promise<void>;
}

function sessionToExercise(s: Session, completed: boolean): SessionAsExercise {
  return {
    id: s.id,
    patientId: "",
    exerciseTypeId: s.exerciseType || s.id,
    assignedDate: s.timeCreated,
    completed: completed ? 1 : 0,
    targetReps: s.repetitions ?? null,
    targetSets: 3,
    sessionId: s.id,
    timeCreated: s.timeCreated,
    exerciseType: {
      id: s.id,
      name: s.exerciseType || "Exercise",
      category: "general",
      targetReps: s.repetitions ?? 10,
      targetSets: 3,
    },
  } as SessionAsExercise;
}

export const PatientContext = createContext<PatientContextData>({
  patients: {},
  loading: true,
  assignedExercises: {},
  sessionsByPatient: {},
  doctorPatientsItems: [],
  dashboardKpis: null,
  latestFeedback: [],
  doctorDashboardError: null,
  fetchPatients: async () => {},
  fetchAssignedExercises: async () => {},
  fetchPatientSessions: async () => {},
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
      const all: SessionAsExercise[] = [
        ...assigned.map((s) => sessionToExercise(s, false)),
        ...completed.map((s) => sessionToExercise(s, true)),
      ];
      setAssignedExercises((prev) => ({
        ...prev,
        [patientId]: all,
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
    setLoading(true);
    setDoctorDashboardError(null);
    try {
      if (user.role === "doctor") {
        const [patientsRes, kpisRes, feedbackRes] = await Promise.all([
          getDoctorsMePatients().catch((e) => {
            throw e;
          }),
          getDoctorsMeDashboard().catch(() => null),
          getDoctorsMeLatestFeedback().catch(() => []),
        ]);
        setDoctorPatientsItems(patientsRes.items);
        setDashboardKpis(kpisRes);
        setLatestFeedback(Array.isArray(feedbackRes) ? feedbackRes : []);
        const confirmed =
          patientsRes.confirmed ??
          patientsRes.items.filter((x) => x.type === "patient");
        const patientsById: Record<string, Patient> = {};
        for (const c of confirmed) {
          patientsById[c.id] = {
            id: c.id,
            name: c.name,
            details: undefined,
            recovery_process: [],
          };
        }
        setPatients(patientsById);
        for (const c of confirmed) {
          try {
            await fetchPatientSessions(c.id);
          } catch {
            setAssignedExercises((prev) => ({ ...prev, [c.id]: [] }));
            setSessionsByPatient((prev) => ({
              ...prev,
              [c.id]: { assigned: [], completed: [] },
            }));
          }
        }
      } else {
        const local = await getOrCreateLocalPatient(
          user.id,
          user.name || "Patient"
        );
        const patientsById = { [local.id]: local };
        setPatients(patientsById);
        setDoctorPatientsItems([]);
        setDashboardKpis(null);
        setLatestFeedback([]);
        try {
          await fetchPatientSessions(local.id);
        } catch {
          try {
            const exercises = await getAssignedExercises(local.id);
            setAssignedExercises((prev) => ({
              ...prev,
              [local.id]: exercises as SessionAsExercise[],
            }));
            setSessionsByPatient((prev) => ({
              ...prev,
              [local.id]: { assigned: [], completed: [] },
            }));
          } catch (err) {
            console.error("Failed to fetch exercises for patient:", err);
            setAssignedExercises((prev) => ({ ...prev, [local.id]: [] }));
            setSessionsByPatient((prev) => ({
              ...prev,
              [local.id]: { assigned: [], completed: [] },
            }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      if (user?.role === "doctor") {
        setDoctorDashboardError(
          (error as Error)?.message || "Failed to load dashboard"
        );
        setDoctorPatientsItems([]);
        setDashboardKpis(null);
        setLatestFeedback([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchPatientSessions]);

  const fetchAssignedExercises = useCallback(
    async (patientId: string) => {
      try {
        await fetchPatientSessions(patientId);
      } catch {
        try {
          const exercises = await getAssignedExercises(patientId);
          setAssignedExercises((prev) => ({
            ...prev,
            [patientId]: exercises as SessionAsExercise[],
          }));
        } catch (error) {
          console.error(
            `Failed to fetch exercises for patient ${patientId}:`,
            error
          );
        }
      }
    },
    [fetchPatientSessions]
  );

  const createSession = useCallback(
    async (patientId: string, dto: CreateSessionDto): Promise<Session> => {
      const session = await createSessionApi(patientId, dto);
      await fetchPatientSessions(patientId);
      return session;
    },
    [fetchPatientSessions]
  );

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  const assignPatient = async (patientId: string) => {
    try {
      // Local assign; backend POST assign-doctor returns 410 (use invite flow for DB)
      await assignLocalPatientToDoctor(patientId, user!.id);
      await fetchPatients();
    } catch (error) {
      console.error("Failed to assign patient:", error);
      throw error;
    }
  };

  const updatePatient = async (
    patientId: string,
    updates: Partial<Patient>
  ) => {
    try {
      // Update local state only (no remote API)
      setPatients((prevPatients) => {
        const updatedPatient = {
          ...prevPatients[patientId],
          ...updates,
        };
        return {
          ...prevPatients,
          [patientId]: updatedPatient,
        };
      });
    } catch (error) {
      console.error("Failed to update patient:", error);
      throw error;
    }
  };

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
        doctorDashboardError,
        fetchPatients,
        fetchAssignedExercises,
        fetchPatientSessions,
        createSession,
        assignPatient,
        updatePatient,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export function usePatients() {
  return useContext(PatientContext);
}
