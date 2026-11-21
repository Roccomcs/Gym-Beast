import { beforeAll,afterAll,test,expect } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createSyncDatabase } from './sync-database'
import { localRewards } from '../src/economy'
import { petProgress } from '../src/pet-progress'
import type { Item,Reward } from '../src/store'
const actor='00000000-0000-0000-0000-000000000808'
let db:PGlite
beforeAll(async()=>{db=await createSyncDatabase([actor])},15000)
afterAll(()=>db.close())
const plans=[{from:'2026-01-05',target:5,companion:'Dragón'}]
test('local y cuenta confirmada coinciden tras semanas completas, muerte y evolución',async()=>{
  const sessions:Item<'session'>[]=[],sets:Item<'set'>[]=[]
  async function add(date:string){
    const id='session-'+date,started=Date.parse(date+'T12:00:00Z')
    const exercise={id:'e',catalogId:'bench-press',name:'Press banca',original:'Press banca',mode:'external' as const,sets:1,min:10,max:10,load:60,unit:'kg' as const,rest:90,type:'work' as const}
    const s:Item<'session'>={owner:actor,id,kind:'session',version:1,data:{title:id,date,started,ended:started+60000,companion:'Dragón',cycleId:'c',dayId:id,exercises:[exercise]}}
    const set:Item<'set'>={owner:actor,id,kind:'set',version:1,data:{sessionId:id,exerciseId:'e',kg:60,reps:10,done:true,created:started,type:'work'}}
    sessions.push(s);sets.push(set)
    for(const row of [s,set])await db.query('insert into public.training_items(owner,kind,id,version,data) values($1,$2,$3,1,$4)',[actor,row.kind,id,row.data])
  }
  async function check(today:string,expected:{xp:number;health:number}){
    const confirmed=(await db.query<Reward>('select * from public.session_rewards where owner=$1',[actor])).rows
    const local=petProgress(today,'America/Buenos_Aires','Dragón',plans,sessions,[],localRewards(sessions,sets)).get('Dragón')
    expect(local).toEqual(expected)
    expect(petProgress(today,'America/Buenos_Aires','Dragón',plans,sessions,[],confirmed).get('Dragón')).toEqual(local)
  }
  for(let i=0;i<10;i++)await add(new Date(Date.parse('2026-01-05')+(Math.floor(i/5)*7+i%5)*86400000).toISOString().slice(0,10))
  await check('2026-01-18',{xp:250,health:100})
  await check('2026-01-26',{xp:250,health:50})
  await check('2026-02-02',{xp:0,health:0})
  await add('2026-02-02');await check('2026-02-02',{xp:25,health:0})
  for(const date of ['2026-02-03','2026-02-04','2026-02-05'])await add(date)
  await check('2026-02-05',{xp:100,health:100})
})
test.each([{timezone:'Inventada/Mal'},{petPlans:[{from:'2026-02-30',target:5,companion:'Dragón'}]},
  {petPlans:[{from:'2026-01-05',target:8,companion:'Dragón'}]},{petPlans:[{from:'2026-01-05',target:2.5,companion:'Dragón'}]},
  {petPlans:[{from:'2026-01-05',target:3,companion:'Inventado'}]}])('rechaza perfil con reglas inválidas %j',async patch=>{
  await expect(db.query("insert into public.training_items(owner,kind,id,version,data) values($1,'profile','self',1,$2)",
    [actor,{name:'Prueba',timezone:'UTC',...patch}])).rejects.toThrow()
})
