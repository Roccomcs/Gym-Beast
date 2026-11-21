import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/pets', outputDir: 'pets-results', timeout: 120000,
  use: { baseURL: 'http://127.0.0.1:4178', viewport: { width: 390, height: 844 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort', url: 'http://127.0.0.1:4178' },
})
