import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { User } from '../types';

export const login = async (email: string, password: string, role: 'patient' | 'doctor'): Promise<{ token: string; user: User }> => {
  try {
    const response = await api.post('/login', { email, password, role });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
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
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
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