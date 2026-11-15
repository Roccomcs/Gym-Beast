import { z } from 'zod'

export const catalog = [
  ['bench-barbell', 'Press banca', 'press de banca|press banca barra|bench press'],
  ['bench-smith', 'Press banca Smith', 'press banca en smith'],
  ['bench-dumbbell', 'Press banca mancuernas', 'press plano mancuernas'],
  ['incline-dumbbell', 'Press inclinado mancuernas', 'press inclinado con mancuernas'],
  ['fly', 'Aperturas', 'aperturas mancuernas'],
  ['dip', 'Fondos', 'fondos en paralelas'],
  ['pushdown', 'Tríceps polea', 'extension triceps'],
  ['pull-up', 'Dominadas', 'dominada|pull up'],
  ['barbell-row', 'Remo barra', 'remo con barra'],
  ['pulldown', 'Jalón al pecho', 'jalon|lat pulldown'],
  ['curl', 'Curl bíceps', 'curl de biceps|curl bicep'],
  ['squat', 'Sentadilla libre', 'sentadilla|squat'],
  ['smith-squat', 'Sentadilla Smith', 'sentadilla en smith'],
  ['deadlift', 'Peso muerto', 'deadlift'],
  ['leg-press', 'Prensa', 'prensa piernas'],
  ['lateral-raise', 'Elevaciones laterales', 'vuelos laterales'],
  ['calf-raise', 'Gemelos', 'elevacion de talones'],
  ['hip-thrust', 'Hip thrust', 'empuje de cadera'],
  ['leg-curl', 'Curl femoral', 'curl piernas'],
  ['plank', 'Plancha', 'plank'],
  ['walk', 'Caminata', 'caminar|cinta'],
] as const

const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  original: z.string(),
  catalogId: z.string().nullable(),
  sets: z.number().int().min(1).max(100).nullable(),
  min: z.number().int().positive().nullable(),
  max: z.number().int().positive().nullable(),
  load: z.number().nonnegative().nullable(),
  unit: z.enum(['kg', 'lb']).nullable(),
  mode: z.enum(['external', 'per-side', 'bodyweight', 'assisted', 'unknown']),
  rest: z.number().int().nonnegative().nullable(),
  type: z.enum(['work', 'warmup', 'drop', 'failure', 'amrap']),
  warning: z.string().optional(),
})
export type Exercise = z.infer<typeof exerciseSchema>
export type Day = { id: string; title: string; exercises: Exercise[] }
export type Routine = { name: string; version: number; source: string; days: Day[]; archived?: boolean }
export type Session = {
  title: string; exercises: Exercise[]; started: number; ended?: number;
  date: string; scheduleId?: string; restUntil?: number; pausedRest?: number;
}
export type PerformedSet = { sessionId: string; exerciseId: string; reps: number; kg: number | null; done: boolean; created: number }
export type Profile = { name: string; unit: 'kg' | 'lb'; theme: 'dark' | 'light'; weekStart: number; timezone: string; companion: string }
export type Schedule = { date: string; title: string; exercises: Exercise[]; routineId: string; version: number; skipped?: boolean }

export const uid = () => crypto.randomUUID()

export function parseRoutine(source: string): Day[] {
  const days: Day[] = []
  let day: Day | undefined
  for (const input of source.split(/\r?\n/)) {
    const original = input.trim()
    if (!original) continue
    const row = original.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
    const plain = normalize(row)
    if (/^(?:(?:dia|entrenamiento)\s+[\da-z]+(?:\s*[:—–-].*)?|(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|push|pull|legs|piernas|torso)(?:\s+[ab])?(?:\s*[:—–-].*)?)[:\s]*$/.test(plain)) {
      day = { id: uid(), title: row.replace(/:$/, ''), exercises: [] }
      days.push(day)
      continue
    }
    if (!day) {
      day = { id: uid(), title: 'Día 1', exercises: [] }
      days.push(day)
    }
    const prescription = plain.match(/(\d+)\s*(?:[x×]\s*|series?\s+(?:de\s+)?)(?:(\d+)(?:\s*[-–]\s*(\d+))?|(?:al\s+fallo|amrap))|(\d+)\s+(?:al\s+fallo|amrap)/)
    const name = (prescription ? row.slice(0, prescription.index) : row).trim().replace(/[:—–-]+$/, '').trim() || row
    const match = catalog.find(([, label, aliases]) =>
      [normalize(label), ...aliases.split('|')].includes(normalize(name)))
    const load = plain.match(/(\d+(?:[.,]\d+)?)\s*(kg|lbs?)\b/)
    const rest = plain.match(/descanso\s*:?\s*(\d+)\s*(min|m\b|s\b)?/)
    const min = prescription?.[2] ? Number(prescription[2]) : null
    const max = prescription?.[3] ? Number(prescription[3]) : min
    const sets = prescription ? Number(prescription[1] ?? prescription[4]) : null
    const type = /calentamiento/.test(plain) ? 'warmup'
      : /descendente|drop\s*set/.test(plain) ? 'drop'
      : /amrap/.test(plain) ? 'amrap' : /al fallo/.test(plain) ? 'failure' : 'work'
    day.exercises.push({
      id: uid(), name: match?.[1] ?? name, original, catalogId: match?.[0] ?? null,
      sets: sets && sets <= 100 ? sets : null, min: min || null,
      max: min && max && max >= min ? max : min || null,
      load: load ? Number(load[1].replace(',', '.')) : null,
      unit: load ? load[2] === 'kg' ? 'kg' : 'lb' : null,
      mode: /asistid/.test(plain) ? 'assisted' : /c\/u|cada (lado|mano)/.test(plain) ? 'per-side'
        : load ? 'external' : match && ['pull-up', 'dip', 'plank'].includes(match[0]) ? 'bodyweight' : 'unknown',
      rest: rest ? Number(rest[1]) * (rest[2]?.startsWith('m') ? 60 : 1) : null,
      type, warning: !match || !sets || sets > 100 || (min !== null && max !== null && max < min) || /superserie|@rpe/.test(plain)
        ? 'Revisá esta línea' : undefined,
    })
  }
  return days
}

export const pounds = 0.45359237
export const toKg = (value: number, unit: 'kg' | 'lb') => unit === 'lb' ? value * pounds : value
export const fromKg = (value: number, unit: 'kg' | 'lb') =>
  Number((unit === 'lb' ? value / pounds : value).toFixed(3))

export function dateKey(date = new Date(), timezone?: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)?.value).join('-')
}

export function weekDates(date: string, start: number) {
  const base = new Date(date + 'T00:00:00Z')
  base.setUTCDate(base.getUTCDate() - (base.getUTCDay() - start + 7) % 7)
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(base)
    current.setUTCDate(base.getUTCDate() + index)
    return current.toISOString().slice(0, 10)
  })
}

export function metrics(series: PerformedSet[], exercise: Exercise) {
  const compatible = exercise.mode === 'external' || exercise.mode === 'per-side'
  const work = series.filter(set => set.done && set.kg !== null && set.reps > 0)
  return {
    volume: compatible ? work.reduce((sum, set) => sum + set.kg! * set.reps * (exercise.mode === 'per-side' ? 2 : 1), 0) : 0,
    peak: compatible ? Math.max(0, ...work.map(set => set.kg!)) : 0,
    estimated: exercise.mode === 'external' ? Math.max(0, ...work.filter(set => set.reps <= 10)
      .map(set => set.kg! * (set.reps === 1 ? 1 : 1 + set.reps / 30))) : 0,
  }
}
