import {RoutineCover} from './routine-cover'
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {ArrowLeft,Copy,RefreshCw} from 'lucide-react'
import {api,save} from './store'
import {uid,type Profile} from './domain'
import {Habitat} from './habitat'
import {goods} from './shop-catalog'
import {ExerciseArt,ExerciseTargets} from './library'
import {copySharedRoutine,socialVitals,socialStreaks,comparableRecords,type FriendComparison} from './social-profile'
import {useScreenFocus} from './mobile-behavior'

export function FriendProfile({owner,handle,unit,online,close}:{owner:string;handle:string;unit:Profile['unit'];online:boolean;close:()=>void}){
  useScreenFocus('friend:'+handle,'')
  const [period,setPeriod]=useState(28),[revision,refresh]=useState(0)
  const [data,setData]=useState<FriendComparison>(),[error,setError]=useState(''),[message,setMessage]=useState('')
  const [copying,setCopying]=useState(''),[copied,setCopied]=useState<string[]>([])
  const saving=useRef(false)
  const vitals=useMemo(()=>data?socialVitals(data.friend):undefined,[data])
  const streaks=useMemo(()=>data?socialStreaks(data.friend):undefined,[data])
  useEffect(()=>{
    const update=()=>refresh(n=>n+1)
    window.addEventListener('focus',update)
    return()=>window.removeEventListener('focus',update)
  },[])
  useEffect(()=>{
    let live=true
    setError('')
    if(!online || !api){setData(undefined);return}
    void(async()=>{try{
      const result=await api.rpc('friend_profile',{p_handle:handle,p_days:period})
      if(!live)return
      if(result.error)throw result.error
      setData(result.data as FriendComparison)
    }catch{if(live){setData(undefined);setError('Este perfil no está disponible. Actualizá Amigos para comprobar la conexión y la amistad.')}}})()
    return()=>{live=false}
  },[handle,period,revision,online])
  async function copy(id:string){
    if(!api || !online || saving.current)return
    saving.current=true;setCopying(id);setMessage('')
    try{
      const result=await api.rpc('friend_profile',{p_handle:handle,p_days:period})
      if(result.error)throw result.error
      const routine=(result.data as FriendComparison).friend.routines.find(item=>item.id===id)
      if(!routine)throw new Error('Unavailable')
      await save(owner,'routine',uid(),copySharedRoutine(routine.data))
      setCopied(ids=>[...ids,id]);setMessage('Rutina guardada en Mis rutinas. Ya podés editarla y usarla.')
    }catch{setMessage('No se pudo copiar. Comprobá que siga compartida y que estén conectados.')}
    finally{saving.current=false;setCopying('')}
  }
  const format=(n:number)=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n)
  return <>
    <button type="button" className="secondary social-back" onClick={close}><ArrowLeft size={18}/> Volver a Amigos</button>
    <h1 className="social-handle">@{handle}</h1>
    {!online?<section className="panel"><p role="status">Conectate para consultar el perfil y confirmar sus permisos.</p></section>:
      error?<section className="panel"><p role="alert">{error}</p><button className="secondary" onClick={()=>refresh(n=>n+1)}>Reintentar</button></section>:
      !data?<p role="status">Abriendo perfil…</p>:<>
      <section className="social-person panel"><div className="friends-link">
        {data.friend.avatar?<img className="friend-avatar" src={data.friend.avatar} alt={'Foto de '+handle}/>:<span className="friend-avatar" aria-hidden="true">{handle.slice(0,2).toUpperCase()}</span>}
        <div><h2>{data.friend.name}</h2><p>{format(data.friend.accountXp)} EXP de cuenta</p></div>
        <button type="button" className="secondary social-refresh" aria-label="Actualizar perfil" onClick={()=>refresh(n=>n+1)}><RefreshCw size={18}/></button>
      </div></section>
      <Habitat name={data.friend.companion} xp={vitals!.xp} health={vitals!.health}
        outfit={goods.filter(good=>data.friend.outfit.includes(good.id))}/>
      <section className="panel"><h2>Constancia</h2><div className="social-kpis">
        <div><strong>{streaks!.current}</strong><span>Semanas de racha</span></div>
        <div><strong>{streaks!.best}</strong><span>Mejor racha</span></div>
      </div></section>
      <section className="panel comparison-panel" aria-busy={data.days!==period}><h2>Vos y @{handle}</h2>
        <div className="social-periods" role="group" aria-label="Período de comparación">{[7,28,90].map(days=><button key={days} className="secondary" aria-pressed={period===days} onClick={()=>setPeriod(days)}>{days} días</button>)}</div>
        {data.days!==period&&<p role="status">Actualizando comparación…</p>}
        <p className="comparison-dates">{data.since} — {data.until} · mismo período para los dos</p>
        <div className="comparison-names"><span>Vos</span><span>@{handle}</span></div>
        {[{label:'Días entrenados',mine:data.mine.periodDays,theirs:data.friend.periodDays},
          {label:'Sesiones confirmadas',mine:data.mine.periodSessions,theirs:data.friend.periodSessions},
          {label:'EXP de entrenamientos',mine:data.mine.periodXp,theirs:data.friend.periodXp}].map(row=><div className="comparison-row" key={row.label}>
          <h3>{row.label}</h3><div><strong>{row.mine}</strong><strong>{row.theirs}</strong></div>
          <div className="comparison-bars" aria-hidden="true"><span style={{width:Math.max(3,100*row.mine/Math.max(1,row.mine,row.theirs))+'%'}}/><span style={{width:Math.max(3,100*row.theirs/Math.max(1,row.mine,row.theirs))+'%'}}/></div>
        </div>)}
        <h3>Cargas del período</h3>
        {comparableRecords(data.mine,data.friend,unit).length?<ul className="comparison-loads">{comparableRecords(data.mine,data.friend,unit).map(row=><li key={row.name+row.mode}>
          <strong>{row.name}</strong><small>{row.mode==='per-side'?'Por lado':'Carga total'}</small>
          <div><span>Vos <b>{format(row.mine)} {unit}</b></span><span>@{handle} <b>{format(row.theirs)} {unit}</b></span></div>
        </li>)}</ul>:<p>Todavía no hay registros del mismo ejercicio y modalidad en este período.</p>}
      </section>
      <section className="panel"><h2>Récords de @{handle}</h2>
        {data.friend.records.length?<ul className="social-records">{data.friend.records.map(row=><li key={row.movement+row.mode}><strong>{row.name}</strong><span>{format(row.kg*(unit==='lb'?1/.45359237:1))} {unit}{row.mode==='per-side'?' por lado':''}</span></li>)}</ul>:<p>Los récords aparecen con sus primeras cargas confirmadas.</p>}
      </section>
      <section className="shared-routines"><h2>Rutinas compartidas</h2>
        {message&&<p role="status">{message}</p>}
        {!data.friend.routines.length&&<p>No compartió rutinas todavía.</p>}
        {data.friend.routines.map(item=><article className="panel" key={item.id}>
          {item.data.photo?<img className="routine-photo" src={item.data.photo} alt=""/>:<RoutineCover index={item.data.cover??11}/>}
          <h3>{item.data.name}</h3><p>{item.data.days.length} {item.data.days.length===1?'día':'días'} · Versión {item.data.version}</p>
          <details><summary>Ver ejercicios</summary>{item.data.days.map(day=><section key={day.id}><h4>{day.title}</h4>{day.exercises.map(e=><div className="social-exercise" key={e.id}>
            <ExerciseArt id={e.catalogId}/><div><strong>{e.name}</strong><p>{e.sets??'—'} series · {e.min??'—'} {e.measure==='seconds'?'segundos':'reps'}</p><ExerciseTargets id={e.catalogId} custom={e.custom}/></div>
          </div>)}</section>)}</details>
          <button type="button" disabled={!!copying||copied.includes(item.id)} onClick={()=>void copy(item.id)}><Copy size={17}/>{copied.includes(item.id)?'Copiada':copying===item.id?'Copiando…':'Copiar a Mis rutinas'}</button>
        </article>)}
      </section>
    </>}
  </>
}
