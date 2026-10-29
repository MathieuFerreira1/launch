import { getSupabaseClient } from "@/lib/supabase";
import type { Category, ParsedActivity } from "@/features/imports/model";
export interface StoredActivity extends ParsedActivity {
  id: string;
  user_id: string;
  evidence_level: "file_import" | "self_reported";
  created_at: string;
  updated_at: string;
}
export async function listActivities(category: string, page: number) {
  let q = getSupabaseClient()
    .from("activities")
    .select("*", { count: "exact" })
    .order("started_at_utc", { ascending: false, nullsFirst: false })
    .order("id")
    .range(page * 50, page * 50 + 49);
  if (category !== "all") q = q.eq("category", category);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data as StoredActivity[], count: count ?? 0 };
}
export async function getActivity(id: string) {
  const { data, error } = await getSupabaseClient()
    .from("activities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as StoredActivity | null;
}
export interface StoredSource {
  id: string;
  storage_path: string;
  original_name: string;
  bytes: number;
  retained: boolean;
  format: string;
}
export async function getActivitySources(id: string) {
  const c = getSupabaseClient();
  const { data: links, error } = await c
    .from("activity_file_links")
    .select("file_id")
    .eq("activity_id", id);
  if (error) throw error;
  if (!links?.length) return [];
  const { data, error: sourceError } = await c
    .from("activity_files")
    .select("id,storage_path,original_name,bytes,retained,format")
    .in(
      "id",
      links.map((l) => l.file_id),
    );
  if (sourceError) throw sourceError;
  return data as StoredSource[];
}
export async function correctSport(id: string, category: Category) {
  const { error } = await getSupabaseClient().rpc("correct_activity_sport", {
    p_id: id,
    p_category: category,
  });
  if (error) throw error;
}
export async function saveManual(
  id: string,
  activity: ParsedActivity,
  keepDuplicate: boolean,
) {
  const { data, error } = await getSupabaseClient().rpc(
    "save_manual_activity",
    { p_id: id, p_activity: activity, p_keep_duplicate: keepDuplicate },
  );
  if (error) throw error;
  return data as string;
}
// Read-only, stable cursor for the next reward-engine mission. No grants to award cards.
export async function rewardInputsAfter(id: string | null) {
  let q = getSupabaseClient()
    .from("reward_activity_inputs")
    .select("*")
    .order("id")
    .limit(250);
  if (id) q = q.gt("id", id);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Complete replay interface: includes future sports and incomplete activities.
// Consumers must inspect status/evidence and check retained sources before reprocessing.
export async function activityReplayInputsAfter(id: string | null) {
  let q = getSupabaseClient()
    .from("activities")
    .select(
      "id,user_id,category,original_sport,started_at_utc,distance_m,duration_s,elevation_gain_m,avg_speed_mps,max_speed_mps,evidence_level,status,warnings,extra,created_at,updated_at",
    )
    .order("id")
    .limit(250);
  if (id) q = q.gt("id", id);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
