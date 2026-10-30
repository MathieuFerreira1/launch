import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validatePublicConfig } from "./supabase-config";
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
