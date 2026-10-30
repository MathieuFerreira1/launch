import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, PageHeader } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { SportIcon } from "@/components/sport-icon";
import { sports } from "@/features/cards/types";
import { RewardsNotice } from "@/features/cards/rewards-context";
import { normalize, type Category } from "@/features/imports/model";
import { importError } from "@/features/imports/import-api";
import { getSupabaseClient } from "@/lib/supabase";
import { distance, date, duration } from "@/lib/utils";
import {
  listActivities,
  getActivity,
  getActivitySources,
  correctSport,
  saveManual,
  type StoredSource,
} from "./activity-api";
const fmt = (n: number | null, fn: (n: number) => string) =>
  n === null ? "Non renseignée" : fn(n);
export function AccountActivities() {
  const owner = useAuth().session!.user.id;
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["activities", owner, filter, page],
    queryFn: () => listActivities(filter, page),
  });
  return (
    <>
      <PageHeader
        eyebrow="TON CARNET DE SORTIES"
        title="Chaque sortie compte."
        description="Ton historique réel, conservé dans ton espace privé."
      />
      <div className="actions">
        <Button asChild>
          <Link to="/import">
            <Plus size={18} />
            Importer des fichiers
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/activities/new">Saisie manuelle</Link>
        </Button>
      </div>
      <div className="chips" role="group" aria-label="Filtrer les activités">
        {[
          { slug: "all", name: "Toutes" },
          ...sports,
          { slug: "unsupported", name: "Autres" },
          { slug: "unknown", name: "À préciser" },
        ].map((s) => (
          <button
            key={s.slug}
            aria-pressed={filter === s.slug}
            className={filter === s.slug ? "selected" : ""}
            onClick={() => {
              setFilter(s.slug);
              setPage(0);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <div className="panel padded" role="alert">
          <p>Impossible de charger tes activités. Vérifie ta connexion.</p>
          <Button onClick={() => void q.refetch()}>Réessayer</Button>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>Ton historique</h2>
            <span>{q.data.count} activités</span>
          </div>
          {!q.data.items.length ? (
            <EmptyState title="Ton histoire commence ici">
              Importe tes premières sorties ou saisis une activité.
            </EmptyState>
          ) : (
            <div className="panel activity-list">
              {q.data.items.map((a) => (
                <Link
                  key={a.id}
                  to={`/activities/${a.id}`}
                  className="activity-row"
                >
                  <SportIcon sport={a.category} />
                  <div>
                    <h3>{a.title}</h3>
                    <p>
                      {a.started_at_utc
                        ? date(a.started_at_utc)
                        : "Date à compléter"}{" "}
                      · {a.original_sport || "Sport à préciser"}
                    </p>
                    <span className="small">
                      {a.evidence_level === "self_reported"
                        ? "Déclarée manuellement"
                        : "Import de fichier"}{" "}
                      ·{" "}
                      {a.status === "needs_review"
                        ? "À vérifier"
                        : a.category === "unsupported"
                          ? "Sport futur"
                          : "Non certifiée"}
                    </span>
                  </div>
                  <div className="activity-metric">
                    <strong>{fmt(a.distance_m, distance)}</strong>
                    <span>{fmt(a.duration_s, duration)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="actions">
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage((n) => n - 1)}
            >
              Précédent
            </Button>
            <span className="small">Page {page + 1}</span>
            <Button
              variant="outline"
              disabled={(page + 1) * 50 >= q.data.count}
              onClick={() => setPage((n) => n + 1)}
            >
              Suivant
            </Button>
          </div>
        </>
      )}
    </>
  );
}
export function AccountActivity() {
  const { id } = useParams();
  const owner = useAuth().session!.user.id;
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["activities", owner, "detail", id],
    queryFn: () => getActivity(id!),
  });
  const files = useQuery({
    queryKey: ["activity-sources", owner, id],
    queryFn: () => getActivitySources(id!),
  });
  async function download(f: StoredSource) {
    setError("");
    const { data, error } = await getSupabaseClient()
      .storage.from("sport-sources")
      .createSignedUrl(f.storage_path, 60, { download: f.original_name });
    if (error) {
      setError("Source indisponible. Réessaie ou vérifie sa conservation.");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noreferrer";
    a.click();
  }
  async function forget(f: StoredSource) {
    setPending(true);
    setError("");
    try {
      const c = getSupabaseClient();
      const { error } = await c.storage
        .from("sport-sources")
        .remove([f.storage_path]);
      if (error) throw error;
      const result = await c.rpc("forget_activity_source", { p_id: f.id });
      if (result.error) throw result.error;
      setRemoveConfirm(null);
      await files.refetch();
    } catch {
      setError(
        "Suppression non terminée. Réessaie ; les métadonnées de l’activité sont conservées.",
      );
    } finally {
      setPending(false);
    }
  }
  if (q.isPending) return <LoadingState />;
  if (q.isError)
    return (
      <div role="alert" className="panel padded">
        <p>Impossible de charger cette activité.</p>
        <Button onClick={() => void q.refetch()}>Réessayer</Button>
      </div>
    );
  const a = q.data;
  if (!a) return <EmptyState title="Activité introuvable" />;
  return (
    <>
      <Button asChild variant="ghost">
        <Link to="/activities">
          <ArrowLeft size={18} />
          Historique
        </Link>
      </Button>
      <PageHeader
        title={a.title}
        description={`${a.started_at_utc ? date(a.started_at_utc) : "Date absente"} · ${a.original_sport || "Sport à préciser"}`}
      />
      <div className="panel padded">
        <SportIcon sport={a.category} />
        <dl className="metrics">
          <div>
            <dt>Distance</dt>
            <dd>{fmt(a.distance_m, distance)}</dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd>{fmt(a.duration_s, duration)}</dd>
          </div>
          <div>
            <dt>Dénivelé positif</dt>
            <dd>{fmt(a.elevation_gain_m, (n) => `${Math.round(n)} m`)}</dd>
          </div>
          <div>
            <dt>Vitesse moyenne</dt>
            <dd>
              {fmt(a.avg_speed_mps, (n) => `${(n * 3.6).toFixed(1)} km/h`)}
            </dd>
          </div>
          <div>
            <dt>Allure moyenne</dt>
            <dd>
              {a.avg_speed_mps
                ? `${Math.floor(1000 / a.avg_speed_mps / 60)}:${String(Math.floor((1000 / a.avg_speed_mps) % 60)).padStart(2, "0")} / km`
                : "Non renseignée"}
            </dd>
          </div>
        </dl>
        <p>
          {a.evidence_level === "self_reported"
            ? "Activité déclarée manuellement, non certifiée."
            : "Activité issue d’un fichier modifiable, non certifiée par un fournisseur."}
        </p>
        {a.status === "needs_review" && (
          <p className="form-error">
            À vérifier · Les informations manquantes ou incertaines empêchent
            l’attribution automatique de futures cartes.
          </p>
        )}
        <p className="small">{a.warnings.join(" · ")}</p>
        <label className="field-label">
          Corriger le sport
          <select
            aria-label="Corriger le sport"
            value={selected ?? a.category}
            onChange={(e) => setSelected(e.target.value as Category)}
          >
            {[
              ...sports,
              { slug: "unsupported", name: "Autre sport" },
              { slug: "unknown", name: "À préciser" },
            ].map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={pending || selected === null || selected === a.category}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              await correctSport(a.id, selected!);
              await cache.invalidateQueries({
                queryKey: ["activities", owner],
              });
              void cache.invalidateQueries({
                queryKey: ["reward-processing", owner],
              });
              setSelected(null);
            } catch {
              setError("Correction non enregistrée. Réessaie.");
            } finally {
              setPending(false);
            }
          }}
        >
          Enregistrer la classification
        </Button>
      </div>
      <section className="panel padded">
        <h2>Sources privées</h2>
        {files.isPending ? (
          <p role="status">Chargement des sources…</p>
        ) : files.isError ? (
          <p role="alert">
            Sources non chargées.{" "}
            <button onClick={() => void files.refetch()}>Réessayer</button>
          </p>
        ) : !files.data.length ? (
          <p>Aucun fichier source pour cette activité.</p>
        ) : (
          files.data.map((f) => (
            <div key={f.id} className="source-row">
              <strong className="file-name">{f.original_name}</strong>
              <p className="small">
                {f.retained
                  ? "Source conservée en privé"
                  : "Métadonnées seules · Réanalyse complète non garantie"}{" "}
                · {(f.bytes / 1024).toFixed(0)} Ko
              </p>
              {f.retained && (
                <div className="actions">
                  <Button variant="outline" onClick={() => void download(f)}>
                    Télécharger la source
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setRemoveConfirm(f.id)}
                  >
                    Supprimer la source
                  </Button>
                  {removeConfirm === f.id && (
                    <div role="alert">
                      <p>
                        Cette source peut justifier plusieurs activités.
                        Supprimer uniquement le fichier ? Cette suppression est
                        définitive.
                      </p>
                      <Button disabled={pending} onClick={() => void forget(f)}>
                        Confirmer la suppression du fichier
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setRemoveConfirm(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <RewardsNotice />
    </>
  );
}
export function ManualActivity() {
  const owner = useAuth().session!.user.id;
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [keep, setKeep] = useState(false);
  const [fields, setFields] = useState({
    title: "Ma sortie",
    category: "running",
    original: "",
    date: "",
    distance: "",
    duration: "",
    elevation: "",
    note: "",
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const numeric = z
        .object({
          distance: z.coerce.number().min(0).max(20000),
          duration: z.coerce.number().positive().max(525600),
          elevation: z.coerce.number().min(0).max(1e6),
        })
        .parse({
          distance: fields.distance,
          duration: fields.duration,
          elevation: fields.elevation || 0,
        });
      const start = new Date(fields.date);
      if (!fields.date || Number.isNaN(start.valueOf()))
        throw new Error("DATE");
      if (fields.category === "unsupported" && !fields.original.trim())
        throw new Error("SPORT");
      const parsed = normalize({
        title: fields.title.trim(),
        category: fields.category as Category,
        original_sport:
          fields.category === "unsupported"
            ? fields.original.trim()
            : (sports.find((s) => s.slug === fields.category)?.name ?? ""),
        started_at_utc: start.toISOString(),
        distance_m: numeric.distance * 1000,
        duration_s: numeric.duration * 60,
        elevation_gain_m: numeric.elevation,
        max_speed_mps: null,
        extra: { note: fields.note, parser_version: "manual-1" },
      });
      setPending(true);
      const id = await saveManual(requestId, parsed, keep);
      await cache.invalidateQueries({ queryKey: ["activities", owner] });
      void cache.invalidateQueries({ queryKey: ["reward-processing", owner] });
      navigate(`/activities/${id}`, { replace: true });
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("DUPLICATE_REVIEW_REQUIRED")
      ) {
        setDuplicate(true);
        setError(
          "Une activité similaire existe déjà. Vérifie ton historique et confirme uniquement si cette sortie est distincte.",
        );
      } else
        setError(
          e instanceof z.ZodError ||
            (e instanceof Error && ["DATE", "SPORT"].includes(e.message))
            ? "Vérifie la date, le sport et les valeurs numériques."
            : importError(e),
        );
    } finally {
      setPending(false);
    }
  }
  const input = (
    label: string,
    key: keyof typeof fields,
    type = "text",
    props = {},
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={fields[key]}
        required={key !== "elevation" && key !== "note"}
        onChange={(e) => {
          setFields({ ...fields, [key]: e.target.value });
          setKeep(false);
          setDuplicate(false);
        }}
        {...props}
      />
    </label>
  );
  return (
    <div className="auth-layout">
      <PageHeader
        title="Raconte ta sortie."
        description="Une activité déclarée manuellement, toujours identifiée comme non certifiée."
      />
      <form className="panel padded launch-form" onSubmit={submit}>
        {input("Titre", "title", "text", { maxLength: 160 })}
        <label>
          Sport
          <select
            aria-label="Sport"
            value={fields.category}
            onChange={(e) => {
              setFields({ ...fields, category: e.target.value });
              setKeep(false);
              setDuplicate(false);
            }}
          >
            {[...sports, { slug: "unsupported", name: "Autre sport" }].map(
              (s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ),
            )}
          </select>
        </label>
        {fields.category === "unsupported" &&
          input("Sport d’origine", "original", "text", { maxLength: 120 })}
        {input("Date et heure", "date", "datetime-local")}
        {input("Distance (km)", "distance", "number", { min: 0, step: "any" })}
        {input("Durée (minutes)", "duration", "number", {
          min: 0.01,
          step: "any",
        })}
        {input("Dénivelé positif (m)", "elevation", "number", {
          min: 0,
          step: "any",
        })}
        {input("Note facultative", "note", "text", { maxLength: 200 })}
        {duplicate && (
          <label className="consent">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
            />
            Je confirme qu’il s’agit d’une activité distincte.
          </label>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button disabled={pending || (duplicate && !keep)} type="submit">
          {pending ? "Enregistrement…" : "Enregistrer l’activité déclarée"}
        </Button>
      </form>
    </div>
  );
}
