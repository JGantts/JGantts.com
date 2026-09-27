import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:42301',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'chrome',
      use: { browserName: 'chromium', channel: 'chrome' },
      testIgnore: '**/photo-gallery-recovery.spec.ts',
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit', isMobile: true, hasTouch: true },
      testMatch: '**/photo-gallery-recovery.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: true,
    url: 'http://127.0.0.1:42301/photos',
  },
})
