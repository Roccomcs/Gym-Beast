import {configureBuilderDay} from '../builder-helpers'
import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {mobileItems} from '../../tests/mobile-fixture'
import {seedMobile,noOverflow} from './helpers'

test('pantallas, foco, contraste, teclado y controles en tamaño móvil',async({page},info)=>{
  test.setTimeout(120000)
  await seedMobile(page,mobileItems('2026-11-19',10))
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  const routes=['/','/entrenar','/rutinas','/editor','/editor/manual','/editor/importar','/sesion/mobile-active','/progreso','/perfil','/tienda','/amigos','/ejercicios']
  const violations:object[]=[]
  for(const route of routes){
    await page.goto(route)
    if(route==='/ejercicios')await expect(page.getByRole('heading',{name:'Biblioteca',exact:true})).toBeVisible()
    else await expect(page.locator('h1')).toBeVisible()
    await noOverflow(page)
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    if(results.violations.length)violations.push({route,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))})
    if(['/','/entrenar','/progreso','/perfil','/tienda'].includes(route))await page.screenshot({path:info.outputPath(route==='/'?'inicio.png':route.slice(1)+'.png'),fullPage:true})
  }
  await page.goto('/editor/manual')
  await configureBuilderDay(page,['Press banca'])
  const weight=page.getByLabel('Peso de Press banca (kg)',{exact:true})
  await weight.fill('62,5');await weight.focus()
  await page.setViewportSize({width:info.project.use.viewport!.width,height:430})
  await weight.scrollIntoViewIfNeeded()
  const input=await weight.boundingBox(),nav=await page.getByRole('navigation').boundingBox()
  expect(input!.y+input!.height).toBeLessThan(nav!.y)
  await noOverflow(page)
  await page.screenshot({path:info.outputPath('teclado-viewport-corto.png')})
  await page.setViewportSize(info.project.use.viewport!)
  await page.goto('/entrenar')
  await expect(page.getByRole('heading',{name:'Entrenar',exact:true})).toBeFocused()
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await expect(page.locator('.pet-motion')).toHaveCSS('animation-name','none')
  await page.getByRole('button',{name:'Jugar con Dragón'}).click()
  await expect(page.locator('.pet-play')).toHaveCSS('animation-name','none')
  await info.attach('accessibility.json',{body:JSON.stringify(violations,null,2),contentType:'application/json'})
  expect(errors).toEqual([])
  expect(violations).toEqual([])
})

test('un fallo de escritura no marca una serie como guardada',async({page})=>{
  await seedMobile(page,mobileItems())
  await page.addInitScript(()=>{
    const put=IDBObjectStore.prototype.put;let failed=false
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
      if(!failed&&value?.kind==='set'&&value.data.sessionId==='mobile-active'){failed=true;throw new DOMException('QA storage full','QuotaExceededError')}
      return key===undefined?put.call(this,value):put.call(this,value,key)
    }
  })
  await page.goto('/sesion/mobile-active')
  const card=page.locator('.exercise-session').first(),button=card.getByRole('button',{name:'Registrar serie 1',exact:true})
  await button.click()
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar')
  await expect(page.locator('.quick-set-done')).toHaveCount(0)
  await button.click()
  await expect(page.locator('.quick-set-done')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.quick-set-done')).toHaveCount(1)
})

test('las imágenes de la rutina y los módulos se conservan al reabrir offline',async({page,context})=>{
  await seedMobile(page,mobileItems('2026-11-19',0))
  await page.goto('/entrenar')
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await expect(page.getByText('Imágenes listas sin conexión',{exact:true})).toBeVisible({timeout:30000})
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading',{name:'Entrenar',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Continuar',exact:true}).click()
  await expect(page.locator('.exercise-session')).toHaveCount(5)
  const urls=await page.locator('.demo-illustration').evaluateAll(nodes=>nodes.flatMap(node=>[...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1])))
  expect(urls.length).toBeGreaterThan(0)
  expect(await page.evaluate(async urls=>Promise.all(urls.map(async url=>{const response=await fetch(url);return response.ok&&response.headers.get('content-type')?.startsWith('image/')})),urls)).not.toContain(false)
  await page.locator('.exercise-session').first().getByRole('button',{name:'Registrar serie 1',exact:true}).click()
  await expect(page.locator('.quick-set-done')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.quick-set-done')).toHaveCount(1)
})

test('primera apertura, campos largos y navegación al completar el equipo',async({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click()
  await page.getByLabel('Usuario',{exact:true}).fill('atleta_abcdefghijklmnopqr')
  await noOverflow(page)
  await page.evaluate(() => localStorage.setItem('gymbeast-active-account', 'local'))
  await page.reload()
  await expect(page.getByRole('heading',{name:'Armá tu equipo'})).toBeFocused()
  const name='Atleta_'+ 'a'.repeat(50)
  await page.getByLabel('Tu nombre').fill(name)
  await page.getByLabel('Peso (opcional)').fill('80.5')
  await page.getByRole('button',{name:/Lobo/}).click()
  await noOverflow(page)
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations).toEqual([])
  await page.getByRole('button',{name:'Confirmar compañero'}).click()
  await expect(page.getByRole('heading',{name:'Hola, '+name,exact:true})).toBeFocused()
  await noOverflow(page)
})

test('el descanso usa marcas temporales al volver al primer plano y al reabrir',async({page,context})=>{
  await page.clock.setFixedTime(new Date('2026-11-19T15:00:00Z'))
  await seedMobile(page,mobileItems())
  await page.goto('/sesion/mobile-active')
  await page.locator('.exercise-session').first().getByRole('button',{name:'Registrar serie 1',exact:true}).click()
  await expect(page.locator('.workout-rest')).toContainText('Descanso')
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))})
  await expect(page.locator('.demo-frame').first()).toHaveCSS('animation-play-state','paused')
  await page.clock.setFixedTime(new Date('2026-11-19T15:02:00Z'))
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))})
  await expect(page.locator('.workout-rest')).toHaveText('Descanso terminado')
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await context.setOffline(true);await page.reload()
  await expect(page.locator('.workout-rest')).toHaveText('Descanso terminado')
})
