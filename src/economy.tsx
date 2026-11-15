import { milestoneId, trainingMilestones } from './milestones'
import { lazy, Suspense, useState } from 'react'
import { Companion, companions, companionStage } from './companion'
import { api, local, save, sync, type Item, type Reward } from './store'
import type { Profile } from './domain'

const PetView = lazy(() => import('./pet-view'))

export const goods = [
  { id: 'bandana', name: 'Bandana dorada', price: 40 },
  { id: 'medalla', name: 'Medalla de entrenamiento', price: 80 },
  ...companions.map(name => ({ id: 'egg:' + name, name: 'Huevo de ' + name.toLowerCase(), price: 200 })),
]

export function localRewards(sessions: Item<'session'>[], sets: Item<'set'>[]): Reward[] {
  const seen = new Set<string>()
  const dates = new Map<string, number>()
  const earned: Reward[] = [...sessions].sort((a, b) => (a.data.ended ?? 0) - (b.data.ended ?? 0) || a.id.localeCompare(b.id)).flatMap(item => {
    const session = item.data
    const occurrence = session.scheduleId ?? (session.cycleId && session.dayId ? session.cycleId + ':' + session.dayId : undefined)
    if (!occurrence || seen.has(occurrence) || !session.ended || session.incomplete || !session.exercises.length) return []
    const exercised = new Set(sets.filter(set => set.data.sessionId === item.id && set.data.done &&
      set.data.reps > 0 && set.data.type !== 'warmup').map(set => set.data.exerciseId))
    if (!session.exercises.some(exercise => exercised.has(exercise.id)) ||
        !session.exercises.every(exercise => exercised.has(exercise.id) || session.omitted?.includes(exercise.id))) return []
    const count = dates.get(session.date) ?? 0
    if (count >= 3) return []
    dates.set(session.date, count + 1)
    seen.add(occurrence)
    return [{ owner: item.owner, session_id: item.id, xp: 25, gold: 20, companion: session.companion, occurrence }]
  })
  const owner = earned[0]?.owner
  if (!owner) return earned
  return [...earned, ...trainingMilestones.filter(item => earned.length >= item.goal)
    .map(item => ({ owner, session_id: milestoneId(item.goal), xp: 25 }))]
}


export const stageFor = (xp: number) => xp >= 300 ? 'adulta' : xp >= 100 ? 'joven' : 'bebé'

export function PetShop({ owner, profile, rewards }: { owner: string; profile: Profile; rewards: Reward[] }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, showPreview] = useState(false)
  const [animation, selectAnimation] = useState('Reposo')
  const acquired = profile.purchases ?? []
  const initial = profile.starter ?? profile.companion
  const gold = rewards.reduce((total, entry) => total + (entry.gold ?? 0), 0) -
    goods.filter(good => acquired.includes(good.id)).reduce((total, good) => total + good.price, 0)
  const owned = companions.filter(name => name === initial || acquired.includes('egg:' + name))
  const equipped = profile.petGear?.[profile.companion] ?? (profile.companion === initial ? profile.equipped : undefined)
  const activeStage = stageFor(rewards.filter(entry => entry.companion === profile.companion).reduce((total, entry) => total + entry.xp, 0))
  async function update(next: Profile) {
    setBusy(true)
    try { await save(owner, 'profile', 'self', next); setMessage('Cambios guardados.') }
    catch { setMessage('No pudimos guardar el cambio.') }
    finally { setBusy(false) }
  }
  async function buy(item: typeof goods[number]) {
    if (busy || acquired.includes(item.id) || gold < item.price) return
    if (owner === local) {
      await update({ ...profile, purchases: [...acquired, item.id] })
      return
    }
    if (!api || !navigator.onLine) { setMessage('Conectate para comprar con tu cuenta.'); return }
    setBusy(true)
    try {
      await sync(owner)
      const result = await api.rpc('buy_pet_good', { p_good: item.id })
      if (result.error) throw result.error
      await sync(owner)
      setMessage('Compra guardada.')
    } catch { setMessage('No pudimos confirmar la compra. Revisá el saldo y la conexión.') }
    finally { setBusy(false) }
  }
  return <><h1>Mascotas</h1>
    <section className="panel"><h2>Tu equipo</h2><div className="companion-picker">
      {owned.map(name => {
        const xp = rewards.filter(entry => entry.companion === name).reduce((sum, entry) => sum + entry.xp, 0)
        const stage = companionStage(name, xp).stage.name.toLowerCase()
        return <button className="secondary" key={name} disabled={busy} aria-pressed={name === profile.companion}
          onClick={() => void update({ ...profile, starter: initial, companion: name })}>
          <Companion name={name} xp={xp}/>{name}<small>{stage} · {xp} EXP</small>{name === profile.companion && equipped && <small className="gold">{goods.find(good => good.id === equipped)?.name}</small>}
        </button>
      })}
    </div>
      <div className="actions">
        <button className="secondary" aria-expanded={preview} onClick={() => showPreview(value => !value)}>{preview ? 'Cerrar vista 3D' : 'Ver en 3D'}</button>
        {preview && !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
          <label>Animación<select value={animation} onChange={event => selectAnimation(event.target.value)}>
            {['Reposo','Saludo','Entrenamiento','Victoria','Evolución'].map(name => <option key={name}>{name}</option>)}
          </select></label>}
      </div>
      {preview && (window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? <p>Vista fija por tu preferencia de movimiento reducido.</p>
        : <Suspense fallback={<p>Cargando la vista 3D…</p>}><PetView key={profile.companion} name={profile.companion} stage={activeStage} animation={animation} accessory={equipped}/></Suspense>)}
    </section>
    <section className="panel"><h2>Tienda</h2><p className="gold">Saldo: {gold} de oro</p>
      {goods.filter(item => item.id !== 'egg:' + initial).map(item => <div className="schedule shop-row" key={item.id}>
        <span>{item.name} <small>{item.price} de oro</small></span>
        {acquired.includes(item.id) ? item.id.startsWith('egg:') ? <span>En tu equipo</span> :
          <button className="secondary" disabled={busy} onClick={() => void update({ ...profile, equipped: undefined, petGear: { ...profile.petGear, [profile.companion]: equipped === item.id ? null : item.id } })}>
            {equipped === item.id ? 'Quitar' : 'Equipar'}
          </button> : <button disabled={busy || gold < item.price} onClick={() => void buy(item)}>Comprar</button>}
      </div>)}
      {message && <p role="status">{message}</p>}
    </section>
  </>
}
