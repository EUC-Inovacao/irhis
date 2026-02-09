import axios, { type AxiosError } from "axios";
import api from './api';
import type { User } from '../types';

export type AuthRole = "patient" | "doctor";
export type AuthResponse = { token: string; user: User };

function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

function networkMessage(baseURL: unknown): string {
  const apiUrl = typeof baseURL === "string" ? baseURL : "(unknown API URL)";
  return `Cannot connect to API at ${apiUrl}. Check your internet and try again.`;
}

export async function login(email: string, password: string, role: AuthRole): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>("/login", { email, password, role });
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

export async function signup(name: string, email: string, password: string, role: AuthRole): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>("/signup", { name, email, password, role });
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