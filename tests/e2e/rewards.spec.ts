import { expect, test, type Page } from "@playwright/test";
import {
  rewardFixture,
  revealId,
  runningCards,
  syntheticActivityId,
} from "../fixtures/rewards";
const uid = "10000000-0000-0000-0000-000000000001";
async function backend(page: Page, interrupted = false) {
  const token = `header.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  const session = {
    id: revealId,
    kind: "initial_collection",
    status: "pending",
    position: 0,
    card_count: 7,
    created_at: "2026-01-05T08:00:00Z",
    seen_at: null as string | null,
  };
  let stage = interrupted ? "processing" : "ready",
    failures = 0,
    manifestCalls = 0;
  const writes: string[] = [];
  await page.route("https://auth.launch.test/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      body = req.postDataJSON() ?? {};
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        json: data,
        headers: {
          "access-control-allow-origin": "*",
          "x-supabase-api-version": "2024-01-01",
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
    if (path === "/auth/v1/token")
      return reply({
        access_token: token,
        refresh_token: "synthetic",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: uid, email: "synthetic@example.test", user_metadata: {} },
      });
    if (path.endsWith("/process_reward_batch")) {
      if (stage === "processing")
        return reply({
          status: "processing",
          job_id: "80000000-0000-4000-8000-000000000001",
          processed: 1,
          total: 2,
          new_awards: 0,
        });
      if (stage === "failing") {
        if (--failures === 0) stage = "ready";
        return reply({ code: "P0001", message: "Synthetic interruption" }, 503);
      }
      return reply({
        status: "ready",
        job_id: "80000000-0000-4000-8000-000000000001",
        processed: 2,
        total: 2,
        new_awards: 7,
      });
    }
    if (path.endsWith("/get_collection_data")) {
      manifestCalls++;
      const data = rewardFixture(runningCards);
      data.pending = session.status === "seen" ? [] : [session];
      return reply(data);
    }
    if (path === "/rest/v1/reveal_sessions") return reply(session);
    if (path === "/rest/v1/reveal_items") {
      const data = rewardFixture(runningCards);
      const rank: Record<string, number> = {
        common: 1,
        rare: 2,
        epic: 3,
        legendary: 4,
      };
      return reply(
        [...data.owned]
          .sort((a, b) => {
            const da = data.definitions.find((d) => d.id === a.card_id)!,
              db = data.definitions.find((d) => d.id === b.card_id)!;
            return (
              rank[db.rarity]! - rank[da.rarity]! ||
              da.sort_order - db.sort_order
            );
          })
          .map((c) => ({ user_card_id: c.id })),
      );
    }
    if (path.endsWith("/advance_reveal")) {
      session.position = body.p_finish
        ? session.card_count
        : Math.max(session.position, body.p_position);
      session.status =
        session.position === session.card_count ? "seen" : "viewing";
      session.seen_at =
        session.status === "seen" ? "2026-01-06T08:00:00Z" : null;
      return reply(session);
    }
    if (
      req.method() !== "GET" &&
      [
        "/rest/v1/user_cards",
        "/rest/v1/achievement_events",
        "/rest/v1/card_definitions",
      ].includes(path)
    )
      writes.push(path);
    return reply({}, 404);
  });
  return {
    session,
    writes,
    interrupt: () => {
      stage = "failing";
      failures = 2;
    },
    manifestCalls: () => manifestCalls,
  };
}
async function login(page: Page) {
  await page.goto("/auth");
  await page.getByLabel("Adresse email").fill("synthetic@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("synthetic-long-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/app$/);
}
test("private collections, rare initial reveal, interrupted progress, skip and no replay", async ({
  page,
}, info) => {
  const server = await backend(page);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Tes exploits, en cartes." }),
  ).toBeVisible();
  await expect(page.locator(".collection-row")).toHaveCount(4);
  if (info.project.name === "mobile-390")
    await page.screenshot({
      path: info.outputPath("account-home.png"),
      fullPage: true,
    });
  await page.goto("/collections/running");
  await expect(page.locator(".account-card-grid .achievement")).toHaveCount(6);
  await expect(page.getByText("6 / 6 jalons", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Maître du bitume", exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile-390")
    await page.screenshot({
      path: info.outputPath("running-collection.png"),
      fullPage: true,
    });
  await page.goto("/cards/RUN_MARATHON");
  await expect(
    page.getByRole("heading", { level: 1, name: "42,195 km" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voir l’activité associée" }),
  ).toHaveAttribute("href", `/activities/${syntheticActivityId}`);
  await page.goto("/app");
  await page
    .getByRole("link", { name: "Découvrir mes cartes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ta collection prend vie." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (info.project.name === "mobile-390")
    await page.screenshot({
      path: info.outputPath("initial-reveal.png"),
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Découvrir mes cartes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Révéler cette carte", exact: true })
    .click();
  await expect(
    page.locator(".single-reveal.legendary.is-revealed"),
  ).toBeVisible();
  const readsBefore = server.manifestCalls();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByText("Carte 2 / 7", { exact: true })).toBeVisible();
  expect(server.manifestCalls()).toBe(readsBefore);
  await page.reload();
  await expect(page.getByText("Carte 2 / 7", { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Passer les animations" }).click();
  await expect(
    page.getByRole("heading", { name: "Ta collection a grandi." }),
  ).toBeVisible();
  await expect(page.locator(".reveal-summary .achievement")).toHaveCount(7);
  expect(server.session.status).toBe("seen");
  await page
    .getByRole("link", { name: "Voir ma collection", exact: true })
    .click();
  await page.goto("/app");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tes exploits, en cartes." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Découvrir mes cartes", exact: true }),
  ).toHaveCount(0);
  expect(server.writes).toEqual([]);
});
test("processing exposes bounded progress and recovers without reading a stale collection", async ({
  page,
}) => {
  const server = await backend(page, true);
  await login(page);
  await expect(
    page.getByRole("progressbar", { name: "Calcul de la collection" }),
  ).toHaveAttribute("value", "1");
  expect(server.manifestCalls()).toBe(0);
  server.interrupt();
  await expect(
    page.getByRole("button", { name: "Reprendre le calcul" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reprendre le calcul" }).click();
  await expect(
    page.getByRole("heading", { name: "Tes exploits, en cartes." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Découvrir mes cartes", exact: true }),
  ).toBeVisible();
  expect(server.manifestCalls()).toBeGreaterThan(0);
});

test("mobile polish: locked goals, all sports, touch targets and reduced motion", async ({
  page,
}, info) => {
  await backend(page);
  await login(page);
  for (const sport of ["running", "trail", "cycling", "swimming"]) {
    await page.goto(`/collections/${sport}`);
    await expect(page.locator(".account-card-grid .achievement")).toHaveCount(
      6,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const image = page.locator(".account-card-grid img").first();
    await expect(image).toHaveJSProperty("complete", true);
    if (sport !== "running")
      await expect(page.locator(".account-card-grid .locked")).toHaveCount(6);
    if (info.project.name.endsWith("390"))
      await page.screenshot({
        path: info.outputPath(`${sport}-polish.png`),
        fullPage: true,
      });
  }
  await page.locator(".account-card-grid .achievement").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".detail-grid > article")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".detail-grid > .achievement")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  if (info.project.name.endsWith("390"))
    await page.screenshot({
      path: info.outputPath("card-detail-polish.png"),
      fullPage: true,
    });
  if (info.project.name !== "desktop") {
    for (const item of await page.locator(".bottom-nav a").all()) {
      const box = await item.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  }
});
