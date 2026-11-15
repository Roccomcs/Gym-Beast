import { MuscleMap, primaryMuscle } from './library'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fromKg, metrics, weekDates, type Exercise, type Profile } from './domain'
import { milestoneId, trainingMilestones } from './milestones'
import type { Item, Reward } from './store'

const identity = (exercise: Exercise) =>
  (exercise.catalogId ?? exercise.name.trim().toLocaleLowerCase('es-AR')) + ':' + exercise.mode

export function Progress({ sessions, sets, unit, today, weekStart, goal, schedules, rewards }: {
  sessions: Item<'session'>[]; sets: Item<'set'>[]; unit: Profile['unit']; today: string; weekStart: number; goal: number; schedules: Item<'schedule'>[]; rewards: Reward[]
}) {
  const [calendar, selectDate] = useState(today)
  const [selection, select] = useState('')
  const dates = weekDates(calendar, weekStart)
  const weekSessions = sessions.filter(item => dates.includes(item.data.date) && !item.data.incomplete)
  const complete = sessions.filter(item => !item.data.incomplete)
  const completedSchedules = new Set(complete.map(item => item.data.scheduleId).filter(Boolean))
  const planned = schedules.filter(item => !item.data.skipped)
  const weeks = new Map<string, number>()
  for (const item of complete) {
    const week = weekDates(item.data.date, weekStart)[0]
    weeks.set(week, (weeks.get(week) ?? 0) + 1)
  }
  const plannedWeeks = new Map<string, Item<'schedule'>[]>()
  for (const item of planned) {
    const week = weekDates(item.data.date, weekStart)[0]
    plannedWeeks.set(week, [...(plannedWeeks.get(week) ?? []), item])
  }
  const activeWeeks = new Set([...weeks].filter(([week, total]) => {
    const entries = plannedWeeks.get(week)
    return entries?.length ? entries.every(item => completedSchedules.has(item.id)) : goal > 0 && total >= goal
  }).map(([week]) => week))
  const currentWeek = weekDates(today, weekStart)[0]
  const previousWeek = (start: string) => new Date(Date.parse(start + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10)
  let cursor = activeWeeks.has(currentWeek) ? currentWeek : previousWeek(currentWeek)
  let streak = 0
  while (activeWeeks.has(cursor)) { streak++; cursor = previousWeek(cursor) }
  const thisPlan = plannedWeeks.get(currentWeek) ?? []
  const currentTotal = thisPlan.length ? thisPlan.filter(item => completedSchedules.has(item.id)).length : weeks.get(currentWeek) ?? 0
  const target = thisPlan.length || goal
  const weekVolume = weekSessions.reduce((sum, item) => sum + item.data.exercises.reduce((total, exercise) =>
    total + metrics(sets.filter(set => set.data.sessionId === item.id && set.data.exerciseId === exercise.id)
      .map(set => set.data), exercise).volume, 0), 0)
  const muscleCounts = new Map<string, number>()
  for (const item of weekSessions) {
    const moves = new Map(item.data.exercises.map(exercise => [exercise.id, exercise]))
    for (const set of sets) {
      if (set.data.sessionId !== item.id || !set.data.done || set.data.type === 'warmup') continue
      const muscle = primaryMuscle(moves.get(set.data.exerciseId)?.catalogId ?? null) ?? 'Sin clasificar'
      muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1)
    }
  }
  const options = new Map(sessions.flatMap(item =>
    item.data.exercises.map(exercise => [identity(exercise), exercise.name] as const)))
  const selected = options.has(selection) ? selection : options.keys().next().value
  const points = sessions.flatMap(item => item.data.exercises.filter(exercise => identity(exercise) === selected).flatMap(exercise => {
    const result = metrics(sets.filter(set => set.data.sessionId === item.id && set.data.exerciseId === exercise.id)
      .map(set => set.data), exercise)
    return result.peak > 0 ? [{ key: item.id + ':' + exercise.id, date: item.data.date, ...result }] : []
  }))
  const peak = Math.max(0, ...points.map(point => point.peak))
  const timeline = points.slice(0, 8).reverse()
  const coordinates = timeline.map((point, index) => ({
    x: timeline.length === 1 ? 150 : 15 + index * 270 / (timeline.length - 1),
    y: 110 - (peak ? point.peak / peak : 0) * 87,
  }))
  const seriesCount = [...muscleCounts.values()].reduce((total, value) => total + value, 0)
  return <><h1>Progreso</h1>
    <section className="panel progress-dashboard"><h2>Tu semana</h2>
      <div className="progress-kpis"><div><strong>{weekSessions.length}</strong><span>Sesiones</span></div>
        <div><strong>{seriesCount}</strong><span>Series</span></div><div><strong>{fromKg(weekVolume, unit)}</strong><span>{unit} de volumen</span></div></div>
      <div className="body-dashboard"><MuscleMap counts={muscleCounts}/>
        <div><h3>Músculos trabajados</h3>{muscleCounts.size ? <ul className="muscle-bars">
          {[...muscleCounts].sort((a,b) => b[1] - a[1]).map(([muscle,count]) =>
            <li key={muscle}><span>{muscle}</span><strong>{count}</strong><progress aria-label={muscle} max={seriesCount} value={count}/></li>)}
          </ul> : <p>Las zonas se iluminan al registrar series en esta semana.</p>}</div>
      </div>
    </section>
    <section className="panel">
      <h2>Calendario de actividad</h2>
      <label>Semana de<input type="date" value={calendar} onChange={event => {
        if (event.target.value) selectDate(event.target.value)
      }}/></label>
      <p>{weekSessions.length} sesiones completadas · {fromKg(weekVolume, unit)} {unit} de volumen</p>
      <ol className="activity-calendar">{dates.map(date => {
        const entries = weekSessions.filter(item => item.data.date === date)
        const value = new Date(date + 'T12:00:00Z')
        const day = value.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' }).replace('.','')
        return <li key={date} className={entries.length ? 'calendar-done' : undefined}>
          <span>{day}</span>{entries.length
            ? <NavLink to={'/sesion/' + entries[0].id} aria-label={day + ' ' + value.getUTCDate() + ', ' + entries.length + ' sesiones'}>{value.getUTCDate()}</NavLink>
            : <time dateTime={date}>{value.getUTCDate()}</time>}
        </li>
      })}</ol>
    </section>
    {!sessions.length && <p>Finalizá una sesión para ver tu historial.</p>}
    <section className="panel">
      <h2>Constancia</h2>
      <p>Racha activa: {streak} {streak === 1 ? 'semana' : 'semanas'} cumpliendo el plan o el objetivo semanal.</p>
      <p>{thisPlan.length ? 'Plan de esta semana' : 'Objetivo de esta semana'}: {Math.min(currentTotal, target)} de {target} sesiones</p>
      {target > 0 && <progress className="xp-meter" value={Math.min(currentTotal, target)} max={target} aria-label="Cumplimiento semanal" />}
      <h3>Misiones de entrenamiento</h3>
      <ul>
        {trainingMilestones.map(({ goal, label }) => {
          const award = rewards.find(reward => reward.session_id === milestoneId(goal))
          const count = rewards.filter(reward => reward.occurrence).length
          return <li key={goal}>{label} · {award ? 'Completada · +' + award.xp + ' EXP' : Math.min(count, goal) + ' / ' + goal + ' días válidos'}</li>
        })}
      </ul>
    </section>
    {!!options.size && <section className="panel">
      <h2>Evolución de carga</h2>
      <label>Ejercicio<select value={selected} onChange={event => select(event.target.value)}>
        {[...options].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      {peak ? <><div className="load-plot" key={selected}>
        <svg viewBox="0 0 300 125" role="img" aria-label="Tendencia de carga máxima en las últimas sesiones">
          {[24, 53, 82, 110].map(y => <line key={y} x1="10" y1={y} x2="290" y2={y} className="plot-grid"/>)}
          {coordinates.length > 1 && <polyline pathLength="1" points={coordinates.map(point => point.x + ',' + point.y).join(' ')} className="plot-line"/>}
          {coordinates.map((point, index) => <circle key={timeline[index].key} cx={point.x} cy={point.y} r="4" className="plot-point">
            <title>{timeline[index].date} · {fromKg(timeline[index].peak, unit)} {unit}</title>
          </circle>)}
        </svg></div><p>Récord de carga <strong>{fromKg(peak, unit)} {unit}</strong></p>
        <ol className="chart" aria-label="Carga máxima por sesión">
          {points.slice(0, 8).reverse().map(point =>
            <li key={point.key}><time dateTime={point.date}>{point.date.slice(5)}</time>
              <div aria-hidden="true"><span style={{ width: (100 * point.peak / peak) + '%' }} /></div>
              <strong>{fromKg(point.peak, unit)} {unit}</strong>
            </li>)}
        </ol></> : <p>Registrá una carga externa para ver la evolución.</p>}
    </section>}
  </>
}
