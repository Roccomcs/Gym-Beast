import {writeFile} from 'node:fs/promises'
import {test,expect} from '@playwright/test'
import {companions} from '../../src/pet-species'
const outfits=[[],['boca'],['tank-lime'],['hoodie'],['jogger'],['shorts'],['boca','jogger'],['boca','shorts'],['tank-lime','jogger'],['tank-lime','shorts'],['hoodie','jogger'],['hoodie','shorts']]
test('revisión de prendas sobre cada especie y etapa, solas y combinadas',async({page},info)=>{
 test.setTimeout(240000)
 await page.setViewportSize({width:1180,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
 for(const name of companions){
  const cases=outfits.flatMap((outfit,row)=>Array.from({length:5},(_,i)=>({id:name+'-'+row+'-'+(i+1),name,stage:i+1,outfit})))
  await page.evaluate(async cases=>{const {showWardrobeReview}=await import('/tests/wardrobe-preview.tsx');showWardrobeReview(cases)},cases)
  await expect(page.locator('.wardrobe-sheet [data-companion="'+name+'"]')).toHaveCount(60)
  await expect(page.locator('[data-dressed-sprite]')).toHaveCount(55,{timeout:60000})
  await page.locator('.wardrobe-sheet').evaluate(node=>{(node as HTMLElement).style.gridTemplateColumns='repeat(5,minmax(0,1fr))'})

  await page.locator('.wardrobe-sheet').screenshot({path:info.outputPath(name+'.png'),scale:'css'})
 }
})

test('cada color y prenda conserva la silueta del cuerpo en las 40 formas',async({page},info)=>{
 test.setTimeout(300000);await page.goto('/')
 const result=await page.evaluate(async()=>{
  const {wornOutfit}=await import('/src/worn-garment.ts')
  const {goods}=await import('/src/shop-catalog.ts')
  const {petSources}=await import('/src/pet-species.ts')
  const tops=goods.filter(g=>g.slot==='top'),bottoms=goods.filter(g=>g.slot==='bottom')
  const canvas=document.createElement('canvas');canvas.width=canvas.height=352
  const context=canvas.getContext('2d',{willReadFrequently:true})!
  const load=async(url:string)=>{const image=new Image();image.src=url;await image.decode();return image}
  const pixels=async(url:string)=>{const image=await load(url);context.clearRect(0,0,352,352);context.drawImage(image,0,0,352,352);return context.getImageData(0,0,352,352).data}
  let singles=0,combinations=0;const errors:string[]=[]
  for(const [name,species] of Object.entries(petSources)){
   const bare=await load('/'+species+'-stages.webp')
   for(let cell=1;cell<=5;cell++){
    context.clearRect(0,0,352,352);context.drawImage(bare,cell%3*bare.width/3,Math.floor(cell/3)*bare.height/2,bare.width/3,bare.height/2,0,0,352,352)
    const base=context.getImageData(0,0,352,352).data
    for(const top of [undefined,...tops]){
     const reference=top?await pixels((await wornOutfit(species,cell,top))!):base
     if(top)singles++
     for(const bottom of bottoms){
      const actual=await pixels((await wornOutfit(species,cell,top,bottom))!)
      for(let i=3;i<actual.length;i+=4)if(actual[i]!==reference[i]){errors.push(name+':'+cell+':'+(top?.id??'bare')+'+'+bottom.id);break}
      if(top)combinations++;else singles++
     }
    }
   }
  }
  return {singles,combinations,total:singles+combinations,errors}
 })
 await writeFile(info.outputPath('todas-las-prendas.json'),JSON.stringify(result,null,2))
 expect(result.singles).toBe(1000);expect(result.combinations).toBe(3360);expect(result.errors).toEqual([])
})

test('las prendas combinadas con gorras, coronas y relojes conservan su calce',async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width:1180,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
 const outfits=[['boca','track-pants','gold-crown','watch'],['tank-lime','shorts','gym-cap','sport-watch'],['hoodie','jogger','lunar-crown','watch'],['dryfit','tech-shorts','retro-cap','sport-watch']]
 for(const name of companions){
  const cases=outfits.flatMap((outfit,row)=>Array.from({length:5},(_,i)=>({id:name+row+'-'+i,name,stage:i+1,outfit})))
  await page.evaluate(async cases=>{const {showWardrobeReview}=await import('/tests/wardrobe-preview.tsx');showWardrobeReview(cases)},cases)
  await expect(page.locator('.wardrobe-sheet [data-companion="'+name+'"][data-dressed-sprite]')).toHaveCount(20)
  await page.locator('.wardrobe-sheet').evaluate(node=>{(node as HTMLElement).style.gridTemplateColumns='repeat(5,minmax(0,1fr))'})
  await page.locator('.wardrobe-sheet').screenshot({path:info.outputPath(name+'-equipado.png'),scale:'css'})
 }
 await page.evaluate(async()=>{const {showWardrobeReview}=await import('/tests/wardrobe-preview.tsx');showWardrobeReview([{id:'reported',name:'Dragón',stage:1,outfit:['boca','track-pants','gold-crown'],scene:true}])})
 await expect(page.locator('.habitat [data-dressed-bottom="track-pants"]')).toHaveCount(1)
 await page.locator('.habitat-scene').screenshot({path:info.outputPath('dragon-bebe-pantalon-corregido.png'),scale:'css'})
})
