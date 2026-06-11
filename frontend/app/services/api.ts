// app/services/api.ts
import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_URL } from "../../config/env";

let authToken: string | null = null;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = String(config.url ?? "");
  const isAuthCall = url.startsWith("/login") || url.startsWith("/signup");

  if (!isAuthCall && authToken) {
    const headers = config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);
    headers.set("Authorization", `Bearer ${authToken}`);
    config.headers = headers;
  }

  return config;
});

// Add response interceptor to log all errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
