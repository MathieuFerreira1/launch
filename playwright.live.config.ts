import { defineConfig } from "@playwright/test";

if (
  process.env.LAUNCH_LIVE_IMPORT_TEST !== "1" ||
  process.env.VITE_SUPABASE_URL !== "https://kephzbvcbmjzqqvqgtav.supabase.co"
)
  throw new Error(
    "Utiliser scripts/test-live-import-browser.py sur launch-dev uniquement.",
  );

export default defineConfig({
  testDir: "./tests/live",
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command:
      "npm run build && npm run preview -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
  },
});
