import {configureBuilderDay,saveBuilderDay,saveBuilderRoutine} from './builder-helpers'
import {test,expect} from '@playwright/test'
import {gymExercises} from '../src/gym-exercises'
import {seedMobile,noOverflow} from './mobile/helpers'
import {mobileItems} from '../tests/mobile-fixture'

test('elige calentamiento, fuerza y finalización desde el catálogo y los conserva offline',async({page,context},info)=>{
 await page.setViewportSize(info.project.use.viewport??{width:320,height:780})
 const rows=mobileItems().filter(row=>row.kind==='profile');(rows[0].data as any).cycle=undefined
 await seedMobile(page,rows)
 await page.goto('/editor/manual')
 await configureBuilderDay(page,['Bicicleta fija','Face pull con cuerda','Remo ergómetro'])
 await page.getByLabel('Segundos de Bicicleta fija',{exact:true}).fill('1200')
 await page.getByRole('combobox',{name:'Uso de Bicicleta fija',exact:true}).selectOption('warmup')
 await expect(page.getByLabel('Peso de Bicicleta fija (kg)',{exact:true})).toHaveCount(0)
 await page.getByLabel('Peso de Face pull con cuerda (kg)',{exact:true}).fill('15')
 await noOverflow(page)
 await page.screenshot({path:info.outputPath('crear-cardio.png'),fullPage:true})
 await saveBuilderDay(page);await saveBuilderRoutine(page)
 await page.getByRole('link',{name:'Rutinas',exact:true}).click()
 await page.getByRole('button',{name:'Mis rutinas',exact:true}).click()
 await page.getByRole('button',{name:'Usar rutina',exact:true}).click()
 await expect(page.getByText('Imágenes listas sin conexión',{exact:true})).toBeVisible({timeout:30000})
 await page.getByRole('button',{name:'Empezar',exact:true}).click()
 const cards=page.locator('.exercise-session')
 await expect(cards).toHaveCount(3)
 await expect(cards.nth(0).getByLabel('kg',{exact:true})).toHaveCount(0)
 await expect(cards.nth(0).getByLabel('Segundos',{exact:true})).toHaveValue('1200')
 for(const card of await cards.all())await card.getByRole('button',{name:'Registrar serie 1',exact:true}).click()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});await page.reload()
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 await context.setOffline(true);await page.reload()
 await expect(cards.nth(0).getByLabel('Segundos',{exact:true})).toHaveValue('1200')
 const image=await cards.nth(0).locator('.demo-illustration').first().evaluate(node=>getComputedStyle(node).backgroundImage)
 const url=image.match(/url\(["']?([^"')]+)/)![1]
 expect(await page.evaluate(async url=>{const response=await fetch(url);const bitmap=await createImageBitmap(await response.blob());const valid=bitmap.width===1024;bitmap.close();return valid},url)).toBe(true)
 await noOverflow(page)
 await page.screenshot({path:info.outputPath('entrenar-cardio-offline.png'),fullPage:true,style:'.exercise-session{content-visibility:visible}'})
 await page.getByRole('button',{name:'Finalizar entrenamiento',exact:true}).click()
 await expect(page.getByRole('status',{name:'+25 EXP · +20 de oro'})).toBeVisible()
})

test('el catálogo filtra cardio y todas las nuevas ilustraciones se decodifican',async({page},info)=>{
 await seedMobile(page,mobileItems());await page.goto('/ejercicios')
 await page.getByRole('button',{name:'Cardio',exact:true}).click()
 await expect(page.locator('.exercise-card')).toHaveCount(15)
 await page.getByRole('button',{name:'Movilidad',exact:true}).click()
 await expect(page.locator('.exercise-card')).toHaveCount(6)
 await page.getByRole('button',{name:'Todos',exact:true}).click()
 await expect(page.locator('.exercise-card')).toHaveCount(116)
 for(const sheet of new Set(gymExercises.map(e=>e.sheet))){
  expect(await page.evaluate(async sheet=>{const response=await fetch('/exercise-poses/gym-expansion-'+sheet+'.webp');const bitmap=await createImageBitmap(await response.blob());const valid=bitmap.width===1024&&bitmap.height===1536;bitmap.close();return valid},sheet)).toBe(true)
 }
 await page.getByLabel('Buscar ejercicio',{exact:true}).fill('escaladora')
 await page.locator('.exercise-card summary').click()
 await expect(page.getByLabel('Posición inicial',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Posición final',{exact:true})).toBeVisible()
 await noOverflow(page)
 await page.screenshot({path:info.outputPath('escaladora.png'),fullPage:true,style:'.exercise-session{content-visibility:visible}'})
})
