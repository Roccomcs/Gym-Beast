import { milestoneId, trainingMilestones } from './milestones'
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Coins, Sparkles, Egg, Shirt, Dumbbell, Gem, PawPrint } from 'lucide-react'
import { Companion, companions, companionStage, companionStages } from './companion'
import { GoodArt } from './good-art'
import { Habitat } from './habitat'
import type { PetPlan, PetVitals } from './pet-progress'
import { goods, outfitFor, type ShopGood } from './shop-catalog'
import { api, db, list, local, save, sync, type Item, type Reward } from './store'
import type { Profile } from './domain'
import './shop.css'

const filters = [
  { label: 'Todo', matches: () => true },
  { label: 'Huevos', matches: (item: ShopGood) => item.slot === 'egg' },
  { label: 'Fútbol', matches: (item: ShopGood) => item.art === 'shirt' },
  { label: 'Gym', matches: (item: ShopGood) => item.slot === 'bottom' || (item.slot === 'top' && item.art !== 'shirt') },
  { label: 'Accesorios', matches: (item: ShopGood) => ['neck', 'head', 'face', 'wrist', 'hands'].includes(item.slot) },
  { label: 'Familiares', matches: (item: ShopGood) => item.slot === 'buddy' },
]
// Preserve the balance of players who bought items before retirement.
const retiredPrices: Record<string, number> = { 'bandana': 40, 'medalla': 80, 'gold-chain': 120, 'silver-chain': 90, 'obsidian-chain': 140, 'sun-glasses': 80, 'sport-glasses': 95, 'box-red': 110, 'box-gold': 170, 'grip-gloves': 85 }

const goldBalance = (rewards: Reward[], purchased: string[]) => rewards.reduce((total, entry) => total + (entry.gold ?? 0), 0) -
  purchased.reduce((total, id) => total + (goods.find(item => item.id === id)?.price ?? retiredPrices[id] ?? 0), 0)

export function localRewards(sessions: Item<'session'>[], sets: Item<'set'>[]): Reward[] {
  const seen = new Set<string>()
  const earned: Reward[] = [...sessions].sort((a, b) => (a.data.ended ?? 0) - (b.data.ended ?? 0) || a.id.localeCompare(b.id)).flatMap(item => {
    const session = item.data
    const occurrence = session.scheduleId ? 'schedule:' + session.scheduleId :
      session.cycleId && session.dayId ? 'cycle:' + session.cycleId + ':' + session.dayId : undefined
    if (!occurrence || seen.has(occurrence) || !session.ended || session.incomplete || !session.exercises.length) return []
    const exercised = new Set(sets.filter(set => set.data.sessionId === item.id && set.data.done &&
      set.data.reps > 0 && set.data.type !== 'warmup').map(set => set.data.exerciseId))
    if (!session.exercises.some(exercise => exercised.has(exercise.id)) ||
        !session.exercises.every(exercise => exercised.has(exercise.id) || session.omitted?.includes(exercise.id))) return []
    seen.add(occurrence)
    return [{ owner: item.owner, session_id: item.id, xp: 25, gold: 20, companion: session.companion, occurrence }]
  })
  const owner = earned[0]?.owner
  if (!owner) return earned
  return [...earned, ...trainingMilestones.filter(item => earned.length >= item.goal)
    .map(item => ({ owner, session_id: milestoneId(item.goal), xp: 25 }))]
}



