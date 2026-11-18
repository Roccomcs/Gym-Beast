import { beforeAll, afterAll, it, expect } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createSyncDatabase, asAccount } from './sync-database'

const first = '00000000-0000-0000-0000-000000000201'
const second = '00000000-0000-0000-0000-000000000202'
let db: PGlite
beforeAll(async () => { db = await createSyncDatabase([first, second]) }, 15000)
afterAll(() => db.close())
function operation(kind: string, id: string, data: object | null, base = 0, action = 'put') {
  return { op: crypto.randomUUID(), kind, id, data, base, action }
}
async function push(owner: string, operations: object[]) {
  return asAccount(db, owner, async () => (await db.query<{ result: { status: string; row?: { version: number; deleted: boolean } }[] }>(
    'select public.sync_push($1) as result', [operations])).rows[0].result)
}
const workout = (id: string) => ({ title: 'Torso', date: '2026-11-18', started: 1000, ended: 2000,
  cycleId: 'cycle', dayId: id, companion: 'Dragón', exercises: [{ id: 'bench' }] })
const performed = (sessionId: string) => ({ sessionId, exerciseId: 'bench', reps: 10, kg: 60, done: true })

it('aplica un lote una vez y detecta un UUID reutilizado con otros datos', async () => {
  const op = operation('routine', 'routine', { name: 'A', days: [] })
  expect((await push(first, [op]))[0].status).toBe('applied')
  expect((await push(first, [op]))[0].status).toBe('applied')
  expect((await push(first, [{ ...op, data: { name: 'B', days: [] } }]))[0].status).toBe('rejected')
  expect((await db.query("select version from public.training_items where owner=$1 and kind='routine'", [first])).rows).toEqual([{ version: 1 }])
})

it('un rechazo bloquea su entidad y permite aplicar el resto del lote', async () => {
  const result = await push(first, [operation('set', 'bad', performed('missing')), operation('set', 'bad', performed('missing'), 1),
    operation('routine', 'independent', { name: 'Otra', days: [] })])
  expect(result.map(row => row.status)).toEqual(['rejected', 'blocked', 'applied'])
})

it('fusiona altas independientes de series con una sola recompensa', async () => {
  expect((await push(first, [operation('session', 'common', workout('common'))]))[0].status).toBe('applied')
  await Promise.all([push(first, [operation('set', 'device-a', performed('common'))]),
    push(first, [operation('set', 'device-b', performed('common'))])])
  // PGlite has one connection; identity changes above refer to the same account.
  expect((await db.query("select count(*)::int as count from public.training_items where owner=$1 and kind='set'", [first])).rows).toEqual([{ count: 2 }])
  expect((await db.query('select count(*)::int as count from public.session_rewards where owner=$1 and occurrence is not null', [first])).rows).toEqual([{ count: 1 }])
})

it('conserva ambas revisiones y usa una nueva base al resolver', async () => {
  const result = await push(first, [operation('routine', 'routine', { name: 'Dispositivo B', days: [] })])
  expect(result[0]).toMatchObject({ status: 'conflict', row: { version: 1, data: { name: 'A' } } })
  expect((await push(first, [operation('routine', 'routine', { name: 'Dispositivo B', days: [] }, 1)]))[0].status).toBe('applied')
})

it('descarga páginas incrementales sin datos de otra cuenta', async () => {
  await push(second, [operation('routine', 'secret', { name: 'Privada', days: [] })])
  await asAccount(db, first, async () => {
    let cursor = 0
    let more = true
    const ids: string[] = []
    while (more) {
      const { rows } = await db.query<{ result: { changes: { id: string }[]; cursor: number; more: boolean } }>('select public.sync_pull($1,2) as result', [cursor])
      const page = rows[0].result
      expect(page.cursor).toBeGreaterThan(cursor)
      ids.push(...page.changes.map(row => row.id)); cursor = page.cursor; more = page.more
    }
    expect(ids).not.toContain('secret')
    const { rows } = await db.query<{ result: { changes: unknown[]; cursor: number } }>('select public.sync_pull($1,2) as result', [cursor])
    expect(rows[0].result).toMatchObject({ changes: [], cursor })
  })
})

it('rechaza referencias cruzadas y modificaciones directas de la bitácora', async () => {
  expect((await push(second, [operation('set', 'foreign', performed('common'))]))[0].status).toBe('rejected')
  expect((await push(first, [operation('schedule', 'foreign', { title: 'Otra cuenta', date: '2026-11-18', exercises: [], routineId: 'secret' })]))[0].status).toBe('rejected')
  await asAccount(db, first, async () => {
    await expect(db.query("insert into public.wallet_ledger(owner,source,source_id,xp,gold) values($1,'reward','fake',25,20)", [first]))
      .rejects.toThrow(/permission denied/)
  })
})

it('propaga eliminaciones e impide resucitar una versión vieja', async () => {
  await push(first, [operation('routine', 'routine', null, 2, 'delete')])
  const result = await push(first, [operation('routine', 'routine', { name: 'Vieja', days: [] }, 2)])
  expect(result[0]).toMatchObject({ status: 'conflict', row: { version: 3, deleted: true } })
  expect((await push(first, [operation('routine', 'routine', { name: 'Recuperada', days: [] }, 3)]))[0].status).toBe('applied')
})

