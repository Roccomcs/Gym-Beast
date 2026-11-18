import { parseRoutine, type Profile, type Routine } from '../src/domain'
import type { Item } from '../src/store'
import { fiveDayRoutine } from '../src/rocco-routine'

export const pilotDate = '2026-11-18T15:00:00Z'
export const pilotFriends = [
  { id: '2c26454f-a45b-4a18-8bd1-580944496611', handle: 'gabi' },
  { id: 'ebdf948a-90af-426c-a531-264d1b276115', handle: 'leo' },
] as const

// Fixed identifiers and timestamps make screenshots and restored data reproducible.
export function pilotItems(): Item[] {
  const days = parseRoutine(fiveDayRoutine).map((day, index) => ({
    ...day, id: 'demo-day-' + index,
    exercises: day.exercises.map((exercise, position) => ({
      ...exercise, id: 'demo-exercise-' + index + '-' + position,
      sets: exercise.sets ?? 3, min: exercise.min ?? 10, max: exercise.max ?? 10,
      load: exercise.load ?? (exercise.mode === 'bodyweight' ? 0 : 20),
      unit: 'kg' as const,
      superset: exercise.superset ? { ...exercise.superset, id: 'demo-superset-' + index } : undefined,
    })),
  }))
  const routine: Routine = { name: 'Rutina Rocco · demostración', version: 1, source: fiveDayRoutine, days, cover: 10 }
  const profile: Profile = {
    name: 'Rocco Demo', onboarded: true, unit: 'kg', theme: 'dark', weekStart: 1,
    timezone: 'America/Buenos_Aires', companion: 'Dragón', starter: 'Dragón',
    cycle: { id: 'demo-current-cycle', routineId: 'demo-rocco', skipped: [], startedOn: '2026-11-16' },
    petPlans: [{ from: '2026-10-12', target: 5, companion: 'Dragón' }],
    purchases: ['boca', 'gym-cap'], petOutfits: { Dragón: { top: 'boca', head: 'gym-cap' } },
  }
  const items: Item[] = [
    { owner: 'local', kind: 'profile', id: 'self', version: 1, data: profile },
    { owner: 'local', kind: 'routine', id: 'demo-rocco', version: 1, data: routine },
  ]
  for (let index = 0; index < 25; index++) {
    const week = Math.floor(index / 5)
    const dayIndex = index % 5
    const started = Date.UTC(2026, 9, 12 + week * 7 + dayIndex, 15)
    const day = days[dayIndex]
    const sessionId = 'demo-session-' + index
    items.push({ owner: 'local', kind: 'session', id: sessionId, version: 1, data: {
      title: day.title, date: new Date(started).toISOString().slice(0, 10),
      started, ended: started + 3600000, companion: 'Dragón', exercises: day.exercises,
      routineId: 'demo-rocco', routineVersion: 1, cycleId: 'demo-cycle-' + week,
      dayId: day.id, weeklyTarget: 5,
    } })
    for (const exercise of day.exercises) {
      for (let slot = 0; slot < exercise.sets; slot++) {
        items.push({ owner: 'local', kind: 'set', id: sessionId + '-' + exercise.id + '-' + slot, version: 1, data: {
          sessionId, exerciseId: exercise.id, reps: exercise.min, kg: exercise.load + week * 2.5,
          done: true, created: started + slot * 120000, slot, type: 'work',
        } })
      }
    }
  }
  return items
}
