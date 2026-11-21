import { fiveDayRoutine } from '../tests/five-day-routine'
import { describe, expect, it } from 'vitest'
import { catalog, weeklyStreaks, suggestedLoad, fromKg, metrics, parseRoutine, toKg, weekDates } from './domain'
import { exercisePoses } from './exercise-poses'

it('asigna dos posiciones ilustradas a todo el catálogo', () => {
  for (const [id] of catalog) {
    const start = exercisePoses(id, 0)
    const end = exercisePoses(id, 1)
    expect(start, id).toBeDefined()
    expect(end, id).toMatchObject({ image: start!.image, x: start!.x + 1, y: start!.y })
  }
})

describe('importar rutinas', () => {
  it.each(['x', ' x ', '×', ' × '].flatMap(separator =>
    [1, 2, 3, 4, 5].flatMap(sets => ['8', '8-12'].map(reps => [sets, separator, reps] as const))
  ))('interpreta %s%s%s', (sets, separator, reps) => {
    const exercise = parseRoutine('Press banca ' + sets + separator + reps)[0].exercises[0]
    expect(exercise).toMatchObject({ sets, min: 8, max: reps === '8' ? 8 : 12, catalogId: 'bench-barbell' })
  })
  it.each([
    ['4 series de 8 reps con 70kg', { sets: 4, min: 8, load: 70, unit: 'kg' }],
    ['3 al fallo', { sets: 3, min: null, type: 'failure' }],
    ['3xAMRAP', { sets: 3, min: null, type: 'amrap' }],
    ['3x12 20kg c/u', { mode: 'per-side', load: 20 }],
    ['3x10 22,5 kg', { load: 22.5 }],
    ['3x10 45 lbs', { load: 45, unit: 'lb' }],
    ['3x10 descanso 90s', { rest: 90 }],
    ['3x10 descanso 2 min', { rest: 120 }],
    ['3x10 calentamiento', { type: 'warmup' }],
    ['3x10 drop set', { type: 'drop' }],
    ['3x10 asistido', { mode: 'assisted' }],
    ['3x10 @RPE8', { warning: 'Revisá esta línea' }],
    ['3x10 superserie', { warning: 'Revisá esta línea' }],
    ['0x10', { sets: null, warning: 'Revisá esta línea' }],
    ['101x10', { sets: null, warning: 'Revisá esta línea' }],
    ['4x12-8', { min: 12, max: 12, warning: 'Revisá esta línea' }],
    ['', { sets: null, min: null, load: null }],
  ] as const)('interpreta %s', (text, expected) => {
    expect(parseRoutine('Press banca ' + text)[0].exercises[0]).toMatchObject(expected)
  })
  it('conserva líneas desconocidas', () => {
    expect(parseRoutine('Movimiento raro')[0].exercises[0]).toMatchObject({ original: 'Movimiento raro', warning: 'Revisá esta línea' })
  })
  it('reconoce días y sinónimos', () => {
    const days = parseRoutine('DÍA 1 — TORSO\n- Press de banca 3x8\nTorso A\n1. Remo con barra 4x8')
    expect(days.map(day => day.exercises[0].catalogId)).toEqual(['bench-barbell', 'barbell-row'])
  })
  it('conserva duplicados en texto largo', () => {
    expect(parseRoutine(Array.from({ length: 200 }, () => 'Dominadas 4x6-10').join('\n'))[0].exercises).toHaveLength(200)
  })
})
it('convierte pesos sin perder la unidad original de visualización', () => {
  expect(fromKg(toKg(72.5, 'lb'), 'lb')).toBe(72.5)
})
it('calcula métricas de carga y excluye la asistencia', () => {
  const exercise = parseRoutine('Press banca 4x8 70kg')[0].exercises[0]
  const set = { sessionId: 's', exerciseId: exercise.id, kg: 70, reps: 8, created: 0, done: true }
  expect(metrics([set], exercise).volume).toBe(560)
  expect(metrics([set], exercise).estimated).toBeCloseTo(88.6667)
  expect(metrics([set], { ...exercise, mode: 'assisted' }).estimated).toBe(0)
})
it('respeta el inicio de semana', () => {
  expect(weekDates('2026-11-14', 1)[0]).toBe('2026-11-09')
  expect(weekDates('2026-11-14', 0)[0]).toBe('2026-11-08')
})

