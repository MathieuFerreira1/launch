import { expect, test, type Page } from "@playwright/test";
const uid = "10000000-0000-0000-0000-000000000001";
const token = `header.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
async function server(page: Page) {
  let profile = {
    user_id: uid,
    handle: null as string | null,
    display_name: "Alex",
    avatar_url: null,
    bio: "",
    created_at: "2026-10-29T00:00:00Z",
    updated_at: "2026-10-29T00:00:00Z",
  };
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  await page.route("https://auth.launch.test/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postDataJSON() ?? {};
    calls.push({ url: url.pathname, body });
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        json: data,
        headers: {
          "access-control-allow-origin": "*",
          "x-supabase-api-version": "2024-01-01",
          "access-control-expose-headers": "x-supabase-api-version",
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
    if (url.pathname === "/auth/v1/token") {
      if (body.password === "wrong")
        return respond(
          { code: "invalid_credentials", msg: "Invalid login credentials" },
          400,
        );
      return respond({
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "fake-refresh",
        user: {
          id: uid,
          email: "alex@example.test",
          aud: "authenticated",
          user_metadata: {},
          created_at: "2026-10-29T00:00:00Z",
        },
      });
    }
    if (url.pathname === "/auth/v1/signup")
      return respond({
        id: uid,
        email: "alex@example.test",
        identities: [],
        user_metadata: {},
      });
    if (url.pathname === "/auth/v1/recover") return respond({});
    if (url.pathname === "/auth/v1/logout") return respond({});
    if (url.pathname === "/auth/v1/user")
      return respond({
        id: uid,
        email: "alex@example.test",
        user_metadata: {},
      });
    if (url.pathname === "/rest/v1/profiles") {
      if (req.method() === "PATCH") profile = { ...profile, ...body };
      return respond(profile);
    }
    return respond({ message: "Unexpected endpoint" }, 404);
  });
  return calls;
}
test("connexion, profil réel, restauration et déconnexion", async ({
  page,
}) => {
  const calls = await server(page);
  await page.goto("/auth");
  if (test.info().project.name === "mobile-390")
    await page.screenshot({
      path: "docs/screenshots/auth-login.png",
      fullPage: true,
    });
  await page.getByLabel("Adresse email").fill("alex@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Email ou mot de passe incorrect.",
  );
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("a-long-test-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/profile");
  await expect(page.getByLabel("Nom affiché")).toHaveValue("Alex");
  if (test.info().project.name === "mobile-390")
    await page.screenshot({
      path: "docs/screenshots/auth-profile.png",
      fullPage: true,
    });
  await page.getByLabel("Nom affiché").fill("Alexandre");
  await page.getByLabel("Pseudo", { exact: true }).fill("alex_launch");
  await page.getByLabel("Biographie").fill("Un pas après l’autre.");
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Ton profil a été enregistré.",
  );
  expect(
    calls.some(
      (c) =>
        c.url === "/rest/v1/profiles" &&
        c.body.display_name === "Alexandre" &&
        !("user_id" in c.body),
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Nom affiché")).toHaveValue("Alexandre");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL(/\/auth(?:\?.*)?$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/auth\?/);
});
test("inscription email, récupération neutre et lien expiré", async ({
  page,
}) => {
  const calls = await server(page);
  await page.goto("/auth/signup");
  if (test.info().project.name === "mobile-390")
    await page.screenshot({
      path: "docs/screenshots/auth-signup.png",
      fullPage: true,
    });
  await page.getByLabel("Nom affiché").fill("Alex");
  await page.getByLabel("Adresse email").fill("alex@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("a-long-test-password");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("status")).toContainText("email de confirmation");
  expect(calls.find((c) => c.url === "/auth/v1/signup")?.body).toMatchObject({
    email: "alex@example.test",
    data: { display_name: "Alex" },
  });
  await page.goto("/auth/forgot-password");
  await page.getByLabel("Adresse email").fill("alex@example.test");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Si un compte correspond",
  );
  await page.goto("/auth/update-password");
  await expect(page.getByRole("alert")).toContainText("expiré");
  await page.goto("/auth/callback?error=access_denied");
  await expect(
    page.getByRole("heading", { name: "Ce lien ne fonctionne plus." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("erreur réseau récupérable sur la connexion", async ({ page }) => {
  await server(page);
  await page.route("**/auth/v1/token**", (route) => route.abort("failed"));
  await page.goto("/auth");
  await page.getByLabel("Adresse email").fill("alex@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("a-long-test-password");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("alert")).toContainText("Vérifie ta connexion");
  await expect(
    page.getByRole("button", { name: "Me connecter" }),
  ).toBeEnabled();
});

test("récupération PKCE puis nouveau mot de passe sans boucle de redirection", async ({
  page,
}) => {
  const calls = await server(page);
  await page.goto("/auth/forgot-password");
  await page.getByLabel("Adresse email").fill("alex@example.test");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Si un compte correspond",
  );
  await page.goto("/auth/update-password?code=test-recovery-code");
  await page
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("new-long-test-password");
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Enregistrer mon mot de passe" })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Les mots de passe ne correspondent pas.",
  );
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("new-long-test-password");
  await page
    .getByRole("button", { name: "Enregistrer mon mot de passe" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Ton mot de passe a été modifié.",
  );
  expect(
    calls.some(
      (c) =>
        c.url === "/auth/v1/user" &&
        c.body.password === "new-long-test-password",
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Retrouver mon espace" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Tes exploits, en cartes." }),
  ).toBeVisible();
});
