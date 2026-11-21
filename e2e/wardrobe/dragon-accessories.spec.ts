import {test,expect} from '@playwright/test'
import {writeFile} from 'node:fs/promises'

test('el dragón conserva el calce al abrir en frío y después de visitar la tienda',async({page},info)=>{
  await page.setViewportSize({width:1584,height:1000})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await page.evaluate(async()=>{
    const {showWardrobeReview}=await import('/tests/wardrobe-preview.tsx')
    showWardrobeReview([
      {id:'baby-crown',name:'Dragón',stage:1,outfit:['lunar-crown']},
      {id:'baby-cap',name:'Dragón',stage:1,outfit:['gym-cap']},
      {id:'baby-watch',name:'Dragón',stage:1,outfit:['sport-watch']},
      {id:'baby-both',name:'Dragón',stage:1,outfit:['lunar-crown','sport-watch']},
      {id:'cria-both',name:'Dragón',stage:2,outfit:['lunar-crown','sport-watch']},
    ])
  })
  await expect(page.locator('.wardrobe-sheet .dragon-stage')).toHaveCount(5)
  await expect(page.locator('[data-dressed-accessories~="sport-watch"]')).toHaveCount(3)
  await page.evaluate(()=>document.fonts.ready)
  await page.locator('.wardrobe-sheet').screenshot({path:info.outputPath('cold-home.png')})
  const cold=await page.locator('[data-wardrobe-case="baby-both"] .pet-outfit-piece').evaluateAll(nodes=>nodes.map(node=>{
    const css=getComputedStyle(node),rect=node.getBoundingClientRect();return {position:css.position,x:rect.x,y:rect.y,width:rect.width,height:rect.height}
  }))
  await page.evaluate(async()=>{await import('/src/shop.css')})
  await page.locator('.wardrobe-sheet').screenshot({path:info.outputPath('after-shop.png')})
  const warm=await page.locator('[data-wardrobe-case="baby-both"] .pet-outfit-piece').evaluateAll(nodes=>nodes.map(node=>{
    const css=getComputedStyle(node),rect=node.getBoundingClientRect();return {position:css.position,x:rect.x,y:rect.y,width:rect.width,height:rect.height}
  }))
  await info.attach('layout.json',{body:JSON.stringify({cold,warm}),contentType:'application/json'})
  expect(cold.every(piece=>piece.position==='absolute')).toBe(true)
  expect(cold).toEqual(warm)
})

test('relojes, coronas y gorras se revisan en las cinco etapas del dragón',async({page},info)=>{
  await page.setViewportSize({width:1920,height:1300})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  for(const top of [undefined,'boca','hoodie','tank-lime','jogger','shorts']){
    await page.evaluate(async top=>{
      const {showWardrobeReview}=await import('/tests/wardrobe-preview.tsx')
      showWardrobeReview(Array.from({length:5},(_,i)=>i+1).flatMap(stage=>['lunar-crown','gym-cap'].map(head=>({
        id:stage+'-'+head,name:'Dragón',stage,outfit:[head,'sport-watch',...(top?[top]:[])],
      }))))
    },top)
    await expect(page.locator('[data-dressed-accessories~="sport-watch"]')).toHaveCount(10)
    if(top)await expect(page.locator('[data-dressed-sprite="'+top+'"]')).toHaveCount(10)
    await page.locator('.wardrobe-sheet').screenshot({path:info.outputPath((top??'bare')+'-five-stages.png')})
    if(top)for(const stage of [3,4,5]){
      const source=await page.locator('[data-wardrobe-case="'+stage+'-lunar-crown"] .dragon-stage').evaluate(node=>(node as HTMLElement).style.backgroundImage)
      const match=source.match(/data:image\/png;base64,([^"')]+)/)
      if(match)await writeFile(info.outputPath(top+'-stage'+stage+'-source.png'),Buffer.from(match[1],'base64'))
    }
  }
})
