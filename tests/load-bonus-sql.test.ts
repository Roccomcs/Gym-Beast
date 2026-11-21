import { beforeAll, afterAll, test, expect } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createSyncDatabase, asAccount } from './sync-database'
let db:PGlite
const actors=Array.from({length:20},()=>crypto.randomUUID())
beforeAll(async()=>{db=await createSyncDatabase([...actors])},15000)
afterAll(()=>db.close())
async function owner(){return actors.pop()!}
const moves=(count=1)=>Array.from({length:count},(_,i)=>({id:'e'+i,name:'Ejercicio '+i,catalogId:'catalog'+i,mode:'external'}))
async function put(actor:string,kind:string,id:string,data:object){await db.query(`insert into public.training_items(owner,kind,id,version,data) values($1,$2,$3,1,$4)
  on conflict(owner,kind,id) do update set data=excluded.data,version=training_items.version+1`,[actor,kind,id,data])}
async function session(actor:string,id:string,started:number,exercises=moves()){
  const data={title:id,date:'2026-11-19',started,ended:started+10,cycleId:'cycle',dayId:id,companion:'Lobo',exercises}
  await put(actor,'session',id,data);return data
}
async function set(actor:string,id:string,kg:number|null,reps=10,exerciseId='e0',type='work'){
  await put(actor,'set',id+exerciseId,{sessionId:id,exerciseId,kg,reps,done:true,type,created:1})
}
async function rewards(actor:string){return(await db.query<{session_id:string;xp:number;gold:number;improvements:any[]}>(
  'select session_id,xp,gold,improvements from public.session_rewards where owner=$1 and occurrence is not null order by session_id',[actor])).rows}
test('máximo tres mejoras, diferentes reps, reintentos y compensación histórica sin duplicados',async()=>{
  const actor=await owner(),ex=moves(4)
  await session(actor,'a',100,ex);for(const e of ex)await set(actor,'a',60,10,e.id)
  await session(actor,'b',200,ex);for(const e of ex)await set(actor,'b',65,5,e.id)
  expect((await rewards(actor))[1]).toMatchObject({xp:40,gold:35,improvements:expect.any(Array)})
  expect((await rewards(actor))[1].improvements).toHaveLength(3)
  const ledgerBefore=(await db.query('select count(*) from public.wallet_ledger where owner=$1',[actor])).rows
  await db.query("select public.reconcile_session_reward($1,'b')",[actor])
  expect((await db.query('select count(*) from public.wallet_ledger where owner=$1',[actor])).rows).toEqual(ledgerBefore)
  for(const e of ex)await set(actor,'a',70,10,e.id)
  expect((await rewards(actor))[1]).toMatchObject({xp:25,gold:20,improvements:[]})
  expect((await db.query('select sum(gold)::int as gold,sum(xp)::int as xp from public.wallet_ledger where owner=$1',[actor])).rows[0])
    .toEqual({gold:40,xp:75}) // Two days and the first-session milestone.
})
test('una referencia recibida tarde offline recalcula el premio posterior',async()=>{
  const actor=await owner()
  await session(actor,'later',200);await set(actor,'later',65,5)
  expect((await rewards(actor))[0].xp).toBe(25)
  await session(actor,'earlier',100);await set(actor,'earlier',60)
  expect((await rewards(actor)).find(r=>r.session_id==='later')).toMatchObject({xp:30,gold:25})
  await db.query("delete from public.training_items where owner=$1 and kind='set' and id='earliere0'",[actor])
  expect((await rewards(actor)).find(r=>r.session_id==='later')).toMatchObject({xp:25,gold:20})
})
test.each(['warmup','different-mode','different-variant','seconds','assisted','same-kg','incomplete'])('excluye %s en servidor',async kind=>{
  const actor=await owner();await session(actor,'a',100);await set(actor,'a',60)
  const ex:any=moves()
  if(kind==='different-mode')ex[0].mode='per-side'
  if(kind==='different-variant')ex[0].catalogId='another'
  if(kind==='seconds')ex[0].measure='seconds'
  if(kind==='assisted')ex[0].mode='assisted'
  const current=await session(actor,'b',200,ex)
  await set(actor,'b',kind==='same-kg'?60:65,5,'e0',kind==='warmup'?'warmup':'work')
  if(kind==='incomplete')await put(actor,'session','b',{...current,incomplete:true})
  const reward=(await rewards(actor)).find(r=>r.session_id==='b')
  expect(reward?.xp??25).toBe(25)
  expect(reward?.improvements??[]).toEqual([])
})
test('separa cuentas, impide escribir premios y conserva el desglose al restaurar',async()=>{
  const actor=await owner(),other=await owner()
  await session(other,'a',100);await set(other,'a',60)
  await session(actor,'b',200);await set(actor,'b',65)
  expect((await rewards(actor))[0].xp).toBe(25)
  await session(actor,'a',100);await set(actor,'a',60)
  const before=await rewards(actor)
  await asAccount(db,actor,async()=>{
    await expect(db.query("update public.session_rewards set xp=40 where owner=$1",[actor])).rejects.toThrow(/permission denied/)
    await expect(db.query("select public.session_load_improvements($1,'a')",[other])).rejects.toThrow(/permission denied/)
  })
  const backup=(await db.query<{backup:unknown}>('select public.export_account_backup($1) as backup',[actor])).rows[0].backup
  const operation=crypto.randomUUID()
  await db.query('select public.restore_account_backup($1,$2,$3)',[actor,operation,backup])
  await db.query('select public.restore_account_backup($1,$2,$3)',[actor,operation,backup])
  expect(await rewards(actor)).toEqual(before)
})
test('la cuarta sesión del día conserva oro base y bonus; se usa el máximo histórico',async()=>{
  const actor=await owner()
  for(let i=1;i<=4;i++){
    await session(actor,'day'+i,i*100)
    await set(actor,'day'+i,[60,70,65,75][i-1],5)
  }
  expect((await rewards(actor)).map(r=>[r.xp,r.gold])).toEqual([[25,20],[30,25],[25,20],[30,25]])
})
test('mover la fecha de inicio de una referencia recalcula también las sesiones intermedias',async()=>{
  const actor=await owner(),a=await session(actor,'a',100)
  await set(actor,'a',60)
  await session(actor,'b',200);await set(actor,'b',65)
  expect((await rewards(actor))[1].xp).toBe(30)
  await put(actor,'session','a',{...a,started:300,ended:310})
  expect((await rewards(actor))[1]).toMatchObject({xp:25,gold:20,improvements:[]})
})
