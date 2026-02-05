import axios from "axios";
import { Platform } from "react-native";

// Backend: Azure. Set EXPO_PUBLIC_API_URL to override (e.g. http://localhost:5001 for local).
// In development, automatically use localhost for iOS Simulator or 10.0.2.2 for Android Emulator.
const getApiUrl = (): string => {
  const envUrl = typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) return envUrl.trim();
  
  // In development mode, use localhost fallback
  if (__DEV__) {
    // Android Emulator uses special IP to access host machine
    if (Platform.OS === "android") {
      return "http://10.0.2.2:5001";
    }
    // iOS Simulator can use localhost directly
    return "http://localhost:5001";
  }
  
  // Production: use Azure
  return "https://irhis-api.azurewebsites.net";
};

const API_URL = getApiUrl();

// Log API URL in development for debugging
if (__DEV__) {
  console.log(`[API] Using backend URL: ${API_URL}`);
  console.log(`[API] Platform: ${Platform.OS}, __DEV__: ${__DEV__}`);
}

// #region agent log
try {
  fetch("http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "api.ts:getApiUrl", message: "API baseURL resolved", data: { baseURL: API_URL, hasEnv: !!(typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) }, timestamp: Date.now(), sessionId: "debug-session", hypothesisId: "H1-baseURL" }) }).catch(() => {});
} catch (_) {}
// #endregion

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// We will move the interceptors to AuthContext to avoid race conditions
// and to handle token refresh logic in a centralized place.

export default api;
