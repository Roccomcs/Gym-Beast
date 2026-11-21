import {gymExerciseIds} from '../src/gym-exercises'
import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { catalog } from '../src/domain'
import { companions } from '../src/pet-species'
import { ownTrainingSource, petTrainingSource, selectPetTraining } from '../src/training-selection'
import {programExerciseIds} from '../src/program-exercises'
import {explorePrograms} from '../src/explore-programs'
import {programRoutine} from '../src/programs'

describe('cobertura de demostraciones', () => {
  test.each(companions)('%s tiene los cinco ejercicios principales', name => {
    for (const id of ['bench-barbell', 'pulldown', 'squat', 'curl', 'leg-press']) {
      const source = ownTrainingSource(name, id)
      expect(source, name + ': ' + id).toBeTruthy()
      expect(existsSync('public' + source)).toBe(true)
    }
  })
  test('el dragón conserva las demostraciones de los 46 ejercicios anteriores', () => {
    for (const [id] of catalog.filter(([id])=>!programExerciseIds.has(id)&&!gymExerciseIds.has(id)&&id!=='standing-single-leg-curl'&&id!=='seated-triceps-extension'&&id!=='supported-t-row')) {
      const source = ownTrainingSource('Dragón', id)
      expect(source, id).toBeTruthy()
      expect(existsSync('public' + source)).toBe(true)
    }
  })
  test('cada día nuevo tiene un ejercicio ilustrado por un compañero y no inventa variantes',()=>{
    for(const program of explorePrograms)for(const day of programRoutine(program).days)for(const name of companions){
      const ids=day.exercises.map(exercise=>exercise.catalogId),selected=selectPetTraining(name,ids)
      expect(selected.exercise,program.name+': '+day.title).toBeTruthy()
      expect(ids.includes(selected.exercise)||selected.exercise==='curl').toBe(true)
    }
    // Human demos exist for the new variants. A standalone variant without pet
    // art remains a preparation pose, instead of claiming a different lift.
    expect(selectPetTraining('Dragón',['goblet-squat']).exercise).toBeNull()
  })
  test('busca un principal propio dentro del día antes de mostrar al dragón', () => {
    expect(selectPetTraining('Lobo', ['deadlift', 'bench-barbell', 'curl']))
      .toEqual({ companion: 'Lobo', exercise: 'bench-barbell', fallback: false })
  })
  test('conserva una demostración secundaria propia disponible', () => {
    expect(selectPetTraining('Oso', ['walking-lunge'])).toEqual({ companion: 'Oso', exercise: 'walking-lunge', fallback: false })
  })
  test('una variante de bíceps puede usar la demostración principal propia sin cambiar la rutina', () => {
    const exercises = ['incline-curl', 'plank']
    expect(selectPetTraining('Lobo', exercises)).toEqual({ companion: 'Lobo', exercise: 'curl', fallback: false })
    expect(exercises).toEqual(['incline-curl', 'plank'])
    expect(selectPetTraining('Dragón', ['incline-curl']).exercise).toBe('incline-curl')
  })
  test('recurre al mismo ejercicio del dragón cuando falta una demostración propia', () => {
    expect(selectPetTraining('Lobo', ['plank'])).toEqual({ companion: 'Dragón', exercise: 'plank', fallback: true })
    expect(petTrainingSource('Lobo', 'plank')).toBe(ownTrainingSource('Dragón', 'plank'))
  })
  test('un ejercicio personalizado no se reemplaza por un movimiento ajeno', () => {
    expect(selectPetTraining('Lobo', [null, 'custom-123'])).toEqual({ companion: 'Lobo', exercise: null, fallback: false })
    expect(petTrainingSource('Lobo', null)).toBeUndefined()
  })
})
