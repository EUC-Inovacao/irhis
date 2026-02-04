import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CORREÇÃO 1: Adicionar 'id' e 'name' à interface para não dar erro no AppNavigator
interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  token?: string;
}

// Definir o formato do Contexto
interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    const storageUser = await AsyncStorage.getItem('@IRHIS:user');
    const storageToken = await AsyncStorage.getItem('@IRHIS:token');

    if (storageUser && storageToken) {
      setUser(JSON.parse(storageUser));
    }
    setLoading(false);
  }

  async function login(email: string, password: string) {
    setLoading(true);
    
    // Simulação: Decide se é doutor ou paciente
    const detectedRole = email.toLowerCase().startsWith('doc') ? 'doctor' : 'patient';
    
    // Simulação: Cria um nome fictício para não dar erro de "missing name"
    const detectedName = detectedRole === 'doctor' ? 'Dr. Teste' : 'Paciente Teste';

    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // CORREÇÃO 2: Preencher o objeto User completo
    const mockUser: User = {
      id: 'user-123', // ID Fictício
      name: detectedName, // Nome Fictício
      email,
      role: detectedRole,
      token: 'fake-jwt-token',
    };

    setUser(mockUser);

    await AsyncStorage.setItem('@IRHIS:user', JSON.stringify(mockUser));
    await AsyncStorage.setItem('@IRHIS:token', 'fake-jwt-token');
    
    setLoading(false);
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.clear();
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
