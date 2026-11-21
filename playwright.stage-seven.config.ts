import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./e2e',testMatch:'load-bonus.spec.ts',outputDir:'stage-seven-results',
  use:{baseURL:'http://127.0.0.1:4180'},
  projects:[
    {name:'chromium-320',use:{browserName:'chromium',viewport:{width:320,height:780}}},
    {name:'webkit-390',use:{browserName:'webkit',viewport:{width:390,height:844}}},
  ],
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4180 --strictPort',url:'http://127.0.0.1:4180'},
})
