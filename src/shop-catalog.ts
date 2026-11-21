import catalog from './shop-catalog.json'

export const goods = catalog
export type ShopGood = typeof goods[number]
const byId = new Map(goods.map(item => [item.id, item]))

type EquipmentProfile = {
  starter?: string
  companion: string
  equipped?: string
  petGear?: Record<string, string | null>
  petOutfits?: Record<string, Record<string, string | null>>
}

function rawOutfit(profile: EquipmentProfile, name: string) {
  const old = profile.petGear?.[name] ?? (name === (profile.starter ?? profile.companion) ? profile.equipped : undefined)
  const legacy = old ? byId.get(old) : undefined
  const slots = { ...(legacy ? { [legacy.slot]: legacy.id } : {}), ...profile.petOutfits?.[name] }
  return Object.values(slots).flatMap(id => {
    const item = id ? byId.get(id) : undefined
    return item ? [item] : []
  })
}

// Resolve legacy duplicates consistently, independently of the active companion.
export function outfitFor(profile: EquipmentProfile, name: string) {
  const names = [...new Set([profile.starter ?? profile.companion,
    ...Object.keys(profile.petOutfits ?? {}).sort(), ...Object.keys(profile.petGear ?? {}).sort(), name])]
  const used = new Set<string>()
  for (const species of names) {
    const outfit = rawOutfit(profile, species).filter(item => {
      if (used.has(item.id)) return false
      used.add(item.id)
      return true
    })
    if (species === name) return outfit
  }
  return []
}
