import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { toKg, fromKg, uid, type Exercise, type PerformedSet, type Profile } from './domain'
import { save, type Item } from './store'

function clock(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}

export function Workout({ owner, profile, sessions, sets }: {
  owner: string; profile: Profile; sessions: Item<'session'>[]; sets: Item<'set'>[]
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
  const session = item.data
  const series = sets.filter(set => set.data.sessionId === item.id && set.data.done)
  const remaining = session.pausedRest ?? Math.max(0, Math.ceil(((session.restUntil ?? 0) - now) / 1000))
  async function record(exercise: Exercise, event: FormEvent<HTMLFormElement>, existing?: Item<'set'>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const weight = fields.get('load')
    const next: PerformedSet = {
      sessionId: item!.id, exerciseId: exercise.id, reps: Number(fields.get('reps')),
      kg: weight === '' ? null : toKg(Number(weight), profile.unit), done: true,
      created: existing?.data.created ?? Date.now(),
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
      return <section className="panel" key={exercise.id}>
        <h2>{exercise.name}</h2>
        <p>{saved.length}{exercise.sets && ' de ' + exercise.sets} series
          {previous && ' · Anterior: ' + (previous.kg === null ? '' : fromKg(previous.kg, profile.unit) + ' ' + profile.unit + ' × ') + previous.reps + ' reps'}</p>
        {saved.map((set, index) => <form className="set-row" key={set.id + ':' + set.version + ':' + profile.unit} onSubmit={event => void record(exercise, event, set)}>
          <span aria-label={'Serie ' + (index + 1)}>{index + 1}</span>{fields(set.data)}
          <button className="secondary" disabled={busy}>Guardar</button>
          <button type="button" className="secondary" aria-label={'Deshacer serie ' + (index + 1)} onClick={() => void save(owner, 'set', set.id, { ...set.data, done: false })}>×</button>
        </form>)}
        <form className="set-row" key={String(previous?.kg) + ':' + profile.unit} onSubmit={event => void record(exercise, event)}>
          <label>{profile.unit}<input name="load" type="number" min="0" step="any" inputMode="decimal"
            defaultValue={(previous?.kg ?? goalKg) != null ? fromKg((previous?.kg ?? goalKg)!, profile.unit) : ''} /></label>
          <label>Reps<input name="reps" type="number" min="1" step="1" required inputMode="numeric" defaultValue={previous?.reps ?? exercise.min ?? ''} /></label>
          <button disabled={busy}>Registrar serie</button>
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
