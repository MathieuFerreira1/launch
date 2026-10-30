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

type BuildEnv = Record<string, string | undefined>;
export function publicBuildDiagnostics(env: BuildEnv) {
  return {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? "present" : "missing",
    VITE_SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? "present"
      : "missing",
    supabasePublicConfig: validatePublicConfig(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
      ? "valid"
      : "invalid",
  } as const;
}

export function assertPublicBuildConfig(env: BuildEnv, workersCI: boolean) {
  const diagnostics = publicBuildDiagnostics(env);
  // Keep the intentional, unconfigured local/GitHub demo build. A configured
  // key must pass the public-only check before Vite can embed it in any bundle.
  if (
    diagnostics.supabasePublicConfig === "invalid" &&
    (workersCI || diagnostics.VITE_SUPABASE_PUBLISHABLE_KEY === "present")
  )
    throw new Error(
      "Build interrompu : configuration publique Supabase absente ou invalide. " +
        "Vérifier VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans Settings > Build > Variables and secrets. " +
        "Utiliser uniquement une clé publishable ou anon. Les bindings Previews Base ne configurent pas le bundle Vite.",
    );
}

export function publicBuildCommit(env: BuildEnv) {
  const candidate = env.WORKERS_CI_COMMIT_SHA ?? env.GITHUB_SHA;
  return candidate && /^[a-f0-9]{40}$/i.test(candidate) ? candidate : null;
}
