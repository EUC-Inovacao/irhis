import { PatientsRepository, FeedbackRepository, AssignedExercisesRepository, ExerciseTypesRepository, UsersRepository } from '../storage/repositories';
import type { Patient, PatientDetails, RecoveryProcess, PatientFeedback } from '../types/index';
import { executeSql } from '../storage/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to convert PatientRecord to PatientDetails
function createPatientDetails(record: any): PatientDetails {
  // Calculate age from birthDate
  let age = 0;
  if (record.birthDate) {
    const birthDate = new Date(record.birthDate);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  // Convert sex enum to PatientDetails format
  const sexMap: Record<string, "Male" | "Female" | "Other"> = {
    'male': 'Male',
    'female': 'Female',
  };

  return {
    age,
    sex: sexMap[record.sex] || 'Other',
    height: record.height ? record.height / 100 : 0, // Convert cm to meters
    weight: record.weight || 0,
    bmi: record.bmi || 0,
    clinicalInfo: record.medicalHistory || 'No information provided.',
    medicalHistory: record.medicalHistory,
  };
}

// Helper to convert PatientRecord to Patient type
function toPatient(record: any, recoveryProcess?: RecoveryProcess[], feedback?: PatientFeedback[]): Patient {
  const details = createPatientDetails(record);
  return {
    id: record.id,
    name: record.name,
    details,
    recovery_process: recoveryProcess || [],
    doctor: record.doctorId ? { id: record.doctorId, name: '' } : undefined,
    feedback: feedback || [],
  };
}

export const getPatientsForDoctor = async (doctorId: string): Promise<Patient[]> => {
  try {
    const allPatients = await PatientsRepository.list();
    const doctorPatients = allPatients.filter(p => p.doctorId === doctorId);
    
    // Convert to Patient type
    return Promise.all(doctorPatients.map(async (record) => {
      const feedback = await FeedbackRepository.listByPatient(record.id);
      const feedbackList: PatientFeedback[] = feedback.map(f => ({
        id: f.id,
        patientId: f.patientId,
        sessionId: f.sessionId,
        timestamp: f.timestamp,
        pain: f.pain,
        fatigue: f.fatigue,
        difficulty: f.difficulty,
        comments: f.comments,
      }));
      
      // Get recovery process from assigned exercises
      const assignedExercises = await AssignedExercisesRepository.listByPatient(record.id);
      const recoveryProcess: RecoveryProcess[] = await Promise.all(
        assignedExercises.map(async (ex) => {
          const exerciseType = ex.exerciseTypeId 
            ? await ExerciseTypesRepository.getById(ex.exerciseTypeId)
            : null;
          return {
            id: ex.id,
            name: exerciseType?.name || 'Exercise',
            completed: ex.completed === 1,
            assignedDate: ex.assignedDate,
            targetRepetitions: ex.targetReps,
            targetSets: ex.targetSets,
            instructions: exerciseType?.instructions,
          };
        })
      );
      
      return toPatient(record, recoveryProcess, feedbackList);
    }));
  } catch (error) {
    console.error('Failed to fetch patients for doctor:', error);
    throw error;
  }
};

export const getPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    const record = await PatientsRepository.getById(patientId);
    if (!record) {
      return null;
    }
    
    // Get feedback
    const feedback = await FeedbackRepository.listByPatient(patientId);
    const feedbackList: PatientFeedback[] = feedback.map(f => ({
      id: f.id,
      patientId: f.patientId,
      sessionId: f.sessionId,
      timestamp: f.timestamp,
      pain: f.pain,
      fatigue: f.fatigue,
      difficulty: f.difficulty,
      comments: f.comments,
    }));
    
    // Get recovery process from assigned exercises
    const assignedExercises = await AssignedExercisesRepository.listByPatient(patientId);
    const recoveryProcess: RecoveryProcess[] = await Promise.all(
      assignedExercises.map(async (ex) => {
        const exerciseType = ex.exerciseTypeId 
          ? await ExerciseTypesRepository.getById(ex.exerciseTypeId)
          : null;
        return {
          id: ex.id,
          name: exerciseType?.name || 'Exercise',
          completed: ex.completed === 1,
          assignedDate: ex.assignedDate,
          targetRepetitions: ex.targetReps,
          targetSets: ex.targetSets,
          instructions: exerciseType?.instructions,
        };
      })
    );
    
    return toPatient(record, recoveryProcess, feedbackList);
  } catch (error) {
    console.error('Failed to fetch patient by ID:', error);
    throw error;
  }
};

export const getUnassignedPatients = async (): Promise<Patient[]> => {
  try {
    const records = await PatientsRepository.listUnassigned();
    return records.map(record => toPatient(record, [], []));
  } catch (error) {
    console.error('Failed to fetch unassigned patients:', error);
    throw error;
  }
};

export const assignPatientToDoctor = async (patientId: string): Promise<void> => {
  try {
    // Get current user from AsyncStorage to get doctor ID
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const userStr = await AsyncStorage.getItem('@IRHIS:user');
    if (!userStr) {
      throw new Error('User not logged in');
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'doctor') {
      throw new Error('Only doctors can assign patients');
    }
    
    await PatientsRepository.assignToDoctor(patientId, user.id);
  } catch (error) {
    console.error('Failed to assign patient to doctor:', error);
    throw error;
  }
};

