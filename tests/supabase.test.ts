import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import catalog from '../src/shop-catalog.json'
import { pilotFriends } from './pilot-fixture'

const db = new PGlite()
const athlete = 'ec43b31a-e211-4734-9c2b-bad81ed24bc8'
const friend = 'b58b74bc-380c-457c-80ba-48f7fd5d6530'
const returningAthlete = '2163090e-7f24-49c4-b271-9beb2cc24be0'

beforeAll(async () => {
  await db.exec("create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key);")
  await db.exec("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema auth to anon, authenticated")
  await db.query('insert into auth.users values ($1), ($2)', [athlete, friend])
  for (const file of ['202611140001_training.sql', '202611140002_session_rewards.sql', '202611140003_pet_economy.sql', '202611140004_training_milestones.sql', '202611140005_friends.sql', '202611140006_friend_activity.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
  }
  await db.query('insert into auth.users values ($1)', [returningAthlete])
  for (let day = 1; day <= 4; day++) {
    const id = 'session-' + day
    await db.query("insert into public.training_items(owner,kind,id,version,data) values ($1,'session',$2,1,$3), ($1,'set',$4,1,$5)",
      [returningAthlete, id, { title: 'Torso', date: '2026-11-14', ended: day, cycleId: 'cycle', dayId: id, exercises: [{ id: 'bench' }], companion: 'Dragón' },
        'set-' + day, { sessionId: id, exerciseId: 'bench', done: true, reps: 8 }])
  }
  expect((await db.query('select session_id from public.session_rewards where owner = $1 and occurrence is not null', [returningAthlete])).rows).toHaveLength(3)
  await db.exec(await readFile(new URL('../supabase/migrations/202611140007_session_experience.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/202611140008_magic_shop.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/202611150009_gold_per_session.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/202611160010_retire_accessories.sql', import.meta.url), 'utf8'))
}, 15000)

afterAll(() => db.close())

it('recupera la EXP de la cuarta sesión guardada antes de actualizar', async () => {
  await db.exec('reset role')
  expect((await db.query("select xp, gold, companion from public.session_rewards where owner = $1 and session_id = 'session-4'", [returningAthlete])).rows)
    .toEqual([{ xp: 25, gold: 20, companion: 'Dragón' }])
})

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
  const workout = { title: 'Torso', started, ended: started + 90000, exercises: [{ id: 'bench' }], companion: 'Dragón', date: '2026-11-14', cycleId: 'first', dayId: 'one' }
  expect(await change('session', 'workout', 0, workout)).toBe('applied')
  expect((await db.query('select xp, gold from public.session_rewards')).rows).toEqual([])
  const op = crypto.randomUUID()
  const performed = { sessionId: 'workout', exerciseId: 'bench', done: true, reps: 8 }
  expect(await change('set', 'series', 0, performed, op)).toBe('applied')
  expect(await change('set', 'series', 0, performed, op)).toBe('applied')
  expect(await change('set', 'series', 0, { ...performed, reps: 9 })).toBe('conflict')
  expect(await change('set', 'series2', 0, performed)).toBe('applied')
  expect((await db.query('select xp, gold from public.session_rewards order by gold')).rows).toEqual([{ xp: 25, gold: 0 }, { xp: 25, gold: 20 }])
  await expect(db.exec("insert into public.session_rewards(owner,session_id,xp) values ('" + athlete + "','fake',25)"))
    .rejects.toThrow(/permission denied/)
  expect(await change('profile', 'self', 0, { starter: 'Dragón', companion: 'Dragón' })).toBe('applied')
  await expect(db.exec("select public.buy_pet_good('bandana')")).rejects.toThrow(/Unknown good/)
  expect(await change('session', 'workout2', 0, { ...workout, dayId: 'two' })).toBe('applied')
  expect(await change('set', 'series3', 0, { ...performed, sessionId: 'workout2' })).toBe('applied')
  expect((await db.query("select session_id from public.session_rewards where session_id like 'mission:%'")).rows).toEqual([{ session_id: 'mission:1' }])
  for (const dayId of ['three', 'four']) {
    expect(await change('session', dayId, 0, { ...workout, dayId })).toBe('applied')
    const set = { ...performed, sessionId: dayId }
    const operation = crypto.randomUUID()
    expect(await change('set', 'series-' + dayId, 0, set, operation)).toBe('applied')
    expect(await change('set', 'series-' + dayId, 0, set, operation)).toBe('applied')
  }
  expect((await db.query('select sum(xp)::int as xp, sum(gold)::int as gold from public.session_rewards where occurrence is not null')).rows)
    .toEqual([{ xp: 100, gold: 80 }])
  expect(await change('session', 'four', 1, { ...workout, dayId: 'four', incomplete: true })).toBe('applied')
  expect((await db.query("select session_id from public.session_rewards where session_id = 'four'")).rows).toEqual([])
  await account(friend)
  expect((await db.query('select id from public.training_items')).rows).toEqual([])
  expect((await db.query('select xp, gold from public.session_rewards')).rows).toEqual([])
}, 15000)

