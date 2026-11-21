import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e/accounts',testMatch:'sync.spec.ts',grep:/una recuperación global/,outputDir:'recovery-results',
  use:{browserName:'webkit',baseURL:'http://127.0.0.1:4175',serviceWorkers:'block'},
  webServer:{command:'npm run build -- --outDir .auth-dist && npm run preview -- --outDir .auth-dist --host 127.0.0.1 --port 4175 --strictPort',
    url:'http://127.0.0.1:4175',env:{VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}}})
