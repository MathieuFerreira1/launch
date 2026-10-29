import { Bike, Footprints, Mountain, Waves, Ellipsis } from "lucide-react";
import type { Sport } from "@/features/cards/types";
export function SportIcon({
  sport,
  size = 22,
}: {
  sport: Sport | "unsupported" | "unknown";
  size?: number;
}) {
  const Icon = {
    running: Footprints,
    trail: Mountain,
    cycling: Bike,
    swimming: Waves,
    unsupported: Ellipsis,
    unknown: Ellipsis,
  }[sport];
  return (
    <span className={`sport-icon ${sport}`}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
