import { companionStages, stageIndex } from './pet-progress'
import { GoodArt } from './good-art'
import { FittedAccessory } from './fitted-accessory'
import { DragonJersey } from './dragon-jersey'
import type { ShopGood } from './shop-catalog'
import { useEffect, useState, type CSSProperties } from 'react'
import { wornOutfit } from './worn-garment'

export { companionStages } from './pet-progress'

export const starters = ['Dragón', 'Cocodrilo', 'Oso', 'Lobo'] as const
export const companions = [...starters, 'Zorro', 'Ajolote', 'Tigre', 'Fénix'] as const
const sources: Record<string, string> = {
  Dragón: 'dragon', Cocodrilo: 'crocodile', Oso: 'bear', Lobo: 'wolf',
  Zorro: 'fox', Ajolote: 'axolotl', Tigre: 'tiger', Fénix: 'phoenix',
}

// Head and chest anchors as percentages of each transparent sprite cell.
const outfitAnchors: Record<string, number[][]> = {
  dragon: [[52,44,53,65],[64,29,67,58],[67,22,69,54],[68,15,71,53],[67,12,70,53]],
  crocodile: [[46,34,43,69],[54,25,50,61],[52,20,51,57],[56,13,56,57],[62,9,61,52]],
  bear: [[48,37,45,63],[55,23,53,56],[59,19,51,61],[54,11,47,53],[55,8,49,55]],
  wolf: [[52,44,47,69],[62,28,55,61],[68,22,62,61],[63,17,58,56],[70,11,68,52]],
  fox: [[57,52,51,73],[62,38,53,65],[69,33,59,61],[70,27,61,60],[77,22,64,60]],
  axolotl: [[60,58,51,75],[64,43,51,65],[70,46,61,66],[72,45,60,70],[76,42,66,65]],
  tiger: [[58,51,49,70],[64,34,51,64],[70,22,60,56],[71,15,61,56],[75,14,63,56]],
  phoenix: [[55,47,52,68],[54,39,50,66],[64,26,57,61],[55,29,52,60],[57,26,53,58]],
}

export function companionStage(_name: string, xp: number) {
  const index = stageIndex(xp)
  return { index, stage: companionStages[index], next: companionStages[index + 1] }
}

export function Companion({ name, xp, stage = 'adulta', outfit = [] }: {
  name: string; xp?: number; stage?: 'bebé' | 'joven' | 'adulta'; outfit?: ShopGood[]
}) {
  const cell = xp === undefined ? (stage === 'bebé' ? 1 : stage === 'joven' ? 2 : 4) : companionStage(name, xp).index
  const species = sources[name] ?? 'dragon'
  const garment = cell > 0 ? outfit.find(item => ['shirt', 'tee', 'tank', 'hoodie'].includes(item.art)) : undefined
  const bottom = cell > 0 ? outfit.find(item => item.slot === 'bottom') : undefined
  const fitted = (slot: string) => species === 'dragon' && cell === 2 ? outfit.find(item => item.slot === slot) : undefined
  const neck = fitted('neck'), head = fitted('head'), face = fitted('face'), wrist = fitted('wrist'), hands = fitted('hands')
  const accessories = [neck, head, face, wrist, hands]
  const garmentKey = [species, cell, garment?.id, bottom?.id, ...accessories.map(item => item?.id)].join(':')
  const [rendered, setRendered] = useState<{ key: string; url: string }>()
  useEffect(() => {
    const pieces = [neck, head, face, wrist, hands].filter(item => item !== undefined)
    if (!garment && !bottom && !pieces.length) return
    let current = true
    void wornOutfit(species, cell, garment, bottom, pieces).then(url => {
      if (current && url) setRendered({ key: garmentKey, url })
    }).catch(() => {})
    return () => { current = false }
  }, [species, cell, garment, bottom, neck, head, face, wrist, hands, garmentKey])
  const dressed = rendered && garmentKey === rendered.key ? rendered.url : undefined
  const [headX, headY, chestX, chestY] = outfitAnchors[species][Math.max(0, cell - 1)]
  return <span aria-hidden="true" className="dragon-stage" data-companion={name} data-form={cell}
    data-dressed-sprite={dressed ? (garment ?? bottom)?.id : undefined}
    data-dressed-bottom={dressed ? bottom?.id : undefined}
    data-dressed-accessories={dressed ? accessories.flatMap(item => item ? [item.id] : []).join(' ') : undefined}
    data-dressed-head={dressed ? head?.id : undefined} style={{
    backgroundImage: dressed ? 'url(' + dressed + ')' : 'url(/' + species + '-stages.webp)',
    backgroundPosition: dressed ? 'center' : (cell % 3) * 50 + '% ' + (cell >= 3 ? '100%' : '0%'),
    backgroundSize: dressed ? '100% 100%' : undefined,
    '--outfit-head-x': headX + '%', '--outfit-head-y': headY + '%',
    '--outfit-chest-x': chestX + '%', '--outfit-chest-y': chestY + '%',
    '--outfit-size': [1, .72, .94, 1, 1.12, 1.19][cell],
  } as CSSProperties}>
    {outfit.filter(item => (cell > 0 || item.slot === 'buddy') && !accessories.includes(item) &&
      !(dressed && (item.id === garment?.id || item.id === bottom?.id))).map(item =>
      item.art === 'shirt' && species === 'dragon'
        ? <DragonJersey key={item.id} good={item} cell={cell}/>
        : <span className="pet-outfit-piece" data-slot={item.slot} data-worn-art={item.art} key={item.id}>
          {item.slot !== 'top' && item.slot !== 'bottom' && !['fish', 'tiger'].includes(item.art)
            ? <FittedAccessory item={item}/> : <GoodArt good={item}/>}
        </span>)}
  </span>
}
