import { z } from 'zod'
import { exerciseSchema, uid, fromKg, type Routine, type Session, type Schedule, type Profile } from './domain'
import { petProgress, initialVitals, type PetPlan } from './pet-progress'
import { weeklyMissions } from './gamification'
import type { Reward } from './store'

export type SocialRecord = { movement:string; mode:string; name:string; kg:number; period_kg:number|null }
export type SocialSnapshot = {
  handle:string; avatar:string|null; name:string; companion:string; unit:Profile['unit']; timezone:string; today:string;
  accountXp:number; periodXp:number; periodSessions:number; periodDays:number; records:SocialRecord[]; outfit:string[];
  plans:PetPlan[]; sessions:{id:string;data:Session}[]; schedules:{id:string;data:Schedule}[];
  rewards:Pick<Reward,'session_id'|'xp'|'companion'>[]; routines:{id:string;data:Routine}[];
}
export type FriendComparison = {since:string;until:string;days:number;mine:SocialSnapshot;friend:SocialSnapshot}
export function socialVitals(snapshot:SocialSnapshot) {
  return petProgress(snapshot.today,snapshot.timezone,snapshot.companion,snapshot.plans,snapshot.sessions,snapshot.schedules,snapshot.rewards)
    .get(snapshot.companion)??initialVitals
}
export function socialStreaks(snapshot:SocialSnapshot) {
  return weeklyMissions(snapshot.today,snapshot.plans,snapshot.sessions,snapshot.schedules,
    snapshot.rewards.map(reward=>({...reward,owner:''}))).streaks
}
export function comparableRecords(a:SocialSnapshot,b:SocialSnapshot,unit:Profile['unit']) {
  const mine=new Map(a.records.filter(r=>r.period_kg!==null).map(r=>[r.movement+':'+r.mode,r]))
  return b.records.filter(r=>r.period_kg!==null && mine.has(r.movement+':'+r.mode)).map(r=>({
    name:r.name,mode:r.mode,mine:fromKg(mine.get(r.movement+':'+r.mode)!.period_kg!,unit),theirs:fromKg(r.period_kg!,unit),
  }))
}
const sharedSchema=z.object({name:z.string().min(1).max(160),version:z.number().int().positive(),cover:z.number().int().min(0).max(14).nullish(),
  photo:z.string().max(90000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).nullish(),rotateAB:z.boolean().optional(),
  days:z.array(z.object({id:z.string(),title:z.string().min(1),exercises:z.array(exerciseSchema)})).min(1).max(100)})
export function copySharedRoutine(input:unknown):Routine {
  const source=sharedSchema.parse(input)
  return {name:source.name,version:1,source:'',cover:source.cover??0,photo:source.photo??undefined,rotateAB:source.rotateAB,
    days:source.days.map(day=>{
      const groups=new Map<string,string>()
      return {id:uid(),title:day.title,exercises:day.exercises.map(e=>({
        id:uid(),name:e.name,original:e.name,catalogId:e.catalogId,sets:e.sets,min:e.min,max:e.max,load:null,unit:null,
        rest:e.rest,type:e.type,mode:e.mode,measure:e.measure,custom:e.custom,
        superset:e.superset?{...e.superset,id:groups.get(e.superset.id)??(groups.set(e.superset.id,uid()).get(e.superset.id)!)}:undefined,
      }))}
    })}
}
