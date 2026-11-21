import type { PetPlan } from './pet-progress'
import { z } from 'zod'
import { muscleGroups, equipmentKinds } from './exercise-meta'
import {programExercises} from './program-exercises'
import {gymExercises,gymExercise} from './gym-exercises'

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
  ['standing-single-leg-curl', 'Curl femoral unilateral de pie', 'curl femoral unilateral|curl de isquios unilateral de pie'],
  ['leg-curl', 'Curl femoral sentado', 'curl femoral|curl piernas|curl femoral sentado en máquina'],
  ['plank', 'Plancha', 'plank'],
  ['wide-pulldown', 'Jalón al pecho abierto', 'jalon abierto'],
  ['close-pulldown', 'Jalón al pecho cerrado', 'jalon cerrado'],
  ['supported-t-row', 'Remo T en máquina con pecho apoyado', 'remo t en maquina|remo t con apoyo de pecho|chest supported t bar row'],
  ['t-row', 'Remo T', 'remo en t'],
  ['pullover', 'Pullover con mancuerna', 'pull over|pullover'],
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
  ['seated-triceps-extension', 'Extensión de tríceps sentado a dos manos', 'extension de triceps sentado con mancuerna|extension de triceps sentado a dos manos'],
  ['overhead-extension', 'Extensión de tríceps de pie a un brazo', 'extension de triceps c manc|extension de triceps con mancuerna'],
  ['quad-press', 'Prensa de cuádriceps', 'prensa cuadriceps'],
  ['walk', 'Caminata', 'caminar|cinta'],
  ['overhead-press', 'Press militar con barra', 'press militar|overhead press|ohp'],
  ['romanian-deadlift', 'Peso muerto rumano', 'romanian deadlift|rdl'],
  ['inverted-row', 'Remo invertido', 'remo australiano|inverted row'],
  ['push-up', 'Flexiones', 'flexiones de brazos|push up|push ups|pushup'],
  ['bodyweight-squat', 'Sentadilla sin peso', 'sentadilla corporal|bodyweight squat'],
  ...gymExercises.map(exercise=>[exercise.id,exercise.name,exercise.aliases] as const),
  ...programExercises.map(exercise=>[exercise.id,exercise.name,exercise.aliases] as const),
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
  reviewReason: z.enum(['missing', 'unrecognized', 'invalid', 'unsupported', 'fragment']).optional(),
  reviewAccepted: z.boolean().optional(),
  measure: z.enum(['reps', 'seconds']).optional(),
  guidance: z.string().max(300).optional(),
  custom: z.object({ id: z.uuid(), primary: z.enum(muscleGroups), secondary: z.array(z.enum(muscleGroups)).max(12), equipment: z.enum(equipmentKinds) })
    .refine(value => !value.secondary.includes(value.primary) && new Set(value.secondary).size === value.secondary.length, 'Revisá los músculos secundarios').optional(),
})
export type Exercise = z.infer<typeof exerciseSchema>
export type Day = { id: string; title: string; exercises: Exercise[] }
export type RoutineVersion = { name: string; version: number; source: string; days: Day[] }
export type Routine = RoutineVersion & { archived?: boolean; cover?: number; photo?: string; history?: RoutineVersion[]; rotateAB?: boolean }
export type Session = {
  title: string; exercises: Exercise[]; started: number; ended?: number;
  date: string; scheduleId?: string; cycleId?: string; dayId?: string; routineId?: string; routineVersion?: number; weeklyTarget?: number; deload?: boolean; companion?: string; companionXpAtStart?: number; incomplete?: boolean; omitted?: string[]; restUntil?: number; pausedRest?: number;
}
export type PerformedSet = { sessionId: string; exerciseId: string; reps: number; kg: number | null; done: boolean; created: number; slot?: number; rpe?: number; rir?: number; notes?: string; type?: Exercise['type'] }
export type Profile = { petNames?: Record<string, string>; sharedRoutineIds?: string[]; name: string; unit: 'kg' | 'lb'; theme: 'dark' | 'light'; weekStart: number; weeklyGoal?: number; reminderTime?: string; loadIncrementKg?: number; timezone: string; companion: string; onboarded?: boolean; starter?: string; weightKg?: number; cycle?: { id: string; routineId: string; skipped: string[]; startedOn?: string; order?: string[] }; purchases?: string[]; equipped?: string; petGear?: Record<string, string | null>; petPlans?: PetPlan[]; petOutfits?: Record<string, Record<string, string | null>> }
export type Schedule = { date: string; title: string; exercises: Exercise[]; routineId: string; version: number; skipped?: boolean }

