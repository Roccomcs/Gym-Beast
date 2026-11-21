import {test,expect} from 'vitest'
import {mkdir,writeFile} from 'node:fs/promises'
import {randomBytes,createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {createSyncDatabase,asAccount} from '../tests/sync-database'
import {mobileItems} from '../tests/mobile-fixture'

test('mide 100 cuentas, 52 semanas, 20 series por entrenamiento y registros auxiliares',async()=>{
  const count=Number(process.env.GYMBEAST_CAPACITY_ACCOUNTS??100)
  if(!Number.isInteger(count)||count<1||count>100)throw new Error('Use 1..100 synthetic accounts')
  const owners=Array.from({length:count},(_,i)=>'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
  const db=await createSyncDatabase(owners),started=performance.now()
  try{
    const original=mobileItems('2026-11-19',260).filter(row=>row.id!=='mobile-active')
    const uuid=(name:string)=>{const hex=createHash('sha256').update(name).digest('hex');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32)}
    const ids=new Set(original.filter(row=>row.kind!=='profile').map(row=>row.id))
    const routine=original.find(row=>row.kind==='routine')!.data as any
    for(const day of routine.days){ids.add(day.id);for(const exercise of day.exercises)ids.add(exercise.id)}
    const fixture=JSON.parse(JSON.stringify(original,(_key,value)=>typeof value==='string'&&ids.has(value)?uuid(value):value)) as typeof original
    // Bulk import of a settled year, not a 100-user concurrent HTTP benchmark.
    // Keep validation/log triggers. Suppress expensive reward replay during import,
    // then insert its known settled ledger separately and test live queries below.
    await db.exec("select set_config('gymbeast.restoring','yes',false)")
    for(const [index,owner]of owners.entries()){
      const photo='data:image/jpeg;base64,'+randomBytes(65000).toString('base64')
      const rows=fixture.map(row=>({...row,owner,data:row.kind==='routine'?{...row.data,photo}:row.data}))
      for(const kind of ['routine','profile','session','set']){
        const group=rows.filter(row=>row.kind===kind)
        await db.query(`insert into training_items(owner,kind,id,version,data)
          select $1,x.kind,x.id,x.version,x.data from jsonb_to_recordset($2::jsonb) as x(kind text,id text,version int,data jsonb)`,[owner,JSON.stringify(group)])
      }
      await db.query(`insert into social_profiles(owner,handle,avatar) values($1,$2,$3)`,[owner,'capacity_'+index,photo])
      await db.query(`insert into session_rewards(owner,session_id,xp,gold,companion,occurrence,training_date)
        select owner,id,25,20,'Dragón','cycle:'||(data->>'cycleId')||':'||(data->>'dayId'),(data->>'date')::date
        from training_items where owner=$1 and kind='session'`,[owner])
      await db.query(`insert into wallet_ledger(owner,source,source_id,xp,gold)
        select owner,'reward',session_id,xp,gold from session_rewards where owner=$1`,[owner])
      await db.query(`insert into pet_purchases(owner,good,price) select $1,id,price from pet_goods order by price,id limit 3`,[owner])
      await db.query(`insert into wallet_ledger(owner,source,source_id,xp,gold) select owner,'purchase',good,0,-price from pet_purchases where owner=$1`,[owner])
      await db.query(`insert into friend_posts(owner,session_id) select owner,id from training_items where owner=$1 and kind='session' order by id limit 52`,[owner])
      // One operation per saved entity, plus 20% edited sets; fingerprints/results retained.
      await db.query(`insert into training_operations(owner,id,request_hash,result)
        select $1,gen_random_uuid(),sha256(convert_to(n::text,'UTF8')),'{"status":"applied","version":1}'::jsonb
        from generate_series(1,$2::int)n`,[owner,rows.length+1040])
      if((index+1)%10===0)console.log('capacity',index+1,'accounts')
    }
    if(count>1)for(let i=0;i<count;i++){
      const owner=owners[i],friend=owners[(i+1)%count]
      await db.query(`insert into social_relationships(sender,recipient,status) values($1,$2,'accepted') on conflict do nothing`,[owner,friend])
      await db.query(`insert into friend_cheers(post_id,owner) select id,$1 from friend_posts where owner=$2`,[owner,friend])
    }
    await db.exec("select set_config('gymbeast.restoring','',false); analyze")
    const rawBytes=Number((await db.query<{bytes:string}>(`select sum(pg_total_relation_size(oid))::text as bytes from pg_class where relnamespace='public'::regnamespace and relkind='r'`)).rows[0].bytes)
    // Embedded PostgreSQL has no autovacuum: show raw and maintained allocation.
    await db.exec('vacuum (full,analyze) sync_heads')
    await db.exec('reindex table training_items')
    await db.exec('reindex table training_operations')
    const sizes=(await db.query(`select relname as name,pg_total_relation_size(oid)::text as bytes,
      pg_indexes_size(oid)::text as index_bytes from pg_class where relnamespace='public'::regnamespace and relkind='r' order by relname`)).rows
    const counts=(await db.query(`select (select count(*) from training_items)::int as entities,
      (select count(*) from training_items where kind='session')::int as sessions,
      (select count(*) from training_items where kind='set')::int as sets,
      (select count(*) from training_operations)::int as operations,(select count(*) from sync_changes)::int as changes,
      (select count(*) from wallet_ledger)::int as ledger`)).rows[0] as any
    const timings:number[]=[],responses:number[]=[]
    for(let i=0;i<5;i++)await asAccount(db,owners[i%count],async()=>{
      const start=performance.now(),page=await db.query<{page:any}>('select sync_pull(0,250) as page')
      timings.push(performance.now()-start);responses.push(Buffer.byteLength(JSON.stringify(page.rows[0].page)))
    })
    let initialDownloadBytes=0,pages=0,cursor=0,more=true
    await asAccount(db,owners[0],async()=>{
      while(more){const page=(await db.query<{p:any}>('select sync_pull($1,250) as p',[cursor])).rows[0].p
        initialDownloadBytes+=Buffer.byteLength(JSON.stringify(page));pages++;cursor=page.cursor;more=page.more}
    })
    const backupStart=performance.now(),backup=(await db.query<{b:any}>('select export_account_backup($1) as b',[owners[0]])).rows[0].b
    const backupMs=performance.now()-backupStart,backupBytes=Buffer.byteLength(JSON.stringify(backup))
    const probe=crypto.randomUUID(),exercises=routine.days[0].exercises.map((e:any)=>({...e,id:uuid(e.id)}))
    const session={title:'Capacity live probe',date:'2026-11-19',started:Date.parse('2026-11-19T16:00:00Z'),cycleId:probe,dayId:probe,companion:'Dragón',exercises}
    const ops=[{op:crypto.randomUUID(),kind:'session',id:probe,base:0,data:session},
      ...exercises.flatMap((e:any)=>Array.from({length:4},(_,slot)=>({op:crypto.randomUUID(),kind:'set',id:crypto.randomUUID(),base:0,data:{sessionId:probe,exerciseId:e.id,kg:60,reps:10,done:true,type:'work',slot,created:session.started+slot*60000}}))),
      {op:crypto.randomUUID(),kind:'session',id:probe,base:1,data:{...session,ended:session.started+3600000}}]
    let liveUploadMs=0,retryMs=0
    await asAccount(db,owners[0],async()=>{
      let start=performance.now();const response=(await db.query<{r:any[]}>('select sync_push($1) as r',[ops])).rows[0].r;liveUploadMs=performance.now()-start
      expect(response.every(row=>row.status==='applied')).toBe(true)
      start=performance.now();const retried=(await db.query<{r:any[]}>('select sync_push($1) as r',[ops])).rows[0].r;retryMs=performance.now()-start
      expect(retried).toEqual(response)
    })
    expect((await db.query<{n:string}>('select count(*) as n from session_rewards where owner=$1 and session_id=$2',[owners[0],probe])).rows[0].n).toBe(1)
    const total=sizes.reduce((sum,row:any)=>sum+Number(row.bytes),0)
    const report={environment:'PGlite PostgreSQL embedded, bulk settled fixture; no Auth/HTTP/concurrency',accounts:count,weeks:52,sessionsPerWeek:5,setsPerSession:20,
      photoBytesPerAccount:2*Buffer.byteLength('data:image/jpeg;base64,'+randomBytes(65000).toString('base64')),
      identifiers:'UUID-sized entity/exercise/day identifiers',counts,preMaintenanceBytes:rawBytes,maintenance:'VACUUM FULL sync_heads; REINDEX training_items and training_operations',publicRelationBytes:total,tables:sizes,syncFirstPageMs:timings,syncFirstPageBytes:responses,
      elapsedMs:performance.now()-started,freeDatabaseBudgetBytes:500_000_000,headroomBytes:500_000_000-total,
      initialDownloadBytes,initialDownloadPages:pages,backupBytes,backupMs,liveUploadMs,retryMs,
      trafficModel:{initialDownloads100Accounts:initialDownloadBytes*100,monthly22Sessions100AccountsUploadBytes:Buffer.byteLength(JSON.stringify(ops))*2200},
      note:'Public tables/indexes only. Hosted Auth/system tables, WAL, runtime and workload variation are not included.'}
    await mkdir('docs/qa/etapa-11',{recursive:true})
    await writeFile('docs/qa/etapa-11/capacity-'+count+'.json',JSON.stringify(report,null,2))
    expect(counts.sessions).toBe(count*260);expect(counts.sets).toBe(count*5200)
    expect(total+50_000_000).toBeLessThan(500_000_000)
    expect(timings.every(Number.isFinite)).toBe(true)
  }finally{await db.close()}
},600000)
