import { expect, test } from "@playwright/test";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { gpxXml, tcxXml, largeGpx } from "../fixtures/synthetic";
import { emptyRewardsResponse } from "../fixtures/rewards";
const uid = "20000000-0000-0000-0000-000000000001";
test("Worker import, explicit duplicate decision, interrupted batch resume and real history UI", async ({
  page,
}, info) => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  const activities: Record<string, unknown>[] = [];
  const receipts = new Map<string, Set<string>>();
  const files = new Map<string, Record<string, unknown>>();
  let failCommit = true;
  let attempts = 0;
  await page.route("https://auth.launch.test/**", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const body = req.postDataJSON() ?? {};
    const ok = (data: unknown, status = 200, headers = {}) =>
      route.fulfill({
        status,
        json: data,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-expose-headers":
            "content-range,x-supabase-api-version",
          "x-supabase-api-version": "2024-01-01",
          ...headers,
        },
      });
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    const rewards = emptyRewardsResponse(u.pathname);
    if (rewards !== undefined) return ok(rewards);
    if (u.pathname === "/auth/v1/token")
      return ok({
        access_token: token,
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: {
          id: uid,
          email: "synthetic@example.test",
          aud: "authenticated",
          user_metadata: {},
        },
      });
    if (u.pathname.endsWith("/find_activity_duplicates"))
      return ok(
        body.p_items.map((i: Record<string, unknown>) => ({
          key: i.key,
          exactId: activities.find((a) => a.source_key === i.key)?.id ?? null,
          matches: [],
        })),
      );
    if (u.pathname.endsWith("/begin_activity_import")) {
      if (!receipts.has(body.p_id)) receipts.set(body.p_id, new Set());
      return ok({ id: body.p_id });
    }
    if (u.pathname.endsWith("/reserve_activity_file")) {
      const source = {
        id: crypto.randomUUID(),
        storage_path: `${uid}/${body.p_hash}`,
        retained: false,
      };
      files.set(body.p_hash, source);
      return ok(source);
    }
    if (u.pathname.endsWith("/commit_activity_import")) {
      attempts++;
      if (failCommit) {
        failCommit = false;
        return ok(
          { message: "simulated network interruption", code: "P0001" },
          503,
        );
      }
      const done = receipts.get(body.p_batch)!;
      for (const item of body.p_items) {
        if (done.has(item.key)) continue;
        if (
          item.decision !== "skip" &&
          !activities.some((a) => a.source_key === item.key)
        ) {
          activities.push({
            ...item,
            id: crypto.randomUUID(),
            user_id: uid,
            source_key: item.key,
            evidence_level: "file_import",
          });
        }
        done.add(item.key);
      }
      return ok(body.p_items.length);
    }
    if (u.pathname.endsWith("/record_import_errors")) return ok(null);
    if (u.pathname.endsWith("/finish_activity_import")) return ok("completed");
    if (u.pathname === "/rest/v1/import_items") {
      const id = u.searchParams.get("batch_id")?.slice(3) ?? "";
      return ok(
        [...(receipts.get(id) ?? [])].map((source_key) => ({ source_key })),
      );
    }
    if (u.pathname === "/rest/v1/activities") {
      if (u.searchParams.has("id"))
        return ok(
          activities.find((a) => a.id === u.searchParams.get("id")!.slice(3)) ??
            null,
        );
      const c = u.searchParams.get("category")?.slice(3);
      const rows = c ? activities.filter((a) => a.category === c) : activities;
      return ok(rows, 200, {
        "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
      });
    }
    if (u.pathname === "/rest/v1/activity_file_links") return ok([]);
    return ok({}, 404);
  });
  await page.goto("/auth");
  await page.getByLabel("Adresse email").fill("synthetic@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("synthetic-long-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/import");
  await page.getByRole("checkbox", { name: /copie temporaire/ }).check();
  const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await zip.add("nested/run.gpx", new TextReader(gpxXml()));
  await zip.add("nested/same-run.tcx", new TextReader(tcxXml()));
  await zip.add(
    "old/ski.gpx",
    new TextReader(gpxXml("Ski", "2026-01-03T08:00:00Z")),
  );
  await zip.add("corrupt.fit", new TextReader("broken"));
  const archive = await zip.close();
  await page.getByLabel("Fichiers sportifs").setInputFiles({
    name: "history.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(await archive.arrayBuffer()),
  });
  await expect(
    page.getByRole("heading", { name: "Revue de ton import" }),
  ).toBeVisible();
  await expect(
    page.getByText("Doublon probable", { exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile-390")
    await page.screenshot({
      path: info.outputPath("import-review.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  await expect(page.getByRole("alert")).toContainText("Choisis quoi faire");
  await page.getByLabel("Doublon de nested/same-run.tcx").selectOption("skip");
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  await expect(page.getByRole("alert")).toContainText("reprends l’import");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reprendre l’enregistrement" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reprendre l’enregistrement" })
    .click();
  await expect(page.getByRole("status")).toContainText("Import terminé");
  expect(attempts).toBe(2);
  expect(activities).toHaveLength(2);
  await page.goto("/activities");
  await expect(page.locator(".activity-row")).toHaveCount(2);
  if (info.project.name === "mobile-390")
    await page.screenshot({
      path: info.outputPath("imported-history.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Autres", exact: true }).click();
  await expect(page.locator(".activity-row")).toHaveCount(1);
  await expect(page.getByText("Ski", { exact: false }).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("200-file ZIP stays responsive and review is paginated", async ({
  page,
}, info) => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  await page.route("https://auth.launch.test/**", async (route) => {
    const u = new URL(route.request().url());
    const body = route.request().postDataJSON() ?? {};
    const data =
      emptyRewardsResponse(u.pathname) ??
      (u.pathname.endsWith("/token")
        ? {
            access_token: token,
            refresh_token: "synthetic",
            token_type: "bearer",
            expires_in: 3600,
            user: {
              id: uid,
              email: "synthetic@example.test",
              user_metadata: {},
            },
          }
        : u.pathname.endsWith("/find_activity_duplicates")
          ? body.p_items.map((i: { key: string }) => ({
              key: i.key,
              exactId: null,
              matches: [],
            }))
          : {});
    await route.fulfill({
      json: data,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("/auth");
  await page.getByLabel("Adresse email").fill("synthetic@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("synthetic-long-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/import");
  await page.getByRole("checkbox", { name: /copie temporaire/ }).check();
  const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  for (let i = 0; i < 200; i++)
    await zip.add(
      `year/${i}/run.gpx`,
      new TextReader(
        largeGpx(new Date(Date.UTC(2025, 0, 1 + i, 8)).toISOString()),
      ),
    );
  const archive = await zip.close();
  await page.evaluate(() => {
    Reflect.set(window, "importTicks", 0);
    Reflect.set(
      window,
      "importTimer",
      setInterval(
        () =>
          Reflect.set(
            window,
            "importTicks",
            Reflect.get(window, "importTicks") + 1,
          ),
        25,
      ),
    );
  });
  const start = Date.now();
  await page.getByLabel("Fichiers sportifs").setInputFiles({
    name: "200-synthetic.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(await archive.arrayBuffer()),
  });
  await expect(
    page.getByRole("heading", { name: "Revue de ton import" }),
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".import-counts strong").nth(3)).toHaveText("0");
  await expect(page.locator(".import-counts strong").first()).toHaveText("200");
  await expect(page.locator(".review-list article")).toHaveCount(50);
  const ticks = await page.evaluate(() => {
    clearInterval(Reflect.get(window, "importTimer"));
    return Reflect.get(window, "importTicks") as number;
  });
  expect(ticks).toBeGreaterThan(2);
  const metrics = {
    files: 200,
    pointsPerFile: 500,
    compressedBytes: archive.size,
    analysisAndReviewMs: Date.now() - start,
    mainThreadTicks: ticks,
  };
  console.log(info.project.name, JSON.stringify(metrics));
  await info.attach("import-performance", {
    body: JSON.stringify(metrics),
    contentType: "application/json",
  });
  await page
    .getByRole("button", { name: "Abandonner ce brouillon local" })
    .click();
  await expect(
    page.getByRole("button", { name: "Choisir des fichiers" }),
  ).toBeVisible();
});

test("manual activity is saved as self-reported and shown in private history", async ({
  page,
}) => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  let activity: Record<string, unknown> | null = null;
  await page.route("https://auth.launch.test/**", async (route) => {
    const u = new URL(route.request().url());
    const body = route.request().postDataJSON() ?? {};
    let data: unknown = emptyRewardsResponse(u.pathname) ?? {};
    if (u.pathname.endsWith("/token"))
      data = {
        access_token: token,
        refresh_token: "synthetic",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: uid, email: "synthetic@example.test", user_metadata: {} },
      };
    else if (u.pathname.endsWith("/save_manual_activity")) {
      activity = {
        ...body.p_activity,
        id: "50000000-0000-0000-0000-000000000001",
        evidence_level: "self_reported",
        user_id: uid,
      };
      data = "50000000-0000-0000-0000-000000000001";
    } else if (u.pathname === "/rest/v1/activities") data = activity;
    else if (u.pathname === "/rest/v1/activity_file_links") data = [];
    await route.fulfill({
      json: data,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("/auth");
  await page.getByLabel("Adresse email").fill("synthetic@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("synthetic-long-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/activities/new");
  await page.getByLabel("Titre", { exact: true }).fill("Synthetic ski");
  await page.getByLabel("Sport", { exact: true }).selectOption("unsupported");
  await page.getByLabel("Sport d’origine", { exact: true }).fill("Ski");
  await page.getByLabel("Date et heure").fill("2026-01-03T08:00");
  await page.getByLabel("Distance (km)").fill("5");
  await page.getByLabel("Durée (minutes)").fill("60");
  await page
    .getByRole("button", { name: "Enregistrer l’activité déclarée" })
    .click();
  await expect(
    page.getByText("Activité déclarée manuellement, non certifiée.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(activity).toMatchObject({
    category: "unsupported",
    original_sport: "Ski",
    distance_m: 5000,
    duration_s: 3600,
  });
});
