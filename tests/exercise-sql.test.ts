import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { beforeAll, afterAll, test, expect } from 'vitest'
const db = new PGlite()
beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create table public.training_items(kind text,data jsonb)')
  await db.exec(await readFile(new URL('../supabase/migrations/202611190013_exercise_snapshots.sql', import.meta.url),'utf8'))
})
afterAll(() => db.close())
const custom = { id:'b8f3367c-3555-4dde-98fd-1d4d53d7ed13',primary:'Espalda',secondary:['Bíceps'],equipment:'Máquina' }
test('acepta instantáneas anteriores y ejercicios propios válidos',async()=>{
  await db.query('insert into training_items values ($1,$2)', ['session',{exercises:[{id:'legacy'}]}])
  await db.query('insert into training_items values ($1,$2)', ['routine',{days:[{exercises:[{id:'x',name:'Mi máquina',sets:3,min:8,max:12,mode:'external',custom}]}]}])
})
test.each([{...custom,primary:'Inventado'},{...custom,secondary:['Espalda']},{...custom,id:'x'},{...custom,equipment:'x'},{...custom,secondary:['Bíceps','Bíceps']}])('rechaza metadatos propios inválidos %j', async custom=>{
  await expect(db.query('insert into training_items values ($1,$2)', ['session',{exercises:[{id:'x',custom}]}])).rejects.toThrow(/Revisá/)
})
test.each([{sets:0},{sets:101},{min:12,max:8},{load:-1},{rest:'90'},{measure:'minutes'},{guidance:{invalid:true}}])('rechaza una prescripción inválida %j',async patch=>{
  await expect(db.query('insert into training_items values ($1,$2)', ['session',{exercises:[{id:'x',...patch}]}])).rejects.toThrow(/Revisá/)
})
