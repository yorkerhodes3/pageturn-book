import { defineConfig, devices } from "@playwright/test";

const pagesBase = process.env.PAGES_BASE_PATH ?? "/";
const port = process.env.PLAYWRIGHT_PORT ?? "4174";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 2,
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      `npx vite preview --config apps/demo/vite.config.ts ` +
      `--host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}${pagesBase}`,
    reuseExistingServer: false,
  },
});
