function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
}

// Default to Azure backend URL when EXPO_PUBLIC_API_URL is not provided.
// You can override this in development by setting EXPO_PUBLIC_API_URL.
export const API_URL =
  getEnv("EXPO_PUBLIC_API_URL") ?? "http://192.168.1.147:5001";