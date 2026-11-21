import {beforeAll,afterAll,test,expect} from 'vitest'
import type {PGlite} from '@electric-sql/pglite'
import {createSyncDatabase,asAccount} from './sync-database'
import {copySharedRoutine,socialVitals,type FriendComparison} from '../src/social-profile'
import {petProgress,stageIndex} from '../src/pet-progress'
const a='00000000-0000-0000-0000-000000000901',b='00000000-0000-0000-0000-000000000902',c='00000000-0000-0000-0000-000000000903'
let db:PGlite,today:string
const exercise={id:'bench',name:'Press banca',original:'SECRET_ORIGINAL',catalogId:'bench-barbell',sets:3,min:8,max:12,rest:90,load:95,unit:'kg',mode:'external',type:'work',notes:'SECRET_NOTE'}
const routine={name:'Torso compartido',version:1,source:'SECRET_SOURCE',cover:0,days:[{id:'d',title:'Torso',exercises:[exercise]}]}
async function put(owner:string,kind:string,id:string,data:object){await db.query(`insert into training_items(owner,kind,id,version,data) values($1,$2,$3,1,$4)
  on conflict(owner,kind,id) do update set data=excluded.data,version=training_items.version+1`,[owner,kind,id,data])}
async function action(owner:string,name:string,handle:string){return asAccount(db,owner,()=>db.query('select social_action($1,$2)',[name,handle]))}
async function profile(owner=a,handle='gabi',days=28){return asAccount(db,owner,async()=>(await db.query<{result:FriendComparison}>(
  'select public.friend_profile($1,$2) as result',[handle,days])).rows[0].result)}
