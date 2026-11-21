import type { Exercise, PerformedSet } from './domain'
import type { Item } from './store'

export type LoadImprovement = { exerciseId: string; name: string; previousKg: number; kg: number }
const identity = (exercise: Exercise) => exercise.catalogId ? 'catalog:' + exercise.catalogId :
  exercise.custom ? 'custom:' + exercise.custom.id : 'name:' + exercise.name.trim().toLowerCase()
const compatible = (exercise: Exercise) => exercise.measure !== 'seconds' && ['external', 'per-side'].includes(exercise.mode) &&
  !!(exercise.catalogId || exercise.custom?.id || exercise.name?.trim())
const valid = (set: PerformedSet) => set.done && set.type !== 'warmup' && Number.isInteger(set.reps) &&
  set.reps > 0 && set.reps <= 1000 && set.kg !== null && Number.isFinite(set.kg) && set.kg >= 0

// Compare canonical kilograms, never displayed units or a routine's example weight.
export function loadBonusCalculator(sessions: Item<'session'>[], sets: Item<'set'>[]) {
  const sessionKey = (owner: string, id: string) => JSON.stringify([owner, id])
  const indexed = new Map(sessions.map(session => [sessionKey(session.owner, session.id), {
    session, exercises: new Map(session.data.exercises.map(exercise => [exercise.id, exercise])), peaks: new Map<string, number>(),
  }]))
  for (const item of sets) {
    const row = indexed.get(sessionKey(item.owner, item.data.sessionId))
    const exercise = row?.exercises.get(item.data.exerciseId)
    if (!row || !exercise || !compatible(exercise) || (item.data.type ?? exercise.type) === 'warmup' || !valid(item.data)) continue
    const key = identity(exercise) + ':' + exercise.mode
    row.peaks.set(key, Math.max(row.peaks.get(key) ?? -Infinity, item.data.kg!))
  }
  const result = new Map<string,LoadImprovement[]>()
  const owners = new Set(sessions.map(row=>row.owner))
  for(const owner of owners) {
    const rows=[...indexed.values()].filter(row=>row.session.owner===owner && Number.isFinite(row.session.data.started))
      .sort((a,b)=>a.session.data.started-b.session.data.started)
    const completed=rows.filter(row=>row.session.data.ended && !row.session.data.incomplete && Number.isFinite(row.session.data.ended))
      .map(row=>({row,ready:Math.max(row.session.data.started,row.session.data.ended!),strict:row.session.data.started>=row.session.data.ended!}))
      .sort((a,b)=>a.ready-b.ready||Number(a.strict)-Number(b.strict))
    let cursor=0
    const records=new Map<string,number>()
    for(const row of rows) {
      const current=row.session
      while(cursor<completed.length) {
        const event=completed[cursor]
        if(event.ready>current.data.started || event.ready===current.data.started&&event.strict)break
        for(const [key,kg]of event.row.peaks)records.set(key,Math.max(records.get(key)??-Infinity,kg))
        cursor++
      }
      if(!current.data.ended || current.data.incomplete)continue
      const seen=new Set<string>(),improvements:LoadImprovement[]=[]
      for(const exercise of current.data.exercises) {
        if(!compatible(exercise))continue
        const key=identity(exercise)+':'+exercise.mode
        if(seen.has(key))continue
        seen.add(key)
        const kg=row.peaks.get(key),previousKg=records.get(key)
        if(kg!==undefined && previousKg!==undefined && kg>previousKg+.000001)improvements.push({exerciseId:exercise.id,name:exercise.name,kg,previousKg})
        if(improvements.length===3)break
      }
      result.set(sessionKey(owner,current.id),improvements)
    }
  }
  return (current:Item<'session'>):LoadImprovement[]=>result.get(sessionKey(current.owner,current.id))??[]
}

export function loadImprovements(current: Item<'session'>, sessions: Item<'session'>[], sets: Item<'set'>[]): LoadImprovement[] {
  return loadBonusCalculator(sessions, sets)(current)
}
