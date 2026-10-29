import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { getSupabaseClient, publicConfig } from "@/lib/supabase";
import { authError } from "./errors";
import { safeReturnPath } from "./redirect";
import { useAuth } from "./auth-context";
import { useDemoSession } from "./demo-session";
const passwordSchema = z
  .string()
  .min(12, "Utilise au moins 12 caractères.")
  .max(128, "Utilise au maximum 128 caractères.");
export function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "signup" | "forgot";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { enter } = useDemoSession();
  const { expired } = useAuth();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const parsed = z.email().safeParse(email.trim());
    if (!parsed.success) {
      setError("Renseigne une adresse email valide.");
      return;
    }
    if (mode === "signup") {
      const p = passwordSchema.safeParse(password);
      if (!p.success) {
        setError(p.error.issues[0]!.message);
        return;
      }
    }
    setPending(true);
    try {
      const auth = getSupabaseClient().auth;
      if (mode === "login") {
        const { error } = await auth.signInWithPassword({
          email: parsed.data,
          password,
        });
        if (error) throw error;
        navigate(safeReturnPath(search.get("next"), window.location.origin), {
          replace: true,
        });
      }
      if (mode === "signup") {
        const { data, error } = await auth.signUp({
          email: parsed.data,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) navigate("/app", { replace: true });
        else
          setMessage(
            "Si l’inscription est possible, un email de confirmation va arriver. Vérifie aussi tes courriers indésirables.",
          );
      }
      if (mode === "forgot") {
        const { error } = await auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage(
          "Si un compte correspond à cette adresse, un lien de récupération va arriver par email.",
        );
      }
    } catch (err) {
      setError(authError(err));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-layout">
      <PageHeader
        eyebrow="TES EFFORTS MÉRITENT D’ÊTRE COLLECTIONNÉS"
        title={
          mode === "signup"
            ? "Rejoins Launch."
            : mode === "forgot"
              ? "Un nouveau départ."
              : "Heureux de te revoir."
        }
        description={
          mode === "signup"
            ? "Un compte, quatre collections. Tous tes sports sont déjà là."
            : mode === "forgot"
              ? "Reçois un lien pour choisir un nouveau mot de passe."
              : "Connecte-toi pour retrouver ton espace privé."
        }
      />
      <div className="panel padded">
        <form className="launch-form" onSubmit={submit}>
          {(expired || search.has("expired")) && (
            <p role="status">
              Ta session a expiré. Reconnecte-toi pour continuer.
            </p>
          )}
          {!publicConfig && (
            <p role="alert">
              Connexion indisponible : configure l’URL et la clé publique
              Supabase.
            </p>
          )}
          {mode === "signup" && (
            <label>
              Nom affiché
              <input
                autoComplete="nickname"
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}
          <label>
            Adresse email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Mot de passe
              <input
                aria-label="Mot de passe"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "signup" ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <span className="small">
                  Au moins 12 caractères. Une phrase longue est idéale.
                </span>
              )}
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              {message}
            </p>
          )}
          <Button disabled={pending || !publicConfig} type="submit">
            {pending
              ? "Un instant…"
              : mode === "signup"
                ? "Créer mon compte"
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : "Me connecter"}
          </Button>
        </form>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/auth/signup">Créer un compte</Link>
              <Link to="/auth/forgot-password">Mot de passe oublié ?</Link>
            </>
          ) : (
            <Link to="/auth">Retour à la connexion</Link>
          )}
        </div>
      </div>
      <p className="small">
        Profil privé par défaut. Les cartes et activités restent des exemples
        fictifs dans cette version.
      </p>
      <Button variant="ghost" onClick={enter}>
        Explorer sans compte — Démo
      </Button>
    </div>
  );
}
export function UpdatePasswordPage() {
  const { session, loading, finishRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const p = passwordSchema.safeParse(password);
    if (!p.success) {
      setError(p.error.issues[0]!.message);
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) throw error;
      finishRecovery();
      setDone(true);
    } catch (err) {
      setError(authError(err));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-layout">
      <PageHeader
        title="Un mot de passe tout neuf."
        description="Choisis une phrase secrète que tu n’utilises pas ailleurs."
      />
      {loading ? (
        <p role="status">Vérification du lien…</p>
      ) : !session ? (
        <div className="panel padded">
          <p role="alert">
            Ce lien est expiré, invalide ou déjà utilisé. Ouvre-le dans le
            navigateur où tu as fait la demande.
          </p>
          <Button asChild>
            <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
          </Button>
        </div>
      ) : done ? (
        <div className="panel padded">
          <p role="status">Ton mot de passe a été modifié.</p>
          <Button asChild>
            <Link to="/app">Retrouver mon espace</Link>
          </Button>
        </div>
      ) : (
        <form className="panel padded launch-form" onSubmit={submit}>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer mon mot de passe"}
          </Button>
        </form>
      )}
    </div>
  );
}