it('vende los huevos disponibles y ambos accesorios sin cobrar dos veces', async () => {
  const buyer = '61aab025-ecd7-418b-80cd-540eb85e0379'
  await db.exec('reset role')
  await db.query('insert into auth.users values ($1)', [buyer])
  await db.query("insert into public.session_rewards(owner,session_id,xp,gold) select $1,'test-' || id,25,20 from generate_series(1,50) id", [buyer])
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [buyer])
  await db.query("select public.apply_change($1,'profile','self',0,$2)", [crypto.randomUUID(), { starter: 'Dragón', companion: 'Dragón' }])
  for (const sku of ['gym-cap','retro-cap','egg:Cocodrilo','egg:Oso','egg:Lobo']) {
    await db.query('select public.buy_pet_good($1)', [sku])
    await db.query('select public.buy_pet_good($1)', [sku])
  }
  await expect(db.query("select public.buy_pet_good('egg:Dragón')")).rejects.toThrow(/Invalid purchase/)
  await db.exec('reset role')
  const result = await db.query('select count(*)::int as goods, sum(price)::int as gold from public.pet_purchases where owner = $1', [buyer])
  expect(result.rows).toEqual([{ goods: 5, gold: 745 }])
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [buyer])
  expect((await db.query("select data -> 'purchases' as goods from public.training_items where kind = 'profile'")).rows)
    .toEqual([{ goods: ['egg:Cocodrilo', 'egg:Lobo', 'egg:Oso', 'gym-cap', 'retro-cap'] }])
}, 15000)

it('comprueba precios, propiedad y ranuras del bazar mágico', async () => {
  const buyer = 'ded09d06-ea34-414d-ac4e-5e63688cf593'
  await db.exec('reset role')
  expect((await db.query('select id,price,slot from public.pet_goods order by id collate "C"')).rows).toEqual(
    catalog.map(({ id, price, slot }) => ({ id, price, slot })).sort((a, b) => Buffer.compare(Buffer.from(a.id), Buffer.from(b.id))),
  )
  await db.query('insert into auth.users values ($1)', [buyer])
  await db.query("insert into public.session_rewards(owner,session_id,xp,gold) select $1,'magic-' || id,25,20 from generate_series(1,30) id", [buyer])
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [buyer])
  const apply = (version: number, data: object) =>
    db.query("select public.apply_change($1,'profile','self',$2,$3)", [crypto.randomUUID(), version, data])
  const profile = { starter: 'Dragón', companion: 'Dragón' }
  await apply(0, profile)
  await expect(apply(1, { ...profile, companion: 'Zorro' })).rejects.toThrow(/not owned/)
  for (const sku of ['egg:Zorro', 'argentina', 'gym-cap']) await db.query('select public.buy_pet_good($1)', [sku])
  await expect(apply(4, { ...profile, petOutfits: { Dragón: { head: 'argentina' } } })).rejects.toThrow(/invalid slot/)
  await expect(apply(4, { ...profile, petOutfits: { Dragón: { head: 'gold-crown' } } })).rejects.toThrow(/not owned/)
  const dressed = { Zorro: { top: 'argentina', head: 'gym-cap' } }
  await apply(4, { ...profile, companion: 'Zorro', equipped: 'bandana', petGear: { Dragón: 'medalla' }, petOutfits: { Zorro: { ...dressed.Zorro, neck: 'gold-chain', face: 'sun-glasses', hands: 'box-gold' } } })
  expect((await db.query("select data->'petOutfits' outfits from public.training_items where kind='profile'")).rows)
    .toEqual([{ outfits: dressed }])
})

