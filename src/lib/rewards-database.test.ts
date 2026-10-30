// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";

it("awards personal cards transactionally, resumes jobs/reveals and isolates real PostgreSQL roles", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to authenticated;grant select on storage.objects to anon;`,
    );
    for (const file of readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
    await db.exec(readFileSync("supabase/tests/card_rewards.sql", "utf8"), {
      onNotice: (notice) => {
        if (notice.message?.startsWith("Synthetic reward benchmark:")) {
          console.info(notice.message);
          const match = notice.message.match(/10000 activities, (\d+) ms/);
          if (match)
            writeFileSync(
              "/tmp/launch-rewards-benchmark.json",
              JSON.stringify({
                activities: 10000,
                batchSize: 250,
                batches: 40,
                engineMs: Number(match[1]),
              }),
            );
        }
      },
    });
    await db.exec(
      readFileSync("supabase/tests/card_reward_proofs.sql", "utf8"),
    );
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from public.user_cards",
        )
      ).rows[0]?.n,
    ).toBe(0);
  } finally {
    await db.close();
  }
}, 30000);
