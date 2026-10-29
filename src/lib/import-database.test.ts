// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("enforces import idempotency, source privacy and RLS between real PostgreSQL roles", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to authenticated;grant select on storage.objects to anon;`,
    );
    for (const file of [
      "20261029000100_profiles_and_sports.sql",
      "20261029000200_activity_imports.sql",
      "20261029000300_storage_upload_preflight.sql",
      "20261029000400_import_deletion_lifecycle.sql",
      "20261029000500_classification_review_guards.sql",
    ])
      await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
    await db.exec(readFileSync("supabase/tests/activity_imports.sql", "utf8"));
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from public.activities",
        )
      ).rows[0]?.n,
    ).toBe(0);
  } finally {
    await db.close();
  }
}, 30000);
