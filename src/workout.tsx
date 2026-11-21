import type { PetVitals } from './pet-progress'
import { outfitFor } from './shop-catalog'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Coins, Sparkles } from 'lucide-react'
import { toKg, fromKg, uid, type Exercise, type PerformedSet, type Profile } from './domain'
import { recordSet, save, local, type Item, type Reward } from './store'
import { ExerciseArt, ExerciseTargets } from './library'
import { ExerciseDemonstration } from './movement'
import { PetCelebration } from './pet-celebration'

function clock(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
const sameMovement = (a: Exercise, b: Exercise) => a.mode === b.mode && (a.measure ?? 'reps') === (b.measure ?? 'reps') &&
  (a.catalogId ? a.catalogId === b.catalogId : a.custom ? a.custom.id === b.custom?.id : a.name.trim().toLowerCase() === b.name.trim().toLowerCase())

export function Workout({ owner, profile, sessions, sets, rewards, pets }: {
  owner: string; profile: Profile; sessions: Item<'session'>[]; sets: Item<'set'>[]; rewards: Reward[]; pets: Map<string, PetVitals>
}) {
  const { id } = useParams()
  const item = sessions.find(entry => entry.id === id)
  const previousIndex = useMemo(() => {
    const index = new Map<string, Item<'set'>[]>()
    for (const entry of sets) {
      if (!entry.data.done || entry.data.type === 'warmup') continue
      const key = JSON.stringify([entry.data.sessionId, entry.data.exerciseId])
      const entries = index.get(key) ?? []
      entries.push(entry); index.set(key, entries)
    }
    for (const entries of index.values()) entries.sort((a,b)=>a.data.created-b.data.created||a.id.localeCompare(b.id))
    return index
  }, [sets])
  const [now, setNow] = useState(Date.now)
  const [extraRows, setExtraRows] = useState<Record<string, number>>({})
  const [highlight, setHighlight] = useState('')
  const [message, setMessage] = useState('')
  const [committed,setCommitted]=useState<Item<'set'>[]>([])
  useEffect(()=>{
    setCommitted(current=>{
      if(!current.length)return current
      const latest=new Map(sets.map(entry=>[entry.id,entry.version]))
      const pending=current.filter(entry=>(latest.get(entry.id)??0)<entry.version)
      return pending.length===current.length?current:pending
    })
  },[sets])
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
  const visibleSets=new Map(sets.filter(entry=>entry.data.sessionId===item.id).map(entry=>[entry.id,entry]))
  for(const entry of committed)if(entry.data.sessionId===item.id)visibleSets.set(entry.id,entry)
  const logged = [...visibleSets.values()].filter(entry => entry.data.done)
  const entriesByExercise = (exercise: Exercise) => logged.filter(entry => entry.data.exerciseId === exercise.id)
    .sort((a, b) => a.data.created - b.data.created || a.id.localeCompare(b.id))
  const previous = sessions.filter(entry => entry.id !== item.id && entry.data.ended && !entry.data.deload && entry.data.started < session.started)
    .sort((a, b) => b.data.started - a.data.started)
  const previousSets = (exercise: Exercise) => {
    for (const entry of previous) {
      const move = entry.data.exercises.find(candidate => candidate.id === exercise.id && sameMovement(exercise,candidate))
        ?? entry.data.exercises.find(candidate => sameMovement(exercise,candidate))
      const entries = move ? previousIndex.get(JSON.stringify([entry.id,move.id])) : undefined
      if (entries?.length) return entries
    }
    return []
  }

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
      reps: Number(fields.get('reps')), kg: exercise.measure==='seconds'||weight === null||weight === '' ? null : toKg(Number(weight), profile.unit), done: true,
      created: existing?.data.created ?? Date.now(), slot: index, type: existing?.data.type ?? exercise.type }
    const recordId=existing?.id??uid()
    void run(async () => {
      await recordSet(owner, recordId, next,
        !existing && exercise.rest ? { id: item!.id, until: Date.now() + exercise.rest * 1000 } : undefined)
      setCommitted(entries=>[...entries.filter(entry=>entry.id!==recordId),{owner,kind:'set',id:recordId,version:(existing?.version??0)+1,data:next}])
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
    <PetCelebration key={item.id} owner={owner} sessionId={item.id} name={species}
      xp={reward && session.companionXpAtStart !== undefined ? session.companionXpAtStart + reward.xp : companionXp}
      before={session.companionXpAtStart} confirmed={!!reward}
      eligible={!session.incomplete && logged.some(entry => entry.data.type !== 'warmup')}
      outfit={outfitFor(profile, species)}/>
    <div className="victory-content">
      <p className="eyebrow">{session.title} · {clock(elapsed)}{session.deload && ' · Descarga'}</p>
      <h1>{session.incomplete ? 'Sesión incompleta' : 'Sesión completada'}</h1>
      {reward ? <div className="reward-pair" role="status" aria-label={'+' + reward.xp + ' EXP' + (reward.gold ? ' · +' + reward.gold + ' de oro' : '')}>
        <div className="reward-tile"><Sparkles aria-hidden="true"/><strong>+{reward.xp}</strong><span>EXP</span></div>
        {reward.gold ? <div className="reward-tile"><Coins aria-hidden="true"/><strong>+{reward.gold}</strong><span>Oro</span></div> : null}
      </div> : !session.incomplete && <p role="status">{owner === local ? 'Sesión guardada.' : 'Recompensa pendiente de sincronizar.'}</p>}
      {reward?.improvements?.length ? <div className="load-bonus-summary">
        <h2>¡Subiste el peso!</h2>
        <p>Base: 25 EXP · 20 de oro</p>
        <ul>{reward.improvements.map(move => <li key={move.exerciseId}>
          <strong>{move.name}</strong><span>{Number(fromKg(move.previousKg, profile.unit).toFixed(2))} → {Number(fromKg(move.kg, profile.unit).toFixed(2))} {profile.unit}</span>
          <span>+5 EXP · +5 de oro</span>
        </li>)}</ul>
      </div> : null}
      <Link className="pixel-link workout-home-link" to="/">Volver a Inicio</Link>
    </div>
  </section>

  const remaining = Math.max(0, Math.ceil(((session.restUntil ?? 0) - now) / 1000))
  return <>
    <p className="eyebrow">EN CURSO · {clock(elapsed)}</p><h1>{session.title}</h1>

    {session.deload && <p className="eyebrow">Sesión de descarga</p>}
    {session.restUntil && <p className="workout-rest" role={remaining === 0 ? 'status' : undefined}>{remaining ? 'Descanso · ' + clock(remaining) : 'Descanso terminado'}</p>}
    {session.exercises.map(exercise => {
      const legacyPosteriorDay = /cara posterior pierna/i.test(session.title)
      const legacyMachineCalf = legacyPosteriorDay && exercise.catalogId === 'calf-raise' &&
        /^gemelos$/i.test(exercise.name.trim()) && session.exercises.some(entry =>
          entry.catalogId === 'standing-single-leg-curl' || /^curl unilateral$/i.test(entry.name.trim()))
      const legacySeatedTriceps = /full tren superior/i.test(session.title) && exercise.catalogId === 'overhead-extension'
      const legacySupportedRow = /espalda.*b[ií]ceps/i.test(session.title) && exercise.catalogId === 't-row'
      const legacyCablePullover = /espalda.*b[ií]ceps/i.test(session.title) && exercise.catalogId === 'pullover'
      const artId = legacyCablePullover ? 'straight-arm-pulldown' : legacySupportedRow ? 'supported-t-row' : legacySeatedTriceps ? 'seated-triceps-extension' : legacyMachineCalf ? 'seated-calf-raise' : exercise.catalogId ??
        (!exercise.custom && /^curl unilateral$/i.test(exercise.name.trim()) && legacyPosteriorDay ? 'standing-single-leg-curl' : null)
      const saved = entriesByExercise(exercise)
      const last = previousSets(exercise)
      const target = Math.max(1, exercise.sets ?? 0, last.length)
      const rows = new Map(saved.map((entry, index) => [entry.data.slot ?? index, entry]))
      const count = Math.max(target, extraRows[exercise.id] ?? 0, saved.length, ...Array.from(rows.keys(), index => index + 1))
      return <section className={'panel exercise-session' + (highlight === exercise.id ? ' exercise-arrival' : '')}
        key={exercise.id} id={'exercise-' + exercise.id} tabIndex={-1}>
        <h2>{legacyCablePullover ? 'Pullover en polea' : legacySupportedRow ? 'Remo T en máquina con pecho apoyado' : legacySeatedTriceps ? 'Extensión de tríceps sentado a dos manos' : legacyMachineCalf ? 'Gemelos sentado en máquina' : exercise.name}</h2>
        {exercise.guidance && <p className="exercise-guidance">{exercise.guidance}</p>}
        <div className="move-visual workout-visual"><ExerciseDemonstration id={artId}
          illustration={<ExerciseArt id={artId}/>}/><div><ExerciseTargets id={artId} custom={exercise.custom}/></div></div>
        <p className="workout-set-count">{saved.length} de {count} series</p>
        {Array.from({ length: count }, (_, index) => {
          const existing = rows.get(index)
          const prior = last.find(entry => entry.data.slot === index)?.data ?? last[index]?.data
          const baseline = prior ? prior.kg :
            exercise.load === null ? null : toKg(exercise.load, exercise.unit ?? profile.unit)
          const kg = existing ? existing.data.kg : baseline === null ? null : baseline * (session.deload ? .8 : 1)
          const reps = existing?.data.reps ?? prior?.reps ?? exercise.min ?? ''
          return <form className={'quick-set' + (existing ? ' quick-set-done' : '')} key={index + ':' + (existing?.version ?? 'new') + ':' + kg + ':' + reps + ':' + profile.unit}
            onSubmit={event => record(exercise, index, count, event, existing)}>
            <span className="quick-index">{index + 1}</span>
            {exercise.measure !== 'seconds' && <label>{exercise.mode==='assisted'?'Asistencia ('+profile.unit+')':profile.unit}<input name="load" type="number" min="0" step="any" inputMode="decimal"
              defaultValue={kg === null ? '' : fromKg(kg, profile.unit)}/></label>}
            <label>{exercise.measure === 'seconds' ? 'Segundos' : 'Reps'}<input name="reps" type="number" required min="1" max={exercise.measure === 'seconds' ? 86400 : 1000} inputMode="numeric" defaultValue={reps}/></label>
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

