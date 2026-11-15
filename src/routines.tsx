import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { catalog, exerciseSchema, parseRoutine, uid, weekDates, type Day, type Exercise, type Profile, type Routine } from './domain'
import { list, save, saveMany } from './store'
import { Library } from './library'

const templates = [
  ['Torso y pierna', 'Día 1 — Torso\nPress banca 3x8-12\nRemo barra 3x8-12\nDía 2 — Pierna\nSentadilla libre 3x8-12\nPrensa 3x10'],
  ['Push / Pull / Legs', 'Push\nPress banca 3x8-12\nTríceps polea 3x10\nPull\nJalón al pecho 3x8-12\nCurl martillo 3x10\nLegs\nSentadilla libre 3x8\nGemelos 3x12'],
  ['División de cinco días', 'Día 1 — Espalda y bíceps\nRemo T 3x8-12\nCurl inclinado con mancuernas 3x12\nDía 2 — Posterior de pierna\nHip thrust 3x12\nCamilla de isquios 3x12\nDía 3 — Pecho, hombros y tríceps\nPress banca 3x8\nElevaciones laterales 3x12\nTríceps polea 3x12\nDía 4 — Cuádriceps y abductores\nPrensa de cuádriceps 3x10\nAbductores en máquina 3x12\nDía 5 — Tren superior\nJalón al pecho cerrado 3x10\nPress inclinado mancuernas 3x10'],
]
const empty = () => ({ name: '', version: 1, source: '', days: [] })

