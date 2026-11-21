import {ExercisePicker} from './exercise-picker'
import {gymExercise} from './gym-exercises'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { catalog, exerciseSchema, findExercise, parseRoutine, reviseRoutine, uid, weekDates, type Day, type Exercise, type Profile, type Routine } from './domain'
import { muscleGroups, equipmentKinds } from './exercise-meta'
import { ExerciseTargets } from './library'
import { importPreview } from './import-preview'
import { Plus, Trash2, Camera } from 'lucide-react'
import { compactPhoto } from './photo'
import { fromKg, toKg } from './domain'
import { list, save, saveMany } from './store'

const empty = () => ({ name: '', version: 1, source: '', days: [],cover:11 })

export function Routines({ owner, date, weekStart, unit, start, mode, editId }: {
  owner: string; date: string; weekStart: number; unit: Profile['unit']; start: (id: string) => Promise<void>; mode: 'manual' | 'importar' | 'calendar'; editId?: string
}) {
  const routines = useLiveQuery(() => list(owner, 'routine'), [owner], [])
  const schedule = useLiveQuery(() => list(owner, 'schedule'), [owner], [])
  const [draft, setDraft] = useState<Routine>(empty)
  const [editing, setEditing] = useState('')
  const [message, setMessage] = useState('')
  const [picker,setPicker]=useState<{day:Day;exercise:Exercise}|null>(null)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [week, setWeek] = useState(date)
  const requested = routines.find(item => item.id === editId)
  const ownExercises = [...new Map(routines.flatMap(item => item.data.days.flatMap(day => day.exercises))
    .filter(exercise => exercise.custom).map(exercise => [exercise.custom!.id, exercise])).values()]
  useEffect(() => {
    if (!requested) return
    setEditing(requested.id)
    setDraft({ ...requested.data, version: requested.data.version + 1, days: requested.data.days.map(day => ({ ...day,
      exercises: day.exercises.map(exercise => ({ ...exercise, warning: exercise.reviewReason === 'missing' ? undefined : exercise.warning })) })) })
  }, [requested])
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
    if (savingRef.current) return
    setMessage('')
    if (draft.days.some(day => day.exercises.some(exercise => exercise.warning && !exercise.reviewAccepted))) {
      setMessage('Revisá y confirmá las líneas señaladas antes de guardar.'); return
    }
    if (!draft.name.trim() || !draft.days.length || draft.days.some(day =>
      !day.title.trim() || !day.exercises.length || day.exercises.some(exercise =>
        !exerciseSchema.safeParse(exercise).success || (exercise.min && exercise.max && exercise.max < exercise.min)))) {
      setMessage('Ingresá un nombre y revisá los días, ejercicios y rangos.')
      return
    }
    savingRef.current = true; setSaving(true)
    try {
      const current = routines.find(item => item.id === editing)?.data
      const proposed = { ...draft, name: draft.name.trim(), version: 1, rotateAB: undefined }
      const next = current ? reviseRoutine(current, proposed) : proposed
      await save(owner, 'routine', editing || uid(), next)
      setEditing(''); setDraft(empty()); setMessage('Rutina guardada.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar la rutina.') }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <>
    <h1>{mode === 'calendar' ? 'Organizar fechas' : mode === 'importar' ? 'Importar rutina' : 'Crear rutina'}</h1>
    {mode === 'calendar' && <><section className="panel">
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
          <button className="secondary" onClick={() => void save(owner, 'routine', uid(), { ...item.data, name: item.data.name + ' (copia)', version: 1, archived: false, history: undefined, days: item.data.days.map(day => ({ ...day, id: uid() })) })}>Duplicar</button>
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
    </>}
    {(mode !== 'calendar' || !!editing) && <form id="editor" className="panel" onSubmit={submit} inert={saving} aria-busy={saving}>
      <h2>{editing ? 'Editar rutina' : 'Nueva rutina'}</h2>
      {editing && draft.rotateAB && <p>Al guardar una versión propia, los próximos ciclos repetirán estos tres días sin alternarlos.</p>}
      {!!draft.history?.length && <details className="routine-history">
        <summary>Versiones anteriores</summary>
        {draft.history.map(snapshot => <button key={snapshot.version} type="button" className="secondary"
          onClick={() => {
            setDraft(current => ({ ...current, name: snapshot.name, source: snapshot.source, days: snapshot.days }))
            setMessage('Versión ' + snapshot.version + ' cargada. Guardá la rutina para aplicarla.')
          }}>Cargar versión {snapshot.version}</button>)}
      </details>}
      {editing && <button type="button" className="secondary" onClick={() => { setDraft(empty()); setEditing('') }}>Cancelar edición</button>}
      <label>Nombre de la rutina<input required value={draft.name} maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <div className="routine-image-field">
        {draft.photo && <img className="routine-photo" src={draft.photo} alt="Foto de la rutina"/>}
        <label><Camera size={17}/> Foto de la rutina<input type="file" accept="image/*" onChange={async event => {
          const file = event.target.files?.[0]
          if (!file) return
          setPreparingPhoto(true)
          try { const photo = await compactPhoto(file); setDraft(current => ({ ...current, photo })) }
          catch { setMessage('No se pudo cargar esa imagen.') }
          finally { setPreparingPhoto(false) }
        }}/></label>
        {draft.photo && <button className="secondary" type="button" onClick={() => setDraft(current => ({ ...current, photo: undefined }))}>Quitar foto</button>}
      </div>
      {mode !== 'manual' && <><p>Si faltan series o repeticiones, sugerimos 3 × 10. Podés editarlas antes de guardar.</p><label id="importar">Importar desde texto<textarea rows={5} maxLength={40000} value={draft.source}
        onChange={event => setDraft({ ...draft, source: event.target.value })} placeholder={'Día 1 — Torso\nPress banca 4×8 — 70 kg'} /></label>
      <div className="actions">
        <button type="button" className="secondary" disabled={!draft.source.trim()} onClick={() => setDraft({ ...draft, name: draft.name || 'Rutina importada', days: importPreview(draft.source, unit) })}>Preparar vista previa</button>
      </div>
      </>}
      {!!draft.days.length && <p>{draft.days.length} días · {draft.days.reduce((count, day) => count + day.exercises.length, 0)} ejercicios</p>}
      {draft.days.map(day => <fieldset key={day.id}><legend>Entrenamiento</legend>
        <label>Nombre del día<input required value={day.title} onChange={event => changeDay(day.id, value => ({ ...value, title: event.target.value }))} /></label>
        {day.exercises.map((exercise, index) => <fieldset className="exercise-edit" key={exercise.id}><legend>Ejercicio {index + 1}</legend>
          {exercise.warning && <p className="warning">{exercise.warning} · {exercise.original}</p>}
          {exercise.warning && <label className="review-line"><input type="checkbox" checked={!!exercise.reviewAccepted}
            onChange={event => changeExercise(day, exercise.id, { reviewAccepted: event.target.checked })}/> Revisé esta línea</label>}
          {exercise.inferredUnit && <p className="warning">Unidad inferida: {exercise.unit}</p>}
          {exercise.superset && <div className="actions">
            <span className="pixel-link">Superserie {exercise.superset.name} · {exercise.superset.rounds} vueltas</span>
            <button type="button" className="secondary" onClick={() => changeExercise(day, exercise.id, { superset: undefined })}>Sacar del grupo</button>
          </div>}
          {mode === 'importar' && exercise.notes && <small>{exercise.notes}</small>}
          <label>Ejercicio<input list="exercise-catalog" required value={exercise.name}
            onChange={event => {
              const name = event.target.value
              const recognized = findExercise(name)
              const own = ownExercises.find(entry => entry.name.toLocaleLowerCase('es-AR') === name.trim().toLocaleLowerCase('es-AR'))
              changeExercise(day, exercise.id, {
                name, catalogId: recognized?.[0] ?? null,
                custom: recognized ? undefined : own?.custom ?? exercise.custom,
                ...(own && !recognized ? { mode: own.mode } : {}),
                ...(recognized ? { warning: undefined, reviewAccepted: undefined } : {}),
                ...(recognized && recognized[0] !== exercise.catalogId ? { mode: parseRoutine(recognized[1], unit)[0].exercises[0].mode,
                  measure: parseRoutine(recognized[1],unit)[0].exercises[0].measure,
                  ...(parseRoutine(recognized[1],unit)[0].exercises[0].measure==='seconds'?{load:null,unit:null,sets:1,min:gymExercise(recognized[0])?.duration??30,max:gymExercise(recognized[0])?.duration??30,rest:0}:{}) } : {}),
              })
            }} /></label>
          <button type="button" className="secondary catalog-open" onClick={()=>setPicker({day,exercise})}>Buscar en el catálogo</button>
          {!exercise.catalogId && <div className="custom-exercise-fields">
            <div className="input-grid">
              <label>Músculo principal<select aria-label="Músculo principal" value={exercise.custom?.primary ?? ''} onChange={event => {
                if (!event.target.value) return
                changeExercise(day, exercise.id, { custom: { id: exercise.custom?.id ?? uid(), primary: event.target.value as typeof muscleGroups[number],
                  secondary: (exercise.custom?.secondary ?? []).filter(value => value !== event.target.value), equipment: exercise.custom?.equipment ?? 'Otro' } })
              }}><option value="">Sin clasificar</option>{muscleGroups.map(muscle => <option key={muscle}>{muscle}</option>)}</select></label>
              <label>Equipo<select aria-label="Equipo" disabled={!exercise.custom} value={exercise.custom?.equipment ?? 'Otro'} onChange={event => {
                if (exercise.custom) changeExercise(day, exercise.id, { custom: { ...exercise.custom, equipment: event.target.value as typeof equipmentKinds[number] } })
              }}>{equipmentKinds.map(gear => <option key={gear}>{gear}</option>)}</select></label>
            </div>
            {exercise.custom && <>
              <label>Cómo anotás el peso<select aria-label="Cómo anotás el peso" required value={exercise.mode === 'unknown' ? '' : exercise.mode} onChange={event => changeExercise(day, exercise.id, { mode: event.target.value as Exercise['mode'] })}>
                <option value="" disabled>Elegí una opción</option><option value="external">Peso total</option><option value="per-side">Por mano o lado</option>
                <option value="bodyweight">Peso corporal</option><option value="assisted">Asistencia</option>
              </select></label>
              <details><summary>Músculos secundarios</summary><div className="custom-muscles">
                {muscleGroups.filter(muscle => muscle !== exercise.custom?.primary).map(muscle => <label key={muscle}><input type="checkbox"
                  checked={exercise.custom!.secondary.includes(muscle)} onChange={event => changeExercise(day, exercise.id, { custom: { ...exercise.custom!,
                    secondary: event.target.checked ? [...exercise.custom!.secondary, muscle] : exercise.custom!.secondary.filter(value => value !== muscle) } })}/>{muscle}</label>)}
              </div></details>
              <ExerciseTargets id={null} custom={exercise.custom}/>
            </>}
          </div>}
          <div className="input-grid compact-fields">
            <label>Series<input type="number" min="1" value={exercise.sets ?? ''}
              onChange={event => changeExercise(day, exercise.id, { sets: event.target.valueAsNumber || null })}/></label>
            <label>{exercise.measure === 'seconds' ? 'Segundos' : 'Repeticiones'}<input type="number" min="1" max={exercise.measure==='seconds'?86400:1000} value={exercise.min ?? ''}
              onChange={event => changeExercise(day, exercise.id, { min: event.target.valueAsNumber || null, max: event.target.valueAsNumber || null })}/></label>
            {exercise.measure !== 'seconds' && <label>{exercise.mode==='assisted'?'Asistencia':'Peso'} ({unit})<input inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?"
              key={exercise.id + ':' + unit} defaultValue={exercise.load === null ? '' : fromKg(toKg(exercise.load, exercise.unit ?? unit), unit)}
              onChange={event => {
                const value = event.target.value
                if (!value || /^\d+(?:[.,]\d+)?$/.test(value)) changeExercise(day, exercise.id, { load: value ? Number(value.replace(',', '.')) : null, unit, inferredUnit: false })
              }}/></label>}
          </div>
          {exercise.measure==='seconds' && <label>Uso<select value={exercise.type==='warmup'?'warmup':'work'} onChange={event=>changeExercise(day,exercise.id,{type:event.target.value as Exercise['type']})}><option value="warmup">Calentamiento</option><option value="work">Cardio o finalización</option></select></label>}
          <button type="button" className="secondary icon-action" aria-label="Quitar ejercicio" onClick={() => changeDay(day.id, current => ({
            ...current, exercises: current.exercises.filter(entry => entry.id !== exercise.id),
          }))}><Trash2 size={17}/></button>
        </fieldset>)}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => {
            const exercise = parseRoutine('Ejercicio')[0].exercises[0]
            changeDay(day.id, current => ({ ...current, exercises: [...current.exercises, { ...exercise, name: '', original: '', warning: undefined }] }))
          }}><Plus size={16}/> Agregar ejercicio</button>
          <button type="button" className="secondary icon-action" aria-label="Quitar día"
            onClick={() => setDraft(current => ({ ...current, days: current.days.filter(entry => entry.id !== day.id) }))}><Trash2 size={17}/></button>
        </div>
      </fieldset>)}
      <datalist id="exercise-catalog">{catalog.map(([id, name]) => <option key={id} value={name} />)}{ownExercises.map(exercise => <option key={exercise.custom!.id} value={exercise.name}/>)}</datalist>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => setDraft({ ...draft, days: [...draft.days, { id: uid(), title: 'Día ' + (draft.days.length + 1), exercises: [] }] })}>Agregar día</button>
        <button disabled={preparingPhoto || saving}>{saving ? 'Guardando…' : 'Guardar rutina'}</button>
      </div>
      {message && <p role="status">{message}</p>}
    </form>}
    {picker && <ExercisePicker close={()=>setPicker(null)} choose={name=>{
      const selected=parseRoutine(name,unit)[0].exercises[0]
      const timed=selected.measure==='seconds'
      const min=timed?(gymExercise(selected.catalogId)?.duration??30):10
      changeExercise(picker.day,picker.exercise.id,{...selected,id:picker.exercise.id,sets:timed?1:3,min,max:min,rest:timed?0:selected.rest,warning:undefined,reviewReason:undefined,reviewAccepted:undefined,custom:undefined})
      setPicker(null)
    }}/>}
    {mode !== 'calendar' && <p><Link to="/rutinas">Volver a Rutinas</Link></p>}
  </>
}
