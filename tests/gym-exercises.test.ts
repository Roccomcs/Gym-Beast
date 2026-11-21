import {test,expect} from 'vitest'
import {catalog,findExercise,parseRoutine,metrics,suggestedLoad,exerciseSchema} from '../src/domain'
import {gymExercises} from '../src/gym-exercises'
import {anatomy} from '../src/library'
import {technique} from '../src/exercise-technique'
import {exercisePoses} from '../src/exercise-poses'
import {importPreview} from '../src/import-preview'
import {existsSync} from 'node:fs'
test.each(gymExercises)('$name tiene identidad estable, músculos y dos poses independientes',e=>{
 expect(findExercise(e.name)?.[0]).toBe(e.id)
 for(const alias of e.aliases.split('|'))expect(findExercise(alias)?.[0],alias).toBe(e.id)
 expect(anatomy[e.id]).toEqual([e.equipment,e.primary,...e.secondary])
 expect(technique[e.id]).toHaveLength(2)
 const ex=importPreview(e.name,'kg')[0].exercises[0]
 expect(exerciseSchema.safeParse(ex).success).toBe(true)
 expect(ex).toMatchObject({catalogId:e.id,mode:e.mode,measure:e.measure==='seconds'?'seconds':undefined,load:null})
 for(const phase of [0,1] as const){const art=exercisePoses(e.id,phase)!;expect(art.x).toBe(phase);expect(existsSync('public'+art.image)).toBe(true)}
})
test('no hay IDs duplicados ni se confunden los dos remos ni las dos escaladoras',()=>{
 expect(catalog).toHaveLength(123);expect(new Set(catalog.map(e=>e[0])).size).toBe(123)
 expect(findExercise('remo cardio')?.[0]).toBe('rowing-erg')
 expect(findExercise('remo bajo')?.[0]).toBe('low-row')
 expect(findExercise('escaladora')?.[0]).toBe('stairmill')
 expect(findExercise('stepper')?.[0]).toBe('stepper')
})
test.each([
 ['Bicicleta 20 min','stationary-bike',1,1200,1200],['Soga 3x30s','jump-rope',3,30,30],
 ['Remo cardio 1x5 minutos','rowing-erg',1,300,300],['Elíptica 2,5 min','elliptical',1,150,150],
 ['Escaladora 5–10 min','stairmill',1,300,600],['Plancha 3x20-30s','plank',3,20,30],
 ['Cinta 10 min','walk',1,600,600],
] as const)('%s se registra como duración, sin peso inferido',(text,id,sets,min,max)=>{
 const e=parseRoutine(text)[0].exercises[0]
 expect(e).toMatchObject({catalogId:id,measure:'seconds',sets,min,max,load:null,unit:null})
 expect(e.warning).toBeUndefined()
 const set={sessionId:'s',exerciseId:e.id,reps:min,kg:50,done:true,created:1}
 expect(metrics([set],e)).toEqual({volume:0,peak:0,estimated:0})
 expect(suggestedLoad(e,[set],2.5)).toBeNull()
})
test('calentamiento se conserva y las duraciones inválidas no se confirman silenciosamente',()=>{
 expect(parseRoutine('Calentamiento: Bici 5 min')[0].exercises[0]).toMatchObject({type:'warmup',catalogId:'stationary-bike',min:300})
 expect(parseRoutine('Bicicleta 2000 min')[0].exercises[0].reviewReason).toBe('invalid')
 expect(importPreview('Bicicleta','kg')[0].exercises[0]).toMatchObject({sets:1,min:300,max:300,measure:'seconds'})
})
