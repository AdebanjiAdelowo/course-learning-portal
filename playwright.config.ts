import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They need a running, seeded Supabase stack (`npm run db:start && npm run seed`).
 * Set PLAYWRIGHT_CHANNEL=chrome to use an installed Google Chrome instead of the bundled Chromium.
 * Set PLAYWRIGHT_WEB_SERVER="npm run start" to test the production build instead of the dev server.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    // "npm run start" serves the production build (run "npm run build" first). It is what CI
    // uses, because the production build carries the strict Content-Security-Policy.
    command: process.env.PLAYWRIGHT_WEB_SERVER || "npm run dev",
    url: "http://localhost:3000/learn/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
