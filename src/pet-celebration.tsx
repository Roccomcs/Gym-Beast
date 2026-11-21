import { useEffect, useState } from 'react'
import { Companion } from './companion'
import { stageIndex } from './pet-progress'
import { petSources } from './pet-species'
import { claimCelebration } from './celebration-state'
import type { ShopGood } from './shop-catalog'

export function PetCelebration({ owner, sessionId, name, xp, before, eligible, confirmed, outfit }: {
  owner: string; sessionId: string; name: string; xp: number; before?: number;
  eligible: boolean; confirmed: boolean; outfit: ShopGood[]
}) {
  const evolvedStage = confirmed && before !== undefined && stageIndex(xp) > stageIndex(before) ? stageIndex(xp) : 0
  const [playing, play] = useState(false)
  const [evolved, evolve] = useState(false)
  useEffect(() => {
    if (!eligible || document.visibilityState === 'hidden') return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    void claimCelebration(owner, sessionId, evolvedStage).then(receipt => {
      if (!live) return
      evolve(receipt.evolution)
      play(receipt.celebration || receipt.evolution)
      timer = setTimeout(() => { play(false); evolve(false) }, 3200)
    }).catch(() => { /* Presentation failure must not affect the saved session. */ })
    return () => { live = false; clearTimeout(timer) }
  }, [owner, sessionId, eligible, evolvedStage])
  return <div className="victory-stage pet-celebration" data-celebrate={playing}
    data-species={petSources[name]} data-evolved={evolved}>
    <span className="victory-stars" aria-hidden="true">✦ ✧ ✦</span>
    <Companion name={name} xp={xp} outfit={outfit}/>
    {evolved && <p className="evolution-caption" role="status">¡Tu compañero evolucionó!</p>}
  </div>
}
