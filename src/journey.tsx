import { selectPetTraining } from './training-selection'
import { preloadPetTraining } from './pet-training'
import { useEffect, useState } from 'react'
import { Link,useSearchParams } from 'react-router-dom'
import { Camera, Pencil, Plus, Share2, Dumbbell } from 'lucide-react'
import { Companion } from './companion'
import { ExerciseDemonstration } from './movement'
import { compactPhoto } from './photo'
import { ExerciseArt, ExerciseTargets } from './library'
import { programRoutine } from './programs'
import {explorePrograms} from './explore-programs'
import {RoutineCover as Cover} from './routine-cover'
import { catalog, routineShareText, type Routine } from './domain'
import type { Item } from './store'
import {useScreenFocus} from './mobile-behavior'

export function Train({ routine, index, active, companion, xp, activeExercises, start, repeat,offlineArt,retryArt }: {
  routine?: Routine; index: number; active?: string; companion: string; xp: number;
  activeExercises?: (string | null)[]; start: () => void; repeat: () => void;
  offlineArt?:'preparing'|'ready'|'unavailable';retryArt?:()=>void;
}) {
  const day = routine?.days[index]
  const candidates = active ? activeExercises ?? [] : day?.exercises.map(exercise => exercise.catalogId) ?? []
  const demonstration = selectPetTraining(companion, candidates)
  const exercise = demonstration.exercise
  const demoName = catalog.find(([id]) => id === exercise)?.[1]
  useEffect(() => {
    if (xp >= 100 && routine) void preloadPetTraining(companion, routine.days.map(day => selectPetTraining(companion, day.exercises.map(exercise => exercise.catalogId)).exercise))
  }, [routine, companion, xp])
  return <>
    <div className="page-heading"><h1>Entrenar</h1></div>
    {(routine||active)&&offlineArt!=='ready'&&<p className="offline-art-status" role="status">{offlineArt==='unavailable'?'Faltan imágenes por descargar. Podés seguir registrando tus series.':'Preparando imágenes para entrenar sin conexión…'}
      {offlineArt==='unavailable'&&<button type="button" className="secondary" onClick={retryArt}>Reintentar descarga</button>}
    </p>}
    <section className={'panel quest-card' + (active || day ? ' quest-card-expanded' : '')} key={day?.id ?? 'empty'}>
      <div><p className="eyebrow">{active ? 'EN CURSO' : day ? 'DÍA ' + (index + 1) + ' DE ' + routine!.days.length : routine ? 'CICLO COMPLETADO' : 'PRÓXIMO ENTRENAMIENTO'}</p>
        <h2>{active ?? day?.title ?? routine?.name ?? 'Creá tu primera rutina'}</h2>
        {!routine && !active && <p>Para empezar a entrenar, creá una rutina con tus ejercicios.</p>}
        {day && <p>{routine!.name} · {day.exercises.length} ejercicios</p>}
        {!active && !day && (routine ? <button onClick={repeat}>Repetir ciclo</button> : <Link className="profile-shop-link" to="/editor/manual"><Plus size={17} aria-hidden="true"/>Crear rutina</Link>)}
      </div>
      {(active || day) && <button className="quest-start" onClick={start}>{active ? 'Continuar' : 'Empezar'}</button>}
      <div className="quest-demo">{exercise && xp >= 100
        ? <ExerciseDemonstration key={exercise} id={exercise} pet={demonstration.companion} petXp={xp}/>
        : <div className={day && xp >= 100 ? 'pet-ready' : undefined}><Companion name={companion} xp={xp}/></div>}
        {exercise && xp >= 100 && <span className="training-coach-label">{demonstration.fallback && 'Dragón · '}{demoName}</span>}
      </div>
    </section>
  </>
}

