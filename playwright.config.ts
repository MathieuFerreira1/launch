import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60000,
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://auth.launch.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
    },
  },
  projects: [360, 375, 390, 430]
    .map((width) => ({
      name: `mobile-${width}`,
      use: {
        viewport: { width, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    }))
    .concat([
      {
        name: "desktop",
        use: {
          viewport: { width: 1280, height: 900 },
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
        },
      },
    ]),
});