beforeAll(async()=>{
  db=await createSyncDatabase([a,b,c]);today=(await db.query<{date:string}>("select (now() at time zone 'UTC')::date::text as date")).rows[0].date
  for(const [owner,handle]of [[a,'rocco'],[b,'gabi'],[c,'leo']]){
    await db.query('insert into social_profiles(owner,handle) values($1,$2)',[owner,handle])
    await put(owner,'profile','self',{name:handle,timezone:'UTC',companion:'Dragón',unit:'kg',weightKg:111,notes:'SECRET_BODY',petPlans:[{from:'2026-01-05',target:5,companion:'Dragón',notes:'SECRET_PLAN'}]})
  }
  await put(b,'routine','shared',routine);await put(b,'routine','private',{...routine,name:'SECRET_PRIVATE'})
  const started=Date.parse(today+'T12:00:00Z')
  for(const [owner,kg]of [[a,45.359237],[b,60]] as const){
    await put(owner,'session','workout',{title:'SECRET_TITLE',date:today,started,ended:started+60000,cycleId:'c',dayId:'d',companion:'Dragón',exercises:[exercise],notes:'SECRET_SESSION'})
    await put(owner,'set','set',{sessionId:'workout',exerciseId:'bench',done:true,kg,reps:10,notes:'SECRET_SET'})
  }
  for(let i=0;i<4;i++){
    const date='2026-01-0'+(5+i),id='old'+i,start=Date.parse(date+'T12:00:00Z')
    await put(b,'session',id,{title:'PRIVATE_OLD',date,started:start,ended:start+60000,cycleId:'old',dayId:id,companion:'Dragón',exercises:[exercise]})
    await put(b,'set',id,{sessionId:id,exerciseId:'bench',kg:60,reps:10,done:true})
  }
},15000)
afterAll(()=>db.close())
test('solo un amigo aceptado puede abrir el perfil, no una solicitud ni un tercero',async()=>{
  await expect(profile()).rejects.toThrow(/Perfil no disponible/)
  await action(a,'request','gabi');await expect(profile()).rejects.toThrow(/Perfil no disponible/)
  await action(b,'accept','rocco');expect((await profile()).friend.handle).toBe('gabi')
  await expect(profile(c)).rejects.toThrow(/Perfil no disponible/)
})
test('devuelve datos permitidos, conserva vida efectiva y usa períodos equivalentes',async()=>{
  const data=await profile()
  expect(data.days).toBe(28);expect(data.until).toBe(today)
  expect(data.friend.periodDays).toBe(1);expect(data.friend.records).toMatchObject([{movement:'bench-barbell',kg:60,period_kg:60}])
  expect(data.friend.routines).toEqual([])
  expect(JSON.stringify(data)).not.toContain('SECRET_')
  const rewards=(await db.query<any>('select * from session_rewards where owner=$1',[b])).rows
  const sessions=(await db.query<any>("select id,data from training_items where owner=$1 and kind='session'",[b])).rows
  expect(socialVitals(data.friend)).toEqual(petProgress(today,'UTC','Dragón',[{from:'2026-01-05',target:5,companion:'Dragón'}],sessions,[],rewards).get('Dragón'))
  expect(data.friend.accountXp).toBeGreaterThan(socialVitals(data.friend).xp)
  expect(stageIndex(data.friend.rewards.reduce((sum,r)=>sum+r.xp,0))).toBe(1)
  expect(stageIndex(socialVitals(data.friend).xp)).toBe(0)
  expect(socialVitals(data.friend).health).toBe(0)
  await expect(profile(a,'gabi',365)).rejects.toThrow(/Período inválido/)
})
test('compartir es voluntario y la copia no lleva cargas, notas ni historial privado',async()=>{
  const row=(await db.query<any>("select data from training_items where owner=$1 and kind='profile'",[b])).rows[0].data
  await put(b,'profile','self',{...row,sharedRoutineIds:['shared','foreign-id']})
  const data=await profile();expect(data.friend.routines).toHaveLength(1)
  const copied=copySharedRoutine(data.friend.routines[0].data)
  expect(copied.days[0].exercises[0]).toMatchObject({load:null,unit:null,original:'Press banca'})
  expect(copied.days[0].id).not.toBe('d');expect(copied.days[0].exercises[0].id).not.toBe('bench')
  expect(JSON.stringify(data)).not.toContain('SECRET_')
  const result=await asAccount(db,a,async()=>(await db.query<any>('select sync_push($1) as result',
    [[{op:crypto.randomUUID(),kind:'routine',id:'copied',base:0,data:copied,action:'put'}]])).rows[0].result)
  expect(result[0].status).toBe('applied')
})
test('retirar o archivar una rutina la quita de los perfiles sin cambiar la copia propia',async()=>{
  const row=(await db.query<any>("select data from training_items where owner=$1 and kind='profile'",[b])).rows[0].data
  await put(b,'profile','self',{...row,sharedRoutineIds:[]})
  expect((await profile()).friend.routines).toEqual([])
  await put(b,'profile','self',{...row,sharedRoutineIds:['shared']})
  await put(b,'routine','shared',{...routine,archived:true})
  expect((await profile()).friend.routines).toEqual([])
  expect((await db.query("select id from training_items where owner=$1 and kind='routine' and id='copied'",[a])).rows).toHaveLength(1)
})
test('celebraciones idempotentes y desafío de tres fechas se recalculan al corregir una sesión',async()=>{
  const activity=(actor:string,action='list',value:string|null=null)=>asAccount(db,actor,async()=>
    (await db.query<any>('select friend_activity($1,$2) as data',[action,value])).rows[0].data)
  const post=(await activity(a,'publish','workout')).posts.find((p:any)=>p.mine).id
  await activity(b,'cheer',post);await activity(b,'cheer',post)
  expect((await activity(a)).posts.find((p:any)=>p.id===post).cheers).toBe(1)
  await activity(b,'uncheer',post)
  for(const owner of [a,b])for(const offset of [1,2]){
    const date=new Date(Date.parse(today)-offset*86400000).toISOString().slice(0,10),id='challenge'+offset,start=Date.parse(date+'T12:00:00Z')
    await put(owner,'session',id,{title:id,date,started:start,ended:start+60000,cycleId:'challenge',dayId:id,companion:'Dragón',exercises:[exercise]})
    await put(owner,'set',id,{sessionId:id,exerciseId:'bench',done:true,reps:10,kg:40})
  }
  const challenge=(await activity(a,'challenge','gabi')).challenges[0].id
  await activity(b,'accept',challenge)
  await db.query('update friend_challenges set starts_on=$1::date-2,ends_on=$1::date+4 where id=$2',[today,challenge])
  expect((await activity(a)).challenges[0]).toMatchObject({mine:3,theirs:3,accepted:true})
  await db.query("delete from training_items where owner=$1 and kind='set' and id='challenge1'",[a])
  const date=new Date(Date.parse(today)+86400000).toISOString().slice(0,10),start=Date.parse(date+'T12:00:00Z')
  await put(a,'session','future',{title:'future',date,started:start,ended:start+60000,cycleId:'c',dayId:'future',companion:'Dragón',exercises:[exercise]})
  await put(a,'set','future',{sessionId:'future',exerciseId:'bench',done:true,reps:10,kg:40})
  expect((await activity(a)).challenges[0]).toMatchObject({mine:2,theirs:3})
  await activity(a,'unpublish',post)
  expect((await activity(a)).posts).toEqual([])
})
test('bloquear revoca perfil, rutinas, feed, reacciones y desafíos; desbloquear no acepta amistad',async()=>{
  await asAccount(db,b,()=>db.query("select friend_activity('publish','workout')"))
  const feed=await asAccount(db,a,async()=>(await db.query<any>("select friend_activity('list') as data")).rows[0].data)
  const post=feed.posts[0].id
  await action(a,'block','gabi')
  await expect(profile()).rejects.toThrow(/Perfil no disponible/)
  await expect(asAccount(db,a,()=>db.query("select friend_activity('cheer',$1)",[post]))).rejects.toThrow(/Publicación no disponible/)
  await expect(asAccount(db,b,()=>db.query("select friend_activity('challenge','rocco')"))).rejects.toThrow(/amigo disponible/)
  await action(a,'unblock','gabi');await expect(profile()).rejects.toThrow(/Perfil no disponible/)
})
test('no hay acceso directo a perfiles privados ni a helpers de otras cuentas',async()=>{
  await asAccount(db,a,async()=>{
    expect((await db.query('select id from training_items where owner=$1',[b])).rows).toEqual([])
    await expect(db.query('select social_snapshot($1,current_date,current_date)',[b])).rejects.toThrow(/permission denied/)
  })
})
test('un desafío fija su calendario y cuenta días por esa zona, incluso al cruzar medianoche UTC',async()=>{
  await db.query("insert into social_relationships values($1,$2,'accepted')",[a,c])
  const p=(await db.query<any>("select data from training_items where owner=$1 and kind='profile'",[a])).rows[0].data
  await put(a,'profile','self',{...p,timezone:'America/Buenos_Aires'})
  const challenge=await asAccount(db,a,async()=>(await db.query<any>("select friend_activity('challenge','leo') as data")).rows[0].data.challenges.find((x:any)=>x.handle==='leo'))
  expect(challenge.timezone).toBe('America/Buenos_Aires')
  const accepted=await asAccount(db,c,async()=>(await db.query<any>("select friend_activity('accept',$1) as data",[challenge.id])).rows[0].data.challenges[0])
  expect(accepted.starts_on).toBe(challenge.starts_on);expect(accepted.timezone).toBe(challenge.timezone)
  for(const [id,time]of [['tz1','2026-02-05T01:00:00Z'],['tz2','2026-02-05T05:00:00Z']]){
    const start=Date.parse(time)
    await put(a,'session',id,{title:id,date:'2026-02-05',started:start,ended:start+60000,cycleId:'tz',dayId:id,companion:'Dragón',exercises:[exercise]})
    await put(a,'set',id,{sessionId:id,exerciseId:'bench',reps:10,kg:30,done:true})
  }
  const count=async(zone:string)=>(await db.query<{count:number}>("select challenge_day_count($1,'2026-02-04','2026-02-05',$2)::int as count",[a,zone])).rows[0].count
  expect(await count('America/Buenos_Aires')).toBe(2);expect(await count('UTC')).toBe(1)
})