it('importa la rutina de cinco días con cargas, notas y superserie', () => {
  const source = fiveDayRoutine
  for (const text of [source, source.replaceAll('\\', '')]) {
    const days = parseRoutine(text, 'lb')
    expect(days.map(day => day.title)).toEqual([
      'Día 1 — Espalda - biceps', 'Día 2 — Cara posterior pierna', 'Día 3 — Pecho hombro tríceps',
      'Día 4 — Cuadriceps- abductores', 'Día 5 — Full tren superior',
    ])
    expect(days.map(day => day.exercises.length)).toEqual([7, 6, 6, 5, 7])
    expect(days[0].exercises[0]).toMatchObject({
      catalogId: 'wide-pulldown', load: 50, notes: 'incompleto', unit: 'lb', inferredUnit: true,
    })
    expect(days[0].exercises[4]).toMatchObject({ catalogId: 'incline-curl', load: 7.5 })
    expect(days[1].exercises[0]).toMatchObject({ catalogId: 'hip-thrust', sets: 2, min: 15, load: null, mode: 'bodyweight' })
    expect(days[1].exercises[2]).toMatchObject({ catalogId: 'long-lunge', sets: 4, min: null, load: 10, unit: 'kg' })
    expect(days[1].exercises[4]).toMatchObject({ catalogId: 'standing-single-leg-curl', load: 10 })
    expect(days[2].exercises[0]).toMatchObject({ catalogId: 'bench-barbell', load: 55, notes: 'intento 60' })
    expect(days[2].exercises[2].superset).toMatchObject({ name: 'vuelos', rounds: 2 })
    expect(days[2].exercises[3].superset).toEqual(days[2].exercises[2].superset)
    expect(days[2].exercises[4].superset).toBeUndefined()
    expect(days[3].exercises[0]).toMatchObject({ catalogId: 'walking-lunge', sets: 3, unit: 'kg', load: 10 })
    expect(days[3].exercises[2]).toMatchObject({ catalogId: 'hack-squat', load: 80, notes: 'difícil' })
    expect(days[4].exercises[2]).toMatchObject({ catalogId: 'bench-smith', load: 50, notes: 'incompleto' })
  }
})

it('retiene carga implícita, reconoce peso corporal y separa superseries en línea', () => {
  const days = parseRoutine('Press banca 4x8 70\nHip thrust sin peso\nRemo barra 3x8 + Press banca 3x8')
  const [bench, hip, row, press] = days[0].exercises
  expect(bench).toMatchObject({ load: 70, inferredUnit: true, min: 8 })
  expect(hip).toMatchObject({ catalogId: 'hip-thrust', mode: 'bodyweight', load: null })
  expect(row.superset?.rounds).toBe(3)
  expect(press.superset?.id).toBe(row.superset?.id)
})

it('excluye calentamiento de récords y e1RM', () => {
  const exercise = parseRoutine('Press banca 4x8 70kg')[0].exercises[0]
  const set = { sessionId: 's', exerciseId: exercise.id, kg: 70, reps: 8, created: 0, done: true, type: 'warmup' as const }
  expect(metrics([set], exercise)).toEqual({ volume: 560, peak: 0, estimated: 0 })
})

it('sugiere subir carga solo tras completar el rango de todas las series', () => {
  const exercise = parseRoutine('Press banca 2x8-10')[0].exercises[0]
  const set = { sessionId: 's', exerciseId: exercise.id, kg: 50, reps: 10, created: 0, done: true }
  expect(suggestedLoad(exercise, [set, set], 2.5)).toBe(52.5)
  expect(suggestedLoad(exercise, [set, { ...set, reps: 9 }], 2.5)).toBeNull()
  expect(suggestedLoad(exercise, [set, { ...set, rpe: 9 }], 2.5)).toBeNull()
  expect(suggestedLoad(exercise, [set, { ...set, type: 'warmup' }], 2.5)).toBeNull()
})

it('conserva la mejor racha y deja abierta la semana actual', () => {
  const weeks = ['2026-10-19', '2026-10-26', '2026-11-09', '2026-11-09']
  expect(weeklyStreaks(weeks, '2026-11-16')).toEqual({ current: 1, best: 2 })
  expect(weeklyStreaks(weeks, '2026-11-23')).toEqual({ current: 0, best: 2 })
})
