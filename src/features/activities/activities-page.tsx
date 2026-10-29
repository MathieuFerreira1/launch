import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { SportIcon } from "@/components/sport-icon";
import { sports } from "@/features/cards/types";
import { date, distance, duration } from "@/lib/utils";
import type { DemoData } from "@/lib/demo";
export function ActivitiesPage({ data }: { data: DemoData }) {
  const [filter, setFilter] = useState("all");
  const filtered = data.activities.filter(
    (a) => filter === "all" || a.category === filter,
  );
  return (
    <>
      <PageHeader
        eyebrow="TON CARNET DE SORTIES"
        title="Chaque sortie compte."
        description="Des kilomètres, des souvenirs et le plaisir d’avancer."
      />
      <div className="chips" role="group" aria-label="Filtrer les activités">
        {[
          { slug: "all", name: "Toutes" },
          ...sports,
          { slug: "unsupported", name: "Autres" },
        ].map((s) => (
          <button
            key={s.slug}
            aria-pressed={filter === s.slug}
            className={filter === s.slug ? "selected" : ""}
            onClick={() => setFilter(s.slug)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>Ton historique</h2>
        <span>{filtered.length} activités</span>
      </div>
      {filtered.length ? (
        <div className="panel activity-list">
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/activities/${a.id}`}
              className="activity-row"
            >
              <SportIcon sport={a.category} />
              <div>
                <h3>{a.title}</h3>
                <p>
                  {date(a.startedAtUtc)} · {a.originalSport}
                </p>
                <span className="small">
                  {a.evidence === "self_reported"
                    ? "Déclarée manuellement"
                    : a.status === "needs_review"
                      ? "Sport futur · À vérifier"
                      : "Import de fichier · Démo"}
                </span>
              </div>
              <div className="activity-metric">
                <strong>{distance(a.distanceM)}</strong>
                <span>{duration(a.durationS)}</span>
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Aucune activité pour ce filtre" />
      )}
    </>
  );
}
export function ActivityPage({ data }: { data: DemoData }) {
  const { id } = useParams();
  const a = data.activities.find((a) => a.id === id);
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
        description={`${date(a.startedAtUtc)} · ${a.originalSport}`}
      />
      <div className="panel padded">
        <SportIcon sport={a.category} />
        <dl className="metrics">
          <div>
            <dt>Distance</dt>
            <dd>{distance(a.distanceM)}</dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd>{duration(a.durationS)}</dd>
          </div>
          <div>
            <dt>Dénivelé</dt>
            <dd>{a.elevationM} m</dd>
          </div>
        </dl>
        <p>
          {a.evidence === "self_reported"
            ? "Activité déclarée manuellement, non certifiée."
            : "Activité importée depuis un fichier fictif, non certifiée par un fournisseur."}
        </p>
        {a.category === "unsupported" && (
          <p>
            Sport non pris en charge pour les cartes. La future conservation des
            sources dépendra du consentement et des quotas.
          </p>
        )}
      </div>
    </>
  );
}
