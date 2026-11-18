import Dexie, { type Table } from 'dexie'
import { createClient } from '@supabase/supabase-js'
import { uid, type Routine, type Session, type Schedule, type PerformedSet, type Profile } from './domain'

export type Values = { routine: Routine; session: Session; schedule: Schedule; set: PerformedSet; profile: Profile }
export type Kind = keyof Values
export type Item<K extends Kind = Kind> = {
  owner: string; kind: K; id: string; version: number; data: Values[K]
}
export type Reward = { owner: string; session_id: string; xp: number; gold?: number; companion?: string; occurrence?: string | null; revision?: number }
export type Remote = { kind: Kind; id: string; version: number; data: Values[Kind] | null; deleted?: boolean }
export type Operation = {
  op: string; owner: string; kind: Kind; id: string; base: number; data?: Values[Kind];
  action?: 'put' | 'delete'; sequence?: number; conflict?: Remote; rejected?: string
}
type SyncState = { owner: string; cursor: number; nextOperation: number; initialized?: boolean; balance?: { xp: number; gold: number } }
type Tombstone = { owner: string; kind: Kind | 'reward'; id: string; version: number }
class Database extends Dexie {
  syncState!: Table<SyncState, string>
  tombstones!: Table<Tombstone, [string, Kind | 'reward', string]>
  items!: Table<Item, [string, Kind, string]>
  operations!: Table<Operation, string>
  rewards!: Table<Reward, [string, string]>
  onboarding!: Table<{ owner: string; profile: Profile }, string>
  constructor() {
    super('gymbeast')
    this.version(1).stores({
      items: '[owner+kind+id], owner, [owner+kind]',
      operations: 'op, owner, [owner+kind+id]',
    })
    this.version(2).stores({ rewards: '[owner+session_id], owner' })
    this.version(3).stores({ onboarding: 'owner' })
    this.version(4).stores({ syncState: 'owner', tombstones: '[owner+kind+id], owner' }).upgrade(async transaction => {
      const operations = await transaction.table('operations').toArray() as Operation[]
      const rank = { routine: 0, profile: 1, schedule: 2, session: 3, set: 4 }
      operations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.base - b.base || a.op.localeCompare(b.op))
      const counters = new Map<string, number>()
      const profiles = await transaction.table('items').filter(item => item.kind === 'profile').toArray() as Item<'profile'>[]
      for (const profile of profiles) counters.set(profile.owner, 0)
      for (const operation of operations) {
        const sequence = (counters.get(operation.owner) ?? 0) + 1
        counters.set(operation.owner, sequence)
        await transaction.table('operations').put({ ...operation, sequence })
      }
      for (const [owner, nextOperation] of counters) await transaction.table('syncState').put({ owner, cursor: 0, nextOperation,
        initialized: profiles.some(profile => profile.owner === owner && profile.data.onboarded) })
    })
  }
}
export const db = new Database()
export const local = 'local'
export const sessionKey = 'gymbeast-active-account'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const api = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null

export async function list<K extends Kind>(owner: string, kind: K) {
  return await db.items.where('[owner+kind]').equals([owner, kind]).toArray() as Item<K>[]
}

export function save<K extends Kind>(owner: string, kind: K, id: string, data: Values[K]) {
  return saveMany(owner, kind, [{ id, data }])
}

export async function saveMany<K extends Kind>(
  owner: string, kind: K, changes: { id: string; data: Values[K] }[],
) {
  await db.transaction('rw', db.items, db.operations, db.syncState, db.tombstones, async () => {
    const state = await db.syncState.get(owner) ?? { owner, cursor: 0, nextOperation: 0 }
    for (const { id, data } of changes) {
      const current = await db.items.get([owner, kind, id])
      const deleted = await db.tombstones.get([owner, kind, id])
      const base = current?.version ?? deleted?.version ?? 0
      await db.items.put({ owner, kind, id, version: base + 1, data })
      await db.tombstones.delete([owner, kind, id])
      if (owner !== local) await db.operations.add({ owner, kind, id, base, op: uid(), data, action: 'put', sequence: ++state.nextOperation })
    }
    await db.syncState.put(state)
  })
  changed()
}

