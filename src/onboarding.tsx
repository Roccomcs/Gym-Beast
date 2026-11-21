import {useState,type FormEvent} from 'react'
import {Companion,starters} from './companion'
import {toKg,fromKg,type Profile} from './domain'

const personality = ['Curioso y valiente', 'Paciente y decidido', 'Fuerte y tranquilo', 'Ágil y leal']

export function Onboarding({ profile, save, checkpoint }: { profile: Profile; save: (profile: Profile) => Promise<void>; checkpoint: (profile: Profile) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draftName, setName] = useState(profile.name)
  const [petName, setPetName] = useState(profile.petNames?.[profile.companion] ?? '')
  const [selected, select] = useState(profile.companion)
  const [unit, setUnit] = useState(profile.unit)
  const [weightValue, setWeight] = useState(profile.weightKg ? String(fromKg(profile.weightKg, profile.unit)) : '')
  const [hatching, hatch] = useState(false)
  function remember(name: string, weight: string, nextUnit: Profile['unit'], companion: string) {
    const numeric = Number(weight)
    checkpoint({ ...profile, name, unit: nextUnit, companion,
      weightKg: Number.isFinite(numeric) && numeric > 0 ? toKg(numeric, nextUnit) : undefined })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name')).trim()
    if (!name) { setError('Ingresá el nombre que querés usar.'); return }
    const weight = String(fields.get('weight'))
    setBusy(true)
    try {
      await save({ ...profile, name, unit, weightKg: weight ? toKg(Number(weight), unit) : undefined,
        petNames: { ...profile.petNames, [selected]: petName.trim() || selected }, companion: selected, starter: selected, onboarded: true })
    } catch { setError('No pudimos guardar el perfil. Probá de nuevo.'); setBusy(false); hatch(false) }
  }
  return <section className="panel onboarding">
    <p className="eyebrow">TU PRIMER COMPAÑERO</p><h1>Armá tu equipo</h1>
    <form onSubmit={submit}>
      <label>Tu nombre<input name="name" autoComplete="nickname" value={draftName} onChange={event => { setName(event.target.value); remember(event.target.value, weightValue, unit, selected) }} maxLength={60} required /></label>
      <div className="input-grid">
        <label>Peso (opcional)<input type="number" name="weight" min="1" max={unit === 'kg' ? 700 : 1543} step="any" inputMode="decimal"
          value={weightValue} onChange={event => { setWeight(event.target.value); remember(draftName, event.target.value, unit, selected) }} /></label>
        <label>Unidad<select value={unit} onChange={event => { const next = event.target.value === 'lb' ? 'lb' : 'kg'; const value = weightValue ? String(fromKg(toKg(Number(weightValue), unit), next)) : ''; setWeight(value); setUnit(next); remember(draftName, value, next, selected) }}><option>kg</option><option>lb</option></select></label>
      </div>
      <div className="companion-picker" aria-label="Elegí tu compañero">
        {starters.map((name, index) => <button type="button" key={name} className="secondary egg-choice"
          aria-pressed={selected === name} onClick={() => { select(name); hatch(true); remember(draftName, weightValue, unit, name) }}>
          {selected === name && hatching ? <Companion name={name} stage="bebé" /> :
            <Companion name={name} xp={0} />}
          <strong>{name}</strong><small>{personality[index]}</small>
        </button>)}
      </div>
      <label>Nombre de tu compañero<input value={petName} maxLength={30}
        placeholder={selected} onChange={event => {
          setPetName(event.target.value)
          checkpoint({ ...profile, name: draftName, companion: selected,
            petNames: { ...profile.petNames, [selected]: event.target.value } })
        }}/></label>
      <button disabled={busy}>Confirmar compañero</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>
}

