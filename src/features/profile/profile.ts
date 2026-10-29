import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";
export const profileFieldsSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (s) => s === "" || /^[a-z0-9_]{3,30}$/.test(s),
      "Pseudo : 3 à 30 lettres minuscules, chiffres ou underscores.",
    ),
  display_name: z
    .string()
    .trim()
    .max(80, "Le nom ne peut dépasser 80 caractères."),
  avatar_url: z
    .string()
    .trim()
    .refine(
      (s) =>
        s === "" || (/^https:\/\/\S+$/.test(s) && z.url().safeParse(s).success),
      "L’avatar doit utiliser une URL HTTPS valide.",
    )
    .refine((s) => s.length <= 2048, "URL trop longue."),
  bio: z
    .string()
    .trim()
    .max(500, "La biographie ne peut dépasser 500 caractères."),
});
export type ProfileFields = z.infer<typeof profileFieldsSchema>;
export interface Profile {
  user_id: string;
  handle: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  updated_at: string;
}
const columns =
  "user_id,handle,display_name,avatar_url,bio,created_at,updated_at";
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select(columns)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}
export async function updateProfile(
  userId: string,
  input: ProfileFields,
): Promise<Profile> {
  const fields = profileFieldsSchema.parse(input);
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .update({
      ...fields,
      handle: fields.handle || null,
      avatar_url: fields.avatar_url || null,
    })
    .eq("user_id", userId)
    .select(columns)
    .single();
  if (error) throw error;
  return data as Profile;
}
