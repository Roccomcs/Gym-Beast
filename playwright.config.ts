import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/accounts/**', '**/wardrobe/**', '**/pets/**','**/mobile/**'],
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://localhost:4173' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173' },
})
