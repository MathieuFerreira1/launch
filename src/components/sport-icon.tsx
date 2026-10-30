import { Bike, Footprints, Mountain, Waves, Ellipsis } from "lucide-react";
export function SportIcon({
  sport,
  size = 22,
}: {
  sport: string;
  size?: number;
}) {
  const icons: Record<string, typeof Bike> = {
    running: Footprints,
    trail: Mountain,
    cycling: Bike,
    swimming: Waves,
    unsupported: Ellipsis,
    unknown: Ellipsis,
  };
  const Icon = icons[sport] ?? Ellipsis;
  return (
    <span className={`sport-icon ${sport}`}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
