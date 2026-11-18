import type { PetVitals } from './pet-progress'
import { outfitFor } from './shop-catalog'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Coins, Sparkles } from 'lucide-react'
import { toKg, fromKg, suggestedLoad, uid, type Exercise, type PerformedSet, type Profile } from './domain'
import { recordSet, save, local, type Item, type Reward } from './store'
import { ExerciseArt, ExerciseTargets } from './library'
import { ExerciseDemonstration } from './movement'
import { Companion } from './companion'

function clock(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
const sameMovement = (a: Exercise, b: Exercise) => a.mode === b.mode &&
  (a.catalogId ? a.catalogId === b.catalogId : a.name.trim().toLowerCase() === b.name.trim().toLowerCase())

export function Workout({ owner, profile, sessions, sets, rewards, pets }: {
  owner: string; profile: Profile; sessions: Item<'session'>[]; sets: Item<'set'>[]; rewards: Reward[]; pets: Map<string, PetVitals>
}) {
  const { id } = useParams()
  const item = sessions.find(entry => entry.id === id)
  const [now, setNow] = useState(Date.now)
  const [accepted, accept] = useState<Record<string, number>>({})
  const [extraRows, setExtraRows] = useState<Record<string, number>>({})
  const [highlight, setHighlight] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const audio = useRef<AudioContext | null>(null)
  const alerted = useRef<number | undefined>(undefined)
  const [restAlert, setRestAlert] = useState(false)
  const deadline = item?.data.ended ? undefined : item?.data.restUntil
  useEffect(() => () => { if (audio.current) void audio.current.close().catch(() => undefined) }, [])
  useEffect(() => {
    if (!restAlert || !deadline || now < deadline || alerted.current === deadline) return
    alerted.current = deadline
    navigator.vibrate?.([90, 40, 90])
    const context = audio.current
    if (context?.state !== 'running') return
    const tone = context.createOscillator()
    const level = context.createGain()
    tone.frequency.value = 660
    level.gain.setValueAtTime(.12, context.currentTime)
    level.gain.exponentialRampToValueAtTime(.001, context.currentTime + .34)
    tone.connect(level).connect(context.destination)
    tone.start()
    tone.stop(context.currentTime + .35)
  }, [deadline, now, restAlert])
  async function toggleRestAlert() {
    if (restAlert) { setRestAlert(false); return }
    try {
      if (typeof AudioContext !== 'undefined') {
        audio.current ??= new AudioContext()
        await audio.current.resume()
      }
    } catch { /* The visible timer remains available on this browser. */ }
    setRestAlert(audio.current?.state === 'running' || typeof navigator.vibrate === 'function')
    if (audio.current?.state !== 'running' && typeof navigator.vibrate !== 'function') {
      setMessage('Este navegador solo permite el aviso visual.')
    }
  }
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
  const previous = sessions.filter(entry => entry.id !== item.id && entry.data.ended && !entry.data.deload && entry.data.started < session.started)
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
      await recordSet(owner, existing?.id ?? uid(), next,
        !existing && exercise.rest ? { id: item!.id, until: Date.now() + exercise.rest * 1000 } : undefined)
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
  const companionXp = pets.get(species)?.xp ?? 0
  const reward = rewards.find(entry => entry.session_id === item.id)
  const elapsed = Math.max(0, Math.floor(((session.ended ?? now) - session.started) / 1000))
  if (session.ended) return <section className="panel victory-card workout-finish" ref={result} tabIndex={-1}>
    <div className="victory-stage" data-celebrate={!!reward}>
      <span className="victory-stars" aria-hidden="true">✦ ✧ ✦</span>
      <Companion name={species} xp={companionXp} outfit={outfitFor(profile, species)}/>
    </div>
    <div className="victory-content">
      <p className="eyebrow">{session.title} · {clock(elapsed)}{session.deload && ' · Descarga'}</p>
      <h1>{session.incomplete ? 'Sesión incompleta' : 'Sesión completada'}</h1>
      {reward ? <div className="reward-pair" role="status" aria-label={'+' + reward.xp + ' EXP' + (reward.gold ? ' · +' + reward.gold + ' de oro' : '')}>
        <div className="reward-tile"><Sparkles aria-hidden="true"/><strong>+{reward.xp}</strong><span>EXP</span></div>
        {reward.gold ? <div className="reward-tile"><Coins aria-hidden="true"/><strong>+{reward.gold}</strong><span>Oro</span></div> : null}
      </div> : !session.incomplete && <p role="status">{owner === local ? 'Sesión guardada.' : 'Recompensa pendiente de sincronizar.'}</p>}
    </div>
  </section>

  const remaining = Math.max(0, Math.ceil(((session.restUntil ?? 0) - now) / 1000))
  return <>
    <p className="eyebrow">EN CURSO · {clock(elapsed)}</p><h1>{session.title}</h1>
    <details className="panel workout-options"><summary>Opciones de sesión</summary>
      <button type="button" className="secondary" aria-pressed={!!session.deload} disabled={busy || !!logged.length}
        onClick={() => void run(() => save(owner, 'session', item.id, { ...session, deload: !session.deload }))}>
        {session.deload ? 'Quitar descarga' : 'Entrenar en descarga'}
      </button>
      <p>La descarga propone un 20 % menos de carga. Tus marcas habituales se conservan para la próxima sesión.</p>
      <button type="button" className="secondary" aria-pressed={restAlert} onClick={() => void toggleRestAlert()}>
        {restAlert ? 'Silenciar aviso de descanso' : 'Activar aviso de descanso'}
      </button>
      <p>El sonido o la vibración dependen del teléfono y funcionan con la sesión abierta.</p>
    </details>
    {session.deload && <p className="eyebrow">Sesión de descarga</p>}
    {session.restUntil && <p className="workout-rest" role={remaining === 0 ? 'status' : undefined}>{remaining ? 'Descanso · ' + clock(remaining) : 'Descanso terminado'}</p>}
    {session.exercises.map(exercise => {
      const saved = entriesByExercise(exercise)
      const last = previousSets(exercise)
      const increment = toKg(profile.unit === 'kg' ? 2.5 : 5, profile.unit)
      const recommendation = session.deload ? null : suggestedLoad(exercise, last.map(entry => entry.data), increment)
      const target = Math.max(1, exercise.sets ?? 0, last.length)
      const rows = new Map(saved.map((entry, index) => [entry.data.slot ?? index, entry]))
      const count = Math.max(target, extraRows[exercise.id] ?? 0, saved.length, ...Array.from(rows.keys(), index => index + 1))
      return <section className={'panel exercise-session' + (highlight === exercise.id ? ' exercise-arrival' : '')}
        key={exercise.id} id={'exercise-' + exercise.id} tabIndex={-1}>
        <h2>{exercise.name}</h2>
        <div className="move-visual workout-visual"><ExerciseDemonstration id={exercise.catalogId}
          illustration={<ExerciseArt id={exercise.catalogId}/>}/><div><ExerciseTargets id={exercise.catalogId}/></div></div>
        <p className="workout-set-count">{saved.length} de {count} series</p>
        {recommendation !== null && !saved.length && accepted[exercise.id] === undefined &&
          <button className="secondary load-suggestion" type="button"
            onClick={() => accept(current => ({ ...current, [exercise.id]: recommendation }))}>
            Probar {fromKg(recommendation, profile.unit)} {profile.unit}
          </button>}
        {Array.from({ length: count }, (_, index) => {
          const existing = rows.get(index)
          const prior = last.find(entry => entry.data.slot === index)?.data ?? last[index]?.data
          const baseline = accepted[exercise.id] ?? (prior ? prior.kg :
            exercise.load === null ? null : toKg(exercise.load, exercise.unit ?? profile.unit))
          const kg = existing ? existing.data.kg : baseline === null ? null : baseline * (session.deload ? .8 : 1)
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
