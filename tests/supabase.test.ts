import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'

const db = new PGlite()
const athlete = 'ec43b31a-e211-4734-9c2b-bad81ed24bc8'
const friend = 'b58b74bc-380c-457c-80ba-48f7fd5d6530'

beforeAll(async () => {
  await db.exec("create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key);")
  await db.exec("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema auth to anon, authenticated")
  await db.query('insert into auth.users values ($1), ($2)', [athlete, friend])
  for (const file of ['202611140001_training.sql', '202611140002_session_rewards.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  }
}, 15000)

afterAll(() => db.close())

it('applies offline changes once, rewards only eligible sessions, and isolates accounts', async () => {
  const account = async (id: string) => {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  }
  const change = async (kind: string, id: string, base: number, data: object, op = crypto.randomUUID()) => {
    const result = await db.query<{ applied: { status: string } }>(
      'select public.apply_change($1,$2,$3,$4,$5) as applied', [op, kind, id, base, data],
    )
    return result.rows[0].applied.status
  }
  await account(athlete)
  const started = Date.now() - 120000
  const workout = { title: 'Torso', started, ended: started + 90000, exercises: [{ id: 'bench' }] }
  expect(await change('session', 'workout', 0, workout)).toBe('applied')
  expect((await db.query('select xp from public.session_rewards')).rows).toEqual([])
  const op = crypto.randomUUID()
  const performed = { sessionId: 'workout', exerciseId: 'bench', done: true, reps: 8 }
  expect(await change('set', 'series', 0, performed, op)).toBe('applied')
  expect(await change('set', 'series', 0, performed, op)).toBe('applied')
  expect(await change('set', 'series', 0, { ...performed, reps: 9 })).toBe('conflict')
  expect(await change('set', 'series2', 0, performed)).toBe('applied')
  expect((await db.query('select xp from public.session_rewards')).rows).toEqual([{ xp: 25 }])
  await expect(db.exec("insert into public.session_rewards(owner,session_id,xp) values ('" + athlete + "','fake',25)"))
    .rejects.toThrow(/permission denied/)
  await account(friend)
  expect((await db.query('select id from public.training_items')).rows).toEqual([])
  expect((await db.query('select xp from public.session_rewards')).rows).toEqual([])
}, 15000)
