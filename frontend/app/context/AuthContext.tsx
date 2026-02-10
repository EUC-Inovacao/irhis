import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../types";
import * as RemoteAuth from "../services/auth";

type AuthRole = "patient" | "doctor";

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role?: AuthRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: AuthRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_USER_KEY = "@IRHIS:user";
const STORAGE_TOKEN_KEY = "@IRHIS:token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_USER_KEY),
          AsyncStorage.getItem(STORAGE_TOKEN_KEY),
        ]);

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser) as User);
          setToken(storedToken);
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  async function login(email: string, password: string, role?: AuthRole) {
    setLoading(true);
    try {
      const { token: newToken, user: newUser } = await RemoteAuth.login(email, password, role);

      setUser(newUser);
      setToken(newToken);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser)),
        AsyncStorage.setItem(STORAGE_TOKEN_KEY, newToken),
      ]);
    } catch (error) {
      setLoading(false);
      throw error; // Re-throw so caller can handle it
    } finally {
      setLoading(false);
    }
  }

  async function signup(name: string, email: string, password: string, role: AuthRole) {
    setLoading(true);
    try {
      const { token: newToken, user: newUser } = await RemoteAuth.signup(name, email, password, role);

      setUser(newUser);
      setToken(newToken);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser)),
        AsyncStorage.setItem(STORAGE_TOKEN_KEY, newToken),
      ]);
    } catch (error) {
      setLoading(false);
      throw error; // Re-throw so caller can handle it
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      setUser(null);
      setToken(null);
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_USER_KEY),
        AsyncStorage.removeItem(STORAGE_TOKEN_KEY),
      ]);
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(() => ({ user, token, loading, login, signup, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
