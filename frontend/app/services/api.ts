import axios from "axios";

// Backend: Azure. Set EXPO_PUBLIC_API_URL to override (e.g. http://localhost:5001 for local).
const getApiUrl = (): string => {
  const envUrl = typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) return envUrl.trim();
  return "https://irhis-api.azurewebsites.net";
};

const API_URL = getApiUrl();
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
