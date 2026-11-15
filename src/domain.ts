import { z } from 'zod'

export const catalog = [
  ['bench-barbell', 'Press banca', 'press de banca|press banca barra|bench press|banco plano c barra'],
  ['bench-smith', 'Press banca Smith', 'press banca en smith|press pecho smith'],
  ['bench-dumbbell', 'Press banca mancuernas', 'press plano mancuernas'],
  ['incline-dumbbell', 'Press inclinado mancuernas', 'press inclinado con mancuernas|press inclinado c manc'],
  ['fly', 'Aperturas', 'aperturas mancuernas'],
  ['dip', 'Fondos', 'fondos en paralelas'],
  ['pushdown', 'Tríceps polea', 'extension triceps|extension de triceps polea'],
  ['pull-up', 'Dominadas', 'dominada|pull up'],
  ['barbell-row', 'Remo barra', 'remo con barra'],
  ['pulldown', 'Jalón al pecho', 'jalon|lat pulldown'],
  ['curl', 'Curl bíceps', 'curl de biceps|curl bicep'],
  ['squat', 'Sentadilla libre', 'sentadilla|squat|sentadillas'],
  ['smith-squat', 'Sentadilla Smith', 'sentadilla en smith'],
  ['deadlift', 'Peso muerto', 'deadlift'],
  ['leg-press', 'Prensa', 'prensa piernas'],
  ['lateral-raise', 'Elevaciones laterales', 'vuelos laterales'],
  ['calf-raise', 'Gemelos', 'elevacion de talones'],
  ['hip-thrust', 'Hip thrust', 'empuje de cadera|hip trust'],
  ['leg-curl', 'Curl femoral', 'curl piernas'],
  ['plank', 'Plancha', 'plank'],
  ['wide-pulldown', 'Jalón al pecho abierto', 'jalon abierto'],
  ['close-pulldown', 'Jalón al pecho cerrado', 'jalon cerrado'],
  ['t-row', 'Remo T', 'remo en t'],
  ['pullover', 'Pullover', 'pull over'],
  ['rear-delt-machine', 'Posteriores en máquina', 'posteriores maquina'],
  ['incline-curl', 'Curl inclinado con mancuernas', 'curl biceps inclinado sentado c manc'],
  ['barbell-curl', 'Curl con barra', 'curl biceps c barra'],
  ['hammer-curl', 'Curl martillo', 'curl biceps martillo'],
  ['glute-press', 'Prensa de glúteos', 'prensa gluteos'],
  ['long-lunge', 'Estocadas largas', 'estocadas largas manc'],
  ['walking-lunge', 'Estocadas ida y vuelta', 'estocadas ida y vuelta c manc'],
  ['lying-curl', 'Camilla de isquios', 'camilla isquio'],
  ['pec-deck', 'Aperturas en máquina', 'aperturas pecho'],
  ['front-raise', 'Vuelos frontales con disco', 'elevacion frontal disco'],
  ['french-press', 'Tríceps francés con mancuerna', 'triceps frances c manc'],
  ['leg-extension', 'Sillón de cuádriceps', 'extension cuadriceps'],
  ['abductor', 'Abductores en máquina', 'abductores maquina'],
  ['low-row', 'Remo bajo', 'low row'],
  ['overhead-extension', 'Extensión de tríceps con mancuerna', 'extension de triceps c manc'],
  ['quad-press', 'Prensa de cuádriceps', 'prensa cuadriceps'],
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
  notes: z.string().optional(),
  inferredUnit: z.boolean().optional(),
  superset: z.object({ id: z.string(), name: z.string(), rounds: z.number().int().positive() }).optional(),
  warning: z.string().optional(),
})
export type Exercise = z.infer<typeof exerciseSchema>
export type Day = { id: string; title: string; exercises: Exercise[] }
export type RoutineVersion = { name: string; version: number; source: string; days: Day[] }
export type Routine = RoutineVersion & { archived?: boolean; cover?: number; photo?: string; history?: RoutineVersion[] }
export type Session = {
  title: string; exercises: Exercise[]; started: number; ended?: number;
  date: string; scheduleId?: string; cycleId?: string; dayId?: string; routineId?: string; routineVersion?: number; companion?: string; incomplete?: boolean; omitted?: string[]; restUntil?: number; pausedRest?: number;
}
export type PerformedSet = { sessionId: string; exerciseId: string; reps: number; kg: number | null; done: boolean; created: number; slot?: number; rpe?: number; rir?: number; notes?: string; type?: Exercise['type'] }
export type Profile = { name: string; unit: 'kg' | 'lb'; theme: 'dark' | 'light'; weekStart: number; weeklyGoal?: number; reminderTime?: string; loadIncrementKg?: number; timezone: string; companion: string; onboarded?: boolean; starter?: string; weightKg?: number; cycle?: { id: string; routineId: string; skipped: string[]; startedOn?: string; order?: string[] }; purchases?: string[]; equipped?: string; petGear?: Record<string, string | null> }
export type Schedule = { date: string; title: string; exercises: Exercise[]; routineId: string; version: number; skipped?: boolean }