export function Routines({ owner, date, weekStart, unit, start }: {
  owner: string; date: string; weekStart: number; unit: Profile['unit']; start: (id: string) => Promise<void>
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
    <section className="panel actions" aria-label="Crear una rutina">
      <a href="#importar">Importar texto</a><a href="#editor" onClick={() => { setDraft(empty()); setEditing('') }}>Crear desde cero</a><a href="#plantillas">Elegir plantilla</a><a href="#biblioteca">Biblioteca</a>
    </section>
    <section id="plantillas" className="panel">
      <h2>Plantillas</h2>
      <div className="actions">{templates.map(([name, source]) =>
        <a className="pixel-link" href="#editor" key={name} onClick={() => {
          setEditing(''); setDraft({ name, source, version: 1, days: parseRoutine(source, unit) })
        }}>{name}</a>
      )}</div>
    </section>
    <section className="panel">
      <h2>Plan semanal</h2>
      <button type="button" className="secondary" onClick={async () => {
        const previousWeek = new Date(days[0] + 'T00:00:00Z')
        previousWeek.setUTCDate(previousWeek.getUTCDate() - 7)
        const previous = weekDates(previousWeek.toISOString().slice(0, 10), weekStart)
        const entries = schedule.filter(item => previous.includes(item.data.date) && !item.data.skipped)
        if (!entries.length) { setMessage('La semana anterior no tiene sesiones para copiar.'); return }
        try {
          await saveMany(owner, 'schedule', entries.map(item => {
            const planned = days[previous.indexOf(item.data.date)]
            return { id: item.id.split(':')[0] + ':' + planned, data: { ...item.data, date: planned } }
          }))
          setMessage('Semana copiada.')
        } catch { setMessage('No se pudo copiar la semana.') }
      }}>Repetir semana anterior</button>
      {message && <p role="status">{message}</p>}
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
          <button className="secondary" onClick={() => void save(owner, 'routine', uid(), { ...item.data, name: item.data.name + ' (copia)', version: 1, archived: false, days: item.data.days.map(day => ({ ...day, id: uid() })) })}>Duplicar</button>
          <button className="secondary" onClick={() => void save(owner, 'routine', item.id, { ...item.data, archived: !item.data.archived })}>
            {item.data.archived ? 'Restaurar' : 'Archivar'}</button>
        </div>
        {!item.data.archived && item.data.days.length <= 7 && <button className="secondary" onClick={async () => {
          try {
            await saveMany(owner, 'schedule', item.data.days.map((day, index) => ({
              id: day.id + ':' + days[index], data: {
                date: days[index], title: day.title, exercises: day.exercises, routineId: item.id, version: item.data.version,
              },
            })))
            setMessage('Semana asignada.')
          } catch { setMessage('No se pudo asignar la semana.') }
        }}>Asignar semana completa</button>}
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
      <label id="importar">Importar desde texto<textarea rows={5} maxLength={40000} value={draft.source}
        onChange={event => setDraft({ ...draft, source: event.target.value })} placeholder={'Día 1 — Torso\nPress banca 4×8 — 70 kg'} /></label>
      <div className="actions">
        <button type="button" className="secondary" disabled={!draft.source.trim()} onClick={() => setDraft({ ...draft, days: parseRoutine(draft.source, unit) })}>Preparar vista previa</button>
      </div>
      {!!draft.days.length && <p>{draft.days.length} días · {draft.days.reduce((count, day) => count + day.exercises.length, 0)} ejercicios</p>}
      {draft.days.map(day => <fieldset key={day.id}><legend>Entrenamiento</legend>
        <label>Nombre del día<input required value={day.title} onChange={event => changeDay(day.id, value => ({ ...value, title: event.target.value }))} /></label>
        {day.exercises.map((exercise, index) => <fieldset className="exercise-edit" key={exercise.id}><legend>Ejercicio {index + 1}</legend>
          {exercise.warning && <p className="warning">{exercise.warning} · {exercise.original}</p>}
          {exercise.inferredUnit && <p className="warning">Unidad inferida: {exercise.unit}</p>}
          {exercise.superset && <div className="actions">
            <span className="pixel-link">Superserie {exercise.superset.name} · {exercise.superset.rounds} vueltas</span>
            <button type="button" className="secondary" onClick={() => changeExercise(day, exercise.id, { superset: undefined })}>Sacar del grupo</button>
          </div>}
          <label>Notas<input value={exercise.notes ?? ''} onChange={event => changeExercise(day, exercise.id, { notes: event.target.value })} /></label>
          <label>Ejercicio<input list="exercise-catalog" required value={exercise.name}
            onChange={event => changeExercise(day, exercise.id, { name: event.target.value, catalogId: catalog.find(entry => entry[1] === event.target.value)?.[0] ?? null })} /></label>
          <div className="input-grid">
            {([['sets','Series'], ['min','Reps mín.'], ['max','Reps máx.'], ['load','Carga'], ['rest','Descanso (s)']] as const).map(([key, label]) =>
              <label key={key}>{label}<input type="number" min={key === 'load' || key === 'rest' ? 0 : 1} step={key === 'load' ? 'any' : 1}
                value={exercise[key] ?? ''} onChange={event => changeExercise(day, exercise.id, { [key]: event.target.value === '' ? null : event.target.valueAsNumber })} /></label>)}
            <label>Unidad<select value={exercise.unit ?? ''} onChange={event => changeExercise(day, exercise.id, { inferredUnit: false, unit: event.target.value === 'lb' ? 'lb' : event.target.value === 'kg' ? 'kg' : null })}><option value="">Sin unidad</option><option>kg</option><option>lb</option></select></label>
            <label>Carga<select value={exercise.mode} onChange={event => changeExercise(day, exercise.id, { mode: event.target.value as Exercise['mode'] })}>
              <option value="unknown">Sin definir</option><option value="external">Externa</option><option value="per-side">Por lado</option>
              <option value="bodyweight">Corporal</option><option value="assisted">Asistida</option></select></label>
          </div>
          <div className="actions">
            {[-1, 1].map(step => <button key={step} type="button" className="secondary"
              disabled={!day.exercises[index + step]} onClick={() => changeDay(day.id, current => {
                const exercises = [...current.exercises]
                ;[exercises[index], exercises[index + step]] = [exercises[index + step], exercises[index]]
                return { ...current, exercises }
              })}>{step < 0 ? 'Subir' : 'Bajar'}</button>)}
            <button type="button" className="secondary" onClick={() => changeDay(day.id, current => {
              const exercises = [...current.exercises]
              exercises.splice(index + 1, 0, { ...exercise, id: uid() })
              return { ...current, exercises }
            })}>Duplicar ejercicio</button>
            <button type="button" className="secondary" onClick={() => changeDay(day.id, current => ({
              ...current, exercises: current.exercises.filter(entry => entry.id !== exercise.id),
            }))}>Quitar ejercicio</button>
          </div>
        </fieldset>)}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => {
            const exercise = parseRoutine('Ejercicio')[0].exercises[0]
            changeDay(day.id, current => ({ ...current, exercises: [...current.exercises, { ...exercise, name: '', original: '', warning: undefined }] }))
          }}>Agregar ejercicio</button>
          <button type="button" className="secondary" onClick={() => {
            const groups = new Map<string, string>()
            const exercises = day.exercises.map(exercise => {
              const group = exercise.superset
              if (group && !groups.has(group.id)) groups.set(group.id, uid())
              return { ...exercise, id: uid(), superset: group ? { ...group, id: groups.get(group.id)! } : undefined }
            })
            setDraft({ ...draft, days: [...draft.days, { ...day, id: uid(), title: day.title + ' (copia)', exercises }] })
          }}>Duplicar día</button>
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
    <Library />
  </>
}
