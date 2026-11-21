import {beforeAll,afterAll,test,expect} from 'vitest'
import type {PGlite} from '@electric-sql/pglite'
import {createSyncDatabase,asAccount} from './sync-database'
let db:PGlite
const owner=crypto.randomUUID(),other=crypto.randomUUID()
beforeAll(async()=>{db=await createSyncDatabase([owner,other])},15000)
afterAll(()=>db.close())
async function put(kind:string,id:string,data:object){await db.query('insert into public.training_items(owner,kind,id,version,data) values($1,$2,$3,1,$4)',[owner,kind,id,data])}
test('admite veinte minutos de cardio, conserva el premio único y limita las repeticiones de fuerza',async()=>{
 {
  await put('session','cardio',{title:'Cardio',date:'2026-11-19',started:1,ended:2,cycleId:'c',dayId:'d',companion:'Dragón',exercises:[{id:'bike',name:'Bicicleta',measure:'seconds',mode:'bodyweight'},{id:'curl',name:'Curl',mode:'external'}],omitted:['curl']})
  await put('set','bike',{sessionId:'cardio',exerciseId:'bike',done:true,reps:1200,kg:null,created:1})
  await expect(put('set','too-long',{sessionId:'cardio',exerciseId:'bike',done:true,reps:86401,kg:null,created:1})).rejects.toThrow(/Invalid repetitions/)
  await expect(put('set','bad-reps',{sessionId:'cardio',exerciseId:'curl',done:true,reps:1200,kg:10,created:1})).rejects.toThrow(/Invalid repetitions/)
 }
 const rewards=(await db.query<{xp:number;gold:number}>('select xp,gold from public.session_rewards where owner=$1 and occurrence is not null',[owner])).rows
 expect(rewards).toEqual([{xp:25,gold:20}])
 await db.query("select public.reconcile_session_reward($1,'cardio')",[owner])
 expect((await db.query('select count(*)::int n from public.session_rewards where owner=$1 and occurrence is not null',[owner])).rows).toEqual([{n:1}])
 await asAccount(db,other,async()=>expect((await db.query('select * from public.training_items where owner=$1',[owner])).rows).toEqual([]))
})
