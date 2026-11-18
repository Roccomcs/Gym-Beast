import { useId } from 'react'
import type { ShopGood } from './shop-catalog'

// Outlines traced on the torso and front shoulder of each dragon sprite.
const cuts = [
  null,
  { torso: 'M41 63 Q49 68 60 66 L61 70 Q58 75 52 75 L47 72 L41 70 Z', sleeve: 'M43 63 Q38 63 36 67 L37 71 Q40 74 44 72 L46 68 Z', cuff: 'M37 70 Q40 73 44 71', neck: 'M43 64 Q51 69 59 67' },
  { torso: 'M55 54 Q60 57 68 57 L70 60 Q70 66 66 70 L61 72 L56 69 L53 63 Z', sleeve: 'M56 54 Q51 53 48 57 L46 63 Q50 67 55 66 L59 60 Z', cuff: 'M47 62 Q50 65 55 65', neck: 'M57 55 Q61 59 68 58' },
  { torso: 'M58 48 Q64 54 75 53 L77 57 Q77 63 72 68 L65 71 L58 67 L55 60 Z', sleeve: 'M59 49 Q54 47 51 51 L48 58 Q50 63 56 64 L62 55 Z', cuff: 'M49 57 Q52 62 56 62', neck: 'M59 49 Q65 55 75 54' },
  { torso: 'M63 46 Q70 50 79 49 L81 55 Q80 63 75 67 L68 71 L61 67 L57 59 Z', sleeve: 'M64 47 Q58 44 54 50 L51 57 Q53 62 60 63 L66 54 Z', cuff: 'M52 56 Q54 61 60 61', neck: 'M64 47 Q70 52 79 50' },
  { torso: 'M67 39 Q75 45 86 43 L89 48 Q88 57 83 62 L73 67 L65 63 L62 54 Z', sleeve: 'M69 40 Q62 36 57 43 L54 52 Q57 58 65 58 L71 49 Z', cuff: 'M55 51 Q58 56 64 56', neck: 'M68 40 Q77 46 86 44' },
]

const bands: Record<string, number[]> = {
  stripes: [.15, .32, .49, .66, .83],
  band: [.42, .65],
  sash: [.44, .59],
  center: [.4, .6],
  trim: [.16, .85],
  pin: [.18, .22, .39, .43, .6, .64, .81, .85],
}

export function DragonJersey({ good, cell }: { good: ShopGood; cell: number }) {
  const id = useId()
  const color = (index: number) => (index % 2 === 1) !== (good.pattern === 'trim') ? good.secondary : good.primary
  const stops = [0, ...(bands[good.pattern] ?? []), 1]
  const vertical = good.pattern === 'band'
  const diagonal = good.pattern === 'sash'
  const cut = cuts[cell]
  if (!cut) return null
  return <svg className="dragon-jersey pet-outfit-piece" data-slot="top" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <linearGradient id={id + '-fabric'} x1="0" y1={diagonal ? '1' : '0'} x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
        {stops.slice(0, -1).flatMap((start, index) => [
          <stop key={index + '-start'} offset={start} stopColor={color(index)}/>,
          <stop key={index + '-end'} offset={stops[index + 1]} stopColor={color(index)}/>,
        ])}
      </linearGradient>
      <linearGradient id={id + '-light'} x2="0.8" y2="1">
        <stop stopColor="#fff0ce" stopOpacity=".25"/>
        <stop offset=".55" stopColor="#241333" stopOpacity="0"/>
        <stop offset="1" stopColor="#180b2a" stopOpacity=".5"/>
      </linearGradient>
    </defs>
    <path d={cut.torso} fill={'url(#' + id + '-fabric)'} stroke="#23132b" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d={cut.torso} fill={'url(#' + id + '-light)'}/>
    <path d={cut.sleeve} fill={good.primary} stroke="#23132b" strokeWidth="1.1" strokeLinejoin="round"/>
    <path d={cut.sleeve} fill={'url(#' + id + '-light)'}/>
    <path d={cut.cuff} fill="none" stroke={good.secondary} strokeWidth="1.35"/>
    <path d={cut.neck} fill="none" stroke={good.primary} strokeWidth="1.15"/>
  </svg>
}