function changed() { window.dispatchEvent(new Event('gymbeast-save')) }

export async function recordSet(owner: string, id: string, data: PerformedSet, rest?: { id: string; until: number }) {
  await db.transaction('rw', db.items, db.operations, db.syncState, db.tombstones, async () => {
    await save(owner, 'set', id, data)
    if (rest) {
      const session = await db.items.get([owner, 'session', rest.id])
      if (session) await db.items.put({ ...session, data: { ...session.data, restUntil: rest.until, pausedRest: undefined } })
    }
  })
}

export async function resolveConflict(operation: Operation, keepLocal: boolean) {
  if (!operation.conflict) return
  const { owner, kind, id, conflict } = operation
  await db.transaction('rw', db.items, db.operations, db.syncState, db.tombstones, async () => {
    if (!(await db.operations.get(operation.op))) return
    const latest = await db.items.get([owner, kind, id])
    const localDeleted = !latest && !!await db.tombstones.get([owner, kind, id])
    await db.operations.where('[owner+kind+id]').equals([owner, kind, id]).delete()
    await db.items.delete([owner, kind, id])
    await db.tombstones.delete([owner, kind, id])
    if (conflict.deleted || !conflict.data) {
      await db.tombstones.put({ owner, kind, id, version: conflict.version })
    } else await db.items.put({ owner, kind, id, version: conflict.version, data: conflict.data })
    if (keepLocal && (latest || localDeleted)) {
      const state = await db.syncState.get(owner) ?? { owner, cursor: 0, nextOperation: 0 }
      const next = { owner, kind, id, base: conflict.version, op: uid(), sequence: ++state.nextOperation }
      if (latest) {
        await db.items.put({ ...latest, version: conflict.version + 1 })
        await db.tombstones.delete([owner, kind, id])
        await db.operations.add({ ...next, data: latest.data, action: 'put' })
      } else if (!conflict.deleted) {
        await db.tombstones.put({ owner, kind, id, version: conflict.version + 1 })
        await db.operations.add({ ...next, action: 'delete' })
      }
      await db.syncState.put(state)
    }
  })
  changed()
}

const active = new Map<string, Promise<void>>()
export function sync(owner: string) {
  const pending = active.get(owner)
  if (pending) return pending
  const run = () => synchronize(owner)
  const work = (navigator.locks ? navigator.locks.request('gymbeast-sync-' + owner, run) : run())
    .finally(() => active.delete(owner))
  active.set(owner, work)
  return work
}

type PushResult = { op: string; status: 'applied' | 'conflict' | 'rejected' | 'blocked'; row?: Remote; error?: string }
type Change = (Remote & { revision: number }) | { kind: 'reward'; id: string; revision: number; version: number; data: Reward | null; deleted: boolean }
type PullResult = { changes: Change[]; cursor: number; more: boolean; balance?: { xp: number; gold: number } }

