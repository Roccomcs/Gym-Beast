import {weekDates,type Exercise,type Profile} from '../src/domain'
import type {Item} from '../src/store'
export function mobileItems(today='2026-11-19',history=0):Item[]{
  const exercises:Exercise[]=['bench-barbell','squat','pulldown','curl','hip-thrust'].map((catalogId,i)=>({
    id:'move'+i,catalogId,name:['Press banca','Sentadilla libre','Jalón al pecho','Curl bíceps','Hip thrust'][i],
    original:catalogId,sets:4,min:10,max:10,load:60,unit:'kg',mode:'external',rest:90,type:'work',
  }))
  const monday=weekDates(today,1)[0]
  const from=new Date(Date.parse(monday)-Math.ceil(history/5)*604800000).toISOString().slice(0,10)
  const profile:Profile={name:'Rocco',onboarded:true,unit:'kg',theme:'dark',weekStart:1,timezone:'America/Buenos_Aires',companion:'Dragón',starter:'Dragón',
    cycle:{id:'current-cycle',routineId:'mobile-routine',startedOn:from,skipped:[]},petPlans:[{from,target:5,companion:'Dragón'}]}
  const rows:Item[]=[{owner:'local',kind:'profile',id:'self',version:1,data:profile},
    {owner:'local',kind:'routine',id:'mobile-routine',version:1,data:{name:'Rutina de prueba móvil',version:1,source:'',cover:0,
      days:Array.from({length:5},(_,i)=>({id:'day'+i,title:'Día '+(i+1),exercises}))}}]
  for(let i=0;i<history;i++){
    const started=Date.parse(from+'T12:00:00Z')+(Math.floor(i/5)*7+i%5)*86400000,id='past'+i
    rows.push({owner:'local',kind:'session',id,version:1,data:{title:'Entrenamiento',date:new Date(started).toISOString().slice(0,10),started,
      ended:started+3600000,cycleId:'pastcycle'+Math.floor(i/5),dayId:'day'+i%5,companion:'Dragón',exercises}})
    for(const e of exercises)for(let slot=0;slot<4;slot++)rows.push({owner:'local',kind:'set',id:id+e.id+slot,version:1,
      data:{sessionId:id,exerciseId:e.id,kg:60,reps:10,done:true,created:started+slot*60000,slot,type:'work'}})
  }
  rows.push({owner:'local',kind:'session',id:'mobile-active',version:1,data:{title:'Día 1 — Prueba móvil',date:today,
    started:Date.parse(today+'T12:00:00Z'),cycleId:'current-cycle',dayId:'day0',companion:'Dragón',exercises}})
  return rows
}
