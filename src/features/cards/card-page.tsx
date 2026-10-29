import { Link, useParams } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { AchievementCard } from "./achievement-card";
import type { DemoData } from "@/lib/demo";
import { date, distance } from "@/lib/utils";
export function CardPage({
  data,
  activityBasePath = "/activities",
}: {
  data: DemoData;
  activityBasePath?: string;
}) {
  const { cardId } = useParams();
  const card = data.cards.find((c) => c.id === cardId);
  if (!card)
    return (
      <EmptyState title="Carte introuvable">
        Cette carte ne fait pas partie du catalogue de démonstration.
      </EmptyState>
    );
  return (
    <>
      <Button asChild variant="ghost">
        <Link to={`/collections/${card.sport}`}>
          <ArrowLeft size={18} />
          Retour à la collection
        </Link>
      </Button>
      <div className="detail-grid">
        <AchievementCard card={card} />
        <section className="detail-copy">
          <p className="eyebrow">UN CAP À COLLECTIONNER</p>
          <h1>{card.title}</h1>
          <p>{card.subtitle}. Un effort qui reste dans ta collection.</p>
          <div className="panel padded">
            <h2>
              {card.owned ? <Check size={20} /> : <LockKeyhole size={20} />}{" "}
              {card.owned ? "Carte obtenue · Démo" : "Prochain objectif"}
            </h2>
            <p>
              Parcourir au moins {distance(card.thresholdM)} en une seule
              activité dans ce sport.
            </p>
            <p className="small">
              Critère fictif proposé, à valider avant production.
            </p>
            {card.awardedAt && <p>Débloquée le {date(card.awardedAt)}</p>}
          </div>
          {card.activityId && (
            <Button asChild variant="outline">
              <Link to={`${activityBasePath}/${card.activityId}`}>
                Voir l’activité associée
              </Link>
            </Button>
          )}
          <p className="small">
            Aucune carte n’est attribuée par cette interface. Les futures
            attributions seront calculées côté serveur.
          </p>
        </section>
      </div>
    </>
  );
}
