import {parseRoutine,exerciseSchema,uid,type Day,type Exercise,type Routine} from './domain'
import {gymExercise} from './gym-exercises'
import {anatomy} from './library'
export const builderCategories=['Todos','Pecho','Espalda','Piernas','Hombros','Bíceps','Tríceps','Core','Cardio','Mis ejercicios'] as const
export function routineIdentity(days:number){return {name:days===3?'Rutina básica':days===4?'Rutina intermedia':days>=5?'Rutina avanzada':`Rutina de ${days} ${days===1?'día':'días'}`,cover:days>=5?13:days===4?12:11}}
export const newBuilderDay=(index:number):Day=>({id:uid(),title:'Día '+index,exercises:[]})
export function builderExercise(name:string,unit:'kg'|'lb'):Exercise{
 const exercise=parseRoutine(name,unit)[0].exercises[0],timed=exercise.measure==='seconds'
 const reps=timed?(gymExercise(exercise.catalogId)?.duration??30):10
 return {...exercise,sets:timed?1:3,min:reps,max:reps,load:null,unit:timed?null:unit,rest:timed?0:90,warning:undefined,reviewReason:undefined}
}
export function validBuilderDay(day:Day){return !!day.title.trim()&&day.exercises.length>0&&day.exercises.every(e=>exerciseSchema.safeParse(e).success&&!!e.sets&&!!e.min&&!!e.max&&e.sets<=100&&e.max>0&&e.max<=(e.measure==='seconds'?86400:1000)&&(!e.warning||e.reviewAccepted))}
export function matchesBuilderCategory(id:string,category:string,kind:string){
 if(kind==='Movilidad')return false
 if(category==='Todos')return true
 if(category==='Cardio'||category==='Movilidad')return category===kind
 if(kind!=='Fuerza')return false
 const main=anatomy[id as keyof typeof anatomy]?.[1]
 if(category==='Piernas')return ['Cuádriceps','Isquiotibiales','Glúteos','Aductores','Abductores','Gemelos'].includes(main)
 if(category==='Brazos')return ['Bíceps','Tríceps'].includes(main)
 return main===(category==='Core'?'Abdominales':category)
}
export type BuilderState={routine:Routine;view:'choose'|'configure'|'summary';active:string|null;baseVersion?:number}
export function initialBuilderState():BuilderState{const day=newBuilderDay(1);return {routine:{name:'',version:1,source:'',days:[day],cover:11},view:'choose',active:day.id}}
export function isBuilderState(value:unknown):value is BuilderState{
 if(!value||typeof value!=='object')return false
 const s=value as BuilderState
 return ['choose','configure','summary'].includes(s.view)&&!!s.routine&&typeof s.routine.name==='string'&&Array.isArray(s.routine.days)&&s.routine.days.length<=100&&s.routine.days.every(day=>typeof day.id==='string'&&typeof day.title==='string'&&Array.isArray(day.exercises)&&day.exercises.every(e=>exerciseSchema.safeParse(e).success))&&(s.active===null||s.routine.days.some(day=>day.id===s.active))
}
