import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, afterAll, it, expect } from 'vitest'
import { accountEmail } from '../supabase/functions/_shared/account-rules'

const db = new PGlite()
const legacy = crypto.randomUUID()
const hash = (character: string) => character.repeat(64)

beforeAll(async () => {
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key, email text unique, raw_app_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;`)
  await db.query('insert into auth.users(id) values($1)', [legacy])
  const directory = new URL('../supabase/migrations/', import.meta.url)
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, directory), 'utf8'))
  }
}, 15000)
afterAll(() => db.close())

async function invite(code: string, extra = '') {
  await db.exec('reset role')
  await db.query('insert into public.account_invitations(code_hash) values($1)', [code])
  if (extra) await db.query('update public.account_invitations set ' + extra + ' where code_hash=$1', [code])
}
async function register(handle: string, invitation: string, operation = crypto.randomUUID()) {
  const owner = crypto.randomUUID()
  await db.query('insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)', [
    owner, accountEmail(handle), { gymbeast_registration: { handle, invitation_hash: invitation, operation } },
  ])
  return owner
}
async function account(owner: string) {
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
}

it('crea cuenta y usuario social y consume una sola invitación', async () => {
  await invite(hash('a'))
  const owner = await register('rocco', hash('a'))
  expect((await db.query('select handle from public.account_logins where owner=$1', [owner])).rows).toEqual([{ handle: 'rocco' }])
  expect((await db.query('select handle from public.social_profiles where owner=$1', [owner])).rows).toEqual([{ handle: 'rocco' }])
  await expect(register('otro', hash('a'))).rejects.toThrow(/Invitation unavailable/)
  expect((await db.query('select consumed_by from public.account_invitations where code_hash=$1', [hash('a')])).rows)
    .toEqual([{ consumed_by: owner }])
})

it('un usuario duplicado revierte también el consumo de la invitación', async () => {
  await invite(hash('b'))
  await db.query('insert into public.social_profiles(owner,handle) values($1,$2)', [legacy, 'ocupado'])
  await expect(register('ocupado', hash('b'))).rejects.toThrow(/unique/)
  expect((await db.query('select consumed_at from public.account_invitations where code_hash=$1', [hash('b')])).rows)
    .toEqual([{ consumed_at: null }])
  await register('disponible', hash('b'))
})

it.each([
  ['c', "revoked_at = now()"], ['d', "expires_at = now() - interval '1 second'"],
])('rechaza invitaciones no disponibles %s', async (character, clause) => {
  await invite(hash(character), clause)
  await expect(register('persona_' + character, hash(character))).rejects.toThrow(/Invitation unavailable/)
})

it('rechaza registro directo sin invitación y usuarios no normalizados', async () => {
  await expect(db.query('insert into auth.users(id,email) values($1,$2)', [crypto.randomUUID(), 'directo@example.test']))
    .rejects.toThrow(/Invitation registration required/)
  await invite(hash('e'))
  await expect(register('ROCCO', hash('e'))).rejects.toThrow(/Invitation registration required/)
})

it('mantiene el usuario de acceso y oculta invitaciones a los clientes', async () => {
  await db.exec('reset role')
  const { rows } = await db.query<{ owner: string }>("select owner from public.account_logins where handle='rocco'")
  await account(rows[0].owner)
  await expect(db.query('select * from public.account_invitations')).rejects.toThrow(/permission denied/)
  await expect(db.query('select public.allow_account_attempt($1)', [hash('f')])).rejects.toThrow(/permission denied/)
  await expect(db.query("select public.social_action('handle','nuevo',null)")).rejects.toThrow(/no se puede cambiar/)
  await db.query("select public.social_action('handle','rocco',null)")
})

it('limita intentos y vuelve a habilitar el usuario después de quince minutos', async () => {
  await db.exec('reset role')
  for (let attempt = 0; attempt < 10; attempt++) {
    expect((await db.query('select public.allow_account_attempt($1) as allowed', [hash('f')])).rows).toEqual([{ allowed: true }])
  }
  expect((await db.query('select public.allow_account_attempt($1) as allowed', [hash('f')])).rows).toEqual([{ allowed: false }])
  await db.query("update public.account_attempts set starts_at=now()-interval '16 minutes' where bucket=$1", [hash('f')])
  expect((await db.query('select public.allow_account_attempt($1) as allowed', [hash('f')])).rows).toEqual([{ allowed: true }])
})

it('bloquea datos y RPC con contraseña temporal incluso usando una sesión anterior', async () => {
  await db.exec('reset role')
  await db.query("insert into public.training_items(owner,kind,id,version,data) values($1,'profile','self',1,'{}')", [legacy])
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [legacy, { temporary_password_required: true }])
  await account(legacy)
  expect((await db.query('select * from public.training_items')).rows).toEqual([])
  for (const sql of [
    "select public.apply_change('00000000-0000-0000-0000-000000000011','profile','self',1,'{}')",
    "select public.buy_pet_good('gym-cap')", "select public.social_action('list',null,null)",
    "select public.friend_activity('list',null)", 'select public.delete_account()',
  ]) await expect(db.exec(sql)).rejects.toThrow(/Password change required/)
  await db.exec('reset role')
  await db.query("update auth.users set raw_app_meta_data='{}' where id=$1", [legacy])
  await account(legacy)
  expect((await db.query('select id from public.training_items')).rows).toEqual([{ id: 'self' }])
})

it('dos cuentas registradas conservan perfiles separados', async () => {
  await invite(hash('1'))
  const first = await register('primero', hash('1'))
  await invite(hash('2'))
  const second = await register('segundo', hash('2'))
  await account(first)
  await db.query("select public.apply_change($1,'profile','self',0,$2)", [crypto.randomUUID(), { name: 'Primero' }])
  await account(second)
  expect((await db.query('select id from public.training_items')).rows).toEqual([])
  await db.query("select public.apply_change($1,'profile','self',0,$2)", [crypto.randomUUID(), { name: 'Segundo' }])
  expect((await db.query("select data->>'name' as name from public.training_items")).rows).toEqual([{ name: 'Segundo' }])
  await account(first)
  expect((await db.query("select data->>'name' as name from public.training_items")).rows).toEqual([{ name: 'Primero' }])
})
