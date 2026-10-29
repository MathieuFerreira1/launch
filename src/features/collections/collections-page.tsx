import { Link, useParams } from "react-router-dom";
import { Trophy } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/states";
import { SportIcon } from "@/components/sport-icon";
import { sports } from "@/features/cards/types";
import { AchievementCard } from "@/features/cards/achievement-card";
import type { DemoData } from "@/lib/demo";
export function CollectionsPage({ data }: { data: DemoData }) {
  const { sportSlug } = useParams();
  const sport = sports.find((s) => s.slug === sportSlug);
  if (sportSlug && !sport) return <EmptyState title="Collection introuvable" />;
  const filtered = data.cards.filter((c) => !sport || c.sport === sport.slug);
  const owned = filtered.filter((c) => c.owned).length;
  return (
    <>
      <PageHeader
        eyebrow="UN EFFORT. UN SOUVENIR."
        title="Ta collection prend vie."
        description="Chaque carte raconte un moment où tu as avancé."
      />
      <nav className="chips" aria-label="Filtrer les collections">
        <Link className={!sport ? "selected" : ""} to="/collections">
          Toutes
        </Link>
        {sports.map((s) => (
          <Link
            key={s.slug}
            className={sport === s ? "selected" : ""}
            to={`/collections/${s.slug}`}
          >
            <SportIcon sport={s.slug} size={16} />
            {s.name}
          </Link>
        ))}
      </nav>
      <div className="section-heading">
        <h2>{sport?.name ?? "Tous tes exploits"}</h2>
        <span>
          {owned} / {filtered.length} cartes
        </span>
      </div>
      <progress
        className="wide-progress"
        value={owned}
        max={filtered.length}
        aria-label="Progression de collection"
      />
      {filtered.length ? (
        <div className="card-grid">
          {filtered.map((card) => (
            <AchievementCard card={card} key={card.id} />
          ))}
        </div>
      ) : (
        <EmptyState title="Ta collection commence ici" />
      )}
      <div className="panel collection-footer">
        <Trophy />
        <div>
          <strong>La collection se construit, sortie après sortie.</strong>
          <p>Catalogue de démonstration. Noms, raretés et seuils à valider.</p>
        </div>
      </div>
    </>
  );
}
