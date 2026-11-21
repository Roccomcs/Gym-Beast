import { dateKey, weekDates, type Schedule, type Session } from './domain'
import { weekStatus } from './weekly-plan'

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
  const gains = new Map<string, PetReward[]>()
  for (const reward of rewards) {
    if (!reward.companion) continue
    const session = byId.get(reward.session_id)
    if (!session?.ended || session.incomplete || session.date > today) continue
    const week = weekOf(session.date || dateKey(new Date(session.started), zone))
    const items = gains.get(week) ?? []
    items.push(reward)
    gains.set(week, items)
  }

  const firstWeek = [...gains.keys(), weekOf(first)].sort()[0]
  for (let monday = firstWeek; monday <= todayWeek; monday = new Date(Date.parse(monday) + 604800000).toISOString().slice(0, 10)) {
    const orderedGains = [...(gains.get(monday) ?? [])].sort((a,b) =>
      byId.get(a.session_id)!.ended! - byId.get(b.session_id)!.ended! || a.session_id.localeCompare(b.session_id))
    for (const reward of orderedGains) {
      const name = reward.companion!
      const current = pets.get(name) ?? initialVitals
      const xp = current.xp + reward.xp
      pets.set(name, { xp, health: stageIndex(xp) > stageIndex(current.xp) ? 100 : current.health })
    }

    if (monday === todayWeek) break
    const status = weekStatus(monday, timeline, sessions, schedules, rewards)
    if (!status.missed) continue
    const name = status.plan?.companion ?? companion
    const current = pets.get(name) ?? initialVitals
    if (current.health === 0) continue
    const health = current.health - 50
    const xp = health === 0 ? companionStages[Math.max(0, stageIndex(current.xp) - 1)].xp : current.xp
    pets.set(name, { xp, health })
  }
  return pets
}
