import { expect, test } from '@playwright/test'

test('termina offline con tres mejoras, muestra el desglose y conserva el premio al reabrir',async({page,context},info)=>{
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('gymbeast-active-account', 'local'))
  await page.reload()
  await page.getByLabel('Tu nombre').fill('Carga progresiva')
  await page.getByRole('button',{name:/Dragón/}).click()
  await page.getByRole('button',{name:'Confirmar compañero'}).click()
  await expect(page.getByRole('heading',{name:'Hola, Carga progresiva'})).toBeVisible()
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('gymbeast');r.onsuccess=()=>resolve(r.result)})
    const exercises=['bench-press','squat','lat-pulldown','biceps-curl'].map((catalogId,index)=>({id:'move'+index,catalogId,
      name:['Press banca','Sentadilla','Jalón','Curl'][index],original:'Prueba',sets:1,min:10,max:10,load:60,unit:'kg',mode:'external',rest:0,type:'work'}))
    const now=Date.now(),tx=db.transaction('items','readwrite'),store=tx.objectStore('items')
    const row=(kind:string,id:string,data:unknown)=>store.put({owner:'local',kind,id,version:1,data})
    row('session','reference',{title:'Referencia',date:'2026-11-19',started:now-20000,ended:now-10000,
      cycleId:'bonus-cycle',dayId:'before',companion:'Dragón',exercises})
    row('session','improve',{title:'Mejora de carga',date:'2026-11-19',started:now,
      cycleId:'bonus-cycle',dayId:'now',companion:'Dragón',companionXpAtStart:25,exercises})
    for(const e of exercises)row('set','before'+e.id,{sessionId:'reference',exerciseId:e.id,kg:60,reps:10,done:true,created:now-15000,type:'work'})
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
    db.close()
  })
  await page.goto('/sesion/improve')
  await expect(page.locator('.exercise-session')).toHaveCount(4)
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await context.setOffline(true)
  for(const exercise of await page.locator('.exercise-session').all()){
    await exercise.getByLabel('kg',{exact:true}).fill('65')
    await exercise.getByLabel('Reps',{exact:true}).fill('5')
    await exercise.getByRole('button',{name:'Registrar serie 1',exact:true}).click()
  }
  await page.getByRole('button',{name:'Finalizar entrenamiento'}).click()
  await expect(page.getByRole('status',{name:'+40 EXP · +35 de oro'})).toBeVisible()
  await expect(page.locator('.load-bonus-summary li')).toHaveCount(3)
  await expect(page.locator('.load-bonus-summary')).toContainText('Base: 25 EXP · 20 de oro')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await expect(page.locator('.reward-tile').last()).toHaveCSS('opacity','1')
  await page.screenshot({path:info.outputPath('premio-mejora.png'),fullPage:true})
  await page.reload()
  await expect(page.getByRole('status',{name:'+40 EXP · +35 de oro'})).toHaveCount(1)
  await page.getByRole('link',{name:'Tienda',exact:true}).click()
  await expect(page.getByTestId('shop-balance')).toHaveText('Saldo: 55 de oro')
  await context.setOffline(false)
})
