import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
export function validatePublicConfig(url: unknown, key: unknown) {
  const parsed = z
    .object({ url: z.url(), key: z.string().min(1) })
    .safeParse({ url, key });
  if (!parsed.success) return null;
  const endpoint = new URL(parsed.data.url);
  if (
    endpoint.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(endpoint.hostname) &&
      endpoint.protocol === "http:"
    )
  )
    return null;
  if (parsed.data.key.startsWith("sb_secret_")) return null;
  // Legacy JWT keys must carry the anonymous role, never service_role.
  if (!parsed.data.key.startsWith("sb_publishable_")) {
    try {
      const claims = JSON.parse(atob(parsed.data.key.split(".")[1] ?? ""));
      if (claims.role !== "anon") return null;
    } catch {
      return null;
    }
  }
  return parsed.data;
}
export const publicConfig = validatePublicConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
let client: SupabaseClient | undefined;
export function getSupabaseClient() {
  if (!publicConfig)
    throw new Error("Configuration Supabase publique manquante ou invalide.");
  client ??= createClient(publicConfig.url, publicConfig.key, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
