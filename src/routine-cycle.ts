import { db, save } from './store'
import { reviseRoutine, uid } from './domain'
import { alternateRoutine } from './programs'

export async function repeatCycle(owner: string, expectedCycle: string, date: string) {
  return db.transaction('rw', db.items, db.operations, db.syncState, db.tombstones, async () => {
    const profile = await db.items.get([owner, 'profile', 'self'])
    if (!profile || profile.kind !== 'profile') return
    const data = profile.data as import('./domain').Profile
    if (!data.cycle || data.cycle.id !== expectedCycle) return
    const row = await db.items.get([owner, 'routine', data.cycle.routineId])
    if (!row) throw new Error('No encontramos la rutina.')
    const routine = row.data as import('./domain').Routine
    const next = alternateRoutine(routine)
    if (next !== routine) await save(owner, 'routine', row.id, reviseRoutine(routine, next))
    await save(owner, 'profile', 'self', { ...data, cycle: { id: uid(), routineId: row.id, skipped: [], startedOn: date } })
  })
}
