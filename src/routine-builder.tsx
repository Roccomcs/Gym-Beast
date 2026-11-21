import {createPortal} from 'react-dom'
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useLiveQuery} from 'dexie-react-hooks'
import {ArrowLeft,ArrowRight,Check,Dumbbell,ImagePlus,Pencil,Plus,Search,Trash2,X} from 'lucide-react'
import {catalog,reviseRoutine,uid,type Day,type Exercise,type Routine} from './domain'
import {db,list,save} from './store'
import {ExerciseArt,anatomy} from './library'
import {exerciseCategory} from './gym-exercises'
import {muscleGroups,equipmentKinds} from './exercise-meta'
import {RoutineCover} from './routine-cover'
import {compactPhoto} from './photo'
import {builderCategories,builderExercise,initialBuilderState,isBuilderState,matchesBuilderCategory,newBuilderDay,routineIdentity,validBuilderDay,type BuilderState} from './routine-builder-model'
import './routine-builder.css'

const normalize=(text:string)=>text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()

function Thumbnail({id}:{id:string|null}){
  const ref=useRef<HTMLSpanElement>(null),[visible,setVisible]=useState(false)
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'160px'})
    observer.observe(ref.current!);return()=>observer.disconnect()
  },[])
  return <span className="builder-art" ref={ref}>{visible?<ExerciseArt id={id}/>:<Dumbbell aria-hidden="true" size={28}/>}</span>
}

