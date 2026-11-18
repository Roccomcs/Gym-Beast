import { createRoot, type Root } from 'react-dom/client'
import { Companion } from '../src/companion'
import { Habitat } from '../src/habitat'
import { companionStages } from '../src/pet-progress'
import { goods } from '../src/shop-catalog'

export type WardrobeCase = { id: string; name: string; stage: number; outfit: string[]; scene?: boolean }
let root: Root | undefined

// Development-only fixture served by Vite during the visual review.
export function showWardrobeReview(cases: WardrobeCase[]) {
  if (!root) {
    const element = document.createElement('div')
    element.id = 'wardrobe-review'
    document.body.append(element)
    root = createRoot(element)
  }
  root.render(<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', minHeight: '100vh', zIndex: 10000, background: '#131316', padding: 16 }}>
    <div className="wardrobe-sheet" style={{ display: 'grid', gridTemplateColumns: cases.length === 1 ? '1fr' : cases.length === 5 ? 'repeat(5, 1fr)' : 'repeat(6, 1fr)', gap: 8 }}>
      {cases.map(sample => <div key={sample.id} data-wardrobe-case={sample.id} style={{ minWidth: 0, border: '1px solid #55515d', background: '#242429', padding: 8 }}>
        <p style={{ fontSize: 13, color: '#f7ce68' }}>{sample.name} · {companionStages[sample.stage].name}</p>
        <div className="wardrobe-character" style={{ width: cases.length === 1 ? 352 : '100%', margin: 'auto' }}>
          {sample.scene ? <Habitat name={sample.name} xp={companionStages[sample.stage].xp} health={100}
            outfit={goods.filter(good => sample.outfit.includes(good.id))}/>
            : <Companion name={sample.name} xp={companionStages[sample.stage].xp} outfit={goods.filter(good => sample.outfit.includes(good.id))}/>}
        </div>
      </div>)}
    </div>
  </div>)
}
