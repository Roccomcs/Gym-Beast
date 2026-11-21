import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./e2e', testMatch:'stage-six.spec.ts', outputDir:'stage-six-results',
  use:{baseURL:'http://127.0.0.1:4179',viewport:{width:320,height:780}},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4179 --strictPort',url:'http://127.0.0.1:4179'},
})
