function readEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getGeminiApiKey() {
  const key = readEnv("GEMINI_API_KEY").trim();
  return key;
}

export function getCalendarBookingUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_BOOKING_URL ?? "";
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export function getAiProvider() {
  return (process.env.AI_PROVIDER?.trim().toLowerCase() || "ollama") as
    | "ollama"
    | "gemini";
}

export function getOllamaUrl() {
  return process.env.OLLAMA_URL?.trim() || "http://localhost:11434";
}

export function getOllamaModel() {
  return process.env.OLLAMA_MODEL?.trim() || "gemma3:4b";
}
