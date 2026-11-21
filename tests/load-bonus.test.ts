import { expect, test } from 'vitest'
import { loadImprovements } from '../src/load-bonus'
import { localRewards } from '../src/economy'
import { toKg, type Exercise } from '../src/domain'
import type { Item } from '../src/store'
const move = (id='bench'): Exercise => ({id,name:id,catalogId:id,original:id,mode:'external',load:null,sets:3,min:10,max:10,unit:'kg',rest:90,type:'work'})
const session = (id:string,started:number,exercises=[move()]): Item<'session'> => ({owner:'local',kind:'session',id,version:1,
  data:{title:id,date:'2026-11-19',started,ended:started+10,cycleId:'cycle',dayId:id,companion:'Dragón',exercises}})
const set = (id:string,kg:number|null,reps=10,exerciseId='bench'): Item<'set'> => ({owner:'local',kind:'set',id:id+exerciseId,version:1,
  data:{sessionId:id,exerciseId,kg,reps,done:true,created:1}})
const before=session('before',100),current=session('now',200)
test('la primera carga es referencia; menos repeticiones no anulan una mejora',()=>{
  expect(loadImprovements(before,[before],[set('before',60)])).toEqual([])
  expect(loadImprovements(current,[before,current],[set('before',60),set('now',65,5)])).toMatchObject([{previousKg:60,kg:65}])
})
test('compara el máximo histórico, no solo la última sesión',()=>{
  expect(loadImprovements(current,[session('old',50),before,current],[set('old',70),set('before',60),set('now',65)])).toEqual([])
})

test('el índice cronológico conserva límites de inicio, fin y sesiones simultáneas',()=>{
  const a=session('a',100),b=session('b',110),same=session('same',110),overlap=session('overlap',105)
  overlap.data.ended=125
  const rows=[overlap,same,b,a],sets=[set('a',60),set('b',65),set('same',70),set('overlap',100)]
  expect(loadImprovements(b,rows,sets)).toMatchObject([{previousKg:60,kg:65}])
  expect(loadImprovements(same,rows,sets)).toMatchObject([{previousKg:60,kg:70}])
  expect(loadImprovements(overlap,rows,sets)).toEqual([])
  const instant=session('instant',110);instant.data.ended=110
  expect(loadImprovements(same,[instant,same],[set('instant',60),set('same',70)])).toEqual([])
})
test('los kg canónicos no premian un cambio de unidad',()=>{
  expect(loadImprovements(current,[before,current],[set('before',toKg(100,'lb')),set('now',toKg(100,'lb'))])).toEqual([])
})
test.each(['warmup','incomplete','unfinished','no-reps','no-weight','other-owner','overlap','different-mode','different-variant','seconds','assisted','bodyweight'])('excluye %s',kind=>{
  const a=session('a',100), b=session('b',200), x=set('a',60), y=set('b',65)
  if(kind==='warmup') y.data.type='warmup'
  if(kind==='incomplete') b.data.incomplete=true
  if(kind==='unfinished') b.data.ended=undefined
  if(kind==='no-reps') y.data.reps=0
  if(kind==='no-weight') y.data.kg=null
  if(kind==='other-owner') x.owner='other'
  if(kind==='overlap') a.data.ended=250
  if(kind==='different-mode') b.data.exercises[0].mode='per-side'
  if(kind==='different-variant') b.data.exercises[0].catalogId='incline'
  if(kind==='seconds') b.data.exercises[0].measure='seconds'
  if(kind==='assisted') b.data.exercises[0].mode='assisted'
  if(kind==='bodyweight') b.data.exercises[0].mode='bodyweight'
  expect(loadImprovements(b,[a,b],[x,y])).toEqual([])
})
test('máximo tres movimientos y una sola recompensa por ocurrencia; editar compensa',()=>{
  const moves=['a','b','c','d'].map(id=>move(id)), a=session('a',100,moves), b=session('b',200,moves)
  const sets=moves.flatMap(e=>[set('a',60,10,e.id),set('b',65,5,e.id)])
  const duplicate=session('duplicate',300,moves); duplicate.data.dayId=b.data.dayId
  const earned=localRewards([a,b,duplicate],sets).filter(r=>r.occurrence)
  expect(earned).toHaveLength(2)
  expect(earned[1]).toMatchObject({xp:40,gold:35,improvements:expect.any(Array)})
  expect(earned[1].improvements).toHaveLength(3)
  sets.filter(s=>s.data.sessionId==='b').forEach(s=>s.data.kg=60)
  expect(localRewards([a,b],sets).find(r=>r.session_id==='b')).toMatchObject({xp:25,gold:20,improvements:[]})
})
test('corregir una referencia histórica recalcula las sesiones posteriores',()=>{
  const sets=[set('before',60),set('now',65)]
  expect(loadImprovements(current,[before,current],sets)).toHaveLength(1)
  sets[0].data.kg=70
  expect(loadImprovements(current,[before,current],sets)).toEqual([])
})
test('un ejercicio propio mantiene identidad al renombrarse y no se mezcla con otro',()=>{
  const a=session('a',100),b=session('b',200)
  const custom={id:'4167f217-aee2-4ccd-8ffd-bd036b4fc769',primary:'Pecho' as const,secondary:[],equipment:'Máquina' as const}
  a.data.exercises[0]={...move(),catalogId:null,custom,name:'Mi máquina'}
  b.data.exercises[0]={...move(),catalogId:null,custom:{...custom},name:'Máquina renombrada'}
  expect(loadImprovements(b,[a,b],[set('a',60),set('b',65)])).toHaveLength(1)
  b.data.exercises[0].custom!.id='f094374e-d1c2-449b-8411-0d1246d33b98'
  expect(loadImprovements(b,[a,b],[set('a',60),set('b',65)])).toEqual([])
})
test('una instantánea antigua de calentamiento sin tipo en la serie no gana bonus',()=>{
  const a=session('a',100),b=session('b',200),s=set('b',65)
  b.data.exercises[0].type='warmup';s.data.type=undefined
  expect(loadImprovements(b,[a,b],[set('a',60),s])).toEqual([])
})
test('conserva el premio base de instantáneas antiguas sin clasificación',()=>{
  const legacy=session('legacy',100,[{id:'bench'} as Exercise])
  expect(localRewards([legacy],[set('legacy',60)]).find(r=>r.occurrence)).toMatchObject({xp:25,gold:20,improvements:[]})
})
