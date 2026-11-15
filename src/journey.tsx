import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Plus } from 'lucide-react'
import { Companion, companions } from './companion'
import { ExerciseArt, ExerciseTargets } from './library'
import { programRoutine, programs } from './programs'
import { toKg, fromKg, type Profile, type Routine } from './domain'
import type { Item } from './store'

const personality = ['Curioso y valiente', 'Paciente y decidido', 'Fuerte y tranquilo', 'Ágil y leal']

export function Onboarding({ profile, save, checkpoint }: { profile: Profile; save: (profile: Profile) => Promise<void>; checkpoint: (profile: Profile) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draftName, setName] = useState(profile.name)
  const [selected, select] = useState(profile.companion)
  const [unit, setUnit] = useState(profile.unit)
  const [weightValue, setWeight] = useState(profile.weightKg ? String(fromKg(profile.weightKg, profile.unit)) : '')
  const [hatching, hatch] = useState(false)
  function remember(name: string, weight: string, nextUnit: Profile['unit'], companion: string) {
    const numeric = Number(weight)
    checkpoint({ ...profile, name, unit: nextUnit, companion,
      weightKg: Number.isFinite(numeric) && numeric > 0 ? toKg(numeric, nextUnit) : undefined })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name')).trim()
    if (!name) { setError('Ingresá el nombre que querés usar.'); return }
    const weight = String(fields.get('weight'))
    setBusy(true)
    try {
      await save({ ...profile, name, unit, weightKg: weight ? toKg(Number(weight), unit) : undefined,
        companion: selected, starter: selected, onboarded: true })
    } catch { setError('No pudimos guardar el perfil. Probá de nuevo.'); setBusy(false); hatch(false) }
  }
  return <section className="panel onboarding">
    <p className="eyebrow">TU PRIMER COMPAÑERO</p><h1>Armá tu equipo</h1>
    <form onSubmit={submit}>
      <label>Tu nombre<input name="name" autoComplete="nickname" value={draftName} onChange={event => { setName(event.target.value); remember(event.target.value, weightValue, unit, selected) }} maxLength={60} required /></label>
      <div className="input-grid">
        <label>Peso (opcional)<input type="number" name="weight" min="1" max={unit === 'kg' ? 700 : 1543} step="any" inputMode="decimal"
          value={weightValue} onChange={event => { setWeight(event.target.value); remember(draftName, event.target.value, unit, selected) }} /></label>
        <label>Unidad<select value={unit} onChange={event => { const next = event.target.value === 'lb' ? 'lb' : 'kg'; const value = weightValue ? String(fromKg(toKg(Number(weightValue), unit), next)) : ''; setWeight(value); setUnit(next); remember(draftName, value, next, selected) }}><option>kg</option><option>lb</option></select></label>
      </div>
      <div className="companion-picker" aria-label="Elegí tu compañero">
        {companions.map((name, index) => <button type="button" key={name} className="secondary egg-choice"
          aria-pressed={selected === name} onClick={() => { select(name); hatch(true); remember(draftName, weightValue, unit, name) }}>
          {selected === name && hatching ? <Companion name={name} stage="bebé" /> :
            <span className={'egg egg-' + index} aria-hidden="true" />}
          <strong>{name}</strong><small>{personality[index]}</small>
        </button>)}
      </div>
      <button disabled={busy}>Confirmar compañero</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>
}

export function Train({ routine, index, active, companion, stage, start, skip, repeat, delay }: {
  routine?: Routine; index: number; active?: string; companion: string; stage: 'bebé' | 'joven' | 'adulta';
  start: () => void; skip: () => void; repeat: () => void; delay: () => void;
}) {
  const [create, showCreate] = useState(false)
  const day = routine?.days[index]
  return <>
    <div className="page-heading"><h1>Entrenar</h1><button aria-expanded={create} onClick={() => showCreate(!create)}><Plus size={17}/>Crear rutina</button></div>
    {create && <section className="panel actions"><Link className="pixel-link" to="/editor/manual">Crear manualmente</Link><Link className="pixel-link" to="/editor/importar">Importar texto</Link></section>}
    <section className="panel quest-card" key={day?.id ?? 'empty'}>
      <div><p className="eyebrow">{active ? 'EN CURSO' : day ? 'DÍA ' + (index + 1) + ' DE ' + routine!.days.length : routine ? 'CICLO COMPLETADO' : 'PRÓXIMO ENTRENAMIENTO'}</p>
        <h2>{active ?? day?.title ?? routine?.name ?? 'Elegí una rutina'}</h2>
        {day && <p>{routine!.name} · {day.exercises.length} ejercicios</p>}
        {active || day ? <button onClick={start}>{active ? 'Continuar' : 'Empezar'}</button>
          : routine ? <button onClick={repeat}>Repetir ciclo</button> : <Link className="pixel-link" to="/rutinas">Explorar rutinas <ChevronRight size={16}/></Link>}
      </div>
      <Companion name={companion} stage={stage} />
    </section>
    {!active && day && <details className="panel"><summary>Opciones de la rutina</summary><div className="actions">
      <button className="secondary" onClick={skip}>Saltar día</button><button className="secondary" onClick={delay}>Mover al final</button><Link to="/calendario">Organizar fechas</Link>
    </div></details>}
    {!day && <Link to="/calendario">Organizar fechas</Link>}
  </>
}

