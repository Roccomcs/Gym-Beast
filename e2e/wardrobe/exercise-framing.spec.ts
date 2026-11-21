import {test,expect} from '@playwright/test'
test('encuadres del catálogo en móvil y escritorio',async({page},info)=>{
 test.setTimeout(120000)
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.evaluate(async()=>{const {showExerciseReview}=await import('/tests/exercise-review.tsx');showExerciseReview()})
 await expect(page.locator('[data-exercise]')).toHaveCount(123)
 for(const width of [320,390,430,1024]){
  await page.setViewportSize({width,height:900})
  const errors=await page.locator('[data-exercise] .exercise-sprite').evaluateAll(nodes=>nodes.flatMap(node=>{
   const box=node.getBoundingClientRect()
   return box.width<1||box.height<1?[node.closest('[data-exercise]')?.getAttribute('data-exercise')]:[]
  }))
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.locator('[data-exercise="push-up"]').screenshot({path:info.outputPath('flexiones-'+width+'.png')})
 }
 await page.setViewportSize({width:1024,height:900})
 await page.locator('.art-review').screenshot({path:info.outputPath('catalogo-completo.png')})
})
