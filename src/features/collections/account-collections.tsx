import { CollectionLoading } from "@/features/cards/rewards-context";
import { useRewards } from "@/features/cards/use-rewards";
import { Link, useParams } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError, PageHeader } from "@/components/ui/states";
import { AchievementCard } from "@/features/cards/achievement-card";
import { SportIcon } from "@/components/sport-icon";
import { RewardsNotice, RewardsStatus } from "@/features/cards/rewards-context";
import type { CollectionData } from "@/features/cards/collection-api";
export function LiveCollectionProgress({ data }: { data: CollectionData }) {
  return (
    <div className="panel collection-list">
      {data.collections.map((s) => {
        const cards = data.cards.filter(
          (c) => c.collectionId === s.id && c.kind === "milestone",
        );
        return (
          <Link
            to={`/collections/${s.sport_slug}`}
            className="collection-row"
            key={s.id}
          >
            <SportIcon sport={s.sport_slug} />
            <div>
              <strong>{s.title}</strong>
              <progress
                max={Math.max(1, cards.length)}
                value={cards.filter((c) => c.owned).length}
                aria-label={`Progression ${s.title}`}
              />
            </div>
            <span>
              {cards.filter((c) => c.owned).length} / {cards.length}
            </span>
            <ArrowRight size={16} />
          </Link>
        );
      })}
    </div>
  );
}
export function AccountCollections() {
  const { sportSlug } = useParams();
  const { collections } = useRewards();
  if (collections.isPending) return <CollectionLoading />;
  if (collections.isError)
    return <InlineError retry={() => void collections.refetch()} />;
  const data = collections.data;
  const sport =
    data.collections.find((s) => s.sport_slug === sportSlug && s.active) ??
    data.collections.find((s) => s.sport_slug === sportSlug);
  if (sportSlug && !sport) return <EmptyState title="Collection introuvable" />;
  const filtered = data.cards.filter(
    (c) => !sport || c.collectionId === sport.id,
  );
  const core = filtered.filter((c) => c.kind === "milestone");
  const count = core.filter((c) => c.owned).length;
  return (
    <>
      <PageHeader
        eyebrow="UN EFFORT. UN SOUVENIR."
        title={
          sport ? `Ta collection ${sport.title}.` : "Ta collection prend vie."
        }
        description="Des souvenirs personnels, acquis par tes activités. Chaque jalon compte une seule fois."
      />
      <RewardsStatus />
      <RewardsNotice />
      <nav className="chips" aria-label="Filtrer les collections">
        <Link to="/collections" className={!sport ? "selected" : ""}>
          Toutes
        </Link>
        {data.collections
          .filter((s) => s.active)
          .map((s) => (
            <Link
              key={s.id}
              to={`/collections/${s.sport_slug}`}
              className={sport?.id === s.id ? "selected" : ""}
            >
              <SportIcon sport={s.sport_slug} size={16} />
              {s.title}
            </Link>
          ))}
      </nav>
      <div className="section-heading">
        <h2>{sport?.title ?? "Tes terrains d’aventure"}</h2>
        <span>
          {count} / {core.length} jalons
        </span>
      </div>
      <progress
        className="wide-progress"
        value={count}
        max={Math.max(1, core.length)}
        aria-label="Progression de collection"
      />
      {!sport ? (
        <div className="collection-overview">
          {data.collections
            .filter((s) => s.active)
            .map((s) => {
              const cards = data.cards.filter((c) => c.collectionId === s.id);
              return (
                <Link
                  to={`/collections/${s.sport_slug}`}
                  className="collection-tile"
                  key={s.id}
                >
                  <img
                    src={`/art/${cards[0]?.artwork ?? "trail"}.svg`}
                    alt=""
                  />
                  <div>
                    <h2>{s.title}</h2>
                    <p>
                      {
                        cards.filter((c) => c.kind === "milestone" && c.owned)
                          .length
                      }{" "}
                      / {cards.filter((c) => c.kind === "milestone").length}{" "}
                      jalons · 1 carte spéciale
                    </p>
                    <ArrowRight size={20} />
                  </div>
                </Link>
              );
            })}
        </div>
      ) : (
        <>
          <div className="card-grid account-card-grid">
            {filtered
              .filter((c) => c.kind === "milestone")
              .map((c) => (
                <AchievementCard key={c.id} card={c} />
              ))}
          </div>
          {filtered
            .filter((c) => c.kind === "completion")
            .map((c) => (
              <div
                className={`completion-card panel ${c.owned ? "complete" : ""}`}
                key={c.id}
              >
                <Trophy size={40} />
                <div>
                  <p className="eyebrow">
                    CARTE SPÉCIALE · COLLECTION ACCOMPLIE
                  </p>
                  <h2>{c.title}</h2>
                  <p>
                    {c.owned
                      ? "Tes jalons ont ouvert un nouveau chapitre."
                      : c.condition}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to={`/cards/${c.id}`}>
                    {c.owned ? "Voir ma carte" : "Voir l’objectif"}
                  </Link>
                </Button>
              </div>
            ))}
        </>
      )}
      <p className="personal-note">
        Collections personnelles · Fichiers modifiables et déclarations
        manuelles, sans certification fournisseur.
      </p>
    </>
  );
}
