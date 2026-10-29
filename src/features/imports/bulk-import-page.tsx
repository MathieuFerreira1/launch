import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileArchive, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { sports } from "@/features/cards/types";
import { date, distance, duration } from "@/lib/utils";
import {
  type LocalImport,
  type ImportCandidate,
  type WorkerEvent,
} from "./model";
import {
  createDraft,
  loadDrafts,
  updateMeta,
  persistFile,
  persistIssue,
  persistItem,
  removeDraft,
} from "./local-store";
import {
  commitDraft,
  importError,
  reviewDuplicates,
  saveReview,
} from "./import-api";
const names = {
  running: "Running",
  trail: "Trail",
  cycling: "Vélo",
  swimming: "Natation",
  unsupported: "Autre sport",
  unknown: "À préciser",
};
export function BulkImportPage() {
  const { session } = useAuth();
  const owner = session!.user.id;
  const cache = useQueryClient();
  const [draft, setDraft] = useState<LocalImport | null>(null);
  const current = useRef<LocalImport | null>(null);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [localConsent, setLocalConsent] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadDrafts(owner)
      .then((d) => {
        if (alive) {
          current.current = d[0] ?? null;
          setDraft(current.current);
          setLocalConsent(!!current.current);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setError(
            "La reprise locale est indisponible. Autorise IndexedDB et le stockage du navigateur pour importer.",
          );
          setReady(false);
        }
      });
    return () => {
      alive = false;
      worker.current?.terminate();
      abort.current?.abort();
    };
  }, [owner]);
  function refresh(d: LocalImport) {
    current.current = d;
    setDraft({ ...d, items: [...d.items], issues: [...d.issues] });
  }
  async function analyze(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setMessage("");
    const job = ++generation.current;
    try {
      let d = current.current;
      if (!d) {
        d = await createDraft(owner);
        current.current = d;
      }
      if (d.owner !== owner) throw new Error("OWNER_CHANGED");
      d.stage = "analysing";
      await updateMeta(d);
      refresh(d);
      setBusy(true);
      const w = new Worker(new URL("./import.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      let eventQueue = Promise.resolve();
      const onEvent = async (event: WorkerEvent) => {
        if (current.current?.id !== d.id || worker.current !== w) return;
        if (event.type === "file") {
          const unique = event.items.filter(
            (i) => !d.items.some((old) => old.key === i.key),
          );
          await persistFile(d.id, event.file, unique);
          d.items.push(...unique);
          refresh(d);
          w.postMessage({ type: "ack" });
        }
        if (event.type === "issue") {
          await persistIssue(d.id, event.issue);
          if (!d.issues.some((i) => i.key === event.issue.key))
            d.issues.push(event.issue);
          refresh(d);
          w.postMessage({ type: "ack" });
        }
        if (event.type === "progress") {
          d.analysedBytes = event.bytes;
          setProgress({ done: event.done, total: event.total || 1 });
        }
        if (event.type === "done" || event.type === "fatal") {
          w.terminate();
          worker.current = null;
          d.stage = "review";
          await updateMeta(d);
          if (event.type === "fatal")
            setError(importError(new Error(event.code)));
          try {
            d.items = await reviewDuplicates(d.items);
            await saveReview(d, d.items);
          } catch {
            setError(
              "Analyse locale conservée. La vérification des doublons nécessite le réseau. Réessaie avant de confirmer.",
            );
          }
          if (generation.current !== job || current.current?.id !== d.id)
            return;
          refresh(d);
          setBusy(false);
        }
      };
      w.onmessage = (e) => {
        eventQueue = eventQueue
          .then(() => onEvent(e.data as WorkerEvent))
          .catch(() => {
            w.terminate();
            worker.current = null;
            setBusy(false);
            setError(
              "Stockage local saturé ou analyse interrompue. Les éléments déjà sauvegardés restent reprenables.",
            );
          });
      };
      w.onerror = () => {
        w.terminate();
        worker.current = null;
        setBusy(false);
        setError(
          "Le Worker a été interrompu. Reprends la sélection pour compléter ce brouillon.",
        );
      };
      w.postMessage({ type: "analyze", files: Array.from(files) });
    } catch (e) {
      setBusy(false);
      setError(importError(e));
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  async function change(
    item: ImportCandidate,
    patch: Partial<ImportCandidate>,
  ) {
    const d = current.current;
    if (!d) return;
    const updated = { ...item, ...patch };
    await persistItem(d.id, updated);
    d.items = d.items.map((i) => (i.key === item.key ? updated : i));
    refresh(d);
  }
  async function confirm() {
    const d = current.current;
    if (!d) return;
    setError("");
    setMessage("");
    setCommitting(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      d.items = await reviewDuplicates(d.items);
      await saveReview(d, d.items);
      refresh(d);
      if (
        d.items.some(
          (i) =>
            i.duplicate === "probable" &&
            !i.decision &&
            !i.linkId &&
            !i.linkKey,
        )
      ) {
        setError(
          "Choisis quoi faire pour chaque doublon probable avant de confirmer.",
        );
        return;
      }
      await updateMeta(d);
      await commitDraft(d, controller.signal, (done, total) =>
        setProgress({ done, total: total || 1 }),
      );
      setMessage(
        "Import terminé. Retrouve tes activités dans ton historique. Aucune carte n’a été attribuée à cette étape.",
      );
      refresh(d);
      await cache.invalidateQueries({ queryKey: ["activities", owner] });
    } catch (e) {
      d.stage = "partial";
      await updateMeta(d);
      refresh(d);
      setError(importError(e));
    } finally {
      setCommitting(false);
      abort.current = null;
    }
  }
  async function discard() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    abort.current?.abort();
    const d = current.current;
    if (d) await removeDraft(d.id);
    current.current = null;
    setDraft(null);
    setError("");
    setMessage("");
    setBusy(false);
    setPage(0);
  }
  const entries = draft?.items ?? [];
  const issues = draft?.issues ?? [];
  const incomplete = entries.filter((i) => i.status === "needs_review").length;
  const duplicates = entries.filter((i) => i.duplicate).length;
  const running = busy || committing;
  return (
    <>
      <PageHeader
        eyebrow="TON HISTOIRE, À TON RYTHME"
        title="Importe ton histoire sportive."
        description="FIT, GPX, TCX ou ZIP : analyse tes fichiers, vérifie les résultats, puis confirme."
      />
      {!draft && (
        <div className="panel padded">
          <label className="consent">
            <input
              type="checkbox"
              checked={localConsent}
              onChange={(e) => setLocalConsent(e.target.checked)}
            />
            J’accepte une copie temporaire privée sur cet appareil pour
            reprendre l’import (reprise disponible 48 h, nettoyage à la
            prochaine ouverture après expiration et après succès ou abandon).
          </label>
        </div>
      )}
      <div className="import-grid">
        <section>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (
                localConsent &&
                ready &&
                !running &&
                draft?.stage !== "completed" &&
                !draft?.serverStarted
              )
                void analyze(e.dataTransfer.files);
            }}
          >
            <FileArchive size={38} />
            <h2>Ajoute tes fichiers sportifs</h2>
            <p>
              ZIP avec sous-dossiers ou sélection multiple. 256 Mo par
              sélection, 32 Mo par fichier extrait, 5 000 entrées maximum.
            </p>
            <input
              ref={input}
              className="sr-only"
              type="file"
              multiple
              accept=".zip,.fit,.gpx,.tcx"
              aria-label="Fichiers sportifs"
              disabled={
                !localConsent ||
                !ready ||
                running ||
                draft?.stage === "completed" ||
                !!draft?.serverStarted
              }
              onChange={(e) => void analyze(e.target.files)}
            />
            <Button
              disabled={
                !localConsent ||
                !ready ||
                running ||
                draft?.stage === "completed" ||
                !!draft?.serverStarted
              }
              onClick={() => input.current?.click()}
            >
              <Upload size={18} />
              {draft ? "Compléter ce brouillon" : "Choisir des fichiers"}
            </Button>
          </div>
          {(running || draft) && (
            <div className="panel padded" aria-live="polite">
              <h2>
                {busy
                  ? "Analyse en cours"
                  : committing
                    ? "Enregistrement des lots"
                    : draft?.stage === "completed"
                      ? "Import terminé"
                      : "Revue de ton import"}
              </h2>
              {running && (
                <>
                  <progress
                    value={progress.done}
                    max={progress.total}
                    aria-label={
                      busy
                        ? "Progression de l’analyse"
                        : "Progression de l’enregistrement"
                    }
                  />
                  <p className="small">
                    {committing
                      ? `${progress.done} / ${progress.total} éléments enregistrés`
                      : "Traitement local progressif, interface disponible."}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (committing) abort.current?.abort();
                      else {
                        generation.current++;
                        worker.current?.terminate();
                        worker.current = null;
                        setBusy(false);
                        if (draft) {
                          const next = { ...draft, stage: "review" as const };
                          void updateMeta(next);
                          refresh(next);
                        }
                      }
                    }}
                  >
                    Interrompre
                  </Button>
                </>
              )}
              <div className="import-counts">
                <span>
                  <strong>{entries.length}</strong> activités
                </span>
                <span>
                  <strong>{incomplete}</strong> à vérifier
                </span>
                <span>
                  <strong>{duplicates}</strong> doublons
                </span>
                <span>
                  <strong>{issues.length}</strong> erreurs / ignorés
                </span>
              </div>
            </div>
          )}
        </section>
        <aside className="stack">
          <div className="panel padded">
            <h2>
              <ShieldCheck size={20} />
              Tes sources restent privées.
            </h2>
            <p>
              Les activités normalisées sont conservées dans ton compte, y
              compris les sports futurs. Les fichiers originaux sont
              facultatifs.
            </p>
            <label className="consent">
              <input
                type="checkbox"
                checked={draft?.retainSources ?? false}
                disabled={
                  !draft ||
                  running ||
                  !!draft.serverStarted ||
                  draft.stage === "completed"
                }
                onChange={(e) => {
                  if (draft) {
                    const next = { ...draft, retainSources: e.target.checked };
                    void updateMeta(next);
                    refresh(next);
                  }
                }}
              />
              Conserver les sources dans mon espace privé pour une future
              réanalyse.
            </label>
            <p className="small">
              Jusqu’à suppression par tes soins, plafond technique provisoire de
              1 Go par compte. Une réanalyse complète n’est pas garantie sans
              sources. Tu peux les supprimer depuis le détail d’activité.
            </p>
          </div>
          <div className="panel padded">
            <Button asChild variant="ghost">
              <Link to="/activities/sources">Gérer mes sources privées</Link>
            </Button>
            <h2>Une sortie sans fichier ?</h2>
            <p>
              La saisie manuelle est toujours identifiée comme déclarative et
              non certifiée.
            </p>
            <Button asChild variant="outline">
              <Link to="/activities/new">Saisir une activité</Link>
            </Button>
          </div>
        </aside>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="form-success">
          {message} <Link to="/activities">Voir mon historique</Link>
        </p>
      )}
      {draft && draft.stage !== "completed" && (
        <>
          <div className="section-heading">
            <h2>Vérifie avant de confirmer</h2>
            <span>
              Page {page + 1} / {Math.max(1, Math.ceil(entries.length / 50))}
            </span>
          </div>
          <div className="review-list">
            {entries.slice(page * 50, page * 50 + 50).map((item) => (
              <article className="panel padded" key={item.key}>
                <div className="section-heading">
                  <h3>{item.title}</h3>
                  <span>
                    {item.duplicate === "exact"
                      ? "Déjà importée"
                      : item.duplicate === "probable"
                        ? "Doublon probable"
                        : item.status === "valid"
                          ? "Valide"
                          : "À vérifier"}
                  </span>
                </div>
                <p className="small file-name">{item.fileName}</p>
                <p>
                  {item.started_at_utc
                    ? date(item.started_at_utc)
                    : "Date absente"}{" "}
                  ·{" "}
                  {item.distance_m === null
                    ? "Distance absente"
                    : distance(item.distance_m)}{" "}
                  ·{" "}
                  {item.duration_s === null
                    ? "Durée absente"
                    : duration(item.duration_s)}
                </p>
                <label className="field-label">
                  Sport de cette activité
                  <select
                    aria-label={`Sport de ${item.fileName}`}
                    value={item.category}
                    disabled={
                      running ||
                      (!!item.duplicate && item.duplicate === "exact")
                    }
                    onChange={(e) => {
                      const category = e.target
                        .value as ImportCandidate["category"];
                      const warnings = item.warnings.filter(
                        (w) => w !== "SPORT_A_PRECISER",
                      );
                      void change(item, {
                        category,
                        warnings,
                        status:
                          category === "unknown" || warnings.length
                            ? "needs_review"
                            : "valid",
                        decision: undefined,
                        linkId: undefined,
                        linkKey: undefined,
                      });
                    }}
                  >
                    {[
                      ...sports.map((s) => ({ slug: s.slug, name: s.name })),
                      { slug: "unsupported", name: "Autre sport" },
                      { slug: "unknown", name: "À préciser" },
                    ].map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="small">
                  Sport original : {item.original_sport || "non renseigné"} ·{" "}
                  {names[item.category]}
                  {item.warnings.length ? ` · ${item.warnings.join(", ")}` : ""}
                </p>
                {item.duplicate === "probable" && (
                  <label className="field-label">
                    Décision pour ce doublon
                    <select
                      aria-label={`Doublon de ${item.fileName}`}
                      disabled={running}
                      value={
                        item.decision ??
                        (item.linkId
                          ? `id:${item.linkId}`
                          : item.linkKey
                            ? `key:${item.linkKey}`
                            : "")
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        void change(item, {
                          decision:
                            v === "keep" || v === "skip" ? v : undefined,
                          linkId: v.startsWith("id:") ? v.slice(3) : undefined,
                          linkKey: v.startsWith("key:")
                            ? v.slice(4)
                            : undefined,
                        });
                      }}
                    >
                      <option value="">Choisir explicitement</option>
                      <option value="keep">
                        Garder comme activité distincte
                      </option>
                      <option value="skip">Ignorer cette version</option>
                      {item.matches?.map((m) => (
                        <option
                          key={m.id}
                          value={m.id.startsWith("key:") ? m.id : `id:${m.id}`}
                        >
                          Rattacher à {m.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            ))}
          </div>
          {entries.length > 50 && (
            <div className="actions">
              <Button
                variant="outline"
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                disabled={(page + 1) * 50 >= entries.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
          {issues.length > 0 && (
            <details className="panel padded">
              <summary>{issues.length} fichiers en erreur ou ignorés</summary>
              <ul>
                {issues.slice(0, 100).map((i) => (
                  <li key={i.key} className="small file-name">
                    {i.name} · {i.code}
                  </li>
                ))}
              </ul>
              {issues.length > 100 && (
                <p className="small">
                  Liste limitée aux 100 premiers ; toutes les erreurs seront
                  enregistrées avec le lot.
                </p>
              )}
            </details>
          )}
          <p className="small">
            Les activités incomplètes restent « à vérifier » et ne sont pas
            éligibles aux futures récompenses. Un GPX de parcours seul n’est pas
            une preuve d’activité accomplie.
          </p>
          <div className="actions">
            <Button
              disabled={running || !ready || !(entries.length + issues.length)}
              onClick={() => void confirm()}
            >
              {draft.stage === "partial"
                ? "Reprendre l’enregistrement"
                : "Confirmer l’import"}
            </Button>
            <Button
              variant="outline"
              disabled={running}
              onClick={() => void discard()}
            >
              Abandonner ce brouillon local
            </Button>
          </div>
        </>
      )}
      {draft?.stage === "completed" && (
        <Button variant="outline" onClick={() => void discard()}>
          Nouvel import
        </Button>
      )}
    </>
  );
}
