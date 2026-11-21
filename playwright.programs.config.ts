import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'new-programs.spec.ts',outputDir:'programs-results',
  use:{baseURL:'http://127.0.0.1:4185'},projects:[320,390].map(width=>({name:'webkit-'+width,use:{browserName:'webkit' as const,viewport:{width,height:780},isMobile:true,hasTouch:true}})),
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4185 --strictPort',url:'http://127.0.0.1:4185'}})
