import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@services/api';
import * as RemoteAuth from '@services/auth';


interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  token?: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_TOKEN_KEY = '@IRHIS:token';
const STORAGE_USER_KEY = '@IRHIS:user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    const storageUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
    const storageToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);

    if (storageUser && storageToken) {
      setUser(JSON.parse(storageUser));
      api.defaults.headers.common.Authorization = `Bearer ${storageToken}`;
    }
    setLoading(false);
  }

  async function login(email: string, password: string) {
    setLoading(true);

    const detectedRole: 'doctor' | 'patient' =
      email.toLowerCase().startsWith('doc') ? 'doctor' : 'patient';

    const { token, user: loggedUser } = await RemoteAuth.login(email, password, detectedRole);

    const userToStore: User = { ...loggedUser, token };

    setUser(userToStore);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userToStore));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);

    setLoading(false);
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_USER_KEY, STORAGE_TOKEN_KEY]);
    delete api.defaults.headers.common.Authorization;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
