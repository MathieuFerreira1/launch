import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, publicConfig } from "@/lib/supabase";
import { AuthContext } from "./auth-context";
import { authError } from "./errors";
import { clearOwnedDrafts } from "../imports/local-store";
export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!publicConfig);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [recovery, setRecovery] = useState(
    sessionStorage.getItem("launch-recovery") === "true",
  );
  const [attempt, setAttempt] = useState(0);
  const lastUser = useRef<string | null>(null);
  const intentionalLogout = useRef(false);
  useEffect(() => {
    if (!publicConfig) return;
    const auth = getSupabaseClient().auth;
    let alive = true;
    let revision = 0;
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      revision++;
      if (lastUser.current !== next?.user.id) {
        cache.clear();
      }
      if (event === "SIGNED_OUT") {
        setExpired(!!lastUser.current && !intentionalLogout.current);
        setRecovery(false);
        sessionStorage.removeItem("launch-recovery");
      }
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        sessionStorage.setItem("launch-recovery", "true");
      }
      lastUser.current = next?.user.id ?? null;
      setSession(next);
      setLoading(false);
      setError(null);
      if (next) setExpired(false);
    });
    const initialRevision = revision;
    auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive || revision !== initialRevision) return;
        if (error) setError(authError(error));
        setSession(data.session);
        lastUser.current = data.session?.user.id ?? null;
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError("Impossible de vérifier la session. Vérifie ta connexion.");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [cache, attempt]);
  async function signOut() {
    intentionalLogout.current = true;
    try {
      const { error } = await getSupabaseClient().auth.signOut({
        scope: "local",
      });
      if (error) throw error;
      const owner = session?.user.id;
      if (owner) {
        try {
          await clearOwnedDrafts(owner);
        } catch {
          /* Browser storage may be unavailable; server logout still completes. */
        }
      }
      cache.clear();
      setSession(null);
      setRecovery(false);
      sessionStorage.removeItem("launch-recovery");
    } finally {
      intentionalLogout.current = false;
    }
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        expired,
        recovery,
        retry: () => {
          setLoading(true);
          setError(null);
          setAttempt((n) => n + 1);
        },
        signOut,
        finishRecovery: () => {
          setRecovery(false);
          sessionStorage.removeItem("launch-recovery");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
