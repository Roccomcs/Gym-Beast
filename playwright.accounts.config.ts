import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/accounts',
  outputDir: 'accounts-results',
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://127.0.0.1:4175' },
  webServer: {
    command: 'npm run build -- --outDir .auth-dist && npm run preview -- --outDir .auth-dist --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key' },
  },
})
