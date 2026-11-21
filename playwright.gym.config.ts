import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'gym-catalog.spec.ts',outputDir:'gym-results',
 use:{baseURL:'http://127.0.0.1:4186'},projects:[320,390].map(width=>({name:'webkit-'+width,use:{browserName:'webkit' as const,viewport:{width,height:780},isMobile:true,hasTouch:true}})),
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4186',url:'http://127.0.0.1:4186'}})