export const uid = () => crypto.randomUUID()

const findExercise = (name: string) => catalog.find(([, label, aliases]) =>
  [normalize(label), ...aliases.split('|')].includes(normalize(name)))

export function parseRoutine(source: string, preferredUnit: 'kg' | 'lb' = 'kg'): Day[] {
  const days: Day[] = []
  let day: Day | undefined
  let group: Exercise['superset']
  let groupRemaining = 0
  const lines = source.split(/\r?\n/).flatMap(line => {
    const moves = line.replace(/\\+$/, '').split(/\s+\+\s+/)
    if (moves.length < 2 || !moves.every(move => /\d+\s*[x×]\s*\d+/i.test(move))) return [line]
    const rounds = moves.map(move => Number(move.match(/(\d+)\s*[x×]/i)?.[1]))
    return rounds.every(count => count === rounds[0]) && moves.length === 2
      ? ['Superserie (' + rounds[0] + 'x)', ...moves] : moves
  })
  for (const input of lines) {
    const original = input.trim()
    const row = original.replace(/\\+$/, '').trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
    if (!row) continue
    const plain = normalize(row)
    if (/^(?:(?:dia|entrenamiento)\s+[\da-z]+(?:\s*[:—–-].*)?|(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|push|pull|legs|piernas|torso)(?:\s+[ab])?(?:\s*[:—–-].*)?)[:\s]*$/.test(plain)) {
      day = { id: uid(), title: row.replace(/:$/, ''), exercises: [] }
      days.push(day)
      groupRemaining = 0
      continue
    }
    if (day && /^dia\s+\d+$/.test(normalize(day.title)) &&
        !day.exercises.length && /^(espalda|cara posterior|pecho|cuadriceps|full tren superior)\b/.test(plain) &&
        !/\d|series|superserie/.test(plain) && !findExercise(row)) {
      day.title += ' — ' + row
      continue
    }
    if (!day) {
      day = { id: uid(), title: 'Día 1', exercises: [] }
      days.push(day)
    }
    const heading = row.match(/^superserie(?:\s+(.+?))?\s*\((\d+)\s*x\)$/i)
    if (heading && Number(heading[2]) > 0) {
      group = { id: uid(), name: heading[1] ?? 'Combinada', rounds: Number(heading[2]) }
      groupRemaining = 2
      continue
    }
    const notesMatch = row.match(/\s+(?:\(([^)]+)\)|(intento\b.*|incompleto\b.*|dif[ií]cil\b.*))$/i)
    const movement = notesMatch ? row.slice(0, notesMatch.index).trim() : row
    const clean = normalize(movement)
    const prescription = clean.match(/\b(\d+)\s*(?:[x×]\s*(?=\d|amrap|al\s+fallo)|series?\b\s*(?:de\s+)?)(?:(\d+)(?:\s*[-–]\s*(\d+))?|al\s+fallo|amrap)?|\b(\d+)\s+(?:al\s+fallo|amrap)/)
    const explicit = clean.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|lbs?)\b/)
    const trailingLoad = clean.match(/\s(\d+(?:[.,]\d+)?)$/)
    const bare = trailingLoad && (!prescription || trailingLoad.index! >= prescription.index! + prescription[0].length) ? trailingLoad : null
    const start = Math.min(prescription?.index ?? clean.length, explicit?.index ?? clean.length, bare?.index ?? clean.length)
    let name = movement.slice(0, start).replace(/\s+sin peso$/i, '').trim().replace(/[:—–-]+$/, '').trim() || movement
    if (prescription && explicit && prescription.index! < explicit.index!) {
      const equipment = clean.slice(prescription.index! + prescription[0].length, explicit.index).trim()
      if (/^(?:c\s+)?manc$/.test(equipment)) name += ' ' + equipment
    }
    const match = findExercise(name)
    const load = explicit ?? bare
    const rest = clean.match(/descanso\s*:?\s*(\d+)\s*(min|m\b|s\b)?/)
    const min = prescription?.[2] ? Number(prescription[2]) : null
    const max = prescription?.[3] ? Number(prescription[3]) : min
    const sets = prescription ? Number(prescription[1] ?? prescription[4]) : null
    const type = /calentamiento/.test(clean) ? 'warmup'
      : /descendente|drop\s*set/.test(clean) ? 'drop'
      : /amrap/.test(clean) ? 'amrap' : /al fallo/.test(clean) ? 'failure' : 'work'
    const bodyweight = /sin peso/.test(clean)
    day.exercises.push({
      id: uid(), name: match?.[1] ?? name, original, catalogId: match?.[0] ?? null,
      sets: sets && sets <= 100 ? sets : null, min: min || null,
      max: min && max && max >= min ? max : min || null,
      load: load && !bodyweight ? Number(load[1].replace(',', '.')) : null,
      unit: bodyweight ? null : explicit ? explicit[2] === 'kg' ? 'kg' : 'lb' : bare ? preferredUnit : null,
      inferredUnit: !!bare && !bodyweight,
      mode: bodyweight ? 'bodyweight' : /asistid/.test(clean) ? 'assisted'
        : /c\/u|cada (lado|mano)/.test(clean) ? 'per-side'
        : match && ['pull-up', 'dip', 'plank'].includes(match[0]) && !load ? 'bodyweight' : load || (match && match[0] !== 'walk') ? 'external' : 'unknown',
      rest: rest ? Number(rest[1]) * (rest[2]?.startsWith('m') ? 60 : 1) : null,
      notes: notesMatch?.[1] ?? notesMatch?.[2],
      superset: groupRemaining > 0 ? group : undefined,
      type, warning: !match || !sets || sets > 100 || (min !== null && max !== null && max < min) || /superserie|@rpe/.test(clean)
        ? 'Revisá esta línea' : undefined,
    })
    groupRemaining = Math.max(0, groupRemaining - 1)
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
    peak: compatible ? Math.max(0, ...work.filter(set => set.type !== 'warmup').map(set => set.kg!)) : 0,
    estimated: exercise.mode === 'external' ? Math.max(0, ...work.filter(set => set.type !== 'warmup' && set.reps <= 10)
      .map(set => set.kg! * (set.reps === 1 ? 1 : 1 + set.reps / 30))) : 0,
  }
}

