import { MuscleMap, primaryMuscle } from './library'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fromKg, metrics, weekDates, type Exercise, type Profile } from './domain'
import { milestoneId, trainingMilestones } from './milestones'
import type { Item, Reward } from './store'
import type { PetPlan } from './pet-progress'
import { companionStages } from './pet-progress'
import { weeklyMissions } from './gamification'

const identity = (exercise: Exercise) =>
  (exercise.catalogId ?? exercise.custom?.id ?? exercise.name?.trim().toLocaleLowerCase('es-AR') ?? exercise.id) + ':' + exercise.mode + ':' + (exercise.measure ?? 'reps')

export function Progress({ sessions, sets, unit, today, weekStart, schedules, rewards, petPlans=[], pending=false }: {
  sessions: Item<'session'>[]; sets: Item<'set'>[]; unit: Profile['unit']; today: string; weekStart: number; goal: number; schedules: Item<'schedule'>[]; rewards: Reward[]; petPlans?:PetPlan[]; pending?:boolean
}) {
  const [calendar, selectDate] = useState(today)
  const [selection, select] = useState('')
  const dates = weekDates(calendar, weekStart)
  const weekSessions = sessions.filter(item => dates.includes(item.data.date) && !item.data.incomplete)
  const complete = sessions.filter(item => !item.data.incomplete)
  const missions = weeklyMissions(today,petPlans,sessions,schedules,rewards)
  const streaks = missions.streaks
  const target = missions.current.goal
  const precedingDates = weekDates(new Date(Date.parse(dates[0] + 'T00:00:00Z') - 604800000).toISOString().slice(0, 10), weekStart)
  const precedingSessions = complete.filter(item => precedingDates.includes(item.data.date))
  const precedingCount = precedingSessions.length
  const bySession = new Map<string, Item<'set'>['data'][]>()
  for (const { data } of sets) {
    const entries = bySession.get(data.sessionId) ?? []
    entries.push(data)
    bySession.set(data.sessionId, entries)
  }
  const volumeOf = (entries: Item<'session'>[]) => entries.reduce((sum, item) =>
    sum + item.data.exercises.reduce((total, exercise) => total + metrics(
      (bySession.get(item.id) ?? []).filter(set => set.exerciseId === exercise.id), exercise,
    ).volume, 0), 0)
  const weekVolume = volumeOf(weekSessions)
  const precedingVolume = volumeOf(precedingSessions)
  const format = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
  const deltaText = (current: number, prior: number) => {
    const delta = fromKg(current - prior, unit)
    return (delta > 0 ? '+' : '') + format.format(delta) + ' ' + unit
  }
  const difference = weekSessions.length - precedingCount
  const muscleCounts = new Map<string, number>()
  for (const item of weekSessions) {
    const moves = new Map(item.data.exercises.map(exercise => [exercise.id, exercise]))
    for (const set of bySession.get(item.id) ?? []) {
      if (!set.done || set.type === 'warmup') continue
      const exercise = moves.get(set.exerciseId)
      const muscle = exercise?.custom?.primary ?? primaryMuscle(exercise?.catalogId ?? null) ?? 'Sin clasificar'
      muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1)
    }
  }
  const options = new Map(complete.flatMap(item =>
    item.data.exercises.map(exercise => [identity(exercise), exercise.name] as const)))
  const selected = options.has(selection) ? selection : options.keys().next().value
  const points = complete.flatMap(item => item.data.exercises.filter(exercise => identity(exercise) === selected).flatMap(exercise => {
    const result = metrics((bySession.get(item.id) ?? []).filter(set => set.exerciseId === exercise.id), exercise)
    return result.peak > 0 ? [{ key: item.id + ':' + exercise.id, date: item.data.date, ...result }] : []
  }))
  const weekPeak = Math.max(0, ...points.filter(point => dates.includes(point.date)).map(point => point.peak))
  const precedingPeak = Math.max(0, ...points.filter(point => precedingDates.includes(point.date)).map(point => point.peak))
  const peak = Math.max(0, ...points.map(point => point.peak))
  const timeline = points.slice(0, 8).reverse()
  const coordinates = timeline.map((point, index) => ({
    x: timeline.length === 1 ? 150 : 15 + index * 270 / (timeline.length - 1),
    y: 110 - (peak ? point.peak / peak : 0) * 87,
  }))
  const achievements = [
    { name: 'Marca personal', rarity: 'Raro', value: missions.records, target: 1, hint: 'Conseguí tu primer premio por subir peso.' },
    { name: 'Cinco récords', rarity: 'Épico', value: missions.records, target: 5, hint: 'Conseguí cinco mejoras de carga confirmadas.' },
    { name: 'Cuatro semanas de constancia', rarity: 'Épico', value: streaks.best, target: 4, hint: 'Cumplí tu plan durante cuatro semanas consecutivas.' },
    { name: 'Cincuenta sesiones', rarity: 'Legendario', value: missions.confirmed, target: 50, hint: 'Completá cincuenta entrenamientos válidos.' },
  ]
  const seriesCount = [...muscleCounts.values()].reduce((total, value) => total + value, 0)
  return <><h1>Progreso</h1>
    <section className="panel weekly-missions" aria-label="Misiones semanales">
      <p className="eyebrow">DE LUNES A DOMINGO</p><h2>Misiones de esta semana</h2>
      <div className="mission-cards">
        <article data-complete={missions.current.fulfilled}>
          <span className="mission-emblem" aria-hidden="true">{missions.current.fulfilled?'✓':'Ⅰ'}</span>
          <h3>Tu plan, completo</h3>
          <p>{missions.current.rest ? 'Descanso programado: tu plan está cumplido.' : target ? `${missions.current.count} de ${target} días confirmados` : 'Elegí una rutina para activar esta misión.'}</p>
          {target>0 && <progress aria-label="Misión cumplir el plan" value={missions.current.count} max={target}/>}
          <strong>{missions.current.fulfilled?'Insignia: Plan cumplido':target?'Insignia por conseguir':'Sin plan activo'}</strong>
        </article>
        <article data-complete={missions.improved>=3}>
          <span className="mission-emblem" aria-hidden="true">{missions.improved>=3?'✓':'Ⅱ'}</span>
          <h3>Un poco más fuerte</h3><p>{missions.improved} de 3 ejercicios con mejora de carga</p>
          <progress aria-label="Misión mejorar cargas" value={missions.improved} max={3}/>
          <strong>{missions.improved>=3?'Insignia: Más fuerte':'Insignia por conseguir'}</strong>
        </article>
      </div>
      <p>Las insignias semanales son visuales; tus premios de entrenamiento se mantienen.</p>
      {missions.current.grace && <p>Semana de adaptación: avanzás sin perder vida si no completás el plan.</p>}
      {!!missions.badges.length && <details className="weekly-badges"><summary>Tus insignias semanales ({missions.badges.length})</summary>
        <ul>{missions.badges.slice(0,12).map(badge=><li key={badge.week+badge.label}><span aria-hidden="true">✦</span><strong>{badge.label}</strong><time dateTime={badge.week}>Semana del {badge.week.slice(8)}/{badge.week.slice(5,7)}</time></li>)}</ul>
      </details>}
      <details className="pet-rules"><summary>Vida y evolución</summary>
        <p>Cada semana completa sin cumplir el plan resta 50 de vida. Con cero vida tu compañero baja una etapa. Sigue con cero hasta que vuelva a evolucionar: ahí recupera 100 de vida.</p>
        <p>Los cambios de rutina o compañero se aplican al cuidado semanal desde el próximo lunes. La EXP de cada sesión siempre va a la mascota que te acompañó.</p>
        <ol>{companionStages.map(stage=><li key={stage.name}>{stage.name}<strong>{stage.xp} EXP</strong></li>)}</ol>
      </details>
      {pending && <p role="status">Hay cambios de entrenamiento pendientes de confirmar. La vida y las misiones se recalculan al sincronizar.</p>}
    </section>
    <section className="panel progress-dashboard"><h2>Tu semana</h2>
      <label>Semana de<input type="date" value={calendar} max={today} onChange={event => {
        if (event.target.value && event.target.value <= today) selectDate(event.target.value)
      }}/></label>
      <div className="progress-kpis"><div><strong>{weekSessions.length}</strong><span>Sesiones</span></div>
        <div><strong>{seriesCount}</strong><span>Series</span></div><div><strong>{fromKg(weekVolume, unit)}</strong><span>{unit} de volumen</span></div></div>
      <p>{difference === 0 ? 'Misma cantidad de sesiones que la semana anterior.' :
        (difference > 0 ? '+' : '') + difference + ' ' + (Math.abs(difference) === 1 ? 'sesión' : 'sesiones') + ' frente a la semana anterior.'}</p>
      {precedingCount > 0 && <p>Volumen frente a la semana anterior: <strong>{deltaText(weekVolume, precedingVolume)}</strong></p>}
      <div className="body-dashboard"><MuscleMap counts={muscleCounts}/>
        <div><h3>Músculos trabajados</h3>{muscleCounts.size ? <ul className="muscle-bars">
          {[...muscleCounts].sort((a,b) => b[1] - a[1]).map(([muscle,count]) =>
            <li key={muscle}><span>{muscle}</span><strong>{count}</strong><progress aria-label={muscle} max={seriesCount} value={count}/></li>)}
          </ul> : <p>Las zonas se iluminan al registrar series en esta semana.</p>}</div>
      </div>
    </section>
    <section className="panel">
      <h2>Calendario de actividad</h2>
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
      <p>Racha activa: {streaks.current} {streaks.current === 1 ? 'semana' : 'semanas'} cumpliendo el plan o el objetivo semanal.</p>
      <p>Mejor racha registrada: {streaks.best} {streaks.best === 1 ? 'semana' : 'semanas'}.</p>
      <p>Plan de esta semana: {missions.current.count} de {target} días confirmados</p>
      {target > 0 && <progress className="xp-meter" value={missions.current.count} max={target} aria-label="Cumplimiento semanal" />}
      <details className="advanced-achievements"><summary>Logros avanzados</summary>
        <div className="achievement-grid">{achievements.map(achievement => <article key={achievement.name} className="achievement" data-complete={achievement.value>=achievement.target}>
          <span className="mission-emblem" aria-hidden="true">{achievement.value>=achievement.target?'✓':'✧'}</span>
          <span className="eyebrow">{achievement.rarity}</span><h3>{achievement.name}</h3><p>{achievement.hint}</p>
          <strong>{achievement.value >= achievement.target ? 'Desbloqueado' : achievement.value + ' / ' + achievement.target}</strong>
          <progress aria-label={achievement.name} value={Math.min(achievement.value, achievement.target)} max={achievement.target}/>
        </article>)}</div>
      </details>
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
      {weekPeak > 0 && precedingPeak > 0 && <p>Máxima carga frente a la semana anterior: <strong>{deltaText(weekPeak, precedingPeak)}</strong></p>}
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
