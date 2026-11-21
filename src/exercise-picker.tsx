import {useEffect,useRef,useState} from 'react'
import {Search,X} from 'lucide-react'
import {catalog} from './domain'
import {anatomy,ExerciseArt} from './library'
import {exerciseCategory} from './gym-exercises'
import {muscleGroups} from './exercise-meta'
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()
export function ExercisePicker({choose,close}:{choose:(name:string)=>void;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[muscle,setMuscle]=useState('')
  useEffect(()=>{const node=dialog.current!;node.showModal();return()=>node.close()},[])
  const matches=catalog.filter(([id,name,aliases])=>(!category||exerciseCategory(id)===category)&&(!muscle||anatomy[id].slice(1).some(value=>value===muscle))&&normalize(name+' '+aliases+' '+anatomy[id].join(' ')).includes(normalize(query)))
  return <dialog ref={dialog} className="exercise-picker" onClose={close} aria-labelledby="picker-title">
    <header><h2 id="picker-title">Elegí un ejercicio</h2><button type="button" className="secondary icon-action" aria-label="Cerrar catálogo" onClick={close}><X size={20}/></button></header>
    <label className="picker-search"><Search size={18}/><input autoFocus type="search" aria-label="Buscar en el catálogo" placeholder="Nombre, músculo o equipo" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <div className="catalog-categories" role="group" aria-label="Tipo de ejercicio">{['','Fuerza','Cardio','Movilidad'].map(value=><button key={value} type="button" className="secondary" aria-pressed={value===category} onClick={()=>setCategory(value)}>{value||'Todos'}</button>)}</div>
    <label>Músculo<select value={muscle} onChange={event=>setMuscle(event.target.value)}><option value="">Todos</option>{muscleGroups.map(value=><option key={value}>{value}</option>)}</select></label>
    <p className="muted" role="status">{matches.length} ejercicios</p>
    <div className="picker-results">{matches.map(([id,name])=><button type="button" className="picker-exercise secondary" key={id} onClick={()=>choose(name)}><ExerciseArt id={id}/><span><strong>{name}</strong><small>{exerciseCategory(id)} · {anatomy[id][0]}</small></span></button>)}{!matches.length&&<p>Probá otro nombre o cambiá los filtros.</p>}</div>
  </dialog>
}
