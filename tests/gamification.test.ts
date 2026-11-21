import { expect,test } from 'vitest'
import { petProgress,stageIndex } from '../src/pet-progress'
import { weekStatus,recordPetPlan,weeklyPlan } from '../src/weekly-plan'
import { weeklyMissions } from '../src/gamification'
import type { Session } from '../src/domain'
import type { Reward } from '../src/store'
const plan=[{from:'2026-01-05',target:5,companion:'Dragón'}]
const session=(date:string,id=date)=>({id,data:{title:id,date,started:Date.parse(date+'T12:00:00Z'),ended:Date.parse(date+'T13:00:00Z'),
  companion:'Dragón',exercises:[]} as Session})
const reward=(id:string,xp=25):Reward=>({owner:'local',session_id:id,xp,gold:20,companion:'Dragón',occurrence:id})
const status=(rows:ReturnType<typeof session>[],rewards=rows.map(s=>reward(s.id)))=>weekStatus('2026-01-05',plan,rows,[],rewards)
test('cinco días distintos cumplen; cinco sesiones del mismo día no',()=>{
  expect(status(Array.from({length:5},(_,i)=>session('2026-01-0'+(i+5)))).fulfilled).toBe(true)
  expect(status(Array.from({length:5},(_,i)=>session('2026-01-05','s'+i)))).toMatchObject({count:1,missed:true})
})
test('sesiones sin confirmación o corregidas como incompletas no completan la semana',()=>{
  const rows=Array.from({length:5},(_,i)=>session('2026-01-0'+(i+5)))
  expect(status(rows,[]).count).toBe(0)
  rows[0].data.incomplete=true
  expect(status(rows).count).toBe(4)
})
test('cambiar rutina y mascota fija el cambio para la siguiente semana',()=>{
  const changed=recordPetPlan(plan,{from:'2026-01-07',target:3,companion:'Lobo'})
  expect(weeklyPlan('2026-01-05',changed).plan).toEqual(plan[0])
  expect(weeklyPlan('2026-01-12',changed).plan).toMatchObject({target:3,companion:'Lobo'})
  expect(recordPetPlan(changed,{from:'2026-01-08',target:4,companion:'Oso'})).toHaveLength(2)
})
test('primera semana parcial es adaptación; semana siguiente sí descuenta vida',()=>{
  const plans=[{from:'2026-01-07',target:5,companion:'Dragón'}]
  expect(petProgress('2026-01-12','UTC','Dragón',plans,[],[],[]).get('Dragón')).toBeUndefined()
  expect(petProgress('2026-01-19','UTC','Dragón',plans,[],[],[]).get('Dragón')).toEqual({xp:0,health:50})
})
test('sin plan no se pierde vida; plan de descanso no se castiga',()=>{
  expect(petProgress('2026-02-02','UTC','Dragón',[],[],[],[]).size).toBe(0)
  const rest=[{id:'rest',data:{date:'2026-01-05',title:'Descanso',exercises:[],routineId:'r',version:1,skipped:true}}]
  expect(weekStatus('2026-01-05',plan,[],rest,[])).toMatchObject({rest:true,fulfilled:true,missed:false})
})
test('dos incumplimientos matan y bajan solo una etapa; no sigue bajando a cero vida',()=>{
  const row=session('2026-01-05')
  expect(petProgress('2026-02-02','UTC','Dragón',plan,[row],[],[reward(row.id,3250)]).get('Dragón')).toEqual({xp:1500,health:0})
})
test('volver a entrenar no cura sin evolucionar; la evolución sí devuelve cien',()=>{
  const rows=[session('2026-01-05'),session('2026-01-19')]
  expect(petProgress('2026-01-19','UTC','Dragón',plan,rows,[],[reward(rows[0].id,1500),reward(rows[1].id,40)]).get('Dragón')).toEqual({xp:740,health:0})
  expect(petProgress('2026-01-19','UTC','Dragón',plan,rows,[],[reward(rows[0].id,1500),reward(rows[1].id,800)]).get('Dragón')).toEqual({xp:1500,health:100})
})
test('bono de carga acelera la llegada a Titán sin cambiar los umbrales',()=>{
  const rows=Array.from({length:82},(_,i)=>session(new Date(Date.parse('2026-01-05')+(Math.floor(i/5)*7+i%5)*86400000).toISOString().slice(0,10)))
  expect(petProgress(rows[81].data.date,'UTC','Dragón',plan,rows,[],rows.map(s=>reward(s.id,40))).get('Dragón')).toEqual({xp:3280,health:100})
  expect([0,100,300,700,1500,3250].map(stageIndex)).toEqual([0,1,2,3,4,5])
})
test('el castigo sigue al compañero del plan, no al seleccionado después',()=>{
  expect(petProgress('2026-01-12','UTC','Lobo',plan,[],[],[]).get('Dragón')).toEqual({xp:0,health:50})
  expect(petProgress('2026-01-12','UTC','Lobo',plan,[],[],[]).get('Lobo')).toBeUndefined()
})
test('una sesión nocturna pertenece a la fecha de entrenamiento, no al día UTC de finalización',()=>{
  const row=session('2026-01-11');row.data.ended=Date.parse('2026-01-12T01:00:00Z')
  expect(petProgress('2026-01-12','America/Buenos_Aires','Dragón',plan,[row],[],[reward(row.id,100)]).get('Dragón')).toEqual({xp:100,health:50})
})
test('el resultado no depende del orden de descarga; corregir un premio recompone el estado',()=>{
  const a=session('2026-01-05'),b=session('2026-01-12')
  const awards=[reward(a.id,1500),reward(b.id)]
  const run=(r:Reward[])=>petProgress('2026-01-19','UTC','Dragón',plan,[a,b],[],r).get('Dragón')
  expect(run(awards)).toEqual(run([...awards].reverse()))
  expect(run([])).toEqual({xp:0,health:0})
})
test('misiones e insignias usan confirmaciones y tres ejercicios distintos, sin sumar premios extra',()=>{
  const rows=[session('2026-01-05'),session('2026-01-06')]
  rows.forEach(row=>row.data.exercises=['a','b','c'].map(id=>({id,catalogId:id,mode:'external',name:id} as any)))
  const awards=rows.map(row=>({...reward(row.id),improvements:['a','b','c'].map(id=>({exerciseId:id,name:id,kg:65,previousKg:60}))}))
  expect(weeklyMissions('2026-01-07',plan,rows,[],awards)).toMatchObject({improved:3,records:6,confirmed:2,current:{count:2,fulfilled:false}})
  expect(weeklyMissions('2026-01-07',plan,rows,[],[])).toMatchObject({improved:0,records:0,confirmed:0})
})
test('las insignias quedan en la semana anterior y se recalculan si se corrige el historial',()=>{
  const rows=Array.from({length:5},(_,i)=>session('2026-01-0'+(i+5)))
  expect(weeklyMissions('2026-01-12',plan,rows,[],rows.map(s=>reward(s.id))).badges).toContainEqual({week:'2026-01-05',label:'Plan cumplido'})
  rows[0].data.incomplete=true
  expect(weeklyMissions('2026-01-12',plan,rows,[],rows.map(s=>reward(s.id))).badges).toEqual([])
})
test('una sesión futura no adelanta el avance ni la evolución',()=>{
  const row=session('2026-01-09')
  expect(weeklyMissions('2026-01-05',plan,[row],[],[reward(row.id,100)])).toMatchObject({confirmed:0,current:{count:0}})
  expect(petProgress('2026-01-05','UTC','Dragón',plan,[row],[],[reward(row.id,100)]).get('Dragón')).toBeUndefined()
})
