// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
it("applies the migration and enforces real PostgreSQL RLS/grants for A, B and anonymous", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261029000100_profiles_and_sports.sql",
        "utf8",
      ),
    );
    await db.exec(readFileSync("supabase/tests/auth_profiles.sql", "utf8"));
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from auth.users",
        )
      ).rows[0]?.count,
    ).toBe(0);
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.sports",
        )
      ).rows[0]?.count,
    ).toBe(4);
  } finally {
    await db.close();
  }
}, 30000);