export const uid = () => crypto.randomUUID()

const exerciseName = (name: string) => normalize(name).replace(/\bc[/.]?\s*(?=manc)/g, 'con ')
  .replace(/\bmanc\b/g, 'mancuernas').replace(/\s+/g, ' ')
export const findExercise = (name: string) => catalog.find(([, label, aliases]) =>
  [label, ...aliases.split('|')].some(value => exerciseName(value) === exerciseName(name)))

export function parseRoutine(source: string, preferredUnit: 'kg' | 'lb' = 'kg'): Day[] {
  const days: Day[] = []
  let day: Day | undefined
  let group: Exercise['superset']
  let groupRemaining = 0
  const lines = source.replace(/\\n/g, '\n').split(/\r?\n/).flatMap(line => {
    const moves = line.trimEnd().replace(/\\+$/, '').trimEnd().split(/\s+\+\s+/)
    if (moves.length < 2 || !moves.every(move => /\d+\s*[x×]\s*\d+/i.test(move))) return [line]
    const rounds = moves.map(move => Number(move.match(/(\d+)\s*[x×]/i)?.[1]))
    return rounds.every(count => count === rounds[0]) && moves.length === 2
      ? ['Superserie (' + rounds[0] + 'x)', ...moves] : moves
  })
  for (const input of lines) {
    const original = input.trim()
    const row = original.replace(/\\+$/, '').trim().replace(/[\t ]+/g, ' ').replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
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
    // Explicit durations are parsed before weights: “Bicicleta 20 min” is never 20 kg.
    const activityText=movement.replace(/^calentamiento\s*[:—-]?\s*/i,'').replace(/^(?:finalizaci[oó]n|vuelta a la calma)\s*[:—-]?\s*/i,'')
    const timed=activityText.match(/^(.*?)\s+(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(min(?:utos?)?|m|seg(?:undos?)?|s)\s*$/i)
    const timedMatch=timed ? findExercise(timed[1]) : undefined
    const activity=timedMatch ? gymExercise(timedMatch[0]) : undefined
    if(timed && timedMatch && (activity?.measure==='seconds'||['walk','plank'].includes(timedMatch[0]))) {
      const factor=/^m/i.test(timed[5])?60:1
      const duration=Number(timed[3].replace(',','.'))*factor
      const upper=Number((timed[4]??timed[3]).replace(',','.'))*factor
      const count=Number(timed[2]??1)
      const valid=Number.isInteger(duration)&&Number.isInteger(upper)&&duration>0&&upper>=duration&&upper<=86400&&count>0&&count<=100
      day.exercises.push({id:uid(),name:timedMatch[1],original,catalogId:timedMatch[0],sets:count,
        min:valid?duration:null,max:valid?upper:null,load:null,unit:null,mode:'bodyweight',measure:'seconds',rest:null,
        type:/^calentamiento/i.test(movement)?'warmup':'work',notes:notesMatch?.[1]??notesMatch?.[2],
        warning:valid?undefined:'Revisá la duración (entre 1 segundo y 24 horas)',reviewReason:valid?undefined:'invalid'})
      continue
    }
    const rest = clean.match(/descanso\s*:?\s*(\d+)\s*(min|m\b|s\b)?/)
    const prescription = clean.match(/\b(\d+)\s*(?:[x×]\s*(?=\d|amrap|al\s+fallo)|series?\b\s*(?:de\s+)?)(?:(\d+)(?:\s*[-–]\s*(\d+))?|al\s+fallo|amrap)?|\b(\d+)\s+(?:al\s+fallo|amrap)/)
    if (prescription?.[2] && /series?\b/.test(prescription[0]) && /^\s*(?:kg|lbs?)\b/.test(clean.slice(prescription.index! + prescription[0].length))) {
      prescription[0] = prescription[0].replace(/\s*\d+(?:\s*[-–]\s*\d+)?$/, '').trimEnd()
      prescription[2] = prescription[3] = ''
    }
    const explicit = clean.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|lbs?)\b/)
    const trailingLoad = clean.match(/\s(\d+(?:[.,]\d+)?)$/)
    const bare = trailingLoad && (!prescription || trailingLoad.index! >= prescription.index! + prescription[0].length)
      && !(rest && trailingLoad.index! >= rest.index!) && !/tempo\s+\d+$/.test(clean) ? trailingLoad : null
    const start = Math.min(prescription?.index ?? clean.length, explicit?.index ?? clean.length, bare?.index ?? clean.length)
    let name = movement.slice(0, start).trim().replace(/\s+sin peso$/i, '').trim().replace(/[:—–-]+$/, '').trim() || movement
    if (prescription && explicit && prescription.index! < explicit.index!) {
      const equipment = clean.slice(prescription.index! + prescription[0].length, explicit.index).trim()
      if (/^(?:c\s+)?manc$/.test(equipment)) name += ' ' + equipment
    }
    const match = findExercise(normalize(name) === "curl unilateral" && /cara posterior pierna/.test(normalize(day.title))
      ? "Curl femoral unilateral de pie" : normalize(name) === "sentadillas" && /cuadriceps.*abductores/.test(normalize(day.title))
        ? "Sentadilla hack en máquina" : normalize(name) === "low row" && /full tren superior/.test(normalize(day.title))
          ? "Remo en máquina con pecho apoyado" : normalize(name) === "extension de triceps c manc" && /full tren superior/.test(normalize(day.title))
            ? "Extensión de tríceps sentado a dos manos" : normalize(name) === "remo t" && /espalda.*biceps/.test(normalize(day.title))
              ? "Remo T en máquina con pecho apoyado" : /^(pull over|pullover)$/.test(normalize(name)) && /espalda.*biceps/.test(normalize(day.title))
                ? "Pullover en polea" : name)
    const load = explicit ?? bare
    const min = prescription?.[2] ? Number(prescription[2]) : null
    const max = prescription?.[3] ? Number(prescription[3]) : min
    const sets = prescription ? Number(prescription[1] ?? prescription[4]) : null
    const type = /calentamiento/.test(clean) ? 'warmup'
      : /descendente|drop\s*set/.test(clean) ? 'drop'
      : /amrap/.test(clean) ? 'amrap' : /al fallo/.test(clean) ? 'failure' : 'work'
    const bodyweight = /sin peso/.test(clean)
    let remainder = clean.slice(start)
    for (const token of [prescription?.[0], explicit?.[0], bare?.[0], rest?.[0]]) if (token) remainder = remainder.replace(token, '')
    remainder = remainder.replace(/\b(?:reps?|repeticiones|con|c|manc|mancuernas|sin peso|calentamiento|descendente|drop set|amrap|al fallo|asistido|cada mano|cada lado|c\/u)\b/g, '')
      .replace(/^[s]\b|\bseg(?:undos)?\b/g, '').replace(/[\s,:—–-]/g, '')
    const unresolved = remainder && !/superserie|@rpe/.test(clean) ? 'Sin interpretar: ' + remainder : undefined
    day.exercises.push({
      id: uid(), name: match?.[1] ?? name, original, catalogId: match?.[0] ?? null,
      sets: sets && sets <= 100 ? sets : null, min: min || null,
      max: min && max && max >= min ? max : min || null,
      load: load && !bodyweight ? Number(load[1].replace(',', '.')) : null,
      unit: bodyweight ? null : explicit ? explicit[2] === 'kg' ? 'kg' : 'lb' : bare ? preferredUnit : null,
      inferredUnit: !!bare && !bodyweight,
      measure: gymExercise(match?.[0]??null)?.measure === 'seconds' || match?.[0] === 'walk' || match?.[0] === 'plank' || /\d\s*(?:s\b|seg)/.test(clean.replace(rest?.[0] ?? '\u0000', '')) ? 'seconds' : undefined,
      mode: gymExercise(match?.[0]??null)?.mode ?? (bodyweight || (match && ['inverted-row', 'push-up', 'bodyweight-squat','weighted-pull-up','weighted-dip'].includes(match[0])) ? 'bodyweight' : /asistid/.test(clean) ? 'assisted'
        : /c\/u|cada (lado|mano)/.test(clean) ? 'per-side'
        : match && ['pull-up', 'dip', 'plank'].includes(match[0]) && !load ? 'bodyweight' : match && match[0] !== 'walk' ? 'external' : 'unknown'),
      rest: rest ? Number(rest[1]) * (rest[2]?.startsWith('m') ? 60 : 1) : null,
      notes: notesMatch?.[1] ?? notesMatch?.[2],
      superset: groupRemaining > 0 ? group : undefined,
      type, warning: !match || !sets || sets > 100 || (min !== null && max !== null && max < min) || /superserie|@rpe/.test(clean)
        ? 'Revisá esta línea' : unresolved,
      reviewReason: !match ? 'unrecognized' : (prescription && (!sets || sets > 100 || (min !== null && max !== null && max < min))) ? 'invalid'
        : /superserie|@rpe/.test(clean) ? 'unsupported' : unresolved ? 'fragment' : !sets ? 'missing' : undefined,
    })
    if(match && (gymExercise(match[0])?.measure==='seconds'||match[0]==='walk') && load){
      const last=day.exercises[day.exercises.length-1]
      last.load=null;last.unit=null;last.inferredUnit=false
      last.warning='Indicá la duración con min o s, en lugar de un peso.';last.reviewReason='fragment'
    }
    groupRemaining = Math.max(0, groupRemaining - 1)
  }
  for (const day of days) for (const exercise of day.exercises) {
    if (exercise.superset && day.exercises.filter(other => other.superset?.id === exercise.superset?.id).length !== 2) {
      exercise.warning = 'Superserie incompleta: revisá la agrupación'; exercise.reviewReason = 'unsupported'
    }
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
  const compatible = exercise.measure !== 'seconds' && (exercise.mode === 'external' || exercise.mode === 'per-side')
  const work = series.filter(set => set.done && set.kg !== null && set.reps > 0)
  return {
    volume: compatible ? work.reduce((sum, set) => sum + set.kg! * set.reps * (exercise.mode === 'per-side' ? 2 : 1), 0) : 0,
    peak: compatible ? Math.max(0, ...work.filter(set => set.type !== 'warmup').map(set => set.kg!)) : 0,
    estimated: compatible && exercise.mode === 'external' ? Math.max(0, ...work.filter(set => set.type !== 'warmup' && set.reps <= 10)
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
  if (exercise.measure === 'seconds' || !exercise.sets || !exercise.max || incrementKg <= 0 ||
      (exercise.mode !== 'external' && exercise.mode !== 'per-side')) return null
  const work = sets.filter(set => set.done && (set.type ?? 'work') === 'work' && set.kg !== null)
  if (work.length < exercise.sets) return null
  const recent = work.slice(0, exercise.sets)
  const kg = recent[0].kg!
  if (kg <= 0 || !recent.every(set => set.kg === kg && set.reps >= exercise.max! && (set.rpe ?? 0) < 9)) return null
  return kg + incrementKg
}

export function weeklyStreaks(fulfilled: Iterable<string>, current: string) {
  const prior = (value: string) => new Date(Date.parse(value + 'T00:00:00Z') - 604800000).toISOString().slice(0, 10)
  const weeks = [...new Set(fulfilled)].filter(week => week <= current).sort()
  let previous = ''
  let best = 0
  let ongoing = 0
  for (const week of weeks) {
    ongoing = previous === prior(week) ? ongoing + 1 : 1
    previous = week
    best = Math.max(best, ongoing)
  }
  return { best, current: previous === current || previous === prior(current) ? ongoing : 0 }
}
