import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { AchievementCard } from "@/features/cards/achievement-card";
import { CollectionProgress } from "@/features/collections/collection-progress";
import type { DemoData } from "@/lib/demo";
export function HomePage({ data }: { data: DemoData }) {
  const latest = data.cards.find((c) => c.id === "running-2")!;
  return (
    <>
      <PageHeader
        eyebrow="LES EFFORTS PASSENT. LES CARTES RESTENT."
        title="Tes exploits, en cartes."
        description="Chaque sortie compte. Collectionne les moments qui te font avancer."
      />
      <div className="home-grid">
        <section>
          <div className="section-heading">
            <h2>Dernière carte débloquée</h2>
            <ArrowUpRight size={18} />
          </div>
          <AchievementCard card={latest} hero />
          <p className="caption-note">Un nouveau cap. Un souvenir à garder.</p>
        </section>
        <section>
          <div className="section-heading">
            <h2>Tes collections</h2>
            <Link to="/collections">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <CollectionProgress cards={data.cards} />
          <div className="quiet-callout">
            <span className="eyebrow">LA SUITE T’APPARTIENT</span>
            <h2>
              Et si ta prochaine sortie
              <br />
              devenait une carte ?
            </h2>
            <p>Un fichier, une activité, une nouvelle histoire.</p>
            <Button asChild className="w-full">
              <Link to="/import">
                <Plus size={18} />
                Ajouter une activité
              </Link>
            </Button>
          </div>
          <div className="mini-summary">
            <strong>{data.cards.filter((c) => c.owned).length}</strong>
            <span>cartes collectionnées</span>
            <span className="summary-divider" />
            <strong>4</strong>
            <span>sports à explorer</span>
          </div>
        </section>
      </div>
    </>
  );
}
