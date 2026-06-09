import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import * as RemoteAuth from "../services/auth";
import { setApiAuthToken } from "../services/api";

type AuthRole = "patient" | "doctor";

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role?: AuthRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: AuthRole) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role?.toLowerCase() === "doctor" ? "doctor" : "patient",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  async function login(email: string, password: string, role?: AuthRole) {
    setLoading(true);
    try {
      const { token: newToken, user: newUser } = await RemoteAuth.login(email, password, role);
      const normalizedUser = normalizeUser(newUser);

      setUser(normalizedUser);
      setToken(newToken);
      setApiAuthToken(newToken);
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
      const normalizedUser = normalizeUser(newUser);

      setUser(normalizedUser);
      setToken(newToken);
      setApiAuthToken(newToken);
      return normalizedUser;
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
      setApiAuthToken(null);
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(() => ({ user, token, loading, login, signup, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
