import { useId } from 'react'
import type { ShopGood } from './shop-catalog'

export function FittedAccessory({ item }: { item: ShopGood }) {
  const id = useId()
  const metal = 'url(#' + id + ')'
  const trim = item.secondary
  const ink = '#281627'
  const shine = '#fff0c8'
  let drawing
  switch (item.art) {
    case 'cap':
      drawing = <>
        <path fill={metal} d="M6 22 7 15 10 9 16 5 24 5 30 9 34 14 34 22 29 24 14 25Z"/>
        <path fill={trim} d="M34 20 39 24 35 27 26 27 19 25 25 22Z"/>
        <path fill="none" stroke={trim} d="m14 22 1-9 4-6m4 0 5 4 2 9"/>
        <path stroke={shine} d="M11 14 16 9m7-2 4 1" opacity=".8"/>
      </>
      break
    case 'crown':
      drawing = <>
        <path fill={metal} d="m6 23-1-13 8 6 6-12 7 10 8-7-1 15-4 5-18 1Z"/>
        <path fill={trim} d="m7 22 8 1 16-3-1 6-17 2-4-1Z"/>
        <path fill={shine} d="m16 18 4-5 4 4-4 5Z"/>
        <path fill="none" stroke={shine} d="m8 13 5 5 6-11m-8 18 6 1 12-2"/>
      </>
      break
    case 'watch':
      drawing = <>
        <path fill={trim} d="M8 5 32 5 34 27 29 30 9 29 6 24Z"/>
        <path fill={metal} d="M12 8 28 7 32 12 30 24 26 27 10 24 8 18Z"/>
        <path fill="#251c36" d="m13 11 12-1 4 4-2 8-3 2-12-3-1-4Z"/>
        <path stroke={shine} fill="none" d={item.id === 'sport-watch' ? 'M15 16h10m-10 4h5' : 'm19 13 1 5 5 2'}/>
      </>
      break
    case 'flame':
      drawing = <>
        <path fill={metal} d="M7 24 8 18 13 13 14 19 20 11 22 3 27 10 29 16 31 12 35 21 33 27 27 30 15 30Z"/>
        <path fill={trim} d="M12 26 15 19 18 22 23 16 27 21 30 24 26 29 16 29Z"/>
        <path d="M17 24h2m5 0h2" strokeWidth="2.5"/>
      </>
      break
    case 'moon':
      drawing = <>
        <path fill={metal} d="M23 3 16 9 14 16 17 22 24 25 32 22 37 17 35 25 28 30 17 31 8 27 5 20 6 13 12 6Z"/>
        <path fill="none" stroke={trim} d="m10 21 3 4 8 2m-5-14 5-3"/>
        <path fill={shine} d="m27 8 2-4 2 4 4 1-4 2-2 4-2-4-4-2Z"/>
      </>
      break
    case 'slime':
      drawing = <>
        <path fill={metal} d="M4 23 7 18 11 16 14 8 20 5 26 7 29 12 31 17 36 21 37 25 33 29 24 30 10 30 5 27Z"/>
        <path fill={trim} fillOpacity=".55" d="m6 25 10 3 11-1 8-3-2 5-17 1-8-2Z"/>
        <path d="M13 15 17 10 20 9" fill="none" stroke={shine}/>
        <path strokeWidth="3" d="M16 21h1m9 0h1"/>
      </>
      break
    case 'wand':
      drawing = <>
        <path fill={metal} d="m6 26 20-18 4 5-21 17Z"/>
        <path fill={trim} d="m26 2 4 5 7 1-4 5 1 6-6-2-6 3 1-6-5-4 7-2Z"/>
        <path fill="none" stroke={shine} d="m8 26 12-11m5-6 4-2"/>
      </>
      break
    default: return null
  }
  return <svg className="fitted-accessory" viewBox="0 0 40 32" aria-hidden="true" stroke={ink} strokeWidth="1.3" strokeLinejoin="round">
    <defs><linearGradient id={id} x2=".75" y2="1">
      <stop stopColor={shine}/>
      <stop offset=".24" stopColor={item.primary}/>
      <stop offset=".65" stopColor={item.primary}/>
      <stop offset="1" stopColor={trim}/>
    </linearGradient></defs>
    {drawing}
  </svg>
}
