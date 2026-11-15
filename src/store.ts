import Dexie, { type Table } from 'dexie'
import { createClient } from '@supabase/supabase-js'
import { uid, type Routine, type Session, type Schedule, type PerformedSet, type Profile } from './domain'

export type Values = { routine: Routine; session: Session; schedule: Schedule; set: PerformedSet; profile: Profile }
type Kind = keyof Values
export type Item<K extends Kind = Kind> = {
  owner: string; kind: K; id: string; version: number; data: Values[K]
}
export type Reward = { owner: string; session_id: string; xp: number }
type Remote = Omit<Item, 'owner'>
export type Operation = {
  op: string; owner: string; kind: Kind; id: string; base: number; data: Values[Kind]; conflict?: Remote
}
class Database extends Dexie {
  items!: Table<Item, [string, Kind, string]>
  operations!: Table<Operation, string>
  rewards!: Table<Reward, [string, string]>
  constructor() {
    super('gymbeast')
    this.version(1).stores({
      items: '[owner+kind+id], owner, [owner+kind]',
      operations: 'op, owner, [owner+kind+id]',
    })
    this.version(2).stores({ rewards: '[owner+session_id], owner' })
  }
}
export const db = new Database()
export const local = 'local'
export const sessionKey = 'gymbeast-active-account'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const api = url && key ? createClient(url, key) : null

export async function list<K extends Kind>(owner: string, kind: K) {
  return await db.items.where('[owner+kind]').equals([owner, kind]).toArray() as Item<K>[]
}

export function save<K extends Kind>(owner: string, kind: K, id: string, data: Values[K]) {
  return saveMany(owner, kind, [{ id, data }])
}

export async function saveMany<K extends Kind>(
  owner: string, kind: K, changes: { id: string; data: Values[K] }[],
) {
  await db.transaction('rw', db.items, db.operations, async () => {
    for (const { id, data } of changes) {
      const current = await db.items.get([owner, kind, id])
      const base = current?.version ?? 0
      await db.items.put({ owner, kind, id, version: base + 1, data })
      if (owner !== local) await db.operations.add({ owner, kind, id, base, op: uid(), data })
    }
  })
  window.dispatchEvent(new Event('gymbeast-save'))
}
export async function resolveConflict(operation: Operation, keepLocal: boolean) {
  if (!operation.conflict) return
  const { owner, kind, id, conflict } = operation
  await db.transaction('rw', db.items, db.operations, async () => {
    const latest = await db.items.get([owner, kind, id])
    await db.operations.where('[owner+kind+id]').equals([owner, kind, id]).delete()
    await db.items.put({ ...conflict, owner })
    if (keepLocal && latest) {
      await db.items.put({ ...latest, version: conflict.version + 1 })
      await db.operations.add({ owner, kind, id, data: latest.data, base: conflict.version, op: uid() })
    }
  })
  window.dispatchEvent(new Event('gymbeast-save'))
}

const active = new Map<string, Promise<void>>()
export function sync(owner: string) {
  const pending = active.get(owner)
  if (pending) return pending
  const work = synchronize(owner).finally(() => active.delete(owner))
  active.set(owner, work)
  return work
}

async function synchronize(owner: string) {
  if (!api || owner === local || !navigator.onLine) return
  const { data: auth } = await api.auth.getSession()
  if (auth.session?.user.id !== owner) return
  const ops = await db.operations.where('owner').equals(owner).toArray()
  const blocked = new Set(ops.filter(op => op.conflict).map(op => op.kind + ':' + op.id))
  const sorted = ops.sort((a, b) => a.base - b.base)
  for (const op of sorted) {
    const key = op.kind + ':' + op.id
    if (blocked.has(key)) continue
    const { data, error } = await api.rpc('apply_change', {
      p_operation: op.op, p_kind: op.kind, p_id: op.id, p_base: op.base, p_data: op.data,
    })
    if (error) throw error
    if (data.status === 'conflict') {
      blocked.add(key)
      await db.operations.update(op.op, { conflict: data.row as Remote })
    } else {
      await db.operations.delete(op.op)
    }
  }
  const size = 250
  for (let offset = 0; ; offset += size) {
    const { data, error } = await api.from('training_items').select('kind,id,version,data')
      .eq('owner', owner).order('kind').order('id').range(offset, offset + size - 1)
    if (error) throw error
    await db.transaction('rw', db.items, db.operations, async () => {
      for (const row of data as Remote[]) {
        const pending = await db.operations.where('[owner+kind+id]').equals([owner, row.kind, row.id]).count()
        if (!pending) await db.items.put({ ...row, owner })
      }
    })
    if (data.length < size) break
  }
  for (let offset = 0; ; offset += size) {
    const result = await api.from('session_rewards').select('owner,session_id,xp')
      .eq('owner', owner).order('session_id').range(offset, offset + size - 1)
    if (result.error) throw result.error
    await db.rewards.bulkPut(result.data as Reward[])
    if (result.data.length < size) break
  }
}

export async function clearAccount(owner: string) {
  await db.transaction('rw', db.items, db.operations, db.rewards, async () => {
    await db.rewards.where('owner').equals(owner).delete()
    await db.items.where('owner').equals(owner).delete()
    await db.operations.where('owner').equals(owner).delete()
  })
}
