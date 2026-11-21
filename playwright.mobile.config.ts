import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e/mobile',testMatch:'layout.spec.ts',outputDir:'mobile-results',
  use:{baseURL:'http://127.0.0.1:4183'},projects:['chromium','webkit'].flatMap(browserName=>[320,390,430].map(width=>({
    name:browserName+'-'+width,use:{browserName:browserName as 'chromium'|'webkit',viewport:{width,height:844},hasTouch:true,isMobile:true},
  }))),webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4183 --strictPort',url:'http://127.0.0.1:4183'}})
