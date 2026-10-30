import { CollectionLoading } from "@/features/cards/rewards-context";
import { useRewards } from "@/features/cards/use-rewards";
import { Link } from "react-router-dom";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError, PageHeader } from "@/components/ui/states";
import { AchievementCard } from "@/features/cards/achievement-card";
import { RewardsNotice, RewardsStatus } from "@/features/cards/rewards-context";
import { rarityRank } from "@/features/cards/collection-api";
import { LiveCollectionProgress } from "@/features/collections/account-collections";
export function AccountHome() {
  const { collections } = useRewards();
  if (collections.isPending) return <CollectionLoading />;
  if (collections.isError)
    return <InlineError retry={() => void collections.refetch()} />;
  const data = collections.data;
  const latest = data.cards
    .filter((c) => c.owned)
    .sort(
      (a, b) =>
        (b.awardedAt ?? "").localeCompare(a.awardedAt ?? "") ||
        rarityRank[b.rarity] - rarityRank[a.rarity] ||
        a.id.localeCompare(b.id),
    )[0];
  return (
    <>
      <PageHeader
        eyebrow="LES EFFORTS PASSENT. LES CARTES RESTENT."
        title="Tes exploits, en cartes."
        description="Chaque sortie compte. Collectionne les moments qui te font avancer."
      />
      <RewardsStatus />
      <RewardsNotice />
      <div className="home-grid">
        <section>
          <div className="section-heading">
            <h2>Dernière carte débloquée</h2>
          </div>
          {latest ? (
            <AchievementCard card={latest} hero />
          ) : (
            <EmptyState title="Ton prochain cap t’attend">
              Une activité peut ouvrir plusieurs jalons. Importe ton historique
              ou ajoute une sortie pour commencer.
            </EmptyState>
          )}
          <p className="caption-note">
            Souvenirs personnels, sans certification fournisseur.
          </p>
        </section>
        <section>
          <div className="section-heading">
            <h2>Tes collections</h2>
            <Link to="/collections">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <LiveCollectionProgress data={data} />
          <div className="quiet-callout">
            <p className="eyebrow">LA SUITE T’APPARTIENT</p>
            <h2>
              Ta prochaine sortie,
              <br />
              ton prochain souvenir.
            </h2>
            <p>Une activité, des objectifs. Tes cartes restent acquises.</p>
            <Button asChild className="w-full">
              <Link to="/import">
                <Plus size={18} />
                Ajouter une activité
              </Link>
            </Button>
          </div>
          <div className="mini-summary">
            <strong>{data.owned.length}</strong>
            <span>cartes</span>
            <span className="summary-divider" />
            <strong>{data.activity_count}</strong>
            <span>activités</span>
          </div>
        </section>
      </div>
    </>
  );
}
