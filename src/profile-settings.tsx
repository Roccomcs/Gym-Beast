import { useEffect, useRef, useState } from 'react'
import { fromKg, toKg, type Profile } from './domain'

export function ProfileSettings({ profile, persist }: { profile: Profile; persist: (profile: Profile) => Promise<void> }) {
  const latest = useRef(profile)
  useEffect(() => { latest.current = profile }, [profile])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<Parameters<typeof persist>[0] | undefined>(undefined)
  const [unit, setUnit] = useState(profile.unit)
  const [weight, setWeight] = useState(profile.weightKg ? String(fromKg(profile.weightKg, profile.unit)) : '')
  const [name, setName] = useState(profile.name)
  const [status, setStatus] = useState('')
  useEffect(() => {
    if (pending.current) return
    setName(profile.name)
    setUnit(profile.unit)
    setWeight(profile.weightKg ? String(fromKg(profile.weightKg, profile.unit)) : '')
  }, [profile])
  const persisted = useRef(persist)
  persisted.current = persist
  const flush = () => {
    clearTimeout(timer.current)
    const value = pending.current
    if (!value) return Promise.resolve()
    pending.current = undefined
    latest.current = value
    return persisted.current(value)
  }
  useEffect(() => () => { void flush().catch(() => undefined) }, [])
  function change(nextName: string, value: string, nextUnit: Profile['unit']) {
    const numeric = Number(value)
    if (value !== '' && (!Number.isFinite(numeric) || numeric <= 0)) return
    pending.current = { ...latest.current, name: nextName.trim(), unit: nextUnit, weekStart: 1,
      weeklyGoal: undefined, reminderTime: undefined, loadIncrementKg: undefined,
      weightKg: value === '' ? undefined : toKg(numeric, nextUnit) }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush().then(() => setStatus('Guardado'), () => setStatus('No se pudo guardar')), 250)
  }
  return <section className="panel profile-settings">
    <h2>Tus datos</h2><div className="profile-fields">
      <label>Nombre visible<input value={name} maxLength={60} onChange={event => {
        setName(event.target.value); change(event.target.value, weight, unit)
      }}/></label>
      <label>Peso ({unit})<input value={weight} type="number" min="1" step="any" inputMode="decimal" onChange={event => {
        setWeight(event.target.value); change(name, event.target.value, unit)
      }}/></label>
      <label>Unidad<select value={unit} onChange={event => {
        const next = event.target.value === 'lb' ? 'lb' : 'kg'
        const value = weight ? String(fromKg(toKg(Number(weight), unit), next)) : ''
        setUnit(next); setWeight(value); change(name, value, next)
      }}><option>kg</option><option>lb</option></select></label>
    </div><p role="status">{status}</p>
  </section>
}
