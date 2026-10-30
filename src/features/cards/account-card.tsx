import { CollectionLoading } from "@/features/cards/rewards-context";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, LockKeyhole, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError } from "@/components/ui/states";
import { date } from "@/lib/utils";
import { useRewards } from "./use-rewards";
import { AchievementCard } from "./achievement-card";
import { ruleCondition } from "./collection-api";
export function AccountCard() {
  const { cardId } = useParams();
  const { collections } = useRewards();
  if (collections.isPending) return <CollectionLoading />;
  if (collections.isError)
    return <InlineError retry={() => void collections.refetch()} />;
  const data = collections.data,
    card = data.cards.find((c) => c.id === cardId);
  if (!card) return <EmptyState title="Carte introuvable" />;
  const source = card.ownership;
  const earnedRules = source?.rule_snapshot.rules;
  return (
    <>
      <Button asChild variant="ghost">
        <Link to={`/collections/${card.sport}`}>
          <ArrowLeft size={18} />
          Retour à la collection
        </Link>
      </Button>
      <div className="detail-grid">
        <AchievementCard card={card} interactive={false} />
        <section className="detail-copy">
          <p className="eyebrow">
            {card.kind === "completion"
              ? "UNE COLLECTION. UN NOUVEAU CHAPITRE."
              : "UN CAP À COLLECTIONNER"}
          </p>
          <h1>{card.title}</h1>
          <p>{card.condition}.</p>
          <div className="panel padded">
            <h2>
              {card.owned ? <Check size={20} /> : <LockKeyhole size={20} />}{" "}
              {card.owned ? "Carte obtenue" : "Prochain objectif"}
            </h2>
            <p>
              {card.kind === "completion" ? (
                <>
                  <Trophy size={20} /> Récompense de collection : chaque jalon
                  est requis.
                </>
              ) : (
                "Les performances sont évaluées sur une seule activité, sans additionner tes sorties."
              )}
            </p>
            {source && (
              <>
                <p>Débloquée le {date(source.first_awarded_at)}</p>
                <p>
                  {source.evidence_level === "self_reported"
                    ? "Provenance : activité déclarée manuellement."
                    : source.evidence_level === "file_import"
                      ? "Provenance : import d’un fichier modifiable."
                      : "Provenance : jalons personnels de la collection."}
                </p>
                <p className="small">
                  Version du catalogue conservée avec la justification.
                </p>
                {Array.isArray(earnedRules) && earnedRules.length > 0 && (
                  <p className="small">
                    Condition à l’attribution :{" "}
                    {earnedRules
                      .map((r: { metric?: unknown; threshold?: unknown }) =>
                        typeof r.metric === "string" &&
                        typeof r.threshold === "number"
                          ? ruleCondition({
                              card_id: card.id,
                              metric: r.metric,
                              threshold: r.threshold,
                            })
                          : "",
                      )
                      .join(" et ")}
                    .
                  </p>
                )}
                {source.proof_status === "needs_review" && (
                  <p role="status" className="form-error">
                    La justification a changé ou n’est plus disponible. Ton
                    souvenir est conservé ; cette carte personnelle reste à
                    vérifier.
                  </p>
                )}
              </>
            )}
          </div>
          {source?.activity_id && (
            <Button asChild variant="outline">
              <Link to={`/activities/${source.activity_id}`}>
                Voir l’activité associée
              </Link>
            </Button>
          )}
          <p className="personal-note">
            Collection personnelle, non certifiée. Cette carte ne constitue
            aucun droit compétitif ou commercial.
          </p>
        </section>
      </div>
    </>
  );
}
