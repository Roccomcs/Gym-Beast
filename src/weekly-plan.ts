import { weekDates, type Session, type Schedule } from './domain'
import type { PetPlan } from './pet-progress'

export const nextWeek = (monday: string) => new Date(Date.parse(monday + 'T00:00:00Z') + 604800000).toISOString().slice(0,10)
export function recordPetPlan(plans: PetPlan[], next: PetPlan): PetPlan[] {
  const monday = weekDates(next.from, 1)[0]
  const active = plans.some(plan => plan.target > 0 && plan.from < nextWeek(monday))
  const from = active ? nextWeek(monday) : next.from
  return [...plans.filter(plan => plan.from !== from), { ...next, from }].sort((a,b) => a.from.localeCompare(b.from))
}

export function weeklyPlan(monday: string, plans: PetPlan[]) {
  const ordered = [...plans].sort((a,b) => a.from.localeCompare(b.from))
  const plan = ordered.filter(item => item.from <= monday).at(-1) ?? ordered.find(item => item.from < nextWeek(monday))
  return { plan, grace: !!plan && plan.from > monday }
}

export function weekStatus(monday: string, plans: PetPlan[], sessions: {id:string;data:Session}[],
  schedules: {id:string;data:Schedule}[], rewards: {session_id:string}[]) {
  const {plan,grace} = weeklyPlan(monday,plans)
  const end = nextWeek(monday)
  const confirmed = new Set(rewards.map(reward => reward.session_id))
  const done = sessions.filter(item => confirmed.has(item.id) && item.data.ended && !item.data.incomplete &&
    item.data.date >= monday && item.data.date < end)
  const appointments = schedules.filter(item => item.data.date >= monday && item.data.date < end)
  const required = appointments.filter(item => !item.data.skipped)
  const goal = appointments.length ? required.length : plan?.target ?? 0
  const count = appointments.length ? required.filter(slot => done.some(item => item.data.scheduleId === slot.id)).length :
    new Set(done.map(item => item.data.date)).size
  const rest = appointments.length > 0 && required.length === 0
  const active = goal > 0 || rest
  const fulfilled = active && count >= goal
  return {plan,goal,count:Math.min(count,goal),active,fulfilled,rest,grace:grace && !appointments.length,
    missed:active && !fulfilled && !(grace && !appointments.length)}
}
