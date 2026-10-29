import { expect, test } from "@playwright/test";
test("parcours démo, collections, activité, import et profil", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const backend: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).hostname.endsWith("supabase.co"))
      backend.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorer la démo" }).click();
  await expect(
    page.getByRole("heading", { name: "Tes exploits, en cartes." }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", {
    name:
      testInfo.project.name === "desktop"
        ? "Navigation principale"
        : "Navigation mobile",
    exact: true,
  });
  for (const [url, name] of [
    ["/app", "accueil"],
    ["/collections/running", "collection"],
    ["/cards/running-2", "carte"],
    ["/activities", "activites"],
    ["/import", "import"],
    ["/profile", "profil"],
  ]) {
    await page.goto(url!);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (testInfo.project.name === "mobile-390")
      await page.screenshot({
        path: testInfo.outputPath(`${name}.png`),
        fullPage: true,
      });
  }
  await nav.getByRole("link", { name: "Collections", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Filtrer les collections" })
    .getByRole("link", { name: "Natation" })
    .click();
  await expect(page.locator(".achievement")).toHaveCount(4);
  await page.locator(".achievement").first().click();
  await expect(
    page.getByRole("heading", {
      name: "Premières longueurs",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voir l’activité associée" }).click();
  await expect(
    page.getByText("Activité déclarée manuellement, non certifiée."),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Activités", exact: true }).click();
  await page.getByRole("button", { name: "Autres", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Une journée sur les pistes/ }),
  ).toBeVisible();
  await expect(page.locator(".activity-row")).toHaveCount(1);
  await page.goto("/import");
  await page.getByLabel("Fichiers sportifs").setInputFiles([
    {
      name: "sortie.gpx",
      mimeType: "application/gpx+xml",
      buffer: Buffer.from("<gpx/>"),
    },
    {
      name: "inconnu.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("sample"),
    },
  ]);
  await expect(
    page.getByText("Format non pris en charge ou fichier vide", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Analyse disponible dans une prochaine étape",
    }),
  ).toBeDisabled();
  // Keyboard activation also verifies that this control remains accessible.
  await page
    .getByRole("button", { name: "Effacer la sélection" })
    .press("Enter");
  await expect(page.getByText("sortie.gpx")).toHaveCount(0);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Quitter la démo" }).click();
  await expect(page).toHaveURL(/\/auth(?:\?.*)?$/);
  await page.goto("/collections");
  await expect(page).toHaveURL(/\/auth(?:\?.*)?$/);
  expect(errors).toEqual([]);
  expect(backend).toEqual([]);
});
test("liens directs, carte verrouillée, erreur de route, hors ligne et mouvement réduit", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorer la démo" }).click();
  await page.goto("/cards/running-4");
  await expect(
    page.getByRole("heading", { name: "Prochain objectif" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Marathon");
  await page.goto("/cards/inconnue");
  await expect(
    page.getByRole("heading", { name: "Carte introuvable" }),
  ).toBeVisible();
  await page.goto("/collections/inconnue");
  await expect(
    page.getByRole("heading", { name: "Collection introuvable" }),
  ).toBeVisible();
  await page.goto("/introuvable");
  await expect(
    page.getByRole("heading", { name: "Cette page n’existe pas" }),
  ).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByRole("status")).toContainText("Hors ligne");
  await page.context().setOffline(false);
});
