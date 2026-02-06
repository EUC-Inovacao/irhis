import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { User } from '../types';

export const login = async (email: string, password: string, role: 'patient' | 'doctor'): Promise<{ token: string; user: User }> => {
  try {
    const response = await api.post('/login', { email, password, role });
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Provide helpful error messages for common issues
    if (error.response?.status === 503 || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      const apiUrl = api.defaults.baseURL;
      throw new Error(
        `Cannot connect to Azure API at ${apiUrl}. ` +
        `Please check your internet connection and try again.`
      );
    }
    
    const msg = error.response?.data?.error || error.message || 'Invalid credentials';
    throw Object.assign(new Error(msg), { response: error.response });
  }
};

export const signup = async (
  name: string,
  email: string,
  password: string,
  role: 'patient' | 'doctor'
): Promise<{ token: string; user: User }> => {
  try {
    const response = await api.post('/signup', { name, email, password, role });
    return response.data;
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Provide helpful error messages for common issues
    if (error.response?.status === 503 || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      const apiUrl = api.defaults.baseURL;
      throw new Error(
        `Cannot connect to Azure API at ${apiUrl}. ` +
        `Please check your internet connection and try again.`
      );
    }
    
    if (error.response?.status === 409) {
      throw Object.assign(new Error('An account with this email already exists. Please login instead.'), { response: error.response });
    }
    const msg = error.response?.data?.error || error.message || 'Failed to create account. Please try again.';
    throw Object.assign(new Error(msg), { response: error.response });
  }
};

export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('@iRHIS:token');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}; 