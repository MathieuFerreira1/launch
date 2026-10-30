import { Link } from "react-router-dom";
import { Check, LockKeyhole, Trophy, Diamond } from "lucide-react";
import { rarityLabels, sports, type Achievement } from "./types";
export function AchievementCard({
  card,
  hero = false,
  interactive = true,
}: {
  card: Achievement;
  hero?: boolean;
  interactive?: boolean;
}) {
  const attributes = {
    className: `achievement ${hero ? "hero-card" : ""} ${!card.owned ? "locked" : ""}`,
    "data-sport": card.sport,
    "data-rarity": card.rarity,
    "data-kind": card.kind,
    "aria-label": `${card.title} · ${rarityLabels[card.rarity]} · ${card.owned ? "Obtenue" : "Verrouillée"}`,
  };
  const content = (
    <>
      <div className="art">
        <img
          src={`/art/${card.artwork}.svg`}
          alt=""
          width={600}
          height={600}
          decoding="async"
          loading={hero ? "eager" : "lazy"}
        />
        <span className={`rarity ${card.rarity}`}>
          <Diamond size={10} aria-hidden="true" />
          {rarityLabels[card.rarity]}
        </span>
        <span className="ownership">
          {card.owned ? <Check size={17} /> : <LockKeyhole size={17} />}
        </span>
        {card.kind && (
          <span className="card-stamp">
            {card.kind === "completion" ? (
              <>
                <Trophy size={13} /> COLLECTION ACCOMPLIE
              </>
            ) : (
              `LAUNCH · ${card.edition?.toUpperCase() ?? "V1"}`
            )}
          </span>
        )}
        {hero && (
          <div className="art-caption">
            CHAQUE SORTIE
            <br />
            LAISSE UNE TRACE.
          </div>
        )}
      </div>
      <div className="card-caption">
        <div>
          <h3>{card.title}</h3>
          <p>
            {hero
              ? sports.find((s) => s.slug === card.sport)?.name
              : card.subtitle}
          </p>
        </div>
        {hero && (
          <span className="card-edition">
            {card.kind ? "SÉRIE" : "ÉDITION"}
            <br />
            {card.edition?.toUpperCase() ?? "ORIGINALE · 01"}
          </span>
        )}
        <div className="card-footer" aria-hidden="true">
          <span>{card.owned ? "SOUVENIR ACQUIS" : "PROCHAIN CAP"}</span>
          <span>{card.edition?.toUpperCase() ?? "V1"}</span>
        </div>
      </div>
    </>
  );
  return interactive ? (
    <Link to={`/cards/${card.id}`} {...attributes}>
      {content}
    </Link>
  ) : (
    <article {...attributes}>{content}</article>
  );
}
