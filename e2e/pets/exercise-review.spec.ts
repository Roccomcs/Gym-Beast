import { expect, test } from '@playwright/test'
import { catalog } from '../../src/domain'

test('revisión ilustrada de las 46 variantes y sus músculos en ambas poses',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.setViewportSize({width:1200,height:1200})
  for(let start=0;start<catalog.length;start+=8){
    await page.goto('/')
    await page.evaluate(async ids=>{
      const path='/tests/training-preview.tsx'; const fixture=await import(path); fixture.previewExercises(ids)
    },catalog.slice(start,start+8).map(entry=>entry[0]))
    const cards=page.locator('.review-exercise')
    await expect(cards).toHaveCount(Math.min(8,catalog.length-start))
    await expect(page.locator('#exercise-sheet .muscle-map')).toHaveCount(Math.min(8,catalog.length-start))
    await page.evaluate(async()=>{
      await Promise.all([...document.querySelectorAll('#exercise-sheet .demo-illustration')].map(async element=>{
        const url=getComputedStyle(element).backgroundImage.slice(5,-2); const image=new Image();image.src=url;await image.decode()
      }))
    })
    await page.locator('#exercise-sheet').screenshot({path:info.outputPath('ejercicios-'+start+'-inicio.png')})
    for(const card of await cards.all()) await card.getByRole('button',{name:'Ver posición final'}).click()
    await page.locator('#exercise-sheet').screenshot({path:info.outputPath('ejercicios-'+start+'-final.png')})
  }
})
