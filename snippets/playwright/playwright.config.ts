import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'form.spec.ts',
  outputDir: '../../test-results/playwright-snippet',
  workers: 1,
  globalTimeout: 60_000,
  use: { browserName: 'chromium' },
});
