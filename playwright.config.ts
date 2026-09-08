import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "on-first-retry",
  },
  webServer: {
    command: ".venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
