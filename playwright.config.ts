import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    headless: true,
    baseURL: 'http://localhost:3457',
  },
  webServer: {
    command: 'node e2e-fixtures/server.mjs',
    port: 3457,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
