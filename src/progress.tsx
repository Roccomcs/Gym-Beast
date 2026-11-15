import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fromKg, metrics, weekDates, type Exercise, type Profile } from './domain'
import type { Item } from './store'

const identity = (exercise: Exercise) =>
  (exercise.catalogId ?? exercise.name.trim().toLocaleLowerCase('es-AR')) + ':' + exercise.mode

export function Progress({ sessions, sets, unit, today, weekStart }: {
  sessions: Item<'session'>[]; sets: Item<'set'>[]; unit: Profile['unit']; today: string; weekStart: number
}) {
  const [calendar, selectDate] = useState(today)
  const [selection, select] = useState('')
  const dates = weekDates(calendar, weekStart)
  const weekSessions = sessions.filter(item => dates.includes(item.data.date) && !item.data.incomplete)
  const weekVolume = weekSessions.reduce((sum, item) => sum + item.data.exercises.reduce((total, exercise) =>
    total + metrics(sets.filter(set => set.data.sessionId === item.id && set.data.exerciseId === exercise.id)
      .map(set => set.data), exercise).volume, 0), 0)
  const options = new Map(sessions.flatMap(item =>
    item.data.exercises.map(exercise => [identity(exercise), exercise.name] as const)))
  const selected = options.has(selection) ? selection : options.keys().next().value
  const points = sessions.flatMap(item => item.data.exercises.filter(exercise => identity(exercise) === selected).flatMap(exercise => {
    const result = metrics(sets.filter(set => set.data.sessionId === item.id && set.data.exerciseId === exercise.id)
      .map(set => set.data), exercise)
    return result.peak > 0 ? [{ key: item.id + ':' + exercise.id, date: item.data.date, ...result }] : []
  }))
  const peak = Math.max(0, ...points.map(point => point.peak))
  return <><h1>Progreso</h1>
    <section className="panel">
      <h2>Calendario de actividad</h2>
      <label>Semana de<input type="date" value={calendar} onChange={event => {
        if (event.target.value) selectDate(event.target.value)
      }}/></label>
      <p>{weekSessions.length} sesiones completadas · {fromKg(weekVolume, unit)} {unit} de volumen</p>
      <ol className="activity-calendar">{dates.map(date => {
        const entries = weekSessions.filter(item => item.data.date === date)
        return <li key={date}><time dateTime={date}>
          {new Date(date + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })}
        </time>{entries.length ? entries.map(item =>
          <NavLink key={item.id} to={'/sesion/' + item.id}>{item.data.title}</NavLink>) : <span>Sin sesión</span>}</li>
      })}</ol>
    </section>
    {!sessions.length && <p>Finalizá una sesión para ver tu historial.</p>}
    {!!options.size && <section className="panel">
      <h2>Evolución de carga</h2>
      <label>Ejercicio<select value={selected} onChange={event => select(event.target.value)}>
        {[...options].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      {peak ? <><p>Récord de carga <strong>{fromKg(peak, unit)} {unit}</strong></p>
        <ol className="chart" aria-label="Carga máxima por sesión">
          {points.slice(0, 8).reverse().map(point =>
            <li key={point.key}><time dateTime={point.date}>{point.date.slice(5)}</time>
              <div aria-hidden="true"><span style={{ width: (100 * point.peak / peak) + '%' }} /></div>
              <strong>{fromKg(point.peak, unit)} {unit}</strong>
            </li>)}
        </ol></> : <p>Registrá una carga externa para ver la evolución.</p>}
    </section>}
    {sessions.map(item => <section key={item.id} className="panel">
      <NavLink to={'/sesion/' + item.id}><h2>{item.data.title}</h2></NavLink>
      <p>{item.data.date} · {sets.filter(set => set.data.sessionId === item.id && set.data.done).length} series</p>
      {item.data.exercises.map(exercise => {
        const result = metrics(sets.filter(set => set.data.sessionId === item.id && set.data.exerciseId === exercise.id)
          .map(set => set.data), exercise)
        return <p key={exercise.id}>{exercise.name}{result.volume > 0 && ' · ' + Math.round(fromKg(result.volume, unit)) + ' ' + unit + ' de volumen'}
          {result.estimated > 0 && ' · ' + Math.round(fromKg(result.estimated, unit)) + ' ' + unit + ' e1RM estimada'}</p>
      })}
    </section>)}
  </>
}