export function ProgramLibrary({ routines, activate, updateCover }: { routines: Item<'routine'>[]; activate: (routine: Routine, id?: string) => Promise<void>; updateCover: (id: string, routine: Routine) => Promise<void> }) {
  const [params,setParams]=useSearchParams()
  const mine=params.get('tab')==='mis'
  const setMine=(value:boolean)=>setParams(value?{tab:'mis'}:{})
  const [selected, select] = useState<number>()
  useScreenFocus('program:'+selected,'')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const program = selected === undefined ? undefined : explorePrograms[selected]
  async function use(routine: Routine, id?: string) {
    setBusy(true); setError('')
    try { await activate(routine, id) }
    catch { setError('No pudimos activar la rutina.'); }
    finally { setBusy(false) }
  }
  return <><div className="page-heading"><h1>Rutinas</h1><Link className="profile-shop-link" to="/editor/manual"><Plus size={17} aria-hidden="true"/>Crear rutina</Link></div>
    <div className="actions tabs"><button className={mine ? 'secondary' : ''} aria-pressed={!mine} onClick={() => { setMine(false); select(undefined) }}>Explorar</button>
      <button className={mine ? '' : 'secondary'} aria-pressed={mine} onClick={() => { setMine(true); select(undefined) }}>Mis rutinas</button></div>
    {error && <p role="alert">{error}</p>}
    {program && selected !== undefined ? <article className={'panel'+(program.featured?' dev-program-detail':'')}>
      <button className="secondary" onClick={() => select(undefined)}>Volver a explorar</button>
      <Cover index={program.cover} /><h2>{program.name}</h2><p>{program.goal}</p>
      <p>{program.level} · {program.equipment} · {program.days.length} días</p>
      <button disabled={busy} onClick={() => void use(programRoutine(program))}>Usar rutina</button>
      <p>{program.progression}</p>{program.source && <p>Inspirada en <a href={program.source}>{program.reference}</a>.</p>}
      <p className="program-adaptation">{program.adaptation}</p><p>{program.recovery}</p>
      {programRoutine(program).days.map((day, i) => <details className="exercise-card" key={i}><summary>Día {i + 1}</summary>
        {day.exercises.map(exercise => <div className="program-move" key={exercise.id}><div><h3>{exercise.name}</h3>
          <small>{exercise.sets ? exercise.sets + ' series' : 'Series a definir'}{exercise.min ? ' · ' + exercise.min + (exercise.max !== exercise.min ? '–' + exercise.max : '') + (exercise.measure === 'seconds' ? ' s' : ' reps') : ''}{exercise.rest ? ' · ' + exercise.rest + ' s descanso' : ''}</small><div className="move-visual"><ExerciseArt id={exercise.catalogId}/><div><ExerciseTargets id={exercise.catalogId}/></div></div></div></div>)}
      </details>)}
    </article> : mine ? <section className="panel">
      {!routines.length && <p>Tus rutinas guardadas van a aparecer acá.</p>}
      {routines.filter(item => !item.data.archived).map(item => <article className="my-routine" key={item.id}>
        {item.data.photo ? <img className="routine-photo" src={item.data.photo} alt=""/> : <Cover index={item.data.cover ?? 11}/>}
        <h3>{item.data.name}</h3><small>{item.data.days.length} días</small>
        <details><summary>Ver rutina</summary>
          {item.data.days.map(day => <div key={day.id}><h4>{day.title}</h4><ul>
            {day.exercises.map(exercise => <li key={exercise.id}>{exercise.name}</li>)}
          </ul></div>)}
        </details>
        <div className="actions routine-actions">
          <button disabled={busy} onClick={() => void use(item.data, item.id)}>Usar rutina</button>
          <Link className="icon-action" to={'/editor/manual?rutina=' + item.id} aria-label="Editar"><Pencil size={18}/></Link>
          <a className="icon-action" href={'https://wa.me/?text=' + encodeURIComponent(item.data.name + '\n\n' + routineShareText(item.data))}
            target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp"><Share2 size={18}/></a>
        </div>
        <details className="routine-cover-picker"><summary><Camera size={16}/> Cambiar foto</summary>
          <div className="cover-choices">{[11,12,13].map(index =>
            <button key={index} className="secondary" aria-label={'Elegir portada ' + ['Básica','Intermedia','Avanzada'][index-11]}
              onClick={() => void updateCover(item.id, { ...item.data, cover: index, photo: undefined }).catch(() => setError('No se pudo cambiar la portada.'))}><Cover index={index}/></button>)}</div>
          <label>Subir foto<input type="file" accept="image/*" onChange={async event => {
            const file = event.target.files?.[0]
            if (!file) return
            try { await updateCover(item.id, { ...item.data, photo: await compactPhoto(file) }) }
            catch { setError('No se pudo cargar la foto. Probá con otra imagen.') }
          }}/></label>
        </details>
      </article>)}
    </section> : <div className="program-grid curated-programs">{explorePrograms.map((entry, index) =>
      <button className={'program-card secondary'+(entry.featured?' dev-program-card':'')} onClick={() => select(index)} key={entry.name}>
        <Cover index={entry.cover}/><strong>{entry.name}</strong><small>{entry.days.length} días · {entry.level}</small>
      </button>)}</div>}
  </>
}

