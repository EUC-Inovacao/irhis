function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Create a .env file in irhis/frontend with ${name}=...`
    );
  }
  return String(value).trim();
}

export const API_URL = requireEnv("EXPO_PUBLIC_API_URL");