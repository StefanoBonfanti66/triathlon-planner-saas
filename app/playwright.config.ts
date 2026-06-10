import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    browserName: 'chromium',
    launchOptions: {
      executablePath: '/usr/bin/chromium-browser',
    },
  },
});
