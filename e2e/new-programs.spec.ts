import {test,expect} from '@playwright/test'
import {programExercises} from '../src/program-exercises'
import {seedMobile,noOverflow} from './mobile/helpers'
import {mobileItems} from '../tests/mobile-fixture'

test('tres insignias, elección de la básica y seis ejercicios por día en móvil',async({page,context},info)=>{
  await page.setViewportSize(info.project.use.viewport??{width:320,height:780})
  const rows=mobileItems().filter(row=>row.kind==='profile')
  const profile=rows[0].data as any;profile.cycle=undefined;profile.petPlans=[]
  await seedMobile(page,rows)
  await page.goto('/rutinas')
  await expect(page.locator('.program-card')).toHaveCount(4)
  await noOverflow(page)
  for(const image of ['/routine-covers/basic.webp','/routine-covers/intermediate.webp','/routine-covers/advanced.webp']){
    const response=await page.request.get(image);expect(response.headers()['content-type']).toContain('image/webp')
  }
  await page.screenshot({path:info.outputPath('explorar-320.png'),fullPage:true})
  await page.getByRole('button',{name:/Básica · Base completa/}).click()
  await expect(page.locator('details.exercise-card')).toHaveCount(3)
  await page.locator('details.exercise-card').first().locator('summary').click()
  await expect(page.locator('details.exercise-card').first().locator('.program-move')).toHaveCount(6)
  await page.getByRole('button',{name:'Usar rutina',exact:true}).click()
  await expect(page.getByText('DÍA 1 DE 3',{exact:true})).toBeVisible()
  await expect(page.getByText('Imágenes listas sin conexión',{exact:true})).toBeVisible({timeout:30000})
  await page.getByRole('button',{name:'Empezar',exact:true}).click()
  await expect(page.locator('.exercise-session')).toHaveCount(6)
  for(const card of await page.locator('.exercise-session').all())await card.getByRole('button',{name:'Registrar serie 1',exact:true}).click()
  await page.getByRole('button',{name:'Finalizar entrenamiento',exact:true}).click()
  await expect(page.getByRole('status',{name:'+25 EXP · +20 de oro'})).toBeVisible()
  await page.getByRole('link',{name:'Entrenar',exact:true}).click()
  await expect(page.getByText('DÍA 2 DE 3',{exact:true})).toBeVisible()
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await context.setOffline(true);await page.reload()
  await page.getByRole('button',{name:'Empezar',exact:true}).click()
  await expect(page.locator('.exercise-session h2').first()).toHaveText('Sentadilla goblet')
  await expect(page.locator('.exercise-session')).toHaveCount(6)
  const art=await page.locator('.exercise-session').first().locator('.demo-illustration').first().evaluate(node=>getComputedStyle(node).backgroundImage)
  expect(art).toContain('program-expansion-1.png')
  const url=art.match(/url\(["']?([^"')]+)/)![1]
  expect(await page.evaluate(async url=>{const response=await fetch(url);const image=await createImageBitmap(await response.blob());const valid=image.width===1024&&image.height===1536;image.close();return valid},url)).toBe(true)
  await noOverflow(page)
})

test('las 22 variantes nuevas se buscan por nombre y tienen poses y músculos',async({page})=>{
  await seedMobile(page,mobileItems())
  await page.goto('/ejercicios')
  for(const exercise of programExercises){
    await page.getByLabel('Buscar ejercicio',{exact:true}).fill(exercise.name)
    const card=page.locator('.exercise-card').filter({has:page.locator('summary').getByText(exercise.name,{exact:true})})
    await expect(card).toHaveCount(1)
    await card.locator('summary').click()
    await expect(card.locator('.exercise-sprite')).toBeVisible()
    await expect(card.locator('.muscle-map')).toBeVisible()
    await expect(card.getByLabel('Posición inicial',{exact:true})).toBeVisible()
    await expect(card.getByLabel('Posición final',{exact:true})).toBeVisible()
  }
})

test('DEV aparece destacada para todos y crea una copia propia de sus cinco días',async({page},info)=>{
 await page.setViewportSize(info.project.use.viewport??{width:390,height:780})
 await seedMobile(page,mobileItems().filter(row=>row.kind==='profile'))
 await page.goto('/rutinas')
 const dev=page.getByRole('button',{name:/Rutina DEV/})
 await expect(dev).toHaveClass(/dev-program-card/)
 await expect(dev).toBeVisible()
 await noOverflow(page)
 await page.screenshot({path:info.outputPath('rutina-dev-explorar.png')})
 await dev.click()
 await expect(page.locator('details.exercise-card')).toHaveCount(5)
 await page.locator('details.exercise-card').first().locator('summary').click()
 await expect(page.locator('details.exercise-card').first().locator('.program-move')).toHaveCount(7)
 await page.getByRole('button',{name:'Usar rutina',exact:true}).click()
 await expect(page.getByText('DÍA 1 DE 5',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Empezar',exact:true}).click()
 await expect(page.locator('.exercise-session')).toHaveCount(7)
 await expect(page.locator('.exercise-session').first().getByLabel('kg',{exact:true}).first()).toHaveValue('50')
})
