import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions: { args: ['--enable-unsafe-swiftshader'] }, baseURL: 'http://localhost:4173' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173' },
})