it('revierte XP y oro al borrar una sesión y deja compensaciones verificables', async () => {
  expect((await push(first, [operation('session', 'common', null, 1, 'delete')]))[0].status).toBe('applied')
  expect((await db.query("select count(*)::int as count from public.training_items where owner=$1 and kind='set'", [first])).rows).toEqual([{ count: 0 }])
  expect((await db.query('select sum(xp)::int as xp,sum(gold)::int as gold from public.wallet_ledger where owner=$1', [first])).rows).toEqual([{ xp: 0, gold: 0 }])
})

it('respalda y restaura identidad de registros, compras, saldo y premios de forma idempotente', async () => {
  await push(second, [operation('profile', 'self', { name: 'Antes', companion: 'Dragón', starter: 'Dragón' })])
  for (let day = 0; day < 4; day++) await push(second, [operation('session', 'backup-' + day, workout('backup-' + day)),
    operation('set', 'backup-set-' + day, performed('backup-' + day))])
  await asAccount(db, second, () => db.exec("select public.buy_pet_good('gym-cap')"))
  // Preserve decimal values after a PostgreSQL → JSON → JavaScript round trip.
  await db.query("update public.training_items set data=jsonb_set(data,'{weightKg}','70.00') where owner=$1 and kind='profile'", [second])
  const snapshot = (await db.query<{ backup: unknown }>('select public.export_account_backup($1) as backup', [second])).rows[0].backup
  await push(second, [operation('profile', 'self', { name: 'Después', companion: 'Dragón', starter: 'Dragón' }, 2),
    operation('set', 'backup-set-0', null, 1, 'delete')])
  const op = crypto.randomUUID()
  await db.query('select public.restore_account_backup($1,$2,$3)', [second, op, snapshot])
  const revision = (await db.query('select revision from public.sync_heads where owner=$1', [second])).rows
  await db.query('select public.restore_account_backup($1,$2,$3)', [second, op, snapshot])
  expect((await db.query('select revision from public.sync_heads where owner=$1', [second])).rows).toEqual(revision)
  expect((await db.query("select data->>'name' as name from public.training_items where owner=$1 and kind='profile'", [second])).rows).toEqual([{ name: 'Antes' }])
  expect((await db.query('select sum(xp)::int as xp,sum(gold)::int as gold from public.wallet_ledger where owner=$1', [second])).rows).toEqual([{ xp: 125, gold: 15 }])
  await asAccount(db, second, async () => {
    await expect(db.query('select public.export_account_backup($1)', [first])).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.restore_account_backup($1,$2,$3)', [second, op, snapshot])).rejects.toThrow(/permission denied/)
  })
})

it('un respaldo corrupto se rechaza sin alterar la cuenta', async () => {
  const read = async () => (await db.query("select (public.export_account_backup($1)->'payload')-'exported_at' as payload", [second])).rows[0].payload
  const before = await read()
  await expect(db.query('select public.restore_account_backup($1,$2,$3)', [second, crypto.randomUUID(), { format: 'gymbeast-account', version: 1 }]))
    .rejects.toThrow(/Invalid account backup/)
  expect(await read()).toEqual(before)
  const { rows } = await db.query<{ backup: object }>(`with corrupt as (
    select jsonb_set(public.export_account_backup($1),'{payload,ledger}','[]') as backup
  ) select jsonb_set(backup,'{checksum}',to_jsonb(md5((backup->'payload')::text))) as backup from corrupt`, [second])
  await expect(db.query('select public.restore_account_backup($1,$2,$3)', [second, crypto.randomUUID(), rows[0].backup]))
    .rejects.toThrow(/Backup wallet mismatch/)
  expect(await read()).toEqual(before)
})

it('el borrado de cuenta elimina también los datos, el monedero y el registro incremental', async () => {
  await db.query('delete from auth.users where id=$1', [second])
  for (const table of ['training_items','session_rewards','wallet_ledger','sync_changes','training_tombstones','account_restores']) {
    expect((await db.query('select count(*)::int as count from public.' + table + ' where owner=$1', [second])).rows).toEqual([{ count: 0 }])
  }
})

it('la migración conserva el saldo confirmado y publica los premios anteriores', async () => {
  const upgraded = await createSyncDatabase([first], async database => {
    await database.query("insert into public.session_rewards(owner,session_id,xp,gold,occurrence) values($1,'old-session',25,20,'cycle:old:day')", [first])
    await database.query("insert into public.pet_purchases(owner,good,price) values($1,'legacy-good',10)", [first])
  })
  try {
    expect((await upgraded.query('select sum(xp)::int as xp,sum(gold)::int as gold from public.wallet_ledger')).rows).toEqual([{ xp: 50, gold: 10 }])
    await asAccount(upgraded, first, async () => {
      const page = (await upgraded.query<{ result: { changes: { id: string }[] } }>('select public.sync_pull() as result')).rows[0].result
      expect(page.changes.map(row => row.id)).toEqual(expect.arrayContaining(['old-session', 'mission:1']))
    })
  } finally { await upgraded.close() }
})
