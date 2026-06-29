import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/backend/env";

export function createSupabaseServerClient(accessToken?: string) {
  const { url, anonKey } = getPublicSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

export async function getAuthenticatedUser(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { accessToken: null, user: null, error: "Missing bearer token" };
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  return {
    accessToken,
    user: data.user ?? null,
    error: error?.message ?? null,
  };
}
