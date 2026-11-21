import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {mobileItems} from '../../tests/mobile-fixture'
import {seedMobile} from './helpers'
test('mide carga, registro, memoria y animación con un año de historial',async({page,context},info)=>{
  test.setTimeout(120000)
  const baseline=process.env.GYMBEAST_BASELINE==='1'
  const rate=Number(process.env.GYMBEAST_CPU_RATE??4)
  const limited=process.env.GYMBEAST_NETWORK==='mobile'
  await seedMobile(page,mobileItems('2026-11-19',260))
  const cdp=await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate',{rate})
  if(limited)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:5_000_000/8,uploadThroughput:1_000_000/8})
  await page.addInitScript(()=>{
    const state={lcp:0,cls:0,longTasks:0,series:[] as number[],commits:[] as number[],submitted:0}
    let target:Element|null=null,beforeCount=0
    ;(window as any).__perf=state
    const put=IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
      const request=key===undefined?put.call(this,value):put.call(this,value,key)
      if(value?.kind==='set'&&state.submitted){const start=state.submitted;request.transaction?.addEventListener('complete',()=>state.commits.push(performance.now()-start),{once:true})}
      return request
    }
    for(const type of ['largest-contentful-paint','layout-shift','longtask'])try{
      new PerformanceObserver(list=>{for(const entry of list.getEntries() as any[]){
        if(type==='largest-contentful-paint')state.lcp=entry.startTime
        if(type==='layout-shift'&&!entry.hadRecentInput)state.cls+=entry.value
        if(type==='longtask')state.longTasks+=entry.duration
      }}).observe({type,buffered:true})
    }catch{/* Unsupported metrics are reported separately by browser. */}
    document.addEventListener('submit',event=>{if((event.target as HTMLElement).matches('.quick-set')){
      target=(event.target as HTMLElement).closest('.exercise-session');beforeCount=target?.querySelectorAll('.quick-set-done').length??0
      state.submitted=performance.now()
    }},true)
    new MutationObserver(()=>{
      if(state.submitted&&target&&(target.querySelectorAll('.quick-set-done').length>beforeCount)){state.series.push(performance.now()-state.submitted);state.submitted=0}
    }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})
  })
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Hola, Rocco'})).toBeVisible()
  await page.waitForFunction(async()=>{
    const images=[...document.querySelectorAll('.habitat-scene,.dragon-stage')].flatMap(e=>[...getComputedStyle(e).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]))
    await Promise.all(images.map(url=>{const image=new Image();image.src=url;return image.decode().catch(()=>undefined)}));return true
  })
  await page.waitForTimeout(350)
  const home=await page.evaluate(()=>({...(window as any).__perf,sceneReadyMs:performance.now(),resources:performance.getEntriesByType('resource').map((r:any)=>({name:r.name,bytes:r.encodedBodySize,duration:r.duration}))}))
  await page.goto('/sesion/mobile-active')
  const cards=page.locator('.exercise-session')
  await expect(cards).toHaveCount(5)
  for(let i=0;i<5;i++){
    await cards.nth(i).getByRole('button',{name:'Registrar serie 1',exact:true}).click()
    await expect(cards.nth(i).locator('.quick-set-done')).toHaveCount(1)
  }
  const work=await page.evaluate(()=>(window as any).__perf)
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Hola, Rocco'})).toBeVisible()
  await page.waitForTimeout(1000)
  const frames=await page.evaluate(()=>new Promise<{frames:number;p95:number}>(resolve=>{
    const gaps:number[]=[],start=performance.now();let last=start
    function frame(now:number){gaps.push(now-last);last=now;if(now-start<1500)requestAnimationFrame(frame);else{gaps.sort((a,b)=>a-b);resolve({frames:gaps.length,p95:gaps[Math.floor(gaps.length*.95)]})}}
    requestAnimationFrame(frame)
  }))
  const metrics=await cdp.send('Performance.getMetrics')
  const result={scenario:'localhost, Chromium 390x844, CPU ×'+rate+'; '+(limited?'5 Mbps bajada/1 Mbps subida, 80 ms':'sin limitación de red')+', 260 sesiones/5200 series',home,series:work.series,commits:work.commits,frames,
    heapUsed:metrics.metrics.find((m:any)=>m.name==='JSHeapUsedSize')?.value,recordTargetMs:100,lcpTargetMs:2500}
  await mkdir('docs/qa/etapa-10',{recursive:true})
  await writeFile('docs/qa/etapa-10/'+(baseline?'baseline':'performance-cpu'+rate+(limited?'-network':''))+'.json',JSON.stringify(result,null,2))
  await page.screenshot({path:info.outputPath('rendimiento-inicio.png')})
  expect(work.series).toHaveLength(5)
})
