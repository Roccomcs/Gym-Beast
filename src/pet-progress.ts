import { dateKey, weekDates, type Schedule, type Session } from './domain'

export const companionStages = [
  { name: 'Huevo', xp: 0 }, { name: 'Bebé', xp: 100 }, { name: 'Cría', xp: 300 },
  { name: 'Adolescente', xp: 700 }, { name: 'Adulto', xp: 1500 }, { name: 'Titán', xp: 3250 },
]

export const stageIndex = (xp: number) => companionStages.reduce((latest, stage, index) => xp >= stage.xp ? index : latest, 0)

export type PetPlan = { from: string; target: number; companion: string }
export type PetVitals = { xp: number; health: number }
export const initialVitals: PetVitals = { xp: 0, health: 100 }

type TrainingRow<T> = { id: string; data: T }
type PetReward = { session_id: string; companion?: string | null; xp: number }

export function petProgress(today: string, zone: string, companion: string, plans: PetPlan[],
  sessions: TrainingRow<Session>[], schedules: TrainingRow<Schedule>[], rewards: PetReward[]) {
  const pets = new Map<string, PetVitals>()
  const byId = new Map(sessions.map(row => [row.id, row.data]))
  const timeline = [...plans].sort((a, b) => a.from.localeCompare(b.from))
  const weekOf = (date: string) => weekDates(date, 1)[0]
  const todayWeek = weekOf(today)
  const first = [today, ...timeline.map(plan => plan.from), ...schedules.map(row => row.data.date)].sort()[0]
  const completed = new Map<string, Session[]>()
  const scheduled = new Map<string, TrainingRow<Schedule>[]>()
  const gains = new Map<string, PetReward[]>()
  for (const { data } of sessions) {
    if (!data.ended || data.incomplete) continue
    const week = weekOf(data.date)
    const items = completed.get(week) ?? []
    items.push(data)
    completed.set(week, items)
  }
  for (const row of schedules) {
    const week = weekOf(row.data.date)
    const items = scheduled.get(week) ?? []
    items.push(row)
    scheduled.set(week, items)
  }
  for (const reward of rewards) {
    if (!reward.companion) continue
    const ended = byId.get(reward.session_id)?.ended
    const week = ended ? weekOf(dateKey(new Date(ended), zone)) : weekOf(first)
    const items = gains.get(week) ?? []
    items.push(reward)
    gains.set(week, items)
  }

  const firstWeek = [...gains.keys(), weekOf(first)].sort()[0]
  let plan: PetPlan | undefined
  let planIndex = 0
  for (let monday = firstWeek; monday <= todayWeek; monday = new Date(Date.parse(monday) + 604800000).toISOString().slice(0, 10)) {
    while (planIndex < timeline.length && timeline[planIndex].from <= monday) plan = timeline[planIndex++]

    for (const reward of gains.get(monday) ?? []) {
      const name = reward.companion!
      const current = pets.get(name) ?? initialVitals
      const xp = current.xp + reward.xp
      pets.set(name, { xp, health: stageIndex(xp) > stageIndex(current.xp) ? 100 : current.health })
    }

    if (monday === todayWeek) break
    const done = completed.get(monday) ?? []
    const appointments = scheduled.get(monday)
    const missed = appointments?.length
      ? appointments.some(row => !row.data.skipped && !done.some(session => session.scheduleId === row.id))
      : !!plan && new Set(done.map(session => session.date)).size < plan.target
    if (!missed) continue
    const name = plan?.companion ?? companion
    const current = pets.get(name) ?? initialVitals
    if (current.health === 0) continue
    const health = current.health - 50
    const xp = health === 0 ? companionStages[Math.max(0, stageIndex(current.xp) - 1)].xp : current.xp
    pets.set(name, { xp, health })
  }
  return pets
}
