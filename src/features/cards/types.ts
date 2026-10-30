export const sports = [
  { slug: "running", name: "Running" },
  { slug: "trail", name: "Trail" },
  { slug: "cycling", name: "Vélo" },
  { slug: "swimming", name: "Natation" },
] as const;
export type Sport = (typeof sports)[number]["slug"];
export type Rarity = "common" | "rare" | "epic" | "legendary";
export const rarityLabels: Record<Rarity, string> = {
  common: "Commune",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};
export interface Achievement {
  id: string;
  sport: string;
  title: string;
  subtitle: string;
  rarity: Rarity;
  thresholdM: number;
  owned: boolean;
  artwork: string;
  awardedAt?: string;
  activityId?: string;
  kind?: "milestone" | "completion";
  edition?: string;
}
