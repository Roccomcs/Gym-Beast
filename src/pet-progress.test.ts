import { expect, it } from 'vitest'
import { petProgress } from './pet-progress'
import type { Schedule, Session } from './domain'

const companion = 'Dragón'
const first = '2026-01-05'
const plan = [{ from: first, target: 5, companion }]
const session = (date: string, id = date, scheduleId?: string): { id: string; data: Session } => {
  const ended = Date.parse(date + 'T12:00:00Z')
  return { id, data: { title: 'Rutina', exercises: [], started: ended - 60000, ended, date, scheduleId, companion } }
}
const reward = (session_id: string, xp = 25) => ({ session_id, companion, xp })
const evaluate = (today: string, sessions: ReturnType<typeof session>[], rewards = sessions.map(row => reward(row.id)),
  schedules: { id: string; data: Schedule }[] = []) =>
  petProgress(today, 'UTC', companion, plan, sessions, schedules, rewards).get(companion)

it('llega a Titán en la sesión 130 con cinco entrenamientos por semana', () => {
  const dates = Array.from({ length: 130 }, (_, index) =>
    new Date(Date.parse(first) + (Math.floor(index / 5) * 7 + index % 5) * 86400000).toISOString().slice(0, 10))
  const sessions = dates.map(date => session(date))
  expect(evaluate(dates[3], sessions.slice(0, 4))).toEqual({ xp: 100, health: 100 })
  expect(evaluate(dates[128], sessions.slice(0, 129))).toEqual({ xp: 3225, health: 100 })
  expect(evaluate(dates[129], sessions)).toEqual({ xp: 3250, health: 100 })
})

it('descuenta vida al cerrar la semana y recupera únicamente al evolucionar', () => {
  const sessions = [session('2026-01-05'), session('2026-01-12'), session('2026-01-19'), session('2026-01-20')]
  const rewards = [reward(sessions[0].id, 1500), reward(sessions[1].id), reward(sessions[2].id), reward(sessions[3].id, 775)]
  expect(evaluate('2026-01-11', sessions.slice(0, 1), rewards.slice(0, 1))).toEqual({ xp: 1500, health: 100 })
  expect(evaluate('2026-01-12', sessions.slice(0, 2), rewards.slice(0, 2))).toEqual({ xp: 1525, health: 50 })
  expect(evaluate('2026-01-19', sessions.slice(0, 3), rewards.slice(0, 3))).toEqual({ xp: 725, health: 0 })
  expect(evaluate('2026-01-20', sessions, rewards)).toEqual({ xp: 1500, health: 100 })
  expect(evaluate('2026-01-26', sessions.slice(0, 2), rewards.slice(0, 2))).toEqual({ xp: 700, health: 0 })
})

it('respeta un calendario explícito con un descanso y excluye el entrenamiento incompleto', () => {
  const slots = [
    { id: 'a', data: { date: first, title: 'Torso', exercises: [], routineId: 'routine', version: 1 } },
    { id: 'b', data: { date: '2026-01-06', title: 'Descanso', exercises: [], routineId: 'routine', version: 1, skipped: true } },
  ]
  const done = session(first, 'a-session', 'a')
  expect(evaluate('2026-01-12', [done], [reward(done.id)], slots)).toEqual({ xp: 25, health: 100 })
  expect(evaluate('2026-01-12', [{ ...done, data: { ...done.data, incomplete: true } }], [], slots)).toEqual({ xp: 0, health: 50 })
})
