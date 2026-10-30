import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";
import { type Achievement, type Rarity } from "./types";
const rule = z.object({
  card_id: z.string(),
  metric: z.string(),
  threshold: z.coerce.number().positive(),
});
const collection = z.object({
  id: z.string(),
  sport_slug: z.string(),
  title: z.string(),
  version: z.number(),
  active: z.boolean(),
  sort_order: z.number(),
});
const definition = z.object({
  id: z.string(),
  collection_id: z.string(),
  title: z.string(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  kind: z.enum(["milestone", "completion"]),
  artwork_key: z.string().regex(/^[a-z0-9_-]+$/),
  ruleset_version: z.string(),
  sort_order: z.number(),
  active: z.boolean(),
});
export const revealSchema = z.object({
  id: z.uuid(),
  kind: z.enum([
    "initial_collection",
    "new_achievements",
    "new_sport_collection",
  ]),
  status: z.enum(["pending", "viewing", "seen"]),
  position: z.number().int().nonnegative(),
  card_count: z.number().int().positive(),
  created_at: z.string(),
  seen_at: z.string().nullable(),
});
export type RevealSession = z.infer<typeof revealSchema>;
const owned = z.object({
  id: z.uuid(),
  card_id: z.string(),
  first_awarded_at: z.string(),
  activity_id: z.uuid().nullable(),
  evidence_level: z.enum([
    "file_import",
    "self_reported",
    "collection_unverified",
  ]),
  proof_status: z.enum(["available", "needs_review"]),
  rule_snapshot: z.record(z.string(), z.unknown()),
  evidence_snapshot: z.record(z.string(), z.unknown()),
});
const schema = z.object({
  collections: z.array(collection),
  definitions: z.array(definition),
  rules: z.array(rule),
  core: z.array(
    z.object({
      collection_id: z.string(),
      card_id: z.string(),
      required: z.boolean(),
    }),
  ),
  owned: z.array(owned),
  pending: z.array(revealSchema),
  activity_count: z.number().int().nonnegative(),
});
export type OwnedCard = z.infer<typeof owned>;
export interface CollectionCard extends Achievement {
  collectionId: string;
  kind: "milestone" | "completion";
  condition: string;
  rules: z.infer<typeof rule>[];
  ownership?: OwnedCard;
  sortOrder: number;
}
export type CollectionData = z.infer<typeof schema> & {
  cards: CollectionCard[];
};
const number = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
export function ruleCondition(r: z.infer<typeof rule>) {
  const value =
    r.metric === "distance_m"
      ? r.threshold >= 1000
        ? `${number(r.threshold / 1000)} km`
        : `${number(r.threshold)} m`
      : r.metric === "elevation_gain_m"
        ? `${number(r.threshold)} m D+`
        : r.metric === "duration_s"
          ? `${number(r.threshold / 60)} min`
          : `${number(r.threshold * 3.6)} km/h`;
  return `Atteindre ${value} en une seule activité`;
}
export function parseCollectionData(raw: unknown): CollectionData {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error("COLLECTION_RESPONSE_INVALID");
  const data = parsed.data;
  const cards = data.definitions.map((d): CollectionCard => {
    const set = data.collections.find((s) => s.id === d.collection_id);
    const ownership = data.owned.find((x) => x.card_id === d.id);
    const rules = data.rules.filter((r) => r.card_id === d.id);
    const required = data.core.filter(
      (m) => m.collection_id === d.collection_id && m.required,
    ).length;
    const condition =
      d.kind === "completion"
        ? `Obtenir les ${required} jalons de cette collection avec leurs justifications disponibles`
        : rules.map(ruleCondition).join(" et ");
    return {
      id: d.id,
      sport: set?.sport_slug ?? "unknown",
      collectionId: d.collection_id,
      title: d.title,
      subtitle:
        d.kind === "completion"
          ? "Collection accomplie"
          : (set?.title ?? "Sport"),
      rarity: d.rarity,
      thresholdM: rules.find((r) => r.metric === "distance_m")?.threshold ?? 0,
      owned: !!ownership,
      artwork: d.artwork_key,
      kind: d.kind,
      edition: d.ruleset_version,
      condition,
      rules,
      sortOrder: d.sort_order,
      ownership,
      awardedAt: ownership?.first_awarded_at,
      activityId: ownership?.activity_id ?? undefined,
    };
  });
  return { ...data, cards };
}
export async function loadCollections() {
  const { data, error } = await getSupabaseClient().rpc("get_collection_data");
  if (error) throw new Error("COLLECTION_LOAD_FAILED");
  return parseCollectionData(data);
}
const processingSchema = z.object({
  status: z.enum(["ready", "processing"]),
  job_id: z.uuid().nullable(),
  processed: z.number(),
  total: z.number(),
  new_awards: z.number(),
});
export async function processRewardBatch() {
  const { data, error } = await getSupabaseClient().rpc(
    "process_reward_batch",
    { p_limit: 200 },
  );
  if (error) throw new Error("REWARD_PROCESSING_FAILED");
  const parsed = processingSchema.safeParse(data);
  if (!parsed.success) throw new Error("REWARD_RESPONSE_INVALID");
  return parsed.data;
}
export async function loadReveal(id: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("reveal_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("REVEAL_LOAD_FAILED");
  if (!data) return null;
  const session = revealSchema.parse(data);
  const ids: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const r = await client
      .from("reveal_items")
      .select("user_card_id")
      .eq("session_id", id)
      .order("ordinal")
      .range(offset, offset + 499);
    if (r.error) throw new Error("REVEAL_LOAD_FAILED");
    ids.push(...(r.data ?? []).map((i) => String(i.user_card_id)));
    if ((r.data?.length ?? 0) < 500) break;
  }
  return { session, ownedIds: ids };
}
export async function advanceReveal(
  id: string,
  position: number,
  finish = false,
) {
  const { data, error } = await getSupabaseClient().rpc("advance_reveal", {
    p_session: id,
    p_position: position,
    p_finish: finish,
  });
  if (error) throw new Error("REVEAL_PROGRESS_FAILED");
  return revealSchema.parse(data);
}
export const rarityRank: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};
