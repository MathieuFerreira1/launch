const groups = [
  {
    sport: "running",
    name: "Running",
    rows: [
      ["RUN_5K", "5 km", "common", "distance_m", 5000],
      ["RUN_10K", "10 km", "rare", "distance_m", 10000],
      ["RUN_15K", "15 km", "rare", "distance_m", 15000],
      ["RUN_HALF", "21,1 km", "epic", "distance_m", 21100],
      ["RUN_30K", "30 km", "epic", "distance_m", 30000],
      ["RUN_MARATHON", "42,195 km", "legendary", "distance_m", 42195],
    ],
    bonus: "RUN_COMPLETE",
    title: "Maître du bitume",
  },
  {
    sport: "trail",
    name: "Trail",
    rows: [
      ["TRAIL_5K", "5 km", "common", "distance_m", 5000],
      ["TRAIL_10K", "10 km", "rare", "distance_m", 10000],
      ["TRAIL_UP_500", "500 m D+", "rare", "elevation_gain_m", 500],
      ["TRAIL_20K", "20 km", "epic", "distance_m", 20000],
      ["TRAIL_UP_1500", "1 500 m D+", "epic", "elevation_gain_m", 1500],
      ["TRAIL_UP_3000", "3 000 m D+", "legendary", "elevation_gain_m", 3000],
    ],
    bonus: "TRAIL_COMPLETE",
    title: "Maître des sentiers",
  },
  {
    sport: "cycling",
    name: "Vélo",
    rows: [
      ["BIKE_20K", "20 km", "common", "distance_m", 20000],
      ["BIKE_50K", "50 km", "rare", "distance_m", 50000],
      ["BIKE_100K", "100 km", "epic", "distance_m", 100000],
      ["BIKE_UP_1000", "1 000 m D+", "rare", "elevation_gain_m", 1000],
      ["BIKE_UP_2000", "2 000 m D+", "epic", "elevation_gain_m", 2000],
      ["BIKE_200K", "200 km", "legendary", "distance_m", 200000],
    ],
    bonus: "BIKE_COMPLETE",
    title: "Maître de la route",
  },
  {
    sport: "swimming",
    name: "Natation",
    rows: [
      ["SWIM_500", "500 m", "common", "distance_m", 500],
      ["SWIM_1K", "1 km", "rare", "distance_m", 1000],
      ["SWIM_1500", "1,5 km", "rare", "distance_m", 1500],
      ["SWIM_2K", "2 km", "epic", "distance_m", 2000],
      ["SWIM_3K", "3 km", "epic", "distance_m", 3000],
      ["SWIM_5K", "5 km", "legendary", "distance_m", 5000],
    ],
    bonus: "SWIM_COMPLETE",
    title: "Maître des eaux",
  },
];
export const runningCards = [
  "RUN_5K",
  "RUN_10K",
  "RUN_15K",
  "RUN_HALF",
  "RUN_30K",
  "RUN_MARATHON",
  "RUN_COMPLETE",
];
export const syntheticActivityId = "72000000-0000-4000-8000-000000000001";
export const revealId = "71000000-0000-4000-8000-000000000001";
export function rewardFixture(ids: string[] = []) {
  const definitions = groups.flatMap((g) => [
    ...g.rows.map((r, i) => ({
      id: String(r[0]),
      collection_id: g.sport + "_v1",
      title: String(r[1]),
      rarity: String(r[2]),
      kind: "milestone",
      artwork_key: g.sport,
      ruleset_version: "v1",
      sort_order: i + 1,
      active: true,
    })),
    {
      id: g.bonus,
      collection_id: g.sport + "_v1",
      title: g.title,
      rarity: "legendary",
      kind: "completion",
      artwork_key: "completion",
      ruleset_version: "v1",
      sort_order: 7,
      active: true,
    },
  ]);
  const rules = groups.flatMap((g) =>
    g.rows.map((r) => ({
      card_id: String(r[0]),
      metric: String(r[3]),
      threshold: Number(r[4]),
    })),
  );
  const owned = ids.map((id, i) => ({
    id: `70000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    card_id: id,
    first_awarded_at: "2026-01-05T08:00:00Z",
    activity_id: id.endsWith("COMPLETE") ? null : syntheticActivityId,
    evidence_level: id.endsWith("COMPLETE")
      ? "collection_unverified"
      : "file_import",
    proof_status: "available",
    rule_snapshot: {
      ...definitions.find((d) => d.id === id),
      rules: rules.filter((r) => r.card_id === id),
    },
    evidence_snapshot: {},
  }));
  return {
    collections: groups.map((g, i) => ({
      id: g.sport + "_v1",
      sport_slug: g.sport,
      title: g.name,
      version: 1,
      active: true,
      sort_order: i + 1,
    })),
    definitions,
    rules,
    core: definitions
      .filter((d) => d.kind === "milestone")
      .map((d) => ({
        collection_id: d.collection_id,
        card_id: d.id,
        required: true,
      })),
    owned,
    pending: [] as {
      id: string;
      kind: string;
      status: string;
      position: number;
      card_count: number;
      created_at: string;
      seen_at: string | null;
    }[],
    activity_count: ids.length ? 1 : 0,
  };
}
export function emptyRewardsResponse(path: string): unknown {
  if (path.endsWith("/get_collection_data")) return rewardFixture();
  if (path.endsWith("/process_reward_batch"))
    return {
      status: "ready",
      job_id: null,
      processed: 0,
      total: 0,
      new_awards: 0,
    };
  return undefined;
}
