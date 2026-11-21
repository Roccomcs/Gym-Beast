import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e/accounts',testMatch:'social.spec.ts',outputDir:'social-results',
  use:{baseURL:'http://127.0.0.1:4175'},projects:[
    {name:'chromium-320',use:{browserName:'chromium'}},{name:'webkit-390',use:{browserName:'webkit'}},
  ],webServer:{command:'npm run build -- --outDir .auth-dist && npm run preview -- --outDir .auth-dist --host 127.0.0.1 --port 4175 --strictPort',
    url:'http://127.0.0.1:4175',env:{VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}}})
