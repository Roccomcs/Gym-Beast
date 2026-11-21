import {gymExercise} from './gym-exercises'
import { parseRoutine } from './domain'

export function importPreview(source: string, unit: 'kg' | 'lb') {
  return parseRoutine(source, unit).map(day => ({ ...day, exercises: day.exercises.map(exercise => ({ ...exercise,
    sets: exercise.sets ?? exercise.superset?.rounds ?? (exercise.measure==='seconds'?1:3),
    min: exercise.min ?? (exercise.measure === 'seconds' ? (gymExercise(exercise.catalogId)?.duration??30) : 10), max: exercise.max ?? exercise.min ?? (exercise.measure === 'seconds' ? (gymExercise(exercise.catalogId)?.duration??30) : 10),
    warning: exercise.reviewReason === 'missing' ? undefined : exercise.warning,
  })) }))
}