async function synchronize(owner: string) {
  if (!api || owner === local || !navigator.onLine) return
  const { data: auth } = await api.auth.getSession()
  if (auth.session?.user.id !== owner) return
  const ops = await db.operations.where('owner').equals(owner).toArray()
  const blocked = new Set(ops.filter(op => op.conflict || op.rejected).map(op => op.kind + ':' + op.id))
  const sorted = ops.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
  // Bound both operation count and payload size, retaining order across batches.
  for (let start = 0; start < sorted.length;) {
    const batch: Operation[] = []
    let bytes = 0
    while (start < sorted.length && batch.length < 50) {
      const operation = sorted[start]
      if (blocked.has(operation.kind + ':' + operation.id)) { start++; continue }
      const size = new TextEncoder().encode(JSON.stringify(operation)).length
      if (batch.length && bytes + size > 1000000) break
      batch.push(operation); bytes += size; start++
    }
    if (!batch.length) continue
    const { data, error } = await api.rpc('sync_push', {
      p_operations: batch.map(op => ({ op: op.op, kind: op.kind, id: op.id, base: op.base,
        action: op.action ?? 'put', data: op.data ?? null })),
    })
    if (error) throw error
    if (!Array.isArray(data) || data.length !== batch.length) throw new Error('Respuesta de sincronización incompleta')
    await db.transaction('rw', db.operations, async () => {
      for (const result of data as PushResult[]) {
        const operation = batch.find(op => op.op === result.op)
        if (!operation) throw new Error('Operación de sincronización desconocida')
        if (result.status === 'applied') await db.operations.delete(operation.op)
        else if (result.status === 'conflict' && result.row) {
          await db.operations.update(operation.op, { conflict: result.row })
          blocked.add(operation.kind + ':' + operation.id)
        } else if (result.status === 'rejected') {
          await db.operations.update(operation.op, { rejected: result.error ?? 'Revisá este cambio.' })
          blocked.add(operation.kind + ':' + operation.id)
        } else if (result.status !== 'blocked') throw new Error('Respuesta de sincronización inválida')
      }
    })
  }
  let more = true
  while (more) {
    const state = await db.syncState.get(owner) ?? { owner, cursor: 0, nextOperation: 0 }
    const { data, error } = await api.rpc('sync_pull', { p_cursor: state.cursor, p_limit: 250 })
    if (error) throw error
    const page = data as PullResult
    if (!page || !Array.isArray(page.changes) || !Number.isSafeInteger(page.cursor) ||
      page.cursor < state.cursor || (page.more && page.cursor === state.cursor)) throw new Error('Punto de sincronización inválido')
    await db.transaction('rw', db.items, db.operations, db.rewards, db.syncState, db.tombstones, async () => {
      for (const row of page.changes) {
        if (row.kind === 'reward') {
          const current = await db.rewards.get([owner, row.id])
          const deleted = await db.tombstones.get([owner, 'reward', row.id])
          if (row.revision <= Math.max(current?.revision ?? 0, deleted?.version ?? 0)) continue
          if (row.deleted) {
            await db.rewards.delete([owner, row.id])
            await db.tombstones.put({ owner, kind: 'reward', id: row.id, version: row.revision })
          } else if (row.data) {
            await db.rewards.put({ ...row.data, owner, revision: row.revision })
            await db.tombstones.delete([owner, 'reward', row.id])
          }
          continue
        }
        const pending = await db.operations.where('[owner+kind+id]').equals([owner, row.kind, row.id]).count()
        if (pending) continue
        const current = await db.items.get([owner, row.kind, row.id])
        const deleted = await db.tombstones.get([owner, row.kind, row.id])
        if (row.version < Math.max(current?.version ?? 0, deleted?.version ?? 0)) continue
        if (row.deleted) {
          await db.items.delete([owner, row.kind, row.id])
          await db.tombstones.put({ owner, kind: row.kind, id: row.id, version: row.version })
        } else if (row.data) {
          const data = row.kind === 'session' && !(row.data as Session).ended && current
            ? { ...row.data, restUntil: (current.data as Session).restUntil, pausedRest: (current.data as Session).pausedRest } : row.data
          await db.items.put({ owner, kind: row.kind, id: row.id, version: row.version, data })
          await db.tombstones.delete([owner, row.kind, row.id])
        }
      }
      const latest = await db.syncState.get(owner) ?? state
      await db.syncState.put({ ...latest, cursor: Math.max(latest.cursor, page.cursor), initialized: latest.initialized || !page.more,
        balance: !page.more && page.cursor >= latest.cursor ? page.balance ?? latest.balance : latest.balance })
    })
    more = page.more
  }
}

export async function retryOperation(operation: Operation, keepLocal = true) {
  if (!api || !navigator.onLine) throw new Error('Conectate para revisar el cambio.')
  const { data, error } = await api.rpc('sync_record', { p_kind: operation.kind, p_id: operation.id })
  if (error) throw error
  await resolveConflict({ ...operation, conflict: data as Remote }, keepLocal)
}

export async function clearAccount(owner: string) {
  await db.transaction('rw', [db.items, db.operations, db.rewards, db.onboarding, db.syncState, db.tombstones], async () => {
    await db.onboarding.delete(owner)
    await db.rewards.where('owner').equals(owner).delete()
    await db.items.where('owner').equals(owner).delete()
    await db.operations.where('owner').equals(owner).delete()
    await db.syncState.delete(owner)
    await db.tombstones.where('owner').equals(owner).delete()
  })
}
