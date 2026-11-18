import { readdir, readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

export async function createSyncDatabase(owners: string[], beforeSync?: (db: PGlite) => Promise<void>) {
  const db = new PGlite()
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key, email text unique, raw_app_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;`)
  for (const owner of owners) await db.query('insert into auth.users(id) values($1)', [owner])
  const directory = new URL('../supabase/migrations/', import.meta.url)
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    if (file === '202611180012_durable_sync.sql') await beforeSync?.(db)
    await db.exec(await readFile(new URL(file, directory), 'utf8'))
  }
  return db
}

export async function asAccount<T>(db: PGlite, owner: string, run: () => Promise<T>) {
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  try { return await run() } finally { await db.exec('reset role') }
}
