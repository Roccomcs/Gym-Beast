import {test,expect} from 'vitest'
import {builderExercise,initialBuilderState,isBuilderState,newBuilderDay,routineIdentity,validBuilderDay,matchesBuilderCategory} from '../src/routine-builder-model'
test('identidad automática para tres, cuatro y cinco días sin inventar niveles para uno y dos',()=>{
 expect(routineIdentity(3)).toEqual({name:'Rutina básica',cover:11})
 expect(routineIdentity(4)).toEqual({name:'Rutina intermedia',cover:12})
 expect(routineIdentity(5)).toEqual({name:'Rutina avanzada',cover:13})
 expect(routineIdentity(1).name).toBe('Rutina de 1 día')
})
test('el primer día ya existe pero vacío no se puede confirmar',()=>{
 const state=initialBuilderState();expect(state.routine.days).toHaveLength(1);expect(state.active).toBe(state.routine.days[0].id)
 expect(validBuilderDay(state.routine.days[0])).toBe(false);expect(isBuilderState(state)).toBe(true)
 expect(isBuilderState({...state,active:'missing'})).toBe(false)
})
test('valores iniciales por modalidad y validación de una edición incompleta',()=>{
 const day=newBuilderDay(1);day.exercises=[builderExercise('Press banca','lb')]
 expect(day.exercises[0]).toMatchObject({sets:3,min:10,max:10,load:null,unit:'lb'})
 expect(validBuilderDay(day)).toBe(true)
 day.exercises[0].min=null;expect(validBuilderDay(day)).toBe(false)
 const cardio=builderExercise('Bicicleta fija','kg');expect(cardio).toMatchObject({sets:1,min:300,measure:'seconds',load:null,unit:null,rest:0})
})
test('categorías por movimiento principal y separación de cardio/movilidad',()=>{
 expect(matchesBuilderCategory('bench-barbell','Pecho','Fuerza')).toBe(true)
 expect(matchesBuilderCategory('bench-barbell','Piernas','Fuerza')).toBe(false)
 expect(matchesBuilderCategory('stationary-bike','Piernas','Cardio')).toBe(false)
 expect(matchesBuilderCategory('stationary-bike','Cardio','Cardio')).toBe(true)
})
