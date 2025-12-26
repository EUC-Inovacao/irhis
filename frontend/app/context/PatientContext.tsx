import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import type { Patient, PatientFeedback } from "../types";
import {
  getOrCreateLocalPatient,
  listLocalPatientsForDoctor,
  assignLocalPatientToDoctor,
} from "@services/localPatientService";
import {
  getAssignedExercises,
  AssignedExerciseWithDetails,
} from "@services/exerciseAssignmentService";
import { useAuth } from "./AuthContext";

interface PatientContextData {
  patients: Record<string, Patient>;
  loading: boolean;
  assignedExercises: Record<string, AssignedExerciseWithDetails[]>; // patientId -> exercises
  fetchPatients: () => Promise<void>;
  fetchAssignedExercises: (patientId: string) => Promise<void>;
  assignPatient: (patientId: string) => Promise<void>;
  updatePatient: (
    patientId: string,
    updates: Partial<Patient>
  ) => Promise<void>;
}

export const PatientContext = createContext<PatientContextData>({
  patients: {},
  loading: true,
  assignedExercises: {},
  fetchPatients: async () => {},
  fetchAssignedExercises: async () => {},
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
    Record<string, AssignedExerciseWithDetails[]>
  >({});

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let fetchedPatients: Patient[] = [];
      // Always use local storage (no Azure backend)
      if (user.role === "doctor") {
        fetchedPatients = await listLocalPatientsForDoctor(user.id);
      } else {
        const local = await getOrCreateLocalPatient(
          user.id,
          user.name || "Patient"
        );
        fetchedPatients = [local];
      }
      const patientsById = fetchedPatients.reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, Patient>
      );
      setPatients(patientsById);

      // Fetch assigned exercises for all patients
      const exercisesMap: Record<string, AssignedExerciseWithDetails[]> = {};
      for (const patient of fetchedPatients) {
        try {
          const exercises = await getAssignedExercises(patient.id);
          exercisesMap[patient.id] = exercises;
        } catch (error) {
          console.error(
            `Failed to fetch exercises for patient ${patient.id}:`,
            error
          );
          exercisesMap[patient.id] = [];
        }
      }
      setAssignedExercises(exercisesMap);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAssignedExercises = useCallback(
    async (patientId: string) => {
      try {
        const exercises = await getAssignedExercises(patientId);
        setAssignedExercises((prev) => ({
          ...prev,
          [patientId]: exercises,
        }));
      } catch (error) {
        console.error(
          `Failed to fetch exercises for patient ${patientId}:`,
          error
        );
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  const assignPatient = async (patientId: string) => {
    try {
      // Always use local storage (no Azure backend)
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
        fetchPatients,
        fetchAssignedExercises,
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