it('limita las solicitudes, la aceptación y el bloqueo a las dos cuentas', async () => {
  async function account(id: string) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  }
  async function social(action: string, handle?: string, avatar?: string) {
    const { rows } = await db.query<{ result: { handle: string; relationships: unknown[] } }>(
      'select public.social_action($1,$2,$3) as result', [action, handle ?? null, avatar ?? null],
    )
    return rows[0].result
  }

  await account(athlete)
  expect((await social('handle', 'atleta')).handle).toBe('atleta')
  await account(friend)
  await expect(social('handle', 'atleta')).rejects.toThrow()
  expect((await social('handle', 'amigo')).handle).toBe('amigo')
  const avatar = 'data:image/jpeg;base64,/9j/2Q=='
  await social('avatar', undefined, avatar)
  expect((await social('request', 'atleta')).relationships)
    .toEqual([{ handle: 'atleta', status: 'pending', outgoing: true }])
  await social('accept', 'atleta')
  expect((await social('list')).relationships).toEqual([{ handle: 'atleta', status: 'pending', outgoing: true }])
  await account(athlete)
  expect((await social('accept', 'amigo')).relationships)
    .toEqual([{ handle: 'amigo', status: 'accepted', outgoing: false, avatar }])
  await social('block', 'amigo')
  await account(friend)
  expect((await social('list')).relationships).toEqual([])
  await expect(social('request', 'atleta')).rejects.toThrow(/Usuario no disponible/)
  await expect(db.query('select * from public.social_profiles')).rejects.toThrow(/permission denied/)
}, 15000)

it('comparte solo sesiones confirmadas y limita el feed y el desafío a amigos', async () => {
  const [firstFriend, secondFriend] = pilotFriends
  const first = firstFriend.id
  const second = secondFriend.id
  const stranger = friend
  await db.exec('reset role')
  await db.query('insert into auth.users values ($1), ($2)', [first, second])
  await db.query("insert into public.session_rewards(owner,session_id,xp,gold,occurrence,training_date) values ($1,'confirmed',25,20,'test:1',(now() at time zone 'UTC')::date)", [first])
  async function signIn(id: string) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
  }
  const social = (action: string, handle: string) => db.query('select public.social_action($1,$2)', [action, handle])
  async function activity(action: string, value?: string) {
    const out = await db.query<{ result: { posts: { id: string; cheers: number }[]; challenges: { id: string; accepted: boolean; mine: number; theirs: number }[] } }>(
      'select public.friend_activity($1,$2) as result', [action, value ?? null],
    )
    return out.rows[0].result
  }
  await signIn(first)
  await social('handle', firstFriend.handle)
  await expect(activity('publish', 'missing')).rejects.toThrow(/confirmada/)
  const post = (await activity('publish','confirmed')).posts[0]
  expect((await activity('publish','confirmed')).posts).toHaveLength(1)
  await signIn(second)
  await social('handle', secondFriend.handle)
  await social('request','gabi')
  expect((await activity('list')).posts).toHaveLength(0)
  await signIn(first)
  await social('accept','leo')
  const challenge = (await activity('challenge','leo')).challenges[0]
  expect((await activity('accept',challenge.id)).challenges[0].accepted).toBe(false)
  await signIn(second)
  expect((await activity('cheer', post.id)).posts[0].cheers).toBe(1)
  expect((await activity('cheer', post.id)).posts[0].cheers).toBe(1)
  expect((await activity('uncheer', post.id)).posts[0].cheers).toBe(0)
  expect((await activity('accept',challenge.id)).challenges[0]).toMatchObject({ accepted: true, mine: 0, theirs: 1 })
  await signIn(stranger)
  expect(await activity('list')).toEqual({ posts: [], challenges: [] })
  await expect(activity('cheer',post.id)).rejects.toThrow(/no disponible/)
  await signIn(second)
  await social('block','gabi')
  expect(await activity('list')).toEqual({ posts: [], challenges: [] })
}, 15000)
