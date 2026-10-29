import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
const schema = z.object({ url: z.url(), key: z.string().min(1) });
let client: SupabaseClient | undefined;
// Lazy opt-in only: the demo never calls this factory and never contacts Supabase.
export function getSupabaseClient() {
  const parsed = schema.safeParse({
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success)
    throw new Error("Configuration Supabase publique manquante.");
  client ??= createClient(parsed.data.url, parsed.data.key);
  return client;
}