export function PetShop({ owner, profile, rewards, pets, petPlans, date, target }: {
  owner: string; profile: Profile; rewards: Reward[]; pets: Map<string, PetVitals>; petPlans: PetPlan[]; date: string; target: number
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState(0)
  const [page, setPage] = useState(0)
  const shelf = useRef<HTMLDivElement>(null)
  const acquired = profile.purchases ?? []
  const initial = profile.starter ?? profile.companion
  const bonus = owner === local && localStorage.getItem(testGoldKey) === 'yes' ? testGold : 0
  const confirmed = useLiveQuery(() => db.syncState.get(owner), [owner])
  const gold = owner === local ? bonus + goldBalance(rewards, acquired) : confirmed?.balance?.gold ?? goldBalance(rewards, acquired)
  const owned = companions.filter(name => name === initial || acquired.includes('egg:' + name))
  const activeOutfit = outfitFor(profile, profile.companion)
  const visible = goods.filter(item => item.id !== 'egg:' + initial && filters[filter].matches(item))
  const pages = Array.from({ length: Math.ceil(visible.length / 4) }, (_, index) => visible.slice(index * 4, index * 4 + 4))
  function selectPage(index: number) {
    if (shelf.current) shelf.current.scrollLeft = index * shelf.current.clientWidth
    setPage(index)
  }
  async function update(next: Profile) {
    setBusy(true)
    try { await save(owner, 'profile', 'self', next); setMessage('Cambios guardados.') }
    catch { setMessage('No pudimos guardar el cambio.') }
    finally { setBusy(false) }
  }
  async function buy(item: ShopGood) {
    if (busy || acquired.includes(item.id) || gold < item.price) return
    if (owner === local) {
      setBusy(true)
      try {
        const result = await db.transaction('rw', db.items, async () => {
          const row = (await list(owner, 'profile')).find(entry => entry.id === 'self')
          if (!row) throw new Error('Perfil local ausente')
          const purchased = row.data.purchases ?? []
          if (purchased.includes(item.id)) return 'Ya lo tenés.'
          const earned = localRewards(await list(owner, 'session'), await list(owner, 'set'))
          if (bonus + goldBalance(earned, purchased) < item.price) return 'Te falta oro para esta compra.'
          await db.items.put({ ...row, version: row.version + 1, data: { ...row.data, purchases: [...purchased, item.id] } })
          return 'Compraste ' + item.name + '.'
        })
        setMessage(result)
      } catch { setMessage('No pudimos guardar la compra.') }
      finally { setBusy(false) }
      return
    }
    if (!api || !navigator.onLine) { setMessage('Conectate para comprar con tu cuenta.'); return }
    setBusy(true)
    try {
      await sync(owner)
      const result = await api.rpc('buy_pet_good', { p_good: item.id })
      if (result.error) throw result.error
      await sync(owner)
      setMessage('Compraste ' + item.name + '.')
    } catch { setMessage('No pudimos confirmar la compra. Revisá el saldo y la conexión.') }
    finally { setBusy(false) }
  }
  return <div className="magic-shop">
    <section className="shop-masthead">
      <h1>Tienda mágica</h1>
      <p className="shop-balance" data-testid="shop-balance"><Coins aria-hidden="true" size={18}/> <span className="sr-only">Saldo: </span>{gold}<span className="sr-only"> de oro</span></p>
      <p role="status" className="shop-feedback">{message}</p>
    </section>
    <section className="shop-catalog" aria-label="Catálogo de la tienda">
      <div className="shop-tools">
        <div className="shop-filters" role="group" aria-label="Categorías">
          {[Sparkles, Egg, Shirt, Dumbbell, Gem, PawPrint].map((Icon, index) =>
            <button key={filters[index].label} type="button" className="secondary" aria-pressed={filter === index}
              onClick={() => { selectPage(0); setFilter(index) }}><Icon aria-hidden="true" size={17}/>{filters[index].label}</button>)}
        </div>
      </div>
      {!visible.length && <p className="panel">No encontramos artículos con estos filtros.</p>}
      <div className="shop-shelf" ref={shelf} onScroll={event => {
        const strip = event.currentTarget
        setPage(Math.round(strip.scrollLeft / strip.clientWidth))
      }}>
        {pages.map((entries, index) => <div className="shop-grid" key={index}>
        {entries.map(item => {
          const own = acquired.includes(item.id)
          const equipped = activeOutfit.some(good => good.id === item.id)
          const eggSpecies = item.slot === 'egg' ? item.id.slice(4) : ''
          return <article className="shop-row" key={item.id} data-equipped={equipped}>
            <div className="shop-display">{eggSpecies ? <Companion name={eggSpecies} xp={0}/> : <GoodArt good={item}/>}</div>
            <h3>{item.name}</h3>
            <p className="shop-price">{own ? equipped ? 'Equipado' : 'Comprado' : <><Coins size={14} aria-hidden="true"/> {item.price} de oro</>}</p>
            {own ? eggSpecies ? <small>En tu equipo</small> :
              <button className="secondary" disabled={busy} onClick={() => void update({
                ...profile, petOutfits: { ...profile.petOutfits, [profile.companion]: {
                  ...profile.petOutfits?.[profile.companion], [item.slot]: equipped ? null : item.id,
                } },
              })}>{equipped ? 'Quitar' : 'Equipar'}</button> :
              <button disabled={busy || gold < item.price} onClick={() => void buy(item)}>Comprar</button>}
          </article>
        })}
        </div>)}
      </div>
      {pages.length > 1 && <div className="shop-pages" role="group" aria-label="Páginas de productos">
        {pages.map((_, index) => <button key={index} type="button" aria-label={'Página ' + (index + 1)}
          aria-current={index === page ? 'page' : undefined} onClick={() => selectPage(index)}/>)}
      </div>}
    </section>
    <section className="panel"><h2>Tu equipo</h2><div className="companion-picker">
      {owned.map(name => {
        const xp = pets.get(name)?.xp ?? 0
        const stage = companionStage(name, xp).stage.name.toLowerCase()
        return <button className="secondary" key={name} disabled={busy} aria-pressed={name === profile.companion}
          onClick={() => {
            if (name === profile.companion) return
            void update({ ...profile, starter: initial, companion: name,
              petPlans: [...petPlans.filter(plan => plan.from !== date), { from: date, target, companion: name }],
            })
          }}>
          <Companion name={name} xp={xp} outfit={outfitFor(profile, name)}/>{name}<small>{stage} · {xp} EXP</small>
        </button>
      })}
    </div>
      {activeOutfit.length > 0 && <p className="shop-note">Equipado en {profile.companion}: {activeOutfit.map(item => item.name).join(', ')}.</p>}
      {activeOutfit.some(item => item.slot !== 'buddy') && (pets.get(profile.companion)?.xp ?? 0) < companionStages[1].xp &&
        <p className="shop-note">La ropa y los accesorios aparecen al eclosionar.</p>}
    </section>
  </div>
}

const testGoldKey = 'gymbeast-local-shop-test-gold'
const testGold = 10000

export function LocalPetTools({ profile }: { profile: Profile }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewPet, setPreviewPet] = useState(profile.companion)
  const [previewStage, setPreviewStage] = useState(1)
  const [sampleOutfit, setSampleOutfit] = useState(false)
  const [credited, setCredited] = useState(() => localStorage.getItem(testGoldKey) === 'yes')
  return <><section className="panel pet-gallery">
      <button type="button" className="secondary" aria-expanded={previewOpen} aria-controls="pet-gallery-preview"
        onClick={() => setPreviewOpen(!previewOpen)}>Galería local de mascotas</button>
      <div id="pet-gallery-preview" hidden={!previewOpen}>
        {previewOpen && <>
          <p>Probá cualquier mascota y etapa. Tocala para ver su reacción.</p>
          <div className="input-grid">
            <label>Mascota de muestra<select value={previewPet} onChange={event => { setPreviewPet(event.target.value); setSampleOutfit(false) }}>
              {companions.map(name => <option key={name}>{name}</option>)}
            </select></label>
            <label>Etapa de muestra<select value={previewStage} onChange={event => { setPreviewStage(Number(event.target.value)); setSampleOutfit(false) }}>
              {companionStages.map((stage, index) => <option key={stage.name} value={index}>{stage.name}</option>)}
            </select></label>
          </div>
          <button type="button" className="secondary" onClick={() => {
            setPreviewPet('Dragón'); setPreviewStage(2); setSampleOutfit(true)
          }}>Ver muestra de ropa</button>
          {sampleOutfit && <p>Buzo Oversize y Reloj cronógrafo · muestra de calce</p>}
          <Habitat key={previewPet + previewStage} name={previewPet} xp={companionStages[previewStage].xp} health={100}
            outfit={sampleOutfit ? goods.filter(item => ['hoodie', 'watch'].includes(item.id)) : outfitFor(profile, previewPet)} preview/>
        </>}
      </div>
    </section>
    <section className="panel">
      <button type="button" className="secondary" disabled={credited} onClick={() => {
        localStorage.setItem(testGoldKey, 'yes')
        setCredited(true)
      }}>{credited ? 'Oro de prueba acreditado' : 'Acreditar 10.000 de oro de prueba'}</button>
    </section>
  </>
}
