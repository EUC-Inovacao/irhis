import axios, { type AxiosError } from "axios";
import api from './api';
import type { User } from '../types';

export type AuthRole = "patient" | "doctor" | "Patient" | "Doctor";
export type AuthResponse = { token: string; user: User };

function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

function networkMessage(baseURL: unknown): string {
  const apiUrl = typeof baseURL === "string" ? baseURL : "(unknown API URL)";
  return `Cannot connect to API at ${apiUrl}. Check your internet and try again.`;
}

export async function login(email: string, password: string, role?: AuthRole): Promise<AuthResponse> {
  // Normalize role to match backend enum ('Patient' | 'Doctor')
  const normalizeRole = (r: AuthRole | undefined): "Patient" | "Doctor" | undefined => {
    if (!r) return undefined;
    if (r === "doctor" || r === "Doctor") return "Doctor";
    return "Patient";
  };

  // If role is provided, try that role only
  if (role) {
    const apiRole = normalizeRole(role);
    try {
      const response = await api.post<AuthResponse>("/login", { email, password, role: apiRole });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 503 || error.code === "ECONNREFUSED" || String(error.message).includes("Network Error")) {
          throw new Error(networkMessage(api.defaults.baseURL));
        }
        const msg = (error.response?.data as { error?: string } | undefined)?.error || error.message || "Invalid credentials";
        throw new Error(msg);
      }
      throw new Error("Unexpected login error.");
    }
  }

  // Auto-detect role: try both "patient" and "doctor"
  const rolesToTry: ("Patient" | "Doctor")[] = ["Patient", "Doctor"];
  let lastError: Error | null = null;

  for (const tryRole of rolesToTry) {
    try {
      const response = await api.post<AuthResponse>("/login", { email, password, role: tryRole });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        // Network errors should be thrown immediately
        if (status === 503 || error.code === "ECONNREFUSED" || String(error.message).includes("Network Error")) {
          throw new Error(networkMessage(api.defaults.baseURL));
        }
        // 401 means wrong credentials for this role, try next role
        if (status === 401) {
          lastError = new Error("Invalid credentials");
          continue;
        }
        // Other errors should be thrown
        const msg = (error.response?.data as { error?: string } | undefined)?.error || error.message || "Invalid credentials";
        throw new Error(msg);
      }
      lastError = new Error("Unexpected login error.");
    }
  }

  // If we tried both roles and both failed, throw the last error
  throw lastError || new Error("Invalid credentials");
}

export async function signup(name: string, email: string, password: string, role: AuthRole): Promise<AuthResponse> {
  try {
    // Reuse normalizeRole from login to align with backend enum
    const apiRole = (role === "doctor" || role === "Doctor") ? "Doctor" : "Patient";
    const response = await api.post<AuthResponse>("/signup", { name, email, password, role: apiRole });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 503 || error.code === "ECONNREFUSED" || String(error.message).includes("Network Error")) {
        throw new Error(networkMessage(api.defaults.baseURL));
      }
      if (status === 409) {
        throw new Error("An account with this email already exists. Please login instead.");
      }
      const msg = (error.response?.data as { error?: string } | undefined)?.error || error.message || "Failed to create account.";
      throw new Error(msg);
    }
    throw new Error("Unexpected signup error.");
  }
}; 