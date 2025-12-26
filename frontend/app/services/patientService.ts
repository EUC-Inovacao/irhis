import api from './api';
import type { Patient, PatientDetails, RecoveryProcess, PatientFeedback } from '../types/index';
import axios from 'axios';

export const getPatientsForDoctor = async (doctorId: string): Promise<Patient[]> => {
    try {
        const response = await api.get(`/doctors/${doctorId}/patients`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch patients for doctor:', error);
        throw error;
    }
};

export const getPatientById = async (patientId: string): Promise<Patient | null> => {
    try {
        const response = await api.get(`/patients/${patientId}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        console.error('Failed to fetch patient by ID:', error);
        throw error;
    }
};

export const getUnassignedPatients = async (): Promise<Patient[]> => {
    try {
        const response = await api.get('/patients/unassigned');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch unassigned patients:', error);
        throw error;
    }
};

export const assignPatientToDoctor = async (patientId: string): Promise<void> => {
    try {
        await api.post(`/patients/${patientId}/assign-doctor`);
    } catch (error) {
        console.error('Failed to assign patient to doctor:', error);
        throw error;
    }
};

export const updatePatientDetails = async (patientId: string, details: Partial<PatientDetails>): Promise<Patient> => {
    try {
        const response = await api.put(`/patients/${patientId}/details`, details);
        return response.data;
    } catch (error) {
        console.error('Failed to update patient details:', error);
        throw error;
    }
};

export const updateRecoveryProcess = async (patientId: string, recoveryProcess: RecoveryProcess[]): Promise<Patient> => {
    try {
        const response = await api.put(`/patients/${patientId}/recovery-process`, recoveryProcess);
        return response.data;
    } catch (error) {
        console.error('Failed to update recovery process:', error);
        throw error;
    }
};

export const updatePatientFeedback = async (patientId: string, feedback: PatientFeedback[]): Promise<Patient> => {
    try {
        const response = await api.put(`/patients/${patientId}/feedback`, { feedback });
        return response.data;
    } catch (error) {
        console.error('Failed to update patient feedback:', error);
        throw error;
    }
};

export default {
    getPatientsForDoctor,
    getUnassignedPatients,
    assignPatientToDoctor,
    updatePatientFeedback,
}; 