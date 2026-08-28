import { defineConfig, devices } from "@playwright/test";

const pagesBase = process.env.PAGES_BASE_PATH ?? "/";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview:demo",
    url: `http://127.0.0.1:4174${pagesBase}`,
    reuseExistingServer: false,
  },
});
