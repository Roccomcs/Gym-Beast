import {localRewards} from './local-rewards'
import { recordPetPlan } from './weekly-plan'
import { useRef, useState } from 'react'
import { ExerciseDemonstration } from './movement'
import { catalog } from './domain'
import { useLiveQuery } from 'dexie-react-hooks'
import { Coins, Sparkles, Egg, Shirt, Dumbbell, Gem, PawPrint } from 'lucide-react'
import { Companion, companions, companionStages } from './companion'
import { GoodArt } from './good-art'
import { FittedAccessory } from './fitted-accessory'
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

export {localRewards} from './local-rewards'

export function PetShop({ owner, profile, rewards, pets, petPlans, date, target }: {
  owner: string; profile: Profile; rewards: Reward[]; pets: Map<string, PetVitals>; petPlans: PetPlan[]; date: string; target: number
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [petName, setPetName] = useState('')
  const [namingSpecies, setNamingSpecies] = useState<string>()
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
  const familiar = activeOutfit.find(item => item.slot === 'buddy')
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
  async function equip(item: ShopGood) {
    setBusy(true)
    try {
      await db.transaction('rw', db.items, db.operations, db.syncState, db.tombstones, async () => {
        const row = await db.items.get([owner, 'profile', 'self'])
        if (!row) throw new Error('Perfil ausente')
        const current = row.data as Profile
        const holder = companions.find(name => outfitFor(current, name).some(good => good.id === item.id))
        if (holder && holder !== current.companion) {
          setMessage('Primero quitáselo a ' + (current.petNames?.[holder] || holder) + '.')
          return
        }
        const outfits: NonNullable<Profile['petOutfits']> = Object.fromEntries(companions.map(name =>
          [name, Object.fromEntries(outfitFor(current, name).map(good => [good.slot, good.id]))]))
        outfits[current.companion][item.slot] = holder ? null : item.id
        await save(owner, 'profile', 'self', { ...current, equipped: undefined, petGear: {},
          petOutfits: outfits })
        setMessage(holder ? 'Objeto quitado.' : 'Objeto equipado.')
      })
    } catch { setMessage('No pudimos guardar el equipamiento.') }
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
        if (result.startsWith('Compraste ') && item.slot === 'egg') { setPetName(''); setNamingSpecies(item.id.slice(4)) }
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
      if (item.slot === 'egg') { setPetName(''); setNamingSpecies(item.id.slice(4)) }
    } catch { setMessage('No pudimos confirmar la compra. Revisá el saldo y la conexión.') }
    finally { setBusy(false) }
  }
  return <div className="magic-shop">
    <section className="shop-masthead">
      <h1>Tienda mágica</h1>
      <p className="shop-balance" data-testid="shop-balance"><Coins aria-hidden="true" size={18}/> <span className="sr-only">Saldo: </span>{gold}<span className="sr-only"> de oro</span></p>
      <p role="status" className="shop-feedback">{message}</p>
    </section>
    {namingSpecies && <div className="pet-naming-backdrop"><form className="panel shop-pet-name" role="dialog"
      aria-modal="true" aria-label="Nombrar nuevo compañero" onSubmit={event => {
        event.preventDefault()
        if (!petName.trim() || busy) return
        setBusy(true)
        void (async () => {
          try {
            const row = await db.items.get([owner, 'profile', 'self'])
            if (!row) throw new Error('Perfil ausente')
            const current = row.data as Profile
            await save(owner, 'profile', 'self', { ...current,
              petNames: { ...current.petNames, [namingSpecies]: petName.trim() } })
            setNamingSpecies(undefined)
            setPetName('')
          } catch { setMessage('No pudimos guardar el nombre. Probá de nuevo.') }
          finally { setBusy(false) }
        })()
      }}>
      <label>Nombre para tu {namingSpecies.toLowerCase()}<input autoFocus autoComplete="off"
        value={petName} maxLength={30} required onChange={event => setPetName(event.target.value)}/></label>
      <button disabled={busy || !petName.trim()}>Guardar nombre</button>
    </form></div>}
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
          const holder = owned.find(name => name !== profile.companion && outfitFor(profile, name).some(good => good.id === item.id))
          const eggSpecies = item.slot === 'egg' ? item.id.slice(4) : ''
          return <article className="shop-row" key={item.id} data-equipped={equipped}>
            <div className="shop-display">{eggSpecies ? <Companion name={eggSpecies} xp={0}/> : <GoodArt good={item}/>}</div>
            <h3>{item.name}</h3>
            <p className="shop-price">{own ? equipped ? 'Equipado' : 'Comprado' : <><Coins size={14} aria-hidden="true"/> {item.price} de oro</>}</p>
            {own ? eggSpecies ? <small>En tu equipo</small> :
              <button className="secondary" disabled={busy || !!holder} onClick={() => void equip(item)}>
                {holder ? 'Lo usa ' + (profile.petNames?.[holder] || holder) : equipped ? 'Quitar' : 'Equipar'}
              </button> :
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
    <section className="shop-team" aria-label="Tu equipo">
      <h2>Tu equipo</h2>
      <div className="shop-fitting-stage">
        <Companion name={profile.companion} xp={pets.get(profile.companion)?.xp ?? 0} outfit={activeOutfit.filter(item => item.slot !== 'buddy')}/>
        {familiar && <span className="shop-familiar" data-art={familiar.art} aria-label={familiar.name}>
          {familiar.art === 'fish' || familiar.art === 'tiger'
            ? <Companion name={familiar.art === 'fish' ? 'Ajolote' : 'Tigre'} stage="bebé"/>
            : <FittedAccessory item={familiar}/>}
        </span>}
      </div>
      {owned.length > 1 && <div className="shop-team-picker" aria-label="Elegir compañero">
        {owned.map(name => <button type="button" className="secondary" key={name} disabled={busy}
          aria-label={'Elegir ' + name} aria-pressed={name === profile.companion}
          onClick={() => {
            if (name === profile.companion) return
            void update({ ...profile, starter: initial, companion: name,
              petPlans: recordPetPlan(petPlans, { from: date, target, companion: name }),
            })
          }}>
          <Companion name={name} xp={pets.get(name)?.xp ?? 0}/>
        </button>)}
      </div>}
    </section>
  </div>
}

const testGoldKey = 'gymbeast-local-shop-test-gold'
const testGold = 10000

export function LocalPetTools({ profile }: { profile: Profile }) {
  const [trainingPreview, setTrainingPreview] = useState(false)
  const [previewExercise, setPreviewExercise] = useState<string>('bench-barbell')
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
          <div className="actions tabs" aria-label="Vista de la muestra">
            <button type="button" className={trainingPreview ? 'secondary' : ''} aria-pressed={!trainingPreview} onClick={() => setTrainingPreview(false)}>Escena</button>
            <button type="button" className={trainingPreview ? '' : 'secondary'} aria-pressed={trainingPreview} onClick={() => setTrainingPreview(true)}>Entrenamiento</button>
          </div>
          {trainingPreview ? <>
            <label>Ejercicio de muestra<select value={previewExercise} onChange={event => setPreviewExercise(event.target.value)}>
              {catalog.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select></label>
            <ExerciseDemonstration key={previewPet + previewStage + previewExercise} id={previewExercise} pet={previewPet} petXp={companionStages[previewStage].xp}/>
          </> : <Habitat key={previewPet + previewStage} name={previewPet} xp={companionStages[previewStage].xp} health={100}
            outfit={sampleOutfit ? goods.filter(item => ['hoodie', 'watch'].includes(item.id)) : outfitFor(profile, previewPet)} preview/>}
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
