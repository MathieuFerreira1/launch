import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InlineError, LoadingState, PageHeader } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { authError } from "@/features/auth/errors";
import {
  fetchProfile,
  updateProfile,
  profileFieldsSchema,
  type Profile,
} from "./profile";
function ProfileEditor({ profile }: { profile: Profile }) {
  const { signOut } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [fields, setFields] = useState({
    handle: profile.handle ?? "",
    display_name: profile.display_name,
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const mutation = useMutation({
    mutationFn: () => updateProfile(profile.user_id, fields),
    onSuccess: (data) => {
      cache.setQueryData(["profile", profile.user_id], data);
      setSaved(true);
    },
    onError: (e) => setError(authError(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");
    const parsed = profileFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    mutation.mutate();
  }
  async function logout() {
    setLeaving(true);
    setError("");
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (e) {
      setError(authError(e));
    } finally {
      setLeaving(false);
    }
  }
  return (
    <div className="profile-grid">
      <section className="panel padded profile-card">
        <div className="portrait">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Ton avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            (profile.display_name || profile.handle || "L")
              .slice(0, 1)
              .toUpperCase()
          )}
        </div>
        <h2>{profile.display_name || "Ton profil Launch"}</h2>
        {profile.handle && <p>@{profile.handle}</p>}
        <p>{profile.bio || "Une nouvelle histoire sportive commence ici."}</p>
        <p className="small">
          Profil privé · Les cartes et activités sont encore fictives.
        </p>
        <Button
          variant="outline"
          onClick={() => void logout()}
          disabled={leaving}
        >
          {leaving ? "Déconnexion…" : "Me déconnecter"}
        </Button>
      </section>
      <form className="panel padded launch-form" onSubmit={submit}>
        <h2>Les détails qui te ressemblent.</h2>
        <label>
          Pseudo
          <input
            aria-label="Pseudo"
            autoComplete="username"
            maxLength={30}
            value={fields.handle}
            onChange={(e) => {
              setSaved(false);
              setFields({ ...fields, handle: e.target.value });
            }}
          />
          <span className="small">
            Facultatif · 3 à 30 lettres minuscules, chiffres ou underscores.
          </span>
        </label>
        <label>
          Nom affiché
          <input
            autoComplete="nickname"
            maxLength={80}
            value={fields.display_name}
            onChange={(e) => {
              setSaved(false);
              setFields({ ...fields, display_name: e.target.value });
            }}
          />
        </label>
        <label>
          URL de l’avatar
          <input
            type="url"
            maxLength={2048}
            placeholder="https://…"
            value={fields.avatar_url}
            onChange={(e) => {
              setSaved(false);
              setFields({ ...fields, avatar_url: e.target.value });
            }}
          />
          <span className="small">
            Facultatif. L’image sera chargée depuis ce service externe, qui
            recevra ton adresse IP. Aucun téléversement dans cette version.
          </span>
        </label>
        <label>
          Biographie
          <textarea
            aria-label="Biographie"
            rows={4}
            maxLength={500}
            value={fields.bio}
            onChange={(e) => {
              setSaved(false);
              setFields({ ...fields, bio: e.target.value });
            }}
          />
          <span className="small">{fields.bio.length} / 500 caractères</span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="form-success" role="status">
            Ton profil a été enregistré.
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Enregistrement…" : "Enregistrer mon profil"}
        </Button>
      </form>
    </div>
  );
}
export function AccountProfile() {
  const { session } = useAuth();
  const id = session!.user.id;
  const q = useQuery({
    queryKey: ["profile", id],
    queryFn: () => fetchProfile(id),
    retry: 1,
  });
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <InlineError retry={() => void q.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="L’ATHLÈTE DERRIÈRE LES CARTES"
        title="Ton espace personnel."
        description="Ta collection, ton histoire. Toujours privée."
      />
      <ProfileEditor key={id} profile={q.data} />
    </>
  );
}
