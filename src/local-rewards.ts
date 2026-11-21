import {milestoneId,trainingMilestones} from './milestones'
import {loadBonusCalculator} from './load-bonus'
import type {Item,Reward} from './store'

export function localRewards(sessions: Item<'session'>[], sets: Item<'set'>[]): Reward[] {
  const improvementsFor = loadBonusCalculator(sessions, sets)
  const trained = new Map<string,Set<string>>()
  for(const set of sets) {
    if(!set.data.done || !Number.isInteger(set.data.reps) || set.data.reps<=0 || set.data.type==='warmup')continue
    const key=JSON.stringify([set.owner,set.data.sessionId]),moves=trained.get(key)??new Set<string>()
    moves.add(set.data.exerciseId);trained.set(key,moves)
  }
  const seen = new Set<string>()
  const earned: Reward[] = [...sessions].sort((a, b) => (a.data.ended ?? 0) - (b.data.ended ?? 0) || a.id.localeCompare(b.id)).flatMap(item => {
    const session = item.data
    const occurrence = session.scheduleId ? 'schedule:' + session.scheduleId :
      session.cycleId && session.dayId ? 'cycle:' + session.cycleId + ':' + session.dayId : undefined
    if (!occurrence || seen.has(occurrence) || !session.ended || session.incomplete || !session.exercises.length) return []
    const exercised = trained.get(JSON.stringify([item.owner,item.id]))??new Set<string>()
    if (!session.exercises.some(exercise => exercised.has(exercise.id)) ||
        !session.exercises.every(exercise => exercised.has(exercise.id) || session.omitted?.includes(exercise.id))) return []
    seen.add(occurrence)
    const improvements = improvementsFor(item)
    return [{ owner: item.owner, session_id: item.id, xp: 25 + improvements.length * 5,
      gold: 20 + improvements.length * 5, improvements, companion: session.companion, occurrence }]
  })
  const owner = earned[0]?.owner
  if (!owner) return earned
  return [...earned, ...trainingMilestones.filter(item => earned.length >= item.goal)
    .map(item => ({ owner, session_id: milestoneId(item.goal), xp: 25 }))]
}
