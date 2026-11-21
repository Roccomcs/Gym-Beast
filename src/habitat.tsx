import { useState, type ReactNode } from 'react'
import { Droplets, Flame, Heart, Leaf, PawPrint, Radio, Sparkles } from 'lucide-react'
import { Companion, companionStage } from './companion'
import { FittedAccessory } from './fitted-accessory'
import type { ShopGood } from './shop-catalog'
import './habitat-motion.css'

const habitats = {
  'Dragón': { id: 'dragon', title: 'Patio de las ruinas', Effect: Flame },
  Cocodrilo: { id: 'crocodile', title: 'Laguna de los mangles', Effect: Droplets },
  Oso: { id: 'bear', title: 'Claro de la miel', Effect: Leaf },
  Lobo: { id: 'wolf', title: 'Bosque de luna llena', Effect: Radio },
  Zorro: { id: 'fox', title: 'Sendero de las luciérnagas', Effect: Sparkles },
  Ajolote: { id: 'axolotl', title: 'Gruta de coral', Effect: Droplets },
  Tigre: { id: 'tiger', title: 'Santuario de bambú', Effect: PawPrint },
  Fénix: { id: 'phoenix', title: 'Templo del sol', Effect: Flame },
}

export function Habitat({ name, displayName, xp, health, outfit, sceneFooter, showStats = true, preview = false }: {
  sceneFooter?: ReactNode;
  name: string; displayName?: string; showStats?: boolean; xp: number; health: number; outfit?: ShopGood[]; preview?: boolean
}) {
  const [animation, play] = useState(0)
  const [buddyReaction, petBuddy] = useState(0)
  const buddy = outfit?.find(item => item.slot === 'buddy')
  const { id, title, Effect } = habitats[name as keyof typeof habitats] ?? habitats.Dragón
  const { index, stage, next } = companionStage(name, xp)
  const percent = next ? 100 * (xp - stage.xp) / (next.xp - stage.xp) : 100
  return <section className="habitat panel" aria-label="Hábitat de tu mascota">
    <div className="habitat-scene" data-phase={index} data-species={id}>
      <span className="habitat-weather" aria-hidden="true">
        {Array.from({ length: id === 'crocodile' ? 4 : 8 }, (_, index) =>
          <span className="habitat-weather-detail" key={index}/>)}
      </span>
      <button type="button" className="habitat-pet" aria-label={'Jugar con ' + name} onClick={() => play(value => value + 1)}>
        <span className={index > 0 && (id === 'dragon' || id === 'phoenix') ? 'pet-path pet-patrol' : 'pet-path'}>
          <span className="pet-motion">
            <span key={animation + ':' + index} className={animation ? 'pet-art pet-play' : 'pet-art'}>
              <Companion name={name} xp={xp} outfit={outfit?.filter(item => item.slot !== 'buddy')}/>
              {animation > 0 && <span className="habitat-effects" aria-hidden="true">
                <Effect/><Effect/><Effect/>
              </span>}
            </span>
          </span>
        </span>
      </button>
      {buddy && <button type="button" className="habitat-buddy" aria-label={'Jugar con ' + buddy.name}
        data-buddy-art={buddy.art} onClick={() => petBuddy(value => value + 1)}>
        <span className="buddy-reaction" key={buddy.id + buddyReaction} data-played={buddyReaction > 0}>
          {buddy.art === 'fish' || buddy.art === 'tiger'
            ? <Companion name={buddy.art === 'fish' ? 'Ajolote' : 'Tigre'} stage="bebé"/>
            : <FittedAccessory item={buddy}/>}
        </span>
      </button>}
      {preview && <div className="habitat-badge">{stage.name}</div>}
      {preview && <span className="habitat-place">{title}</span>}
      {sceneFooter}
    </div>
    {!preview && <div className="habitat-details">
      <div className="page-heading"><h2>{displayName || name}</h2></div>
      {showStats && <div className="habitat-meter">
        <span><Heart size={16} fill="currentColor"/> Vida</span><strong>{health} / 100</strong>
        <progress className="life-meter" aria-label="Vida de la mascota" max={100} value={health}/>
      </div>}
      {showStats && <div className="habitat-meter">
        <span><Sparkles size={16}/> EXP</span><strong>{xp}{next ? ' / ' + next.xp : ''}</strong>
        <progress aria-label="Progreso hacia la siguiente evolución" max={100} value={percent}/>
      </div>}
    </div>}
  </section>
}
