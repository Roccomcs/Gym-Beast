import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { toKg, fromKg, metrics, uid, type Exercise, type PerformedSet, type Profile } from './domain'
import { save, local, type Item, type Reward } from './store'
import { Companion } from './companion'

function clock(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}

export function Workout({ owner, profile, sessions, sets, rewards }: {
  owner: string; profile: Profile; sessions: Item<'session'>[]; sets: Item<'set'>[]; rewards: Reward[]
}) {
  const { id } = useParams()
  const item = sessions.find(entry => entry.id === id)
  const [now, setNow] = useState(Date.now)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])
  if (!item) return <p>Buscando entrenamiento…</p>
  const reward = rewards.find(entry => entry.session_id === item.id)
  const session = item.data
  const series = sets.filter(set => set.data.sessionId === item.id && set.data.done)
  const remaining = session.pausedRest ?? Math.max(0, Math.ceil(((session.restUntil ?? 0) - now) / 1000))
  const volume = session.exercises.reduce((total, exercise) => total + metrics(
    series.filter(entry => entry.data.exerciseId === exercise.id).map(entry => entry.data), exercise,
  ).volume, 0)
  async function record(exercise: Exercise, event: FormEvent<HTMLFormElement>, existing?: Item<'set'>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const weight = fields.get('load')
    const value = (key: string) => String(fields.get(key) ?? '').trim()
    const numeric = (key: string) => value(key) ? Number(value(key)) : undefined
    const next: PerformedSet = {
      sessionId: item!.id, exerciseId: exercise.id, reps: Number(fields.get('reps')),
      kg: weight === '' ? null : toKg(Number(weight), profile.unit), done: true,
      created: existing?.data.created ?? Date.now(),
      rpe: numeric('rpe'), rir: numeric('rir'), notes: value('notes'),
      type: (fields.get('type') as Exercise['type'] | null) ?? exercise.type,
    }
    setBusy(true)
    setMessage('')
    try {
      await save(owner, 'set', existing?.id ?? uid(), next)
      if (exercise.rest && !existing && !session.ended) {
        await save(owner, 'session', item!.id, { ...session, restUntil: Date.now() + exercise.rest * 1000, pausedRest: undefined })
      }
    } catch { setMessage('No se pudo completar el guardado. Revisá la última serie antes de reintentar.') }
    finally { setBusy(false) }
  }
  return <>
    <p className="eyebrow">{session.ended ? 'FINALIZADO' : 'EN CURSO'} · {clock(Math.max(0, Math.floor(((session.ended ?? now) - session.started) / 1000)))}</p>
    <h1>{session.title}</h1>
    {session.ended && <section className="panel companion-card workout-summary">
      <Companion name={profile.companion} />
      <div><h2>Sesión completada</h2><p>{series.length} series · {new Set(series.map(set => set.data.exerciseId)).size} ejercicios · {fromKg(volume, profile.unit)} {profile.unit} de volumen</p>{reward && <p className="eyebrow">+{reward.xp} XP</p>}{!reward && owner !== local && <p>La experiencia se confirma al sincronizar las sesiones que cumplen los requisitos.</p>}</div>
    </section>}
    {!session.ended && (session.restUntil !== undefined || session.pausedRest !== undefined) && <section className="panel rest">
      <strong>Descanso · {clock(remaining)}</strong>
      <div className="actions">
        <button className="secondary" disabled={!remaining} onClick={() => {
          const paused = session.pausedRest !== undefined
          void save(owner, 'session', item.id, {
            ...session, pausedRest: paused ? undefined : remaining,
            restUntil: paused ? Date.now() + remaining * 1000 : undefined,
          })
        }}>{session.pausedRest === undefined ? 'Pausar' : 'Reanudar'}</button>
        {[-15, 15].map(delta => <button key={delta} className="secondary" onClick={() =>
          void save(owner, 'session', item.id, { ...session, restUntil: session.pausedRest === undefined ? Date.now() + Math.max(0, remaining + delta) * 1000 : undefined, pausedRest: session.pausedRest === undefined ? undefined : Math.max(0, remaining + delta) })
        }>{delta > 0 ? '+' : ''}{delta} s</button>)}
      </div>
    </section>}
    {session.exercises.map(exercise => {
      const saved = series.filter(set => set.data.exerciseId === exercise.id).sort((a, b) => a.data.created - b.data.created)
      const previous = sessions.filter(entry => entry.id !== item.id && entry.data.ended && entry.data.started < session.started)
        .sort((a, b) => b.data.started - a.data.started)
        .flatMap(entry => {
          const previousExercise = entry.data.exercises.find(candidate => exercise.catalogId ? candidate.catalogId === exercise.catalogId : candidate.name === exercise.name)
          return previousExercise ? sets.filter(set => set.data.sessionId === entry.id && set.data.exerciseId === previousExercise.id && set.data.done)
            .sort((a, b) => b.data.created - a.data.created) : []
        })[0]?.data
      const goalKg = exercise.load === null ? null : toKg(exercise.load, exercise.unit ?? profile.unit)
      const fields = (set?: PerformedSet) => <>
        <label>{profile.unit}<input name="load" type="number" min="0" step="any" inputMode="decimal"
          defaultValue={set?.kg != null ? fromKg(set.kg, profile.unit) : ''} /></label>
        <label>Reps<input name="reps" type="number" min="1" step="1" required inputMode="numeric" defaultValue={set?.reps ?? exercise.min ?? ''} /></label>
      </>
      const extras = (set?: PerformedSet) => <details className="set-extras"><summary>Tipo, esfuerzo y notas</summary>
        <div className="input-grid">
          <label>Tipo<select name="type" defaultValue={set?.type ?? exercise.type}>
            <option value="work">Efectiva</option><option value="warmup">Calentamiento</option>
            <option value="drop">Descendente</option><option value="failure">Al fallo</option><option value="amrap">AMRAP</option>
          </select></label>
          <label>RPE<input name="rpe" type="number" min={1} max={10} step={0.5} defaultValue={set?.rpe} /></label>
          <label>RIR<input name="rir" type="number" min={0} max={20} defaultValue={set?.rir} /></label>
          <label>Notas de la serie<input name="notes" maxLength={240} defaultValue={set?.notes} /></label>
        </div>
      </details>
      return <section className="panel" key={exercise.id}>
        <h2>{exercise.name}</h2>
        {exercise.superset && <p className="eyebrow">Superserie {exercise.superset.name} · {exercise.superset.rounds} vueltas</p>}
        {exercise.notes && <p>{exercise.notes}</p>}
        <p>{saved.length}{exercise.sets && ' de ' + exercise.sets} series
          {previous && ' · Anterior: ' + (previous.kg === null ? '' : fromKg(previous.kg, profile.unit) + ' ' + profile.unit + ' × ') + previous.reps + ' reps'}</p>
        {saved.map((set, index) => <form className="set-row series-saved" key={set.id + ':' + set.version + ':' + profile.unit} onSubmit={event => void record(exercise, event, set)}>
          <span aria-label={'Serie ' + (index + 1)}>{index + 1}</span>{fields(set.data)}
          <button className="secondary" disabled={busy}>Guardar</button>
          <button type="button" className="secondary" aria-label={'Deshacer serie ' + (index + 1)} onClick={() => void save(owner, 'set', set.id, { ...set.data, done: false })}>×</button>
          {extras(set.data)}
        </form>)}
        <form className="set-row" key={String(previous?.kg) + ':' + profile.unit} onSubmit={event => void record(exercise, event)}>
          <label>{profile.unit}<input name="load" type="number" min="0" step="any" inputMode="decimal"
            defaultValue={(previous?.kg ?? goalKg) != null ? fromKg((previous?.kg ?? goalKg)!, profile.unit) : ''} /></label>
          <label>Reps<input name="reps" type="number" min="1" step="1" required inputMode="numeric" defaultValue={previous?.reps ?? exercise.min ?? ''} /></label>
          <button disabled={busy}>Registrar serie</button>
          {extras()}
        </form>
      </section>
    })}
    {message && <p role="alert">{message}</p>}
    {session.ended ? <NavLink to="/progreso">Volver a progreso</NavLink> :
      <button disabled={busy || !series.length} onClick={() => void save(owner, 'session', item.id, {
        ...session, ended: Date.now(), restUntil: undefined, pausedRest: undefined,
      }).catch(() => setMessage('No se pudo finalizar el entrenamiento.'))}>Finalizar entrenamiento</button>}
  </>
}