export function ProgramLibrary({ routines, activate }: { routines: Item<'routine'>[]; activate: (routine: Routine, id?: string) => Promise<void> }) {
  const [mine, setMine] = useState(false)
  const [selected, select] = useState<number>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const program = selected === undefined ? undefined : programs[selected]
  async function use(routine: Routine, id?: string) {
    setBusy(true); setError('')
    try { await activate(routine, id) }
    catch { setError('No pudimos activar la rutina.'); }
    finally { setBusy(false) }
  }
  return <><h1>Rutinas</h1>
    <div className="actions tabs"><button className={mine ? 'secondary' : ''} aria-pressed={!mine} onClick={() => { setMine(false); select(undefined) }}>Explorar</button>
      <button className={mine ? '' : 'secondary'} aria-pressed={mine} onClick={() => { setMine(true); select(undefined) }}>Mis rutinas</button></div>
    {error && <p role="alert">{error}</p>}
    {program && selected !== undefined ? <article className="panel">
      <button className="secondary" onClick={() => select(undefined)}>Volver a explorar</button>
      <Cover index={selected} /><h2>{program.name}</h2><p>{program.goal}</p>
      <p>{program.level} · {program.equipment} · {program.days.length} días</p>
      <button disabled={busy} onClick={() => void use(programRoutine(program))}>Usar rutina</button>
      <p>{program.progression}</p><p>Inspirada en <a href={program.source}>{program.reference}</a>.</p>
      {programRoutine(program).days.map((day, i) => <details className="exercise-card" key={i}><summary>Día {i + 1}</summary>
        {day.exercises.map(exercise => <div className="program-move" key={exercise.id}><ExerciseArt id={exercise.catalogId}/><span>{exercise.name}
          <small>{exercise.sets ? exercise.sets + ' series' : 'Series a definir'}{exercise.min ? ' · ' + exercise.min + (exercise.max !== exercise.min ? '–' + exercise.max : '') + ' reps' : ''}{exercise.rest ? ' · ' + exercise.rest + ' s' : ''}</small><ExerciseTargets id={exercise.catalogId}/></span></div>)}
      </details>)}
    </article> : mine ? <section className="panel">
      {!routines.length && <p>Tus rutinas guardadas van a aparecer acá.</p>}
      {routines.filter(item => !item.data.archived).map(item => <div className="schedule" key={item.id}><h3>{item.data.name}</h3>
        <div className="actions"><button disabled={busy} onClick={() => void use(item.data, item.id)}>Usar rutina</button><Link to={'/editor/manual?rutina=' + item.id}>Editar</Link></div></div>)}
      <Link to="/calendario">Administrar rutinas guardadas</Link>
    </section> : <div className="program-grid">{programs.map((entry, index) =>
      <button className="program-card secondary" onClick={() => select(index)} key={entry.name}>
        <Cover index={index}/><strong>{entry.name}</strong><small>{entry.days.length} días · {entry.level}</small>
      </button>)}</div>}
    <p><Link to="/ejercicios"><BookOpen size={16}/> Biblioteca de ejercicios</Link></p>
  </>
}

function Cover({ index }: { index: number }) {
  return <span className="program-cover" aria-hidden="true" style={{
    '--cover-x': (index % 5) * 25 + '%', '--cover-y': index < 5 ? '0%' : '100%',
    '--cover-hue': index * 39,
  } as React.CSSProperties} />
}
