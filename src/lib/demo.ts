import { useQuery } from "@tanstack/react-query";
import type { Achievement, Sport } from "@/features/cards/types";
import type { Activity } from "@/features/activities/types";
const definitions: {
  sport: Sport;
  distances: number[];
  titles: string[];
  owned: number;
  artwork: string;
}[] = [
  {
    sport: "running",
    distances: [5000, 10000, 21100, 42195],
    titles: ["5 km", "10 km", "Semi-marathon", "Marathon"],
    owned: 3,
    artwork: "running",
  },
  {
    sport: "trail",
    distances: [5000, 15000, 30000, 60000],
    titles: [
      "Premiers sentiers",
      "L’appel des crêtes",
      "Au-delà des sommets",
      "Ultra aventure",
    ],
    owned: 1,
    artwork: "trail",
  },
  {
    sport: "cycling",
    distances: [20000, 50000, 100000, 200000],
    titles: [
      "En selle",
      "La grande boucle",
      "Le premier siècle",
      "L’horizon lointain",
    ],
    owned: 2,
    artwork: "cycling",
  },
  {
    sport: "swimming",
    distances: [500, 1000, 2000, 5000],
    titles: [
      "Premières longueurs",
      "Le grand bain",
      "Eau libre",
      "La traversée",
    ],
    owned: 1,
    artwork: "swimming",
  },
];
const rarities = ["common", "rare", "epic", "legendary"] as const;
export const cards: Achievement[] = definitions.flatMap((d) =>
  d.distances.map((thresholdM, i) => ({
    id: `${d.sport}-${i + 1}`,
    sport: d.sport,
    title: d.titles[i]!,
    subtitle: [
      "Le premier pas",
      "Un nouveau cap",
      "Repousse tes limites",
      "Une aventure à part",
    ][i]!,
    rarity: rarities[i]!,
    thresholdM,
    owned: i < d.owned,
    artwork: d.artwork,
    ...(i < d.owned
      ? { awardedAt: "2026-10-24T08:30:00Z", activityId: `${d.sport}-activity` }
      : {}),
  })),
);
export const activities: Activity[] = [
  {
    id: "running-activity",
    title: "Le long de la corniche",
    category: "running",
    originalSport: "Running",
    startedAtUtc: "2026-10-24T08:30:00Z",
    distanceM: 21200,
    durationS: 6810,
    elevationM: 120,
    evidence: "file_import",
    status: "valid",
  },
  {
    id: "trail-activity",
    title: "Échappée dans les calanques",
    category: "trail",
    originalSport: "Trail running",
    startedAtUtc: "2026-10-22T07:00:00Z",
    distanceM: 8200,
    durationS: 3850,
    elevationM: 420,
    evidence: "file_import",
    status: "valid",
  },
  {
    id: "cycling-activity",
    title: "Un dimanche sur la route",
    category: "cycling",
    originalSport: "Road cycling",
    startedAtUtc: "2026-10-18T08:00:00Z",
    distanceM: 54300,
    durationS: 7380,
    elevationM: 560,
    evidence: "file_import",
    status: "valid",
  },
  {
    id: "swimming-activity",
    title: "Retour dans le grand bain",
    category: "swimming",
    originalSport: "Pool swim",
    startedAtUtc: "2026-10-16T16:00:00Z",
    distanceM: 750,
    durationS: 1200,
    elevationM: 0,
    evidence: "self_reported",
    status: "valid",
  },
  {
    id: "other-activity",
    title: "Une journée sur les pistes",
    category: "unsupported",
    originalSport: "Ski",
    startedAtUtc: "2026-02-12T09:00:00Z",
    distanceM: 18200,
    durationS: 10800,
    elevationM: 0,
    evidence: "file_import",
    status: "needs_review",
  },
];
export interface DemoData {
  cards: Achievement[];
  activities: Activity[];
}
export function useDemoData() {
  return useQuery({
    queryKey: ["demo"],
    queryFn: async (): Promise<DemoData> => ({ cards, activities }),
    staleTime: Infinity,
  });
}
