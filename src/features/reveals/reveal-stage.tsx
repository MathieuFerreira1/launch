import { useState } from "react";
import { AchievementCard } from "@/features/cards/achievement-card";
import type { Achievement } from "@/features/cards/types";
import { Button } from "@/components/ui/button";
export interface RevealPresentation {
  id: string;
  kind: "initial_collection" | "new_achievements" | "new_sport_collection";
  cards: Achievement[];
}
// Presentation only: accepts already-owned cards; never awards or mutates ownership.
export function RevealStage({
  session,
  onComplete,
}: {
  session: RevealPresentation;
  onComplete: (sessionId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const owned = session.cards.filter((c) => c.owned);
  if (!owned.length) return null;
  return (
    <section className="reveal-stage" aria-label="Découverte des cartes">
      <p className="eyebrow">DE BEAUX EFFORTS. DE NOUVEAUX SOUVENIRS.</p>
      <h2>{owned.length} carte(s) à découvrir</h2>
      <div className="card-grid">
        {(showAll ? owned : owned.slice(0, 3)).map((c) => (
          <AchievementCard key={c.id} card={c} />
        ))}
      </div>
      {owned.length > 3 && !showAll && (
        <Button variant="outline" onClick={() => setShowAll(true)}>
          Tout afficher
        </Button>
      )}
      <Button onClick={() => onComplete(session.id)}>Voir ma collection</Button>
      <Button variant="ghost" onClick={() => onComplete(session.id)}>
        Passer
      </Button>
    </section>
  );
}
