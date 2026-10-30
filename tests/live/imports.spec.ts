import { expect, request, test } from "@playwright/test";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { gpxXml } from "../fixtures/synthetic";

test("live launch-dev: ZIP, private upload, lost commit response, resume, history and exact reimport", async ({
  page,
}) => {
  const base = "https://kephzbvcbmjzqqvqgtav.supabase.co";
  const session = JSON.parse(process.env.LAUNCH_LIVE_SESSION ?? "null");
  if (!session?.user?.email?.endsWith("@example.test"))
    throw new Error(
      "A synthetic session from the server-side runner is required.",
    );
  await page.addInitScript((value: unknown) => {
    localStorage.setItem(
      "sb-kephzbvcbmjzqqvqgtav-auth-token",
      JSON.stringify(value),
    );
  }, session);
  // Node's API transport honors the managed proxy and CA trust. Browser SDK
  // requests and their exact bodies are forwarded unchanged; no backend mocks.
  const transport = await request.newContext({
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY }
      : undefined,
  });
  let uploaded = 0,
    missing = 0,
    existing = 0,
    reserves = 0,
    commits = 0;
  let lostCommitResponse = false;
  let tusCreates = 0,
    tusPatches = 0;
  await page.route(`${base}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    try {
      const response = await transport.fetch(req.url(), {
        method: req.method(),
        headers: req.headers(),
        data: req.postDataBuffer() ?? undefined,
        failOnStatusCode: false,
      });
      if (path.endsWith("/reserve_activity_file")) reserves++;
      if (path.includes("/upload/resumable") && response.ok()) {
        if (req.method() === "POST") tusCreates++;
        if (req.method() === "PATCH") tusPatches++;
      }
      if (path.includes("/object/info/")) {
        if (response.ok()) existing++;
        else missing++;
      }
      if (path.includes("/object/sport-sources/") && req.method() === "POST") {
        expect(req.headers()["content-type"]).toBe("application/octet-stream");
        if (response.ok()) uploaded++;
      }
      if (path.endsWith("/commit_activity_import")) {
        commits++;
        if (response.ok() && !lostCommitResponse) {
          // The database transaction really committed; only its client response
          // is lost. Resume must consult receipts instead of writing it twice.
          lostCommitResponse = true;
          await route.fulfill({
            status: 503,
            json: { code: "P0001", message: "Synthetic lost commit response" },
            headers: { "access-control-allow-origin": "*" },
          });
          return;
        }
      }
      await route.fulfill({ response });
    } catch {
      // Suppress Playwright transport diagnostics containing request headers.
      await route.abort("failed");
    }
  });
  try {
    await page.goto("/import");
    const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
    await zip.add("synthetic/year/run.gpx", new TextReader(gpxXml()));
    const archive = Buffer.from(await (await zip.close()).arrayBuffer());
    async function selectZip() {
      await page.getByRole("checkbox", { name: /copie temporaire/ }).check();
      await page.getByLabel("Fichiers sportifs").setInputFiles({
        name: "synthetic-history.zip",
        mimeType: "application/zip",
        buffer: archive,
      });
      await expect(
        page.getByRole("heading", { name: "Revue de ton import" }),
      ).toBeVisible();
      await page
        .getByRole("checkbox", { name: /Conserver les sources/ })
        .check();
    }
    await selectZip();
    await page.getByRole("button", { name: "Confirmer l’import" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Enregistrement des activités",
    );
    await expect(page.getByRole("alert")).toContainText("HTTP 503");
    expect(uploaded).toBe(1);
    await page.reload();
    await page
      .getByRole("button", { name: "Reprendre l’enregistrement" })
      .click();
    await expect(page.getByRole("status")).toContainText("Import terminé");
    await page.goto("/activities");
    await expect(page.locator(".activity-row")).toHaveCount(1);
    await page.locator(".activity-row").click();
    await expect(
      page.getByText("Source conservée en privé", { exact: false }),
    ).toBeVisible();
    await page.goto("/import");
    await selectZip();
    await expect(
      page.getByText("Déjà importée", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirmer l’import" }).click();
    await expect(page.getByRole("status")).toContainText("Import terminé");
    await page.goto("/activities");
    await expect(page.locator(".activity-row")).toHaveCount(1);
    expect(uploaded).toBe(1);
    expect(commits).toBe(2);
    expect(reserves).toBe(2);
    expect(missing).toBe(1);
    expect(existing).toBe(1);
    console.log(
      "PASS live browser: Worker ZIP + private raw upload + committed response lost/replayed + history + same ZIP twice; one activity and one upload.",
    );
    // Exercise the browser's actual tus-js-client branch as well, not only a
    // hand-crafted server-side TUS request. All content remains synthetic.
    await page.goto("/import");
    await page.getByRole("checkbox", { name: /copie temporaire/ }).check();
    const large = gpxXml("Cycling", "2026-01-04T08:00:00Z").replace(
      "</gpx>",
      `<!--${"x".repeat(7 * 1024 * 1024)}--></gpx>`,
    );
    await page
      .getByLabel("Fichiers sportifs")
      .setInputFiles({
        name: "synthetic-large.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(large),
      });
    await expect(
      page.getByRole("heading", { name: "Revue de ton import" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /Conserver les sources/ }).check();
    await page.getByRole("button", { name: "Confirmer l’import" }).click();
    await expect(page.getByRole("status")).toContainText("Import terminé", {
      timeout: 45000,
    });
    await page.goto("/activities");
    await expect(page.locator(".activity-row")).toHaveCount(2);
    expect(tusCreates).toBe(1);
    expect(tusPatches).toBeGreaterThan(0);
    console.log(
      "PASS live browser: actual tus-js-client upload of a synthetic 7 MiB source and second history activity.",
    );
  } finally {
    await transport.dispose();
  }
});
