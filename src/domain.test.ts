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

it('importa la rutina de cinco días con cargas, notas y superserie', () => {
  const source = [
    'Día 1', 'Espalda - biceps ', 'Jalón al pecho abierto 50 incompleto', 'Remo T', 'Pull over',
    'Posteriores en máquina ', 'Curl biceps inclinado sentado c manc 7.5', 'Curl biceps c barra 20',
    'Curl biceps martillo 7.5', '', 'Día 2', 'Cara posterior pierna', 'Hip trust 2 series de 15 Sin peso',
    'Prensa gluteos 180', 'Estocadas largas 4 series manc 10kg', 'Camilla isquio 50',
    'Curl unilateral 10', 'Gemelos ', '', 'Día 3', 'Pecho hombro tríceps', 'Banco plano c barra 55 intento 60 ',
    'Aperturas pecho 50', 'Superserie vuelos (2x)', 'Vuelos laterales 10', 'Vuelos frontales con disco',
    'Tríceps francés c manc 15', 'Extensión de tríceps polea 35', '', 'Día 4', 'Cuadriceps- abductores',
    'Estocadas ida y vuelta c manc 3 series 10kg', 'Prensa cuadriceps 200', 'Sentadillas 80 (difícil)',
    'Sillón de cuádriceps 65', 'Abductores en máquina 35', '', 'Día 5', 'Full tren superior',
    'Jalón al pecho cerrado 55 (incompleto)', 'Low row  80 (incompleto)', 'Press pecho Smith 50 (incompleto)',
    'Press inclinado c manc 17.5', 'Curl biceps inclinado sentado c manc 10 (incompleto)',
    'Curl biceps martillo 10', 'Extensión de tríceps c manc 17.5',
  ].join('\\\n')
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
    expect(days[1].exercises[4]).toMatchObject({ catalogId: null, load: 10, warning: 'Revisá esta línea' })
    expect(days[2].exercises[0]).toMatchObject({ catalogId: 'bench-barbell', load: 55, notes: 'intento 60' })
    expect(days[2].exercises[2].superset).toMatchObject({ name: 'vuelos', rounds: 2 })
    expect(days[2].exercises[3].superset).toEqual(days[2].exercises[2].superset)
    expect(days[2].exercises[4].superset).toBeUndefined()
    expect(days[3].exercises[0]).toMatchObject({ catalogId: 'walking-lunge', sets: 3, unit: 'kg', load: 10 })
    expect(days[3].exercises[2]).toMatchObject({ catalogId: 'squat', load: 80, notes: 'difícil' })
    expect(days[4].exercises[2]).toMatchObject({ catalogId: 'bench-smith', load: 50, notes: 'incompleto' })
  }
})
