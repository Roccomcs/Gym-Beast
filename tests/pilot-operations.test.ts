import {test,expect} from 'vitest'
import {readFile,readdir} from 'node:fs/promises'
import {createSyncDatabase,asAccount} from './sync-database'
const first='00000000-0000-4000-8000-000000000901',second='00000000-0000-4000-8000-000000000902'

test('compactar conserva cursores, eliminaciones y respuesta idempotente',async()=>{
  const db=await createSyncDatabase([first,second])
  try{
    const op=crypto.randomUUID(),snapshot={name:'A',version:1,source:'',days:[]}
    const push=(base:number,data:object|null,action='put',id=crypto.randomUUID())=>asAccount(db,first,async()=>
      (await db.query<{result:any[]}>('select sync_push($1) as result',[[{op:id,kind:'routine',id:'routine',base,data,action}]])).rows[0].result[0])
    const applied=await push(0,snapshot,'put',op)
    await push(1,{...snapshot,name:'B'})
    await push(2,null,'delete')
    const count=Number((await db.query<{n:string}>('select compact_sync_history() as n')).rows[0].n)
    expect(count).toBeGreaterThanOrEqual(2)
    const page=await asAccount(db,first,async()=>(await db.query<{p:any}>('select sync_pull(0,250) as p')).rows[0].p)
    expect(page.changes).toMatchObject([{id:'routine',deleted:true,version:3}])
    expect(await push(0,snapshot,'put',op)).toEqual(applied)
    expect((await push(0,{...snapshot,name:'Different'},'put',op)).status).toBe('rejected')
    const other=await asAccount(db,second,async()=>(await db.query<{p:any}>('select sync_pull(0,250) as p')).rows[0].p)
    expect(other.changes).toEqual([])
  }finally{await db.close()}
},15000)

test('las operaciones administrativas y la generación de recuperación son privadas',async()=>{
  const db=await createSyncDatabase([first])
  try{
    const pull=()=>asAccount(db,first,async()=>(await db.query<{p:any}>('select sync_pull() as p')).rows[0].p)
    const before=await pull()
    for(const name of ['pilot_storage_report','compact_sync_history','begin_recovery_epoch'])await asAccount(db,first,async()=>{
      await expect(db.query(`select ${name}()`)).rejects.toThrow(/permission denied/)
    })
    const report=(await db.query<{r:any}>('select pilot_storage_report() as r')).rows[0].r
    expect(Number(report.database_bytes)).toBeGreaterThan(0)
    await db.query('select begin_recovery_epoch()')
    expect((await pull()).epoch).not.toBe(before.epoch)
  }finally{await db.close()}
},15000)

test('actualizar una base anterior conserva series y premios al cambiar el almacenamiento',async()=>{
  const db=await createSyncDatabase([first],undefined,'202611190016_friend_profiles.sql')
  try{
    await db.query(`insert into training_items(owner,kind,id,version,data) values($1,'session','session',1,$2)`,[first,
      {title:'Torso',date:'2026-11-19',started:100,cycleId:'cycle',dayId:'day',companion:'Dragón',exercises:[{id:'bench'}]}])
    await db.query(`insert into training_items(owner,kind,id,version,data) values($1,'set','set',1,$2)`,[first,
      {sessionId:'session',exerciseId:'bench',kg:60,reps:10,done:true}])
    const dir=new URL('../supabase/migrations/',import.meta.url)
    for(const file of (await readdir(dir)).filter(name=>name.endsWith('.sql')&&name>'202611190016_friend_profiles.sql').sort())await db.exec(await readFile(new URL(file,dir),'utf8'))
    const page=await asAccount(db,first,async()=>(await db.query<{p:any}>('select sync_pull() as p')).rows[0].p)
    expect(page.changes.find((row:any)=>row.id==='set')).toMatchObject({version:1,deleted:false,data:{kg:60,reps:10}})
    expect(Number((await db.query<{n:string}>("select count(*) as n from sync_changes where kind='set' and not deleted")).rows[0].n)).toBe(0)
    await db.query(`update training_items set data=jsonb_set(data,'{kg}','65'),version=2 where owner=$1 and kind='set'`,[first])
    const next=await asAccount(db,first,async()=>(await db.query<{p:any}>('select sync_pull($1) as p',[page.cursor])).rows[0].p)
    expect(next.changes).toMatchObject([{id:'set',version:2,data:{kg:65}}])
    await db.query(`delete from training_items where owner=$1 and kind='set'`,[first])
    const deleted=await asAccount(db,first,async()=>(await db.query<{p:any}>('select sync_pull($1) as p',[next.cursor])).rows[0].p)
    expect(deleted.changes).toMatchObject([{id:'set',deleted:true,version:3}])
  }finally{await db.close()}
},15000)
