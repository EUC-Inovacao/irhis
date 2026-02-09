// app/services/api.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config/env";

const STORAGE_TOKEN_KEY = "@IRHIS:token";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {

  const url = String(config.url ?? "");
  const isAuthCall = url.startsWith("/login") || url.startsWith("/signup");

  if (!isAuthCall) {
    const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export default api;