export const updatePatientDetails = async (patientId: string, details: Partial<PatientDetails>): Promise<Patient> => {
  try {
    // For now, we'll store details as JSON in a separate table or extend the patients table
    // Since the schema doesn't have a details column, we'll need to extend it
    // For now, just return the patient - details can be stored separately if needed
    const patient = await getPatientById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    // Update patient with new details
    patient.details = { ...patient.details, ...details } as PatientDetails;
    
    return patient;
  } catch (error) {
    console.error('Failed to update patient details:', error);
    throw error;
  }
};

export const updateRecoveryProcess = async (patientId: string, recoveryProcess: RecoveryProcess[]): Promise<Patient> => {
  try {
    // Recovery process is stored as assigned exercises
    // We'll sync the recovery process to assigned exercises
    const existingExercises = await AssignedExercisesRepository.listByPatient(patientId);
    
    // Update existing exercises
    for (const exercise of existingExercises) {
      const recoveryItem = recoveryProcess.find(rp => rp.id === exercise.id);
      if (recoveryItem) {
        await AssignedExercisesRepository.update(exercise.id, {
          completed: recoveryItem.completed ? 1 : 0,
          targetReps: recoveryItem.targetRepetitions,
          targetSets: recoveryItem.targetSets,
        });
      }
    }
    
    // Get updated patient
    return await getPatientById(patientId) || {} as Patient;
  } catch (error) {
    console.error('Failed to update recovery process:', error);
    throw error;
  }
};

export const updatePatientFeedback = async (patientId: string, feedback: PatientFeedback[]): Promise<Patient> => {
  try {
    // Save feedback using FeedbackRepository
    for (const fb of feedback) {
      if (fb.id) {
        // Check if feedback already exists
        const existing = await FeedbackRepository.getById(fb.id);
        if (!existing) {
          await FeedbackRepository.create({
            id: fb.id,
            patientId: fb.patientId || patientId,
            sessionId: fb.sessionId,
            timestamp: fb.timestamp || new Date().toISOString(),
            pain: fb.pain,
            fatigue: fb.fatigue,
            difficulty: fb.difficulty,
            comments: fb.comments,
          });
        }
      }
    }
    
    // Get updated patient
    return await getPatientById(patientId) || {} as Patient;
  } catch (error) {
    console.error('Failed to update patient feedback:', error);
    throw error;
  }
};

export interface CreatePatientData {
  name: string;
  email?: string;
  birthDate: string; // Required - DATE NOT NULL
  sex: 'male' | 'female'; // Required - ENUM NOT NULL
  weight?: number;
  height?: number;
  bmi?: number;
  occupation?: 'white' | 'blue';
  education?: number;
  affectedRightKnee: boolean; // Required
  affectedLeftKnee: boolean; // Required
  affectedRightHip: boolean; // Required
  affectedLeftHip: boolean; // Required
  medicalHistory?: string;
  timeAfterSymptoms?: number;
  legDominance: 'dominant' | 'non-dominant'; // Required
  contralateralJointAffect: boolean; // Required
  physicallyActive: boolean; // Required
  coMorbiditiesNMS: boolean; // Required
  coMorbiditiesSystemic: boolean; // Required
}

export const createNewPatient = async (patientData: CreatePatientData): Promise<Patient> => {
  try {
    // Get current doctor from AsyncStorage
    const userStr = await AsyncStorage.getItem('@IRHIS:user');
    if (!userStr) {
      throw new Error('User not logged in');
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'doctor') {
      throw new Error('Only doctors can create patients');
    }
    
    // Generate patient ID
    const patientId = `pat_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const now = new Date().toISOString();
    
    // Create user record for the patient
    await UsersRepository.create({
      id: patientId,
      name: patientData.name,
      email: patientData.email || `${patientId}@irhis.local`,
      role: 'patient',
      createdAt: now,
      passwordHash: null,
      salt: null,
    });
    
    // Create patient record with all required fields
    await PatientsRepository.create({
      id: patientId,
      name: patientData.name,
      email: patientData.email,
      birthDate: patientData.birthDate,
      sex: patientData.sex,
      weight: patientData.weight,
      height: patientData.height,
      bmi: patientData.bmi,
      occupation: patientData.occupation,
      education: patientData.education,
      affectedRightKnee: patientData.affectedRightKnee,
      affectedLeftKnee: patientData.affectedLeftKnee,
      affectedRightHip: patientData.affectedRightHip,
      affectedLeftHip: patientData.affectedLeftHip,
      medicalHistory: patientData.medicalHistory,
      timeAfterSymptoms: patientData.timeAfterSymptoms,
      legDominance: patientData.legDominance,
      contralateralJointAffect: patientData.contralateralJointAffect,
      physicallyActive: patientData.physicallyActive,
      coMorbiditiesNMS: patientData.coMorbiditiesNMS,
      coMorbiditiesSystemic: patientData.coMorbiditiesSystemic,
      createdAt: now,
      doctorId: user.id, // Automatically assign to current doctor
    });
    
    // Return the created patient
    return await getPatientById(patientId) || {} as Patient;
  } catch (error) {
    console.error('Failed to create new patient:', error);
    throw error;
  }
};

export default {
  getPatientsForDoctor,
  getUnassignedPatients,
  assignPatientToDoctor,
  updatePatientFeedback,
  createNewPatient,
};
