import { CollectionLoading } from "@/features/cards/rewards-context";
import { useRewards } from "@/features/cards/use-rewards";
import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { AchievementCard } from "@/features/cards/achievement-card";
import {
  advanceReveal,
  loadReveal,
  type CollectionCard,
} from "@/features/cards/collection-api";
import { RewardsStatus } from "@/features/cards/rewards-context";

function SingleCard({
  card,
  onNext,
  pending,
}: {
  card: CollectionCard;
  onNext: () => void;
  pending: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div
      className={`single-reveal ${card.rarity} ${revealed ? "is-revealed" : ""}`}
    >
      <div className="reveal-art-stage">
        {revealed ? (
          <>
            <div className="rarity-effects" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <i key={i} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
            <AchievementCard card={card} interactive={false} />
          </>
        ) : (
          <button
            className="card-back"
            onClick={() => setRevealed(true)}
            aria-label="Révéler cette carte"
          >
            <span className="wordmark">
              launch<span>.</span>
            </span>
            <Sparkles size={46} />
            <span>
              Un effort.
              <br />
              Un souvenir.
            </span>
            <small>Appuie pour découvrir</small>
          </button>
        )}
      </div>
      {revealed ? (
        <>
          <p role="status" className="reveal-announcement">
            {card.title} ·{" "}
            {card.kind === "completion"
              ? "Collection accomplie"
              : "Carte personnelle acquise"}
          </p>
          <Button disabled={pending} onClick={onNext}>
            Continuer <ArrowRight size={18} />
          </Button>
        </>
      ) : (
        <Button variant="outline" onClick={() => setRevealed(true)}>
          Révéler la carte
        </Button>
      )}
    </div>
  );
}
export function RevealPage() {
  const { sessionId } = useParams();
  const owner = useAuth().session!.user.id;
  const cache = useQueryClient();
  const { collections, processing } = useRewards();
  const q = useQuery({
    queryKey: ["reveal", owner, sessionId],
    queryFn: () => loadReveal(sessionId!),
    retry: 1,
    staleTime: 30000,
    enabled: processing.data?.status === "ready" && !processing.isFetching,
  });
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function advance(position: number, finish = false) {
    if (!q.data) return;
    setPending(true);
    setError("");
    try {
      const session = await advanceReveal(q.data.session.id, position, finish);
      cache.setQueryData(["reveal", owner, sessionId], { ...q.data, session });
      if (session.status === "seen")
        await cache.invalidateQueries({ queryKey: ["collection-data", owner] });
    } catch {
      setError(
        "Ta progression n’a pas été confirmée. Réessaie ; tes cartes restent acquises dans ta collection.",
      );
    } finally {
      setPending(false);
    }
  }
  if (q.isPending || collections.isPending) return <CollectionLoading />;
  if (q.isError || collections.isError)
    return (
      <InlineError
        retry={() => {
          void q.refetch();
          void collections.refetch();
        }}
      />
    );
  if (!q.data) return <EmptyState title="Découverte introuvable" />;
  const session = q.data.session;
  const cards = q.data.ownedIds
    .map((id) => collections.data.cards.find((c) => c.ownership?.id === id))
    .filter((c): c is CollectionCard => !!c);
  if (cards.length !== session.card_count)
    return (
      <div className="empty panel">
        <h1>Ta collection s’actualise.</h1>
        <p>Les cartes sont conservées en base.</p>
        <Button
          onClick={() => {
            void q.refetch();
            void collections.refetch();
          }}
        >
          Actualiser
        </Button>
      </div>
    );
  const summary = session.status === "seen";
  const rareSummary = (["legendary", "epic"] as const)
    .map((rarity) => {
      const n = cards.filter((c) => c.rarity === rarity).length;
      return n
        ? `${n} ${rarity === "legendary" ? "légendaire" : "épique"}${n > 1 ? "s" : ""}`
        : null;
    })
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="reveal-page">
      <div className="reveal-toolbar">
        <Button asChild variant="ghost">
          <Link to="/app">
            <ArrowLeft size={18} />
            Plus tard
          </Link>
        </Button>
        <span className="wordmark">
          launch<span>.</span>
        </span>
        {!summary && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => void advance(session.position, true)}
          >
            Passer les animations
          </Button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!summary &&
      (processing.isPending ||
        processing.isError ||
        processing.data?.status === "processing" ||
        processing.isFetching) ? (
        <RewardsStatus />
      ) : summary ? (
        <>
          <header className="reveal-heading">
            <p className="eyebrow">CES SOUVENIRS SONT À TOI.</p>
            <h1>Ta collection a grandi.</h1>
            <p>
              {cards.length} carte{cards.length > 1 ? "s" : ""} acquise
              {cards.length > 1 ? "s" : ""}. Les efforts passent, les cartes
              restent.
            </p>
          </header>
          <div className="actions">
            <Button asChild>
              <Link to="/collections">Voir ma collection</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app">Retour à l’accueil</Link>
            </Button>
          </div>
          <div className="reveal-breakdown" aria-label="Récompenses par sport">
            {collections.data.collections.map((sport) => {
              const n = cards.filter((c) => c.collectionId === sport.id).length;
              return n ? (
                <span key={sport.id}>
                  <strong>{n}</strong> {sport.title}
                </span>
              ) : null;
            })}
          </div>
          <div className="card-grid reveal-summary">
            {cards.map((c) => (
              <AchievementCard key={c.id} card={c} />
            ))}
          </div>
        </>
      ) : session.status === "pending" ? (
        <>
          <header className="reveal-heading">
            <p className="eyebrow">DE BEAUX EFFORTS. DE NOUVEAUX SOUVENIRS.</p>
            <h1>
              {session.kind === "initial_collection"
                ? "Ta collection prend vie."
                : "Un nouveau cap à découvrir."}
            </h1>
            <p>
              {session.card_count} carte{session.card_count > 1 ? "s" : ""}{" "}
              débloquée{session.card_count > 1 ? "s" : ""} grâce à tes
              activités.
            </p>
            {rareSummary && <p className="rare-summary">{rareSummary}</p>}
          </header>
          <div className="reveal-fan">
            {cards.slice(0, 3).map((c, i) => (
              <div key={c.id} style={{ "--fan": i } as CSSProperties}>
                <AchievementCard card={c} />
              </div>
            ))}
          </div>
          <Button disabled={pending} onClick={() => void advance(0)}>
            Découvrir mes cartes <Sparkles size={18} />
          </Button>
        </>
      ) : (
        <>
          <header className="reveal-heading compact">
            <p className="eyebrow">UN EFFORT. UN SOUVENIR.</p>
            <h1>À chaque cap, sa carte.</h1>
            <p>
              Carte {session.position + 1} / {session.card_count}
            </p>
          </header>
          <progress
            className="reveal-progress"
            aria-label="Cartes découvertes"
            value={session.position}
            max={session.card_count}
          />
          <SingleCard
            key={session.position}
            card={cards[session.position]!}
            pending={pending}
            onNext={() => void advance(session.position + 1)}
          />
        </>
      )}
      <p className="personal-note">
        Collections personnelles · Imports et déclarations non certifiés par un
        fournisseur.
      </p>
    </div>
  );
}
