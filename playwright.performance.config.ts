import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e/mobile',testMatch:'performance.spec.ts',outputDir:'performance-results',
  use:{browserName:'chromium',baseURL:'http://127.0.0.1:4182',viewport:{width:390,height:844}},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4182 --strictPort',url:'http://127.0.0.1:4182'}})
