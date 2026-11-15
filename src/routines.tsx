import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { catalog, exerciseSchema, parseRoutine, uid, weekDates, type Day, type Exercise, type Routine } from './domain'
import { list, save } from './store'

const template = 'Día 1 — Torso\nPress banca 3x8-12\nRemo barra 3x8-12\nDía 2 — Pierna\nSentadilla libre 3x8-12\nPrensa 3x10'
const empty = () => ({ name: '', version: 1, source: '', days: [] })

export function Routines({ owner, date, weekStart, start }: {
  owner: string; date: string; weekStart: number; start: (id: string) => Promise<void>
}) {
  const routines = useLiveQuery(() => list(owner, 'routine'), [owner], [])
  const schedule = useLiveQuery(() => list(owner, 'schedule'), [owner], [])
  const [draft, setDraft] = useState<Routine>(empty)
  const [editing, setEditing] = useState('')
  const [message, setMessage] = useState('')
  const [week, setWeek] = useState(date)
  const days = weekDates(week, weekStart)

  function changeDay(dayId: string, update: (day: Day) => Day) {
    setDraft(current => ({ ...current, days: current.days.map(day => day.id === dayId ? update(day) : day) }))
  }
  function changeExercise(day: Day, id: string, patch: Partial<Exercise>) {
    changeDay(day.id, current => ({ ...current, exercises: current.exercises.map(exercise =>
      exercise.id === id ? { ...exercise, ...patch } : exercise) }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.days.length || draft.days.some(day =>
      !day.title.trim() || !day.exercises.length || day.exercises.some(exercise =>
        !exerciseSchema.safeParse(exercise).success || (exercise.min && exercise.max && exercise.max < exercise.min)))) {
      setMessage('Ingresá un nombre y revisá los días, ejercicios y rangos.')
      return
    }
    try {
      await save(owner, 'routine', editing || uid(), { ...draft, name: draft.name.trim() })
      setEditing(''); setDraft(empty()); setMessage('Rutina guardada.')
    } catch { setMessage('No se pudo guardar la rutina.') }
  }
  return <>
    <h1>Entrenar</h1>
    <section className="panel">
      <h2>Plan semanal</h2>
      <label>Ver semana de<input type="date" value={week} onChange={event => { if (event.target.value) setWeek(event.target.value) }} /></label>
      {days.map(day => <div className="schedule" key={day}>
        <strong>{new Date(day + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</strong>
        {schedule.filter(item => item.data.date === day).map(item => <div className="schedule-item" key={item.id}>
          <span>{item.data.title}{item.data.skipped && ' · Saltado'}</span>
          <div className="actions">
            {!item.data.skipped && <button type="button" onClick={() => void start(item.id)}>Empezar</button>}
            <button className="secondary" onClick={() => void save(owner, 'schedule', item.id, { ...item.data, skipped: !item.data.skipped })}>
              {item.data.skipped ? 'Restaurar' : 'Saltar'}</button>
            <label>Mover a<input type="date" value={day} onChange={event => {
              if (event.target.value) void save(owner, 'schedule', item.id, { ...item.data, date: event.target.value })
            }} /></label>
          </div>
        </div>)}
      </div>)}
    </section>
    <section className="panel">
      <h2>Mis rutinas</h2>
      {!routines.length && <p>Creá tu primera rutina más abajo.</p>}
      {routines.map(item => <article className="schedule" key={item.id}>
        <h3>{item.data.name}{item.data.archived && ' · Archivada'}</h3>
        <div className="actions">
          <a href="#editor" onClick={() => { setEditing(item.id); setDraft({ ...item.data, version: item.data.version + 1 }) }}>Editar</a>
          <button className="secondary" onClick={() => void save(owner, 'routine', uid(), { ...item.data, name: item.data.name + ' (copia)', version: 1, archived: false })}>Duplicar</button>
          <button className="secondary" onClick={() => void save(owner, 'routine', item.id, { ...item.data, archived: !item.data.archived })}>
            {item.data.archived ? 'Restaurar' : 'Archivar'}</button>
        </div>
        {!item.data.archived && item.data.days.map(day => <form className="schedule-item" key={day.id} onSubmit={event => {
          event.preventDefault()
          const planned = String(new FormData(event.currentTarget).get('date'))
          void save(owner, 'schedule', uid(), {
            date: planned, title: day.title, exercises: day.exercises, routineId: item.id, version: item.data.version,
          }).then(() => setWeek(planned))
        }}>
          <label>{day.title}<input aria-label={'Fecha para ' + day.title} type="date" name="date" defaultValue={date} required /></label>
          <button className="secondary">Asignar día</button>
        </form>)}
      </article>)}
    </section>
    <form id="editor" className="panel" onSubmit={submit}>
      <h2>{editing ? 'Editar rutina' : 'Nueva rutina'}</h2>
      {editing && <button type="button" className="secondary" onClick={() => { setDraft(empty()); setEditing('') }}>Cancelar edición</button>}
      <label>Nombre de la rutina<input required value={draft.name} maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Importar desde texto<textarea rows={5} maxLength={40000} value={draft.source}
        onChange={event => setDraft({ ...draft, source: event.target.value })} placeholder={'Día 1 — Torso\nPress banca 4×8 — 70 kg'} /></label>
      <div className="actions">
        <button type="button" className="secondary" disabled={!draft.source.trim()} onClick={() => setDraft({ ...draft, days: parseRoutine(draft.source) })}>Preparar vista previa</button>
        <button type="button" className="secondary" onClick={() => setDraft({ ...draft, name: draft.name || 'Torso y pierna', source: template, days: parseRoutine(template) })}>Usar plantilla</button>
      </div>
      {!!draft.days.length && <p>{draft.days.length} días · {draft.days.reduce((count, day) => count + day.exercises.length, 0)} ejercicios</p>}
      {draft.days.map(day => <fieldset key={day.id}><legend>Entrenamiento</legend>
        <label>Nombre del día<input required value={day.title} onChange={event => changeDay(day.id, value => ({ ...value, title: event.target.value }))} /></label>
        {day.exercises.map((exercise, index) => <fieldset className="exercise-edit" key={exercise.id}><legend>Ejercicio {index + 1}</legend>
          {exercise.warning && <p className="warning">{exercise.warning} · {exercise.original}</p>}
          <label>Ejercicio<input list="exercise-catalog" required value={exercise.name}
            onChange={event => changeExercise(day, exercise.id, { name: event.target.value, catalogId: catalog.find(entry => entry[1] === event.target.value)?.[0] ?? null })} /></label>
          <div className="input-grid">
            {([['sets','Series'], ['min','Reps mín.'], ['max','Reps máx.'], ['load','Carga'], ['rest','Descanso (s)']] as const).map(([key, label]) =>
              <label key={key}>{label}<input type="number" min={key === 'load' || key === 'rest' ? 0 : 1} step={key === 'load' ? 'any' : 1}
                value={exercise[key] ?? ''} onChange={event => changeExercise(day, exercise.id, { [key]: event.target.value === '' ? null : event.target.valueAsNumber })} /></label>)}
            <label>Unidad<select value={exercise.unit ?? ''} onChange={event => changeExercise(day, exercise.id, { unit: event.target.value === 'lb' ? 'lb' : event.target.value === 'kg' ? 'kg' : null })}><option value="">Sin unidad</option><option>kg</option><option>lb</option></select></label>
            <label>Carga<select value={exercise.mode} onChange={event => changeExercise(day, exercise.id, { mode: event.target.value as Exercise['mode'] })}>
              <option value="unknown">Sin definir</option><option value="external">Externa</option><option value="per-side">Por lado</option>
              <option value="bodyweight">Corporal</option><option value="assisted">Asistida</option></select></label>
          </div>
          <button type="button" className="secondary" onClick={() => changeDay(day.id, value => ({ ...value, exercises: value.exercises.filter(entry => entry.id !== exercise.id) }))}>Quitar ejercicio</button>
        </fieldset>)}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => {
            const exercise = parseRoutine('Ejercicio')[0].exercises[0]
            changeDay(day.id, current => ({ ...current, exercises: [...current.exercises, { ...exercise, name: '', original: '', warning: undefined }] }))
          }}>Agregar ejercicio</button>
          <button type="button" className="secondary" onClick={() => setDraft({ ...draft, days: draft.days.filter(entry => entry.id !== day.id) })}>Quitar día</button>
        </div>
      </fieldset>)}
      <datalist id="exercise-catalog">{catalog.map(([id, name]) => <option key={id} value={name} />)}</datalist>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => setDraft({ ...draft, days: [...draft.days, { id: uid(), title: 'Día ' + (draft.days.length + 1), exercises: [] }] })}>Agregar día</button>
        <button>Guardar rutina</button>
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  </>
}
