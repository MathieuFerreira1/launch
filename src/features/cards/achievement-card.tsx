import { Link } from "react-router-dom";
import { Check, LockKeyhole } from "lucide-react";
import { rarityLabels, sports, type Achievement } from "./types";
export function AchievementCard({
  card,
  hero = false,
}: {
  card: Achievement;
  hero?: boolean;
}) {
  return (
    <Link
      to={`/cards/${card.id}`}
      className={`achievement ${hero ? "hero-card" : ""} ${!card.owned ? "locked" : ""}`}
      aria-label={`${card.title} · ${rarityLabels[card.rarity]} · ${card.owned ? "Obtenue" : "Verrouillée"}`}
    >
      <div className="art">
        <img
          src={`/art/${card.artwork}.svg`}
          alt=""
          loading={hero ? "eager" : "lazy"}
        />
        <span className={`rarity ${card.rarity}`}>
          {rarityLabels[card.rarity]}
        </span>
        <span className="ownership">
          {card.owned ? <Check size={17} /> : <LockKeyhole size={17} />}
        </span>
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
            ÉDITION
            <br />
            ORIGINALE · 01
          </span>
        )}
      </div>
    </Link>
  );
}
