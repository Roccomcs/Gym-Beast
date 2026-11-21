import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import {readFile,unlink,writeFile} from 'node:fs/promises'
import {resolve,sep} from 'node:path'
let buildDirectory=''

export default defineConfig({
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'prompt',
    workbox: {
      clientsClaim: true,
      globPatterns: ['**/*.{js,css,html,ico,woff2}'],
      globIgnores: ['**/pet-training/**'],
      runtimeCaching: [{
        urlPattern: /\/pet-training\/.*\.(?:png|webp)(?:\?.*)?$/,
        handler: 'CacheFirst',
        options: { cacheName: 'gymbeast-pet-training-v2', expiration: { maxEntries: 32, maxAgeSeconds: 2592000,purgeOnQuotaError:true },
          cacheableResponse: { statuses: [200] } },
      },{urlPattern:({url,sameOrigin})=>sameOrigin&&/\.(?:png|webp|jpe?g|svg)$/.test(url.pathname),handler:'CacheFirst',
        options:{cacheName:'gymbeast-art-v1',expiration:{maxEntries:128,maxAgeSeconds:2592000,purgeOnQuotaError:true},cacheableResponse:{statuses:[200]}}}],
    },
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'third-party-notices.txt'],
    manifest: {
      name: 'GymBeast', short_name: 'GymBeast', lang: 'es-AR',
      id:'/',start_url: '/', display: 'standalone', orientation: 'portrait',
      theme_color: '#131316', background_color: '#131316',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  }),{
    name:'publish-lossless-art-only',
    async configurePreviewServer(server){
      const report=JSON.parse(await readFile('docs/qa/etapa-10/art-optimization.json','utf8'))
      const targets=new Map<string,string>(report.entries.map((entry:{source:string;output:string})=>[entry.source.replace(/^public/,''),entry.output.replace(/^public/,'')]))
      server.middlewares.use((request,response,next)=>{
        const [path,query]=(request.url??'').split('?'),target=targets.get(path)
        if(!target){next();return}
        response.statusCode=302;response.setHeader('Location',target+(query?'?'+query:''));response.end()
      })
    },
    configResolved(config){if(config.command==='build')buildDirectory=resolve(config.root,config.build.outDir)},
    async closeBundle(){
      if(!buildDirectory)return
      const root=resolve('.')
      if(!buildDirectory.startsWith(root+sep))throw new Error('Invalid build output directory')
      const report=JSON.parse(await readFile('docs/qa/etapa-10/art-optimization.json','utf8'))
      const redirects=await readFile(resolve(buildDirectory,'_redirects'),'utf8')
      await writeFile(resolve(buildDirectory,'_redirects'),report.entries.map((entry:{source:string;output:string})=>
        entry.source.replace(/^public/,'')+' '+entry.output.replace(/^public/,'')+' 200').join('\n')+'\n'+redirects)
      for(const entry of report.entries){
        const target=resolve(buildDirectory,entry.source.replace(/^public\//,''))
        if(!target.startsWith(buildDirectory+sep))throw new Error('Invalid art output path')
        await unlink(target).catch(error=>{if(error.code!=='ENOENT')throw error})
      }
    },
  }],
})