export function reviseRoutine(current: Routine, proposed: Routine): Routine {
  const { name, version, source, days } = current
  const history = [{ name, version, source, days }, ...(current.history ?? [])].slice(0, 3)
  const next = { ...proposed, version: version + 1, history }
  while (history.length > 1 && new Blob([JSON.stringify(next)]).size > 180000) history.pop()
  if (new Blob([JSON.stringify(next)]).size > 180000) throw new Error('La rutina y su versión anterior son demasiado grandes.')
  return next
}

export function routineShareText(routine: Routine) {
  return routine.days.map((day, index) => {
    const title = day.title.replace(/^d[ií]a\s+\d+\s*(?:[-—–:]\s*)?/i, '').trim()
    const moves = day.exercises.map(exercise => {
      const reps = exercise.min ? exercise.min + (exercise.max && exercise.max !== exercise.min ? '-' + exercise.max : '') : ''
      return exercise.name + (exercise.sets ? ' ' + exercise.sets + (reps ? 'x' + reps : ' series') : '')
        + (exercise.rest ? ' descanso ' + exercise.rest + 's' : '')
    })
    return ['Día ' + (index + 1) + (title ? ' — ' + title : ''), ...moves].join('\n')
  }).join('\n\n')
}
export function suggestedLoad(exercise: Exercise, sets: PerformedSet[], incrementKg: number) {
  if (!exercise.sets || !exercise.max || incrementKg <= 0 ||
      (exercise.mode !== 'external' && exercise.mode !== 'per-side')) return null
  const work = sets.filter(set => set.done && (set.type ?? 'work') === 'work' && set.kg !== null)
  if (work.length < exercise.sets) return null
  const recent = work.slice(0, exercise.sets)
  const kg = recent[0].kg!
  if (kg <= 0 || !recent.every(set => set.kg === kg && set.reps >= exercise.max! && (set.rpe ?? 0) < 9)) return null
  return kg + incrementKg
}

export function companionHealth(missedSessions: number, completedThisWeek: number) {
  return Math.min(100, Math.max(25, 100 - 15 * missedSessions + 10 * completedThisWeek))
}