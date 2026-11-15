import { describe, expect, it } from 'vitest'
import { fromKg, metrics, parseRoutine, toKg, weekDates } from './domain'

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
