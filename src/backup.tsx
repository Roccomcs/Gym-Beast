import { useState } from 'react'
import { z } from 'zod'
import { exerciseSchema } from './domain'
import { db, local, type Item } from './store'

const id = z.string().min(1).max(80)
const number = z.number().nonnegative()
const day = z.object({ id, title: z.string().min(1), exercises: z.array(exerciseSchema) })
const date = z.iso.date()
const session = z.object({
  title: z.string().min(1), exercises: z.array(exerciseSchema), started: number, ended: number.optional(),
  date, scheduleId: id.optional(), cycleId: id.optional(), dayId: id.optional(), routineId: id.optional(), routineVersion: z.number().int().positive().optional(), companion: z.string().optional(),
  incomplete: z.boolean().optional(), omitted: z.array(id).optional(), restUntil: number.optional(), pausedRest: number.optional(),
})
const profile = z.object({
  name: z.string().max(60), unit: z.enum(['kg','lb']), theme: z.enum(['dark','light']),
  weekStart: z.number().int().min(0).max(6), reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(), weeklyGoal: z.number().int().min(1).max(7).optional(), loadIncrementKg: z.number().positive().optional(), timezone: z.string().refine(zone => {
    try { new Intl.DateTimeFormat('es', { timeZone: zone }); return true }
    catch { return false }
  }),
  companion: z.enum(['Dragón','Cocodrilo','Oso','Lobo']), onboarded: z.boolean().optional(),
  starter: z.enum(['Dragón','Cocodrilo','Oso','Lobo']).optional(),
  weightKg: number.optional(), cycle: z.object({ id, routineId: id, skipped: z.array(id), startedOn: date.optional(), order: z.array(id).optional() }).optional(),
  purchases: z.array(z.string()).optional(), equipped: z.string().optional(),
  petGear: z.record(z.string(), z.string().nullable()).optional(),
})
const row = z.object({ id, version: z.number().int().positive() })
const backup = z.object({ version: z.literal(1), items: z.array(z.discriminatedUnion('kind', [
  row.extend({ kind: z.literal('routine'), data: z.object({ name: z.string().min(1), version: z.number().int().positive(),
    source: z.string(), days: z.array(day), archived: z.boolean().optional(), cover: z.number().int().min(0).max(9).optional(), photo: z.string().max(90000).optional(),
    history: z.array(z.object({ name: z.string().min(1), version: z.number().int().positive(),
      source: z.string(), days: z.array(day) })).max(3).optional() }) }),
  row.extend({ kind: z.literal('session'), data: session }),
  row.extend({ kind: z.literal('schedule'), data: z.object({ date, title: z.string(), exercises: z.array(exerciseSchema),
    routineId: id, version: z.number().int().positive(), skipped: z.boolean().optional() }) }),
  row.extend({ kind: z.literal('set'), data: z.object({ sessionId: id, exerciseId: id, kg: number.nullable(),
    reps: z.number().int().positive(), done: z.boolean(), created: number, slot: z.number().int().min(0).optional(), rpe: number.optional(), rir: number.optional(),
    notes: z.string().optional(), type: exerciseSchema.shape.type.optional() }) }),
  row.extend({ kind: z.literal('profile'), data: profile }),
])).max(50000) })

export async function restoreLocal(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo supera los 20 MB.')
  const parsed = backup.safeParse(JSON.parse(await file.text()))
  if (!parsed.success) throw new Error('El archivo no tiene el formato de respaldo de GymBeast.')
  const rows: Item[] = parsed.data.items.map(item => ({ ...item, owner: local }))
  const keys = new Set(rows.map(item => item.kind + ':' + item.id))
  if (keys.size !== rows.length) throw new Error('El respaldo tiene registros duplicados.')
  await db.transaction('rw', db.items, async () => {
    const current = await db.items.where('owner').equals(local).toArray()
    if (current.some(item => item.kind !== 'profile')) {
      throw new Error('La restauración requiere un espacio local sin rutinas ni sesiones. Exportá tus datos actuales antes de vaciarlo.')
    }
    if (rows.some(item => item.kind === 'profile')) {
      await db.items.where('[owner+kind]').equals([local, 'profile']).delete()
    }
    await db.items.bulkAdd(rows)
  })
  return rows.length
}

export function RestoreBackup() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  return <form className="panel" onSubmit={async event => {
    event.preventDefault()
    if (busy) return
    const file = new FormData(event.currentTarget).get('backup')
    if (!(file instanceof File) || !file.size) return
    setBusy(true)
    try { setMessage('Registros restaurados: ' + await restoreLocal(file)) }
    catch (error) { setMessage(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' :
      error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.') }
    finally { setBusy(false) }
  }}>
    <label>Archivo de respaldo<input required type="file" name="backup" accept="application/json,.json"/></label>
    <button className="secondary" disabled={busy}>Restaurar respaldo local</button>
    {message && <p role="status">{message}</p>}
  </form>
}
