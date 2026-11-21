import { describe, expect, test } from 'vitest'
import { parseRoutine, exerciseSchema, uid, metrics } from '../src/domain'
import { programRoutine, programs, alternateRoutine } from '../src/programs'
import { anatomy } from '../src/library'
import { exercisePoses } from '../src/exercise-poses'
import { importPreview } from '../src/import-preview'
import { fiveDayRoutine } from '../src/rocco-routine'

describe('programas revisados', () => {
  test.each(programs.slice(0, 10))('$name tiene prescripción completa sin ejercicios desconocidos', program => {
    const routine = programRoutine(program)
    expect(program.source).toMatch(/^https:\/\//)
    expect(program.adaptation.length).toBeGreaterThan(40)
    for (const exercise of routine.days.flatMap(day => day.exercises)) {
      expect(exercise.catalogId, exercise.original).not.toBeNull()
      expect(exercise.warning, exercise.original).toBeUndefined()
      expect(exercise.sets).toBeGreaterThan(0)
      expect(exercise.min).toBeGreaterThan(0)
      expect(exercise.rest).toBeGreaterThan(0)
      expect(exerciseSchema.safeParse(exercise).success).toBe(true)
      expect(anatomy[exercise.catalogId! as keyof typeof anatomy]).toBeDefined()
      expect(exercisePoses(exercise.catalogId!, 1)).toBeDefined()
    }
  })
  test('alterna A/B/A y B/A/B al repetir, conservando el historial original', () => {
    const original = programRoutine(programs[0])
    const previous = structuredClone(original)
    const next = alternateRoutine(original)
    expect(original).toEqual(previous)
    expect(next.days.map(day => day.exercises[1].catalogId)).toEqual(['overhead-press', 'bench-barbell', 'overhead-press'])
    expect(new Set(next.days.map(day => day.id)).size).toBe(3)
    expect(alternateRoutine(next).days.map(day => day.exercises[1].catalogId)).toEqual(['bench-barbell', 'overhead-press', 'bench-barbell'])
  })
})

describe('importaciones difíciles', () => {
  test('la rutina exacta produce 31 ejercicios, dos vueltas y una sola ambigüedad real', () => {
    const days = importPreview(fiveDayRoutine, 'kg')
    const exercises = days.flatMap(day => day.exercises)
    expect(days).toHaveLength(5); expect(exercises).toHaveLength(31)
    expect(exercises.filter(exercise => exercise.warning).map(exercise => exercise.original.replace(/\\+$/, ''))).toEqual([])
    expect(exercises.filter(exercise => exercise.superset).map(exercise => exercise.sets)).toEqual([2,2])
    expect(exercises.find(exercise => exercise.catalogId === 'hip-thrust')).toMatchObject({ sets:2,min:15,load:null,mode:'bodyweight' })
  })
  test.each(['Press banca 3x8 descanso 90','Press banca 3x8 descanso 90s','Press banca 3x8 descanso 2 min'])('no convierte descanso en peso: %s', text => {
    expect(parseRoutine(text)[0].exercises[0].load).toBeNull()
  })
  test('conserva un fragmento sin interpretar y lo señala', () => {
    const exercise = parseRoutine('Press banca 3x8 50kg tempo 3010')[0].exercises[0]
    expect(exercise.load).toBe(50)
    expect(exercise.warning).toContain('3010')
    expect(exercise.original).toContain('tempo 3010')
  })
  test('las sugerencias de series no ocultan un fragmento desconocido', () => {
    const exercise=importPreview('Press banca 50kg tempo 3010','kg')[0].exercises[0]
    expect(exercise.warning).toBeTruthy()
    expect(exercise.reviewReason).toBe('fragment')
    expect(exercise.load).toBe(50)
  })
  test('reconoce abreviaturas con barra y decimal con coma', () => {
    expect(parseRoutine('Curl biceps inclinado sentado c/manc 7,5')[0].exercises[0]).toMatchObject({ catalogId: 'incline-curl', load: 7.5 })
  })
  test('no asigna carga ni músculo por adivinación a un ejercicio ambiguo', () => {
    expect(parseRoutine('Curl unilateral 10')[0].exercises[0]).toMatchObject({ catalogId: null, mode: 'unknown', load: 10, warning: 'Revisá esta línea' })
  })
  test('detecta una superserie con un solo ejercicio y conserva la línea', () => {
    expect(parseRoutine('Superserie vuelos (2x)\nVuelos laterales 10')[0].exercises[0].warning).toContain('incompleta')
  })
  test('representa las planchas en segundos sin convertirlos en peso', () => {
    expect(parseRoutine('Plancha 3x30s')[0].exercises[0]).toMatchObject({ measure:'seconds', sets:3, min:30, load:null, mode:'bodyweight' })
  })
  test('una serie medida en segundos no genera volumen ni e1RM de repeticiones', () => {
    const exercise = { ...parseRoutine('Press banca 3x30s')[0].exercises[0], measure:'seconds' as const }
    expect(metrics([{sessionId:'s',exerciseId:exercise.id,kg:20,reps:30,done:true,created:1}],exercise)).toEqual({volume:0,peak:0,estimated:0})
  })
  test('los ejercicios propios conservan identidad y músculos al validar una instantánea', () => {
    const exercise = { ...parseRoutine('Mi máquina')[0].exercises[0], custom:{ id:uid(), primary:'Espalda', secondary:['Bíceps'], equipment:'Máquina' } }
    expect(exerciseSchema.parse(exercise).custom).toEqual(exercise.custom)
    expect(exerciseSchema.safeParse({ ...exercise, custom:{...exercise.custom,primary:'No existe'} }).success).toBe(false)
  })
})
