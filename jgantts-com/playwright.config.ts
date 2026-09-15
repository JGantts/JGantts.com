import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:42301',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: true,
    url: 'http://127.0.0.1:42301/photos',
  },
})
