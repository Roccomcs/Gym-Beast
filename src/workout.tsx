import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Coins, Sparkles } from 'lucide-react'
import { toKg, fromKg, uid, type Exercise, type PerformedSet, type Profile } from './domain'
import { save, local, type Item, type Reward } from './store'
import { ExerciseArt, ExerciseTargets } from './library'
import { Movement } from './movement'
import { Companion } from './companion'

function clock(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
const sameMovement = (a: Exercise, b: Exercise) => a.mode === b.mode &&
  (a.catalogId ? a.catalogId === b.catalogId : a.name.trim().toLowerCase() === b.name.trim().toLowerCase())

export function Workout({ owner, profile, sessions, sets, rewards }: {
  owner: string; profile: Profile; sessions: Item<'session'>[]; sets: Item<'set'>[]; rewards: Reward[]
}) {
  const { id } = useParams()
  const item = sessions.find(entry => entry.id === id)
  const [now, setNow] = useState(Date.now)
  const [extraRows, setExtraRows] = useState<Record<string, number>>({})
  const [highlight, setHighlight] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const result = useRef<HTMLElement>(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (item?.data.ended) {
      result.current?.focus({ preventScroll: true })
      result.current?.scrollIntoView({ block: 'start' })
    }
  }, [item?.data.ended])
  if (!item) return <p>Buscando entrenamiento…</p>
  const session = item.data
  const logged = sets.filter(entry => entry.data.sessionId === item.id && entry.data.done)
  const entriesByExercise = (exercise: Exercise) => logged.filter(entry => entry.data.exerciseId === exercise.id)
    .sort((a, b) => a.data.created - b.data.created || a.id.localeCompare(b.id))
  const previous = sessions.filter(entry => entry.id !== item.id && entry.data.ended && entry.data.started < session.started)
    .sort((a, b) => b.data.started - a.data.started)
  const previousSets = (exercise: Exercise) => previous.map(entry => {
    const move = entry.data.exercises.find(candidate => candidate.id === exercise.id && sameMovement(exercise, candidate))
      ?? entry.data.exercises.find(candidate => sameMovement(exercise, candidate))
    return move ? sets.filter(set => set.data.sessionId === entry.id && set.data.exerciseId === move.id &&
      set.data.done && set.data.type !== 'warmup').sort((a, b) => a.data.created - b.data.created || a.id.localeCompare(b.id)) : []
  }).find(entries => entries.length) ?? []

  async function run(action: () => Promise<void>) {
    if (saving.current) return
    saving.current = true
    setBusy(true); setMessage('')
    try { await action() }
    catch { setMessage('No se pudo guardar. Revisá los cambios y probá de nuevo.') }
    finally { saving.current = false; setBusy(false) }
  }

  function record(exercise: Exercise, index: number, count: number, event: FormEvent<HTMLFormElement>, existing?: Item<'set'>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const weight = fields.get('load')
    const next: PerformedSet = { ...existing?.data, sessionId: item!.id, exerciseId: exercise.id,
      reps: Number(fields.get('reps')), kg: weight === '' ? null : toKg(Number(weight), profile.unit), done: true,
      created: existing?.data.created ?? Date.now(), slot: index, type: existing?.data.type ?? exercise.type }
    void run(async () => {
      await save(owner, 'set', existing?.id ?? uid(), next)
      if (!existing && exercise.rest) await save(owner, 'session', item!.id, {
        ...session, restUntil: Date.now() + exercise.rest * 1000, pausedRest: undefined,
      })
      if (!existing && next.type !== 'warmup' && index + 1 >= count) {
        const nextExercise = session.exercises.slice(session.exercises.indexOf(exercise) + 1)
          .find(move => entriesByExercise(move).length < (move.sets ?? (previousSets(move).length || 1)))
        if (nextExercise) {
          setHighlight(nextExercise.id)
          requestAnimationFrame(() => {
            const element = document.getElementById('exercise-' + nextExercise.id)
            element?.focus({ preventScroll: true })
            element?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
          })
        }
      }
    })
  }

  const species = session.companion ?? profile.companion
  const companionXp = rewards.filter(entry => entry.companion === species).reduce((sum, entry) => sum + entry.xp, 0)
  const reward = rewards.find(entry => entry.session_id === item.id)
  const elapsed = Math.max(0, Math.floor(((session.ended ?? now) - session.started) / 1000))
  if (session.ended) return <section className="panel victory-card workout-finish" ref={result} tabIndex={-1}>
    <div className="victory-stage">
      <span className="victory-stars" aria-hidden="true">✦ ✧ ✦</span>
      <Companion name={species} xp={companionXp}/>
    </div>
    <div className="victory-content">
      <p className="eyebrow">{session.title} · {clock(elapsed)}</p>
      <h1>{session.incomplete ? 'Sesión incompleta' : 'Sesión completada'}</h1>
      {reward ? <div className="reward-pair" role="status" aria-label={'+' + reward.xp + ' EXP · +' + (reward.gold ?? 0) + ' de oro'}>
        <div className="reward-tile"><Sparkles aria-hidden="true"/><strong>+{reward.xp}</strong><span>EXP</span></div>
        <div className="reward-tile"><Coins aria-hidden="true"/><strong>+{reward.gold ?? 0}</strong><span>Oro</span></div>
      </div> : !session.incomplete && <p role="status">{owner === local ? 'Sesión guardada.' : 'Recompensa pendiente de sincronizar.'}</p>}
    </div>
  </section>

  const remaining = Math.max(0, Math.ceil(((session.restUntil ?? 0) - now) / 1000))
  return <>
    <p className="eyebrow">EN CURSO · {clock(elapsed)}</p><h1>{session.title}</h1>
    {session.restUntil && <p className="workout-rest" role={remaining === 0 ? 'status' : undefined}>{remaining ? 'Descanso · ' + clock(remaining) : 'Descanso terminado'}</p>}
    {session.exercises.map(exercise => {
      const saved = entriesByExercise(exercise)
      const last = previousSets(exercise)
      const target = Math.max(1, exercise.sets ?? 0, last.length)
      const rows = new Map(saved.map((entry, index) => [entry.data.slot ?? index, entry]))
      const count = Math.max(target, extraRows[exercise.id] ?? 0, saved.length, ...Array.from(rows.keys(), index => index + 1))
      return <section className={'panel exercise-session' + (highlight === exercise.id ? ' exercise-arrival' : '')}
        key={exercise.id} id={'exercise-' + exercise.id} tabIndex={-1}>
        <h2>{exercise.name}</h2>
        <div className="move-visual workout-visual"><ExerciseArt id={exercise.catalogId}/><div><ExerciseTargets id={exercise.catalogId}/></div></div><Movement id={exercise.catalogId}/>
        <p className="workout-set-count">{saved.length} de {count} series</p>
        {Array.from({ length: count }, (_, index) => {
          const existing = rows.get(index)
          const prior = last.find(entry => entry.data.slot === index)?.data ?? last[index]?.data
          const kg = existing ? existing.data.kg : prior ? prior.kg :
            exercise.load === null ? null : toKg(exercise.load, exercise.unit ?? profile.unit)
          const reps = existing?.data.reps ?? prior?.reps ?? exercise.min ?? ''
          return <form className={'quick-set' + (existing ? ' quick-set-done' : '')} key={index + ':' + (existing?.version ?? 'new') + ':' + kg + ':' + reps + ':' + profile.unit}
            onSubmit={event => record(exercise, index, count, event, existing)}>
            <span className="quick-index">{index + 1}</span>
            <label>{profile.unit}<input name="load" type="number" min="0" step="any" inputMode="decimal"
              defaultValue={kg === null ? '' : fromKg(kg, profile.unit)}/></label>
            <label>Reps<input name="reps" type="number" required min="1" max="1000" inputMode="numeric" defaultValue={reps}/></label>
            <button disabled={busy} className={existing ? 'secondary' : ''} aria-label={existing ? 'Guardar serie ' + (index + 1) : 'Registrar serie ' + (index + 1)}>
              <Check aria-hidden="true" size={18}/>
            </button>
          </form>
        })}
        {count < 100 && <button type="button" className="secondary add-set" onClick={() => setExtraRows(current => ({
          ...current, [exercise.id]: count + 1,
        }))}>+ Serie</button>}
      </section>
    })}
    {message && <p role="alert">{message}</p>}
    <button className="finish-workout" disabled={busy || !logged.some(entry => entry.data.type !== 'warmup')} onClick={() => void run(async () => {
      const done = new Set(logged.filter(entry => entry.data.type !== 'warmup').map(entry => entry.data.exerciseId))
      await save(owner, 'session', item.id, { ...session, ended: Date.now(),
        omitted: session.exercises.filter(move => !done.has(move.id)).map(move => move.id), restUntil: undefined, pausedRest: undefined })
    })}>Finalizar entrenamiento</button>
  </>
}
