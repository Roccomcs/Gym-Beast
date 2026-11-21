import {test,expect} from 'vitest'
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
// @ts-expect-error release tool is a plain Node module
import {inspectRelease} from '../scripts/check-release.mjs'
test('el control de publicación rechaza secretos administrativos dentro del frontend',async()=>{
  const prefix=join(tmpdir(),'gymbeast-release-'),dir=await mkdtemp(prefix)
  try{
    await mkdir(join(dir,'assets'))
    for(const file of ['index.html','sw.js','_headers','icon.png'])await writeFile(join(dir,file),'test')
    await writeFile(join(dir,'_redirects'),'/* /index.html 200')
    await writeFile(join(dir,'manifest.webmanifest'),JSON.stringify({display:'standalone',start_url:'/',icons:[{src:'icon.png',purpose:'maskable'}]}))
    await writeFile(join(dir,'assets/app.js'),'const value="sb_secret_'+ 'x'.repeat(24)+'"')
    await expect(inspectRelease(dir)).rejects.toThrow(/administrativa/)
    await writeFile(join(dir,'assets/app.js'),'const value="public application"')
    expect((await inspectRelease(dir)).pilotReady).toBe(false)
  }finally{if(!resolve(dir).startsWith(resolve(prefix)))throw new Error('Invalid cleanup target');await rm(dir,{recursive:true,force:true})}
})
