import type { ShopGood } from './shop-catalog'
import { paintDragonAccessory } from './dragon-accessories'

const assets = new Map<string, Promise<HTMLImageElement>>()
const rendered = new Map<string, Promise<string>>()
const size = 352

function image(path: string) {
  const cached = assets.get(path)
  if (cached) return cached
  const source = new Image()
  source.src = path
  const loaded = source.decode().then(() => source).catch((error: unknown) => {
    assets.delete(path)
    throw error
  })
  if (assets.size >= 6) assets.delete(assets.keys().next().value!)
  assets.set(path, loaded)
  return loaded
}

const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16))
const directoryFor = (item: ShopGood) => item.art === 'shirt' || item.art === 'tee' ? '/jerseys/' : '/garments/' + item.art + '/'

function accent(pattern: string, x: number, y: number, band: boolean) {
  switch (pattern) {
    case 'band': return band
    case 'stripes': return Math.floor(x * 7) % 2 === 1
    case 'sash': return Math.abs(x - y - .08) < .14
    case 'center': return x > .41 && x < .61
    case 'trim': return y < .10 || y > .92
    case 'pin': return (x * 7) % 1 < .12
    default: return false
  }
}

export function wornGarment(species: string, cell: number, item: ShopGood) {
  const key = species + ':' + cell + ':' + item.id
  const cached = rendered.get(key)
  if (cached) return cached
  const build = async () => {
    if (species === 'dragon' && cell === 2 && item.id === 'boca') return '/dragon-boca-cria.webp'
    const directory = directoryFor(item)
    const tailored = directory !== '/jerseys/'
    const [art, fabric] = await Promise.all([
      image(directory + species + '.webp'),
      item.id === 'boca' ? undefined : image(directory + species + '-fabric.png'),
    ])
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas no disponible')
    const left = cell % 3 * size
    const top = Math.floor(cell / 3) * size
    context.drawImage(art, left, top, size, size, 0, 0, size, size)
    if (!fabric) return canvas.toDataURL('image/png')
    const sprite = context.getImageData(0, 0, size, size)
    context.clearRect(0, 0, size, size)
    context.drawImage(fabric, left, top, size, size, 0, 0, size, size)
    const mask = context.getImageData(0, 0, size, size).data
    let minX = size, minY = size, maxX = 0, maxY = 0
    for (let i = 0; i < mask.length; i += 4) {
      if (!mask[i + 3]) continue
      const x = i / 4 % size, y = Math.floor(i / 4 / size)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    const primary = rgb(item.primary), secondary = rgb(item.secondary)
    for (let i = 0; i < mask.length; i += 4) {
      if (!mask[i + 3]) continue
      const x = (i / 4 % size - minX) / Math.max(1, maxX - minX)
      const y = (Math.floor(i / 4 / size) - minY) / Math.max(1, maxY - minY)
      const useAccent = tailored ? mask[i + 1] > 128 : accent(item.pattern, x, y, mask[i + 1] > 128)
      const color = useAccent ? secondary : primary
      const shade = mask[i] / 127
      for (let channel = 0; channel < 3; channel++) {
        const tint = color[channel]
        sprite.data[i + channel] = shade <= 1 ? tint * shade : tint + (255 - tint) * (shade - 1) * .44
      }
    }
    context.putImageData(sprite, 0, 0)
    return canvas.toDataURL('image/png')
  }
  const result = build().catch((error: unknown) => { rendered.delete(key); throw error })
  if (rendered.size >= 24) rendered.delete(rendered.keys().next().value!)
  rendered.set(key, result)
  return result
}

async function renderOutfit(species: string, cell: number, top?: ShopGood, bottom?: ShopGood) {
  if (!top) return bottom ? wornGarment(species, cell, bottom) : undefined
  if (!bottom) return wornGarment(species, cell, top)
  const [upper, lower, upperFabric, lowerFabric] = await Promise.all([
    wornGarment(species, cell, top).then(image),
    wornGarment(species, cell, bottom).then(image),
    image(directoryFor(top) + species + '-fabric.png'),
    image(directoryFor(bottom) + species + '-fabric.png'),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas no disponible')
  const left = cell % 3 * size, row = Math.floor(cell / 3) * size
  const pixels = (source: HTMLImageElement, atlas = false) => {
    context.clearRect(0, 0, size, size)
    if (atlas) context.drawImage(source, left, row, size, size, 0, 0, size, size)
    else context.drawImage(source, 0, 0)
    return context.getImageData(0, 0, size, size)
  }
  const pants = pixels(lower).data
  const lowerMask = pixels(lowerFabric, true).data
  const upperMask = pixels(upperFabric, true).data
  const sprite = pixels(upper)
  for (let i = 0; i < pants.length; i += 4) {
    if (!pants[i + 3] || upperMask[i + 3]) continue
    const outline = pants[i] < 75 && pants[i + 1] < 65 && pants[i + 2] < 85 &&
      [i - 4, i + 4, i - size * 4, i + size * 4].some(j => lowerMask[j + 3])
    if (!lowerMask[i + 3] && !outline) continue
    for (let channel = 0; channel < 4; channel++) sprite.data[i + channel] = pants[i + channel]
  }
  context.putImageData(sprite, 0, 0)
  return canvas.toDataURL('image/png')
}

export async function wornOutfit(species: string, cell: number, top?: ShopGood, bottom?: ShopGood, accessories: ShopGood[] = []) {
  const outfit = await renderOutfit(species, cell, top, bottom)
  if (!accessories.length) return outfit
  const art = await image(outfit ?? '/dragon-stages.webp')
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas no disponible')
  if (outfit) context.drawImage(art, 0, 0)
  else context.drawImage(art, cell % 3 * size, Math.floor(cell / 3) * size, size, size, 0, 0, size, size)

  accessories.forEach(item => paintDragonAccessory(context, item))
  return canvas.toDataURL('image/png')
}
