import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  expired: boolean;
  recovery: boolean;
  retry: () => void;
  signOut: () => Promise<void>;
  finishRecovery: () => void;
}
export const AuthContext = createContext<AuthState | undefined>(undefined);
export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider requis");
  return state;
}
