import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SportIcon } from "@/components/sport-icon";
import { sports, type Achievement } from "@/features/cards/types";
export function CollectionProgress({ cards }: { cards: Achievement[] }) {
  return (
    <div className="panel collection-list">
      {sports.map((s) => {
        const all = cards.filter((c) => c.sport === s.slug);
        const count = all.filter((c) => c.owned).length;
        return (
          <Link
            to={`/collections/${s.slug}`}
            className="collection-row"
            key={s.slug}
          >
            <SportIcon sport={s.slug} />
            <div>
              <strong>{s.name}</strong>
              <progress
                max={all.length}
                value={count}
                aria-label={`Progression ${s.name}`}
              />
            </div>
            <span>
              {count} / {all.length}
            </span>
            <ChevronRight size={16} />
          </Link>
        );
      })}
    </div>
  );
}
