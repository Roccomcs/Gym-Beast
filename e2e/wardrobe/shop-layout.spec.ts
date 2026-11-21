import {test,expect} from '@playwright/test'
test.use({isMobile:true,hasTouch:true})
test('tienda compacta con mascota al pie',async({page},info)=>{
 await page.goto('/')
 await page.evaluate(() => localStorage.setItem('gymbeast-active-account', 'local'))
 await page.reload()
 await page.getByLabel('Tu nombre').fill('Ari')
 await page.getByRole('button',{name:/Dragón/}).click()
 await page.getByRole('button',{name:'Confirmar compañero'}).click()
 await page.evaluate(async()=>{
  localStorage.setItem('gymbeast-local-shop-test-gold','yes')
  const {db}=await import('/src/store.ts')
  for(let i=0;i<12;i++){
   const id='shop-layout-'+i,started=Date.UTC(2026,9,i+1,12)
   await db.items.put({owner:'local',kind:'session',id,version:1,data:{title:'Día',date:new Date(started).toISOString().slice(0,10),started,ended:started+60000,companion:'Dragón',cycleId:'demo',dayId:id,exercises:[{id:'press'}]}})
   await db.items.put({owner:'local',kind:'set',id,version:1,data:{sessionId:id,exerciseId:'press',reps:10,kg:25,done:true,created:started}})
  }
  const row=await db.items.get(['local','profile','self'])
  await db.items.put({...row!,data:{...row!.data,purchases:['boca','gold-crown'],petOutfits:{Dragón:{top:'boca',head:'gold-crown'}}}})
 })
 await page.reload()
 await page.getByRole('link',{name:'Tienda',exact:true}).click()
 await page.getByRole('button',{name:'Fútbol',exact:true}).click()
 await page.getByRole('button',{name:'Gym',exact:true}).click()
 const gymPages = page.getByRole('group',{name:'Páginas de productos'})
 const shelf = page.locator('.shop-shelf')
 const fullHeight = (await shelf.boundingBox())!.height
 await gymPages.getByRole('button').last().click()
 await expect.poll(async () => (await shelf.boundingBox())!.height).toBe(fullHeight)
 await page.getByRole('button',{name:'Fútbol',exact:true}).click()
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844})
  await page.screenshot({path:info.outputPath('tienda-'+width+'.png')})
  expect(await page.locator('.shop-team').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(790)
  const home = page.getByRole('navigation').getByRole('link',{name:'Inicio',exact:true})
  await expect(home).toBeVisible()
  expect(await home.evaluate(node=>{
    const box=node.getBoundingClientRect()
    const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)
    return !!hit && node.contains(hit)
  })).toBe(true)
 }
 await page.evaluate(async()=>{
  const {db}=await import('/src/store.ts')
  const row=await db.items.get(['local','profile','self'])
  await db.items.put({...row!,data:{...row!.data,purchases:['boca','gold-crown','egg:Zorro','pet-tiger'],petOutfits:{Dragón:{top:'boca',head:'gold-crown',buddy:'pet-tiger'}}}})
 })
 await page.reload()
 await page.getByRole('button',{name:'Huevos',exact:true}).click()
 for(const egg of await page.locator('.shop-display .dragon-stage').all()){
  const box=await egg.boundingBox()
  const display=await egg.locator('..').boundingBox()
  expect(box!.y+box!.height).toBeLessThanOrEqual(display!.y+display!.height+1)
 }
 await page.getByRole('button',{name:'Elegir Zorro',exact:true}).click()
 const egg = page.locator('.shop-fitting-stage > [data-form="0"]')
 await expect(egg).toBeVisible()
 const sprite = (await egg.boundingBox())!
 const picker = (await page.locator('.shop-team-picker').boundingBox())!
 expect(sprite.y + sprite.height).toBeLessThan(picker.y)
 await page.screenshot({path:info.outputPath('huevos.png')})
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:760})
  for(const name of ['Dragón','Zorro']){
   await page.getByRole('button',{name:'Elegir '+name,exact:true}).tap()
   await expect(page.locator('.shop-fitting-stage > [data-companion="'+name+'"]')).toBeVisible()
   const nav=page.getByRole('navigation',{name:'Navegación principal'})
   await expect(nav).toBeInViewport({ratio:1})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width)
  }
 }
 await page.getByRole('navigation').getByRole('link',{name:'Inicio',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Hola, Ari'})).toBeVisible()
})



