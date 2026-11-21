import {test,expect} from 'vitest'
import {paintFittedBottom,fitFabricMask} from '../src/fitted-bottom'
const pixel=(rgb:number[],alpha=255)=>[...rgb,alpha]
test('la tela no crea píxeles fuera del cuerpo ni modifica su transparencia',()=>{
 const target=new Uint8ClampedArray([...pixel([100,50,150]),...pixel([0,0,0],0),...pixel([170,80,190],90),...pixel([10,10,10])])
 const mask=new Uint8ClampedArray(Array.from({length:4},()=>pixel([127,0,0])).flat())
 const before=new Uint8ClampedArray(target)
 const result=paintFittedBottom(target,mask,null,[40,60,130],[200,200,250],2)
 expect(result.slice(0,3)).not.toEqual(target.slice(0,3))
 for(let i=0;i<4;i++)expect(result[i*4+3]).toBe(target[i*4+3])
 expect(result.slice(4)).toEqual(target.slice(4));expect(target).toEqual(before)
})
test('camiseta y contornos permanecen delante del pantalón',()=>{
 const body=new Uint8ClampedArray([...pixel([120,40,160]),...pixel([110,70,150]),...pixel([100,50,120]),...pixel([90,60,160])])
 const cloth=new Uint8ClampedArray(Array.from({length:4},()=>pixel([127,0,0])).flat())
 const shirt=new Uint8ClampedArray(16);shirt[3]=255
 const result=paintFittedBottom(body,cloth,shirt,[30,45,90],[220,220,250],2)
 expect(result.slice(0,4)).toEqual(body.slice(0,4));expect(result.slice(4,7)).not.toEqual(body.slice(4,7))
})
test('el ajuste del molde no arrastra píxeles de otra fila de la lámina',()=>{
 const body=new Uint8ClampedArray(4*4*4),mask=new Uint8ClampedArray(4*4*4)
 for(const n of [5,6,9,10]){body[n*4+3]=255;mask[n*4]=127;mask[n*4+3]=255}
 expect(fitFabricMask(mask,body,body,4)).toEqual(mask)
})