function CustomExercise({unit,add}:{unit:'kg'|'lb';add:(exercise:Exercise)=>void}){
  const [secondary,setSecondary]=useState<(typeof muscleGroups[number])[]>([])
  const [name,setName]=useState(''),[primary,setPrimary]=useState<typeof muscleGroups[number]>('Pecho'),[equipment,setEquipment]=useState<typeof equipmentKinds[number]>('Máquina')
  return <details className="builder-custom"><summary><Plus size={16}/> Crear ejercicio propio</summary>
    <label>Nombre del ejercicio<input maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="input-grid"><label>Músculo principal<select aria-label="Músculo principal" value={primary} onChange={e=>setPrimary(e.target.value as typeof primary)}>{muscleGroups.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Equipo<select aria-label="Equipo" value={equipment} onChange={e=>setEquipment(e.target.value as typeof equipment)}>{equipmentKinds.map(value=><option key={value}>{value}</option>)}</select></label></div>
    <details><summary>Músculos secundarios</summary><div className="custom-muscles">{muscleGroups.filter(m=>m!==primary).map(m=><label key={m}><input type="checkbox" checked={secondary.includes(m)} onChange={e=>setSecondary(s=>e.target.checked?[...s,m]:s.filter(v=>v!==m))}/>{m}</label>)}</div></details>
    <button type="button" disabled={!name.trim()} onClick={()=>{const exercise=builderExercise(name.trim(),unit);add({...exercise,catalogId:null,custom:{id:uid(),primary,secondary:secondary.filter(m=>m!==primary),equipment},mode:equipment==='Peso corporal'?'bodyweight':'external'});setName('')}}>Agregar a este día</button>
  </details>
}

export function RoutineBuilder({owner,unit,editId}:{owner:string;unit:'kg'|'lb';editId?:string}){
  const navigate=useNavigate(),key=editId??'new'
  const [state,setState]=useState<BuilderState>(),[error,setError]=useState(''),[saving,setSaving]=useState(false),[photoBusy,setPhotoBusy]=useState(false)
  const [editingName,setEditingName]=useState(false),[editingPhoto,setEditingPhoto]=useState(false)
  const [persisted,setPersisted]=useState<BuilderState>()
  const persistence=useRef<Promise<unknown>>(Promise.resolve())
  const [query,setQuery]=useState(''),[category,setCategory]=useState('Todos'),[gear,setGear]=useState('')
  const savingRef=useRef(false),finished=useRef(false),heading=useRef<HTMLHeadingElement>(null)
  const routines=useLiveQuery(()=>list(owner,'routine'),[owner],[])
  const requested=routines.find(item=>item.id===editId)
  useEffect(()=>{
    let cancelled=false
    void (async()=>{
      try{
        const cached=await db.routineDrafts.get([owner,key])
        const item=editId?await db.items.get([owner,'routine',editId]):undefined
        if(cancelled)return
        if(editId&&!item){setError('No encontramos esta rutina.');return}
        if(cached&&isBuilderState(cached.state)){setState(cached.state);return}
        if(item){const routine=structuredClone(item.data as Routine);setState({routine,view:'summary',active:null,baseVersion:item.version})}
        else setState(initialBuilderState())
      }catch{if(!cancelled)setError('No pudimos abrir el borrador. Volvé a intentarlo.')}
    })()
    return()=>{cancelled=true}
  },[owner,key,editId])
  useLayoutEffect(()=>{
    if(!state||finished.current)return
    persistence.current=db.routineDrafts.put({owner,key,state}).then(()=>setPersisted(state)).catch(()=>setError('No pudimos conservar el borrador en este dispositivo.'))
  },[state,owner,key])
  useEffect(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})},[state?.view,state?.active])
  const own=useMemo(()=>[...new Map(routines.flatMap(item=>item.data.days.flatMap(day=>day.exercises)).filter(exercise=>exercise.custom).map(exercise=>[exercise.custom!.id,exercise])).values()],[routines])
  if(!state)return <section className="panel"><h1>Nueva rutina</h1>{error?<p role="alert">{error}</p>:<p>Preparando tus días…</p>}<Link to="/rutinas">Volver a Rutinas</Link></section>
  const {routine,view}=state,day=routine.days.find(day=>day.id===state.active)
  const identity=routineIdentity(routine.days.length),name=editId?routine.name:identity.name,cover=editId?routine.cover:identity.cover
  const dayIndex=routine.days.findIndex(day=>day.id===state.active)
  const current=day?.exercises??[]
  const choice=(exercise:Exercise)=>{if(!day)return;setState(s=>s&&({...s,routine:{...s.routine,days:s.routine.days.map(d=>d.id===day.id?{...d,exercises:[...d.exercises,exercise]}:d)}}))}
  function changeDay(update:(day:Day)=>Day){setState(s=>s&&({...s,routine:{...s.routine,days:s.routine.days.map(d=>d.id===s.active?update(d):d)}}))}
  function patchExercise(id:string,patch:Partial<Exercise>){changeDay(d=>({...d,exercises:d.exercises.map(e=>e.id===id?{...e,...patch}:e)}))}
  function stage(next:BuilderState['view']){setError('');setState(s=>s&&({...s,view:next}));setQuery('')}
  function addDay(){const next=newBuilderDay(routine.days.reduce((highest,d)=>Math.max(highest,Number(d.title.match(/^Día (\d+)/)?.[1]??0)),routine.days.length)+1);setState({...state,routine:{...routine,days:[...routine.days,next]},view:'choose',active:next.id});setQuery('');setCategory('Todos');setError('')}
  function removeDay(id:string){setState(s=>s&&({...s,routine:{...s.routine,days:s.routine.days.filter(d=>d.id!==id)}}))}
  async function finish(asCopy=false){
    if(savingRef.current)return
    if(!routine.days.length||!routine.days.every(validBuilderDay)){setError('Revisá los días: necesitan al menos un ejercicio con series y repeticiones o tiempo.');return}
    if(editId&&!asCopy&&requested?.version!==state!.baseVersion){setError('Esta rutina cambió en otro lugar. Tu borrador sigue guardado; volvé a abrir la versión actual antes de reemplazarla.');return}
    savingRef.current=true;setSaving(true);setError('')
    try{
      await persistence.current
      const proposed={...routine,name:name.trim(),cover,version:1}
      const next=requested&&!asCopy?reviseRoutine(requested.data,proposed):{...proposed,...(asCopy?{name:proposed.name+' (copia)',history:undefined}:{})}
      await save(owner,'routine',asCopy?uid():editId??uid(),next)
      finished.current=true;await db.routineDrafts.delete([owner,key])
      navigate('/rutinas?tab=mis',{replace:true})
    }catch{finished.current=false;setError('No pudimos guardar. Tu borrador sigue acá para reintentar.')}
    finally{savingRef.current=false;setSaving(false)}
  }
  const matches=catalog.filter(([id,label,aliases])=>category!=='Mis ejercicios'&&matchesBuilderCategory(id,category,exerciseCategory(id))&&(!gear||anatomy[id][0]===gear)&&normalize(label+' '+aliases+' '+anatomy[id].join(' ')).includes(normalize(query)))
  const customMatches=own.filter(e=>(category==='Todos'||category==='Mis ejercicios')&&(!gear||e.custom!.equipment===gear)&&normalize(e.name+' '+e.custom!.primary).includes(normalize(query)))
  return <section className={'routine-builder builder-'+view} aria-busy={saving}>
    <div className="builder-heading"><Link className="icon-action" to="/rutinas?tab=mis" aria-label="Volver a Rutinas"><ArrowLeft size={20}/></Link>
      <div><span className="eyebrow">{editId?'TU PROGRAMA':'ARMÁ TU PROGRAMA'}</span><h1 ref={heading} tabIndex={-1}>{editId?'Editar rutina':'Nueva rutina'}</h1></div>
    </div>
    <span hidden data-draft-ready={persisted===state}/>
    {error&&<p className="warning" role="alert">{error}</p>}
    {error&&editId&&requested?.version!==state.baseVersion&&<button type="button" className="secondary" disabled={saving} onClick={()=>void finish(true)}>Guardar como copia</button>}
    {view==='summary'?<>
      <div className="builder-preview panel">
        <button type="button" className="builder-cover-button" aria-label="Cambiar foto de la rutina" disabled={!editId}
          onClick={()=>setEditingPhoto(!editingPhoto)}>
          {routine.photo?<img src={routine.photo} alt="Foto de la rutina"/>:<RoutineCover index={cover}/>}
          {editId&&<ImagePlus size={18}/>}
        </button>
        <div><div className="builder-title-row">{editingName&&editId
          ? <label>Nombre de la rutina<input autoFocus maxLength={100} required value={routine.name}
              onChange={e=>setState({...state,routine:{...routine,name:e.target.value}})}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setEditingName(false)}}}/></label>
          : <h2>{name}</h2>}
          {editId&&<button type="button" className="secondary icon-action" aria-label={editingName?'Confirmar nombre':'Editar nombre'}
            onClick={()=>setEditingName(!editingName)}>{editingName?<Check size={17}/>:<Pencil size={17}/>}</button>}
        </div><p>{routine.days.length} {routine.days.length===1?'día':'días'} · {routine.days.reduce((sum,d)=>sum+d.exercises.length,0)} ejercicios</p></div>
      </div>
      {editId&&editingPhoto&&<div className="builder-details panel">
        <div className="cover-options">{[11,12,13].map((index,i)=><button key={index} type="button" className="secondary" aria-label={'Elegir portada '+['Básica','Intermedia','Avanzada'][i]} aria-pressed={cover===index&&!routine.photo} onClick={()=>setState({...state,routine:{...routine,cover:index,photo:undefined}})}><RoutineCover index={index}/></button>)}</div>
        <label className="builder-photo"><ImagePlus size={18}/> Foto de la rutina<input type="file" accept="image/*" disabled={photoBusy} onChange={async e=>{
          const file=e.target.files?.[0];if(!file)return;setPhotoBusy(true)
          try{const photo=await compactPhoto(file);setState(s=>s&&({...s,routine:{...s.routine,photo}}))}catch{setError('No pudimos abrir esa foto. Probá con otra imagen.')}finally{setPhotoBusy(false)}
        }}/></label>{routine.photo&&<button className="secondary" type="button" onClick={()=>setState({...state,routine:{...routine,photo:undefined}})}>Quitar foto</button>}
      </div>}
      {!!routine.history?.length&&<details className="builder-details panel"><summary>Versiones anteriores</summary>{routine.history.map(snapshot=><button type="button" className="secondary" key={snapshot.version} onClick={()=>setState({...state,routine:{...routine,name:snapshot.name,source:snapshot.source,days:structuredClone(snapshot.days)}})}>Cargar versión {snapshot.version}</button>)}</details>}
      <div className="builder-days">{routine.days.map((d,index)=><article className="builder-day panel" key={d.id}>
        <div className="builder-day-heading"><span className="builder-day-number">{String(index+1).padStart(2,'0')}</span><div><h2>{d.title}</h2><small>{d.exercises.length} {d.exercises.length===1?'ejercicio':'ejercicios'}</small></div>
          <button type="button" className="secondary icon-action" aria-label={'Editar '+d.title} onClick={()=>{setState({...state,view:'configure',active:d.id});setError('')}}><Pencil size={17}/></button>
          <button type="button" className="secondary icon-action" aria-label={'Quitar '+d.title} onClick={()=>removeDay(d.id)}><Trash2 size={17}/></button>
        </div>
        <ul>{d.exercises.map(exercise=><li key={exercise.id}><Thumbnail id={exercise.catalogId}/><div><strong>{exercise.name}</strong></div></li>)}</ul>
      </article>)}</div>
      <button type="button" className="secondary builder-add-day" onClick={addDay}><Plus size={20}/> Agregar día</button>
      <div className="builder-footer"><button type="button" disabled={saving||photoBusy||!routine.days.length||!name.trim()} onClick={()=>void finish()}>{saving?'Guardando…':editId?'Guardar cambios':'Crear rutina'}<Check size={19}/></button></div>
    </>:day?<>
      <div className="builder-day-intro"><span className="builder-day-number">{String(dayIndex+1).padStart(2,'0')}</span><div><h2>{day.title}</h2>{view==='choose'&&<p>Tocá los ejercicios que querés agregar.</p>}</div><button type="button" className="secondary icon-action" aria-label="Ver resumen de días" onClick={()=>{setState({...state,view:'summary',routine:{...routine,days:routine.days.filter(d=>d.id!==day.id||d.exercises.length>0)}});setError('')}}><ArrowLeft size={18}/></button></div>
      {view==='choose'?<>
        <div className="builder-filters"><div className="builder-category-scroll" role="group" aria-label="Categorías de ejercicios">{builderCategories.filter(value=>value!=='Mis ejercicios'||own.length).map(value=><button type="button" key={value} className="secondary" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div>
          <div className="builder-search"><label><Search size={18}/><input type="search" aria-label="Buscar ejercicio" placeholder="Buscar ejercicio" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filtrar por equipo" value={gear} onChange={e=>setGear(e.target.value)}><option value="">Equipo</option>{equipmentKinds.map(value=><option key={value}>{value}</option>)}</select></div>
        </div>
        {!!current.length&&<div className="builder-selection" aria-label="Ejercicios seleccionados">{current.map((exercise,index)=><button key={exercise.id} type="button" className="secondary" aria-label={'Quitar '+exercise.name} onClick={()=>changeDay(d=>({...d,exercises:d.exercises.filter(e=>e.id!==exercise.id)}))}>{index+1}. {exercise.name}<X size={14}/></button>)}</div>}
        <CustomExercise unit={unit} add={choice}/>
        <div className="builder-catalog">{matches.map(([id,label])=>{
          const index=current.findIndex(e=>e.catalogId===id),selected=index>=0
          return <button className="builder-exercise secondary" type="button" key={id} aria-label={label} aria-pressed={selected} onClick={()=>selected?changeDay(d=>({...d,exercises:d.exercises.filter(e=>e.catalogId!==id)})):choice(builderExercise(label,unit))}>
            <span className="builder-pick-number">{selected?index+1:<Plus size={15}/>}</span><Thumbnail id={id}/><strong>{label}</strong><small>{anatomy[id][0]}</small>
          </button>
        })}{customMatches.map(exercise=><button key={exercise.custom!.id} type="button" className="builder-exercise secondary" aria-label={exercise.name} aria-pressed={current.some(e=>e.custom?.id===exercise.custom!.id)} onClick={()=>current.some(e=>e.custom?.id===exercise.custom!.id)?changeDay(d=>({...d,exercises:d.exercises.filter(e=>e.custom?.id!==exercise.custom!.id)})):choice({...structuredClone(exercise),id:uid()})}><Thumbnail id={null}/><strong>{exercise.name}</strong><small>Ejercicio propio</small></button>)}</div>
        {!matches.length&&!customMatches.length&&<p className="builder-empty">No encontramos ejercicios. Probá otro filtro o creá uno propio.</p>}
        {createPortal(<div className="builder-footer builder-selection-footer"><span role="status" aria-live="polite">{current.length} {current.length===1?'seleccionado':'seleccionados'}</span><button type="button" disabled={!current.length} onClick={()=>stage('configure')}>Continuar<ArrowRight size={19}/></button></div>,document.body)}
      </>:<>
        <label className="builder-day-name">Nombre del día<input maxLength={100} value={day.title} onChange={e=>changeDay(d=>({...d,title:e.target.value}))}/></label>
        <button type="button" className="secondary builder-more" onClick={()=>stage('choose')}><Plus size={17}/> Elegir más ejercicios</button>
        <form onSubmit={e=>{e.preventDefault();if(!validBuilderDay(day)){setError('Completá series y repeticiones o tiempo y revisá los valores señalados.');return}stage('summary')}}>
          {current.map((exercise,index)=><fieldset className="builder-config panel" key={exercise.id}><legend>{index+1}. {exercise.name}</legend>
            <div className="builder-config-heading"><Thumbnail id={exercise.catalogId}/><span>{exercise.custom?.primary??anatomy[exercise.catalogId as keyof typeof anatomy]?.[1]}</span><button type="button" className="secondary icon-action" aria-label={'Quitar '+exercise.name} onClick={()=>changeDay(d=>({...d,exercises:d.exercises.filter(e=>e.id!==exercise.id)}))}><Trash2 size={16}/></button></div>
            {exercise.warning&&<label className="warning"><input type="checkbox" checked={!!exercise.reviewAccepted} onChange={e=>patchExercise(exercise.id,{reviewAccepted:e.target.checked})}/> Revisé esta línea: {exercise.original}</label>}
            {exercise.measure==='seconds'&&<label className="builder-use">Uso<select aria-label={'Uso de '+exercise.name} value={exercise.type==='warmup'?'warmup':'work'} onChange={e=>patchExercise(exercise.id,{type:e.target.value as Exercise['type']})}><option value="warmup">Calentamiento</option><option value="work">Cardio o finalización</option></select></label>}
          </fieldset>)}
          <div className="builder-footer"><button type="button" className="secondary" onClick={()=>stage('choose')}><ArrowLeft size={17}/> Elegir</button><button disabled={!current.length}>Guardar día<Check size={19}/></button></div>
        </form>
      </>}
    </>:<button type="button" onClick={addDay}>Agregar día</button>}
  </section>
}
