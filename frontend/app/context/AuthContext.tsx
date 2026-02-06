import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuth from '@services/localAuthService';


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
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_USER_KEY = '@IRHIS:user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure database is initialized before loading user data
    const initAndLoad = async () => {
      try {
        // Import and run migrations if needed
        const { runMigrations } = await import('../storage/db');
        await runMigrations();
      } catch (error) {
        console.error('Error initializing database:', error);
        // Continue anyway - database might already be initialized
      }
      await loadStorageData();
    };
    initAndLoad();
  }, []);

  async function loadStorageData() {
    try {
      const storageUser = await AsyncStorage.getItem(STORAGE_USER_KEY);

      if (storageUser) {
        setUser(JSON.parse(storageUser));
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
      // Continue even if there's an error
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);

    try {
      // Let localAuthService determine the correct role based on stored user data
      const { user: loggedUser } = await LocalAuth.login(email, password);

      const userToStore: User = { ...loggedUser };

      setUser(userToStore);

      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userToStore));
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw so the caller can handle it
    } finally {
      setLoading(false);
    }
  }

  async function setUserDirectly(userToSet: User) {
    setUser(userToSet);
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userToSet));
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, setUser: setUserDirectly, logout }}>
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
