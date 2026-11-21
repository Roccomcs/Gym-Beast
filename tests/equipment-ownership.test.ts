import { expect, test } from 'vitest'
import { outfitFor } from '../src/shop-catalog'

test('una compra antigua duplicada conserva un único dueño al cambiar la mascota activa', () => {
  const profile = { companion: 'Dragón', starter: 'Dragón',
    petOutfits: { Dragón: { top: 'boca' }, Lobo: { top: 'boca', bottom: 'jogger' } } }
  expect(outfitFor(profile, 'Dragón').map(g => g.id)).toEqual(['boca'])
  expect(outfitFor(profile, 'Lobo').map(g => g.id)).toEqual(['jogger'])
  expect(outfitFor({ ...profile, companion: 'Lobo' }, 'Lobo').map(g => g.id)).toEqual(['jogger'])
})

test('un objeto desequipado queda disponible para otra mascota', () => {
  const profile = { companion: 'Lobo', starter: 'Dragón',
    petOutfits: { Dragón: { top: null }, Lobo: { top: 'boca' } } }
  expect(outfitFor(profile, 'Dragón')).toEqual([])
  expect(outfitFor(profile, 'Lobo').map(g => g.id)).toEqual(['boca'])
})
