import { defineConfig } from "@playwright/test";

const external = process.env.FORMA_TEST_APP_URL;
const url = external ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: url,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.FORMA_TEST_CHROMIUM },
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: external ? undefined : {
    command: "npm run dev -- --hostname localhost --port 3000",
    url, timeout: 90000, reuseExistingServer: !process.env.CI,
  },
});
