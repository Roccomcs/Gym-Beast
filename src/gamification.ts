import { weekDates, weeklyStreaks, type Session, type Schedule } from './domain'
import type { Reward } from './store'
import type { PetPlan } from './pet-progress'
import { nextWeek, weekStatus } from './weekly-plan'

export function weeklyMissions(today:string, plans:PetPlan[], sessions:{id:string;data:Session}[],
  schedules:{id:string;data:Schedule}[], rewards:Reward[]) {
  const monday=weekDates(today,1)[0]
  sessions=sessions.filter(item=>item.data.date<=today)
  const current=weekStatus(monday,plans,sessions,schedules,rewards)
  const first=[monday,...plans.map(p=>weekDates(p.from,1)[0]),...schedules.map(p=>weekDates(p.data.date,1)[0]),
    ...sessions.map(p=>weekDates(p.data.date,1)[0])].sort()[0]
  const fulfilled:string[]=[]
  for(let week=first;week<=monday;week=nextWeek(week)) {
    if(weekStatus(week,plans,sessions,schedules,rewards).fulfilled)fulfilled.push(week)
  }
  const bySession=new Map(sessions.filter(item=>item.data.ended && !item.data.incomplete).map(item=>[item.id,item.data]))
  const improved=new Set<string>()
  const improvedByWeek=new Map<string,Set<string>>()
  let records=0
  const seen=new Set<string>()
  for(const reward of rewards) {
    const session=bySession.get(reward.session_id)
    if(!session || seen.has(reward.session_id))continue
    seen.add(reward.session_id)
    records+=reward.improvements?.length??0
    for(const improvement of reward.improvements??[]) {
      const e=session.exercises.find(exercise=>exercise.id===improvement.exerciseId)
      if(!e)continue
      const key=(e.catalogId??e.custom?.id??e.name.trim().toLowerCase())+':'+e.mode
      const week=weekDates(session.date,1)[0]
      const entries=improvedByWeek.get(week)??new Set<string>()
      entries.add(key);improvedByWeek.set(week,entries)
      if(week===monday)improved.add(key)
    }
  }
  const badges=[...new Set([...fulfilled,...improvedByWeek.keys()])].sort().reverse().flatMap(week=>[
    ...(fulfilled.includes(week)?[{week,label:'Plan cumplido'}]:[]),
    ...((improvedByWeek.get(week)?.size??0)>=3?[{week,label:'Más fuerte'}]:[]),
  ])
  return {current,improved:Math.min(3,improved.size),records,confirmed:seen.size,badges,streaks:weeklyStreaks(fulfilled,monday)}
}
