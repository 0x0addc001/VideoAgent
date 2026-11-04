import { defineConfig, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const apiUrl = "http://127.0.0.1:8100";
const webUrl = "http://127.0.0.1:3100";
const runId = Date.now();
const databasePath = resolve(
  `services/api/.data/playwright-${runId}.db`,
).replaceAll("\\", "/");
const mediaDirectory = resolve(`services/api/.data/playwright-${runId}-media`);
mkdirSync(dirname(databasePath), { recursive: true });
mkdirSync(mediaDirectory, { recursive: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.CI ? undefined : "chrome",
    baseURL: webUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        "uv run --directory services/api uvicorn videoagent.main:app --host 127.0.0.1 --port 8100",
      url: `${apiUrl}/api/v1/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VIDEOAGENT_DATABASE_URL:
          `sqlite+aiosqlite:///${databasePath}`,
        VIDEOAGENT_MEDIA_DIR: mediaDirectory,
        VIDEOAGENT_VIDEO_PROVIDER: "mock",
        VIDEOAGENT_ALLOWED_ORIGINS: `["${webUrl}"]`,
        VIDEOAGENT_FRONTEND_BASE_URL: webUrl,
        VIDEOAGENT_CELERY_ENABLED: "false",
      },
    },
    {
      command: "pnpm --dir apps/web exec next dev -H 127.0.0.1 -p 3100",
      url: `${webUrl}/en`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_BASE_URL: `${apiUrl}/api/v1`,
      },
    },
  ],
});

