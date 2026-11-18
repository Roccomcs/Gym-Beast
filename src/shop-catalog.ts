import catalog from './shop-catalog.json'

export const goods = catalog
export type ShopGood = typeof goods[number]
const byId = new Map(goods.map(item => [item.id, item]))

export function outfitFor(profile: {
  starter?: string
  companion: string
  equipped?: string
  petGear?: Record<string, string | null>
  petOutfits?: Record<string, Record<string, string | null>>
}, name: string) {
  const old = profile.petGear?.[name] ?? (name === (profile.starter ?? profile.companion) ? profile.equipped : undefined)
  const legacy = old ? byId.get(old) : undefined
  const slots = { ...(legacy ? { [legacy.slot]: legacy.id } : {}), ...profile.petOutfits?.[name] }
  return Object.values(slots).flatMap(id => {
    const item = id ? byId.get(id) : undefined
    return item ? [item] : []
  })
}
