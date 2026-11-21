import {test,expect} from 'vitest'
import {catalog,exerciseSchema,parseRoutine,metrics} from '../src/domain'
import {explorePrograms} from '../src/explore-programs'
import {programRoutine} from '../src/programs'
import {programExercises} from '../src/program-exercises'
import {anatomy} from '../src/library'
import {exercisePoses} from '../src/exercise-poses'
import {technique} from '../src/exercise-technique'
import {existsSync} from 'node:fs'

test('Explorar ofrece tres niveles con división de tres, cuatro y cinco días',()=>{
  expect(explorePrograms.map(program=>program.days.length)).toEqual([3,4,5,5])
  expect(explorePrograms.map(program=>program.cover)).toEqual([11,12,13,14])
  for(const program of explorePrograms.filter(program=>!program.featured))for(const exercise of programRoutine(program).days.flatMap(day=>day.exercises)){
    expect(exercise.warning,exercise.original).toBeUndefined()
    expect(exercise.catalogId,exercise.original).toBeTruthy()
    expect(exercise.load).toBeNull()
    expect(exerciseSchema.safeParse(exercise).success).toBe(true)
    expect(anatomy[exercise.catalogId! as typeof catalog[number][0]]).toBeDefined()
    expect(exercisePoses(exercise.catalogId!,0)).toBeDefined()
  }
})
test('la básica tiene seis ejercicios por día y cubre los doce grupos musculares principales',()=>{
  const days=programRoutine(explorePrograms[0]).days
  expect(days.map(day=>day.exercises.length)).toEqual([6,6,6])
  expect(days.map(day=>day.exercises[0].catalogId)).toEqual(['pulldown','goblet-squat','bench-barbell'])
  const muscles=new Set(days.flatMap(day=>day.exercises.flatMap(exercise=>anatomy[exercise.catalogId! as typeof catalog[number][0]].slice(1))))
  for(const muscle of ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Abdominales','Glúteos','Cuádriceps','Isquiotibiales','Aductores','Abductores','Gemelos'])expect(muscles.has(muscle),muscle).toBe(true)
  expect(days[0].exercises.at(-1)).toMatchObject({measure:'seconds',min:20,max:30})
})
test('PHUL y PHAT conservan sus variantes y los bloques rápidos tienen su descanso propio',()=>{
  expect(programRoutine(explorePrograms[1]).days.map(day=>day.exercises.length)).toEqual([7,5,7,6])
  const phat=programRoutine(explorePrograms[2])
  expect(phat.days.map(day=>day.exercises.length)).toEqual([8,7,8,9,10])
  for(const index of [2,3,4])expect(phat.days[index].exercises[0]).toMatchObject({sets:6,min:3,max:3,rest:90,guidance:expect.any(String)})
})
test('las 22 incorporaciones tienen identidad, dos poses, equipo, músculos e instrucciones',()=>{
  expect(programExercises).toHaveLength(22)
  expect(new Set(catalog.map(([id])=>id)).size).toBe(catalog.length)
  for(const exercise of programExercises){
    expect(technique[exercise.id]).toHaveLength(2)
    for(const phase of [0,1] as const){const pose=exercisePoses(exercise.id,phase)!;expect(pose.x).toBe(phase);expect(existsSync('public'+pose.image),pose.image).toBe(true)}
  }
})
test('el lastre conserva sus kg sin tratarlo como un ejercicio de carga externa completa',()=>{
  for(const name of ['Dominadas con lastre','Fondos con lastre']){
    const exercise=parseRoutine(name+' 2x8 10kg')[0].exercises[0]
    expect(exercise).toMatchObject({mode:'bodyweight',load:10,unit:'kg'})
    expect(metrics([{sessionId:'s',exerciseId:exercise.id,kg:10,reps:8,done:true,created:1}],exercise).estimated).toBe(0)
  }
})

test('DEV publica la división exacta de Rocco, con valores sugeridos y sin perder observaciones',()=>{
 const program=explorePrograms.find(p=>p.name==='Rutina DEV')!
 expect(program).toMatchObject({featured:true,cover:14})
 const routine=programRoutine(program)
 expect(routine.days).toHaveLength(5)
 expect(routine.days.reduce((sum,d)=>sum+d.exercises.length,0)).toBe(31)
 expect(routine.days[0].exercises[0]).toMatchObject({catalogId:'wide-pulldown',load:50,notes:'incompleto',sets:3,min:10})
 expect(routine.days[1].exercises[0]).toMatchObject({catalogId:'hip-thrust',sets:2,min:15,load:null})
 expect(routine.days[2].exercises[0]).toMatchObject({load:55,notes:'intento 60'})
 expect(routine.days[2].exercises.filter(e=>e.superset).map(e=>e.superset!.rounds)).toEqual([2,2])
 expect(routine.days[1].exercises.find(e=>e.catalogId==='standing-single-leg-curl')).toMatchObject({load:10})
 expect(routine.days[1].exercises.at(-1)).toMatchObject({catalogId:'seated-calf-raise'})
 expect(routine.days[3].exercises[2]).toMatchObject({catalogId:'hack-squat',load:80,notes:'difícil'})
 expect(routine.days[4].exercises[1]).toMatchObject({catalogId:'chest-supported-row',load:80,notes:'incompleto'})
 expect(routine.days[4].exercises.at(-1)).toMatchObject({catalogId:'seated-triceps-extension',load:17.5})
 expect(routine.days[0].exercises[1]).toMatchObject({catalogId:'supported-t-row'})
 expect(routine.days[0].exercises[2]).toMatchObject({catalogId:'straight-arm-pulldown'})
 expect(existsSync('public/routine-covers/dev.svg')).toBe(true)
})
