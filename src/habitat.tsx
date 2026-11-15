import { useState } from 'react'
import { Flame, Heart, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Companion, companionStage } from './companion'

export function Habitat({ name, xp, health }: { name: string; xp: number; health: number }) {
  const [animation, play] = useState(0)
  const { index, stage, next } = companionStage(name, xp)
  const remaining = next ? next.xp - xp : 0
  const percent = next ? 100 * (xp - stage.xp) / (next.xp - stage.xp) : 100
  const dragon = name === 'Dragón'
  return <section className="habitat panel" aria-label="Hábitat de tu mascota">
    <div className="habitat-scene" data-phase={index}>
      <span className="habitat-orbit" aria-hidden="true"/><span className="habitat-spark spark-one" aria-hidden="true">✦</span>
      <span className="habitat-spark spark-two" aria-hidden="true">✦</span>
      <button className="habitat-pet" aria-label={'Jugar con ' + name} aria-describedby={animation ? 'habitat-reaction' : undefined} onClick={() => play(value => value + 1)}>
        <span key={animation + ':' + index} className={'pet-motion' + (animation ? ' pet-play' : '')}>
          <Companion name={name} xp={xp}/>
          {dragon && index > 0 && <span className="pet-fire pet-fire-idle" aria-hidden="true"><Flame fill="currentColor"/></span>}
          {!!animation && dragon && index > 0 && <span className="pet-fire pet-fire-tap" aria-hidden="true"><Flame fill="currentColor"/></span>}
        </span>
      </button>
      {!!animation && <span key={animation} id="habitat-reaction" className="habitat-reaction" role="status">{index === 0 ? '¡El huevo se mueve!' : dragon ? '¡Bocanada de fuego!' : '¡Hola!'}</span>}
      <div className="habitat-badge">{stage.name}</div>
    </div>
    <div className="habitat-details">
      <div className="page-heading"><h2>{name}</h2><NavLink to="/mascotas">Ver compañero</NavLink></div>
      <div className="habitat-meter">
        <span><Heart size={16} fill="currentColor"/> Vida</span><strong>{health} / 100</strong>
        <progress className="life-meter" aria-label="Vida de la mascota" max={100} value={health}/>
      </div>
      <div className="habitat-meter">
        <span><Sparkles size={16}/> EXP</span><strong>{xp}{next ? ' / ' + next.xp : ''}</strong>
        <progress aria-label="Progreso hacia la siguiente evolución" max={100} value={percent}/>
      </div>
      <p>{next ? 'Faltan ' + remaining + ' EXP para ' + (index === 0 ? 'eclosionar' : 'evolucionar') + '.' : 'Evolución máxima.'}
        {health < 100 && ' Cada entrenamiento de esta semana recupera vida.'}</p>
    </div>
  </section>
}
