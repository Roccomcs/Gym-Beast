import {paintFittedBottom,fitFabricMask,babyTrouserMask,bodyBounds} from './fitted-bottom'
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

export const phoenixShortsArt = '/wardrobe/phoenix-shorts-reference.png'

async function renderOutfit(species: string, cell: number, top?: ShopGood, bottom?: ShopGood) {
  if (!bottom) return top ? wornGarment(species, cell, top) : undefined
  const upper = top ? await wornGarment(species,cell,top).then(image) : await image('/'+species+'-stages.webp')
  const babyPants=cell===1&&bottom.art==='pants'&&['dragon','bear','wolf','fox','axolotl','tiger'].includes(species)
  const lowerDirectory=babyPants?'/garments/shorts/':directoryFor(bottom)
  const [lowerFabric,upperFabric,lowerArt]=await Promise.all([
    image(lowerDirectory+species+'-fabric.png'),
    top?image(directoryFor(top)+species+'-fabric.png'):undefined,
    image(lowerDirectory+species+'.webp'),
  ])
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size
  const context=canvas.getContext('2d',{willReadFrequently:true})
  if(!context)throw new Error('Canvas no disponible')
  const pixels=(source:HTMLImageElement,atlas:boolean)=>{
    context.clearRect(0,0,size,size)
    if(atlas)context.drawImage(source,cell%3*(source.naturalWidth/3),Math.floor(cell/3)*(source.naturalHeight/2),source.naturalWidth/3,source.naturalHeight/2,0,0,size,size)
    else context.drawImage(source,0,0,size,size)
    return context.getImageData(0,0,size,size)
  }
  const lowerMask=pixels(lowerFabric,true).data
  const reference=pixels(lowerArt,true).data
  const upperMask=upperFabric?pixels(upperFabric,true).data:null
  const sprite=pixels(upper,!top)
  if (species === 'phoenix' && cell === 1 && bottom.art === 'shorts') {
    context.clearRect(0, 0, size, size)
    const drawing = await image(phoenixShortsArt)
    // Trace the approved garment only. The body and wings still come from the
    // equipped top (or bare sprite), so this layer never brings along clothing.
    context.save()
    context.translate(144, 230)
    context.scale(92 / 390, 39 / 172)
    context.translate(-326, -623)
    context.clip(new Path2D('M329 669 Q365 664 405 660 Q449 650 474 638 Q560 653 646 643 Q676 638 690 623 L704 647 Q720 684 709 729 Q706 747 692 751 Q651 747 611 769 L566 793 Q541 793 526 774 Q515 777 504 789 Q485 771 472 753 Q418 722 373 741 L352 754 Q333 742 329 719 Z'))
    context.drawImage(drawing, 0, 0)
    context.restore()
    const fabric = context.getImageData(0, 0, size, size).data
    const primary = rgb(bottom.primary), trim = rgb(bottom.secondary)
    for (let i = 0; i < fabric.length; i += 4) {
      if (!fabric[i + 3] || sprite.data[i + 3] < 128) continue
      if (upperMask && upperMask[i + 3] > 32) continue
      const x = i / 4 % size, y = Math.floor(i / 4 / size)
      const [red, green, blue] = [sprite.data[i], sprite.data[i + 1], sprite.data[i + 2]]
      // Keep the near wing in front of the waistband.
      if (x < 187 && y < 254 && red > green * 1.2 && red > blue * 1.35) continue
      const opacity = fabric[i + 3] / 255
      const isTrim = fabric[i] > 120 && fabric[i] > fabric[i + 2] * 1.15
      const tint = isTrim ? trim : primary
      const shade = Math.min(1.15, fabric[i + 1] / (isTrim ? 190 : 82))
      for (let channel = 0; channel < 3; channel++) {
        const color = bottom.id === 'shorts' ? fabric[i + channel] : tint[channel] * shade
        sprite.data[i + channel] = sprite.data[i + channel] * (1 - opacity) + color * opacity
      }
    }
  } else if (species === 'phoenix') {
    // The illustrated lower garment already wraps the hip and sits behind the
    // feathers. Reuse its painted pixels instead of adding a new shape.
    const painted = pixels(await image(await wornGarment(species, cell, bottom)), false).data
    const mask = fitFabricMask(lowerMask, reference, sprite.data, size)
    const fabric = fitFabricMask(painted, reference, sprite.data, size)
    for (let i = 0; i < sprite.data.length; i += 4) {
      if (mask[i + 3] < 64 || fabric[i + 3] < 128 || sprite.data[i + 3] < 128) continue
      if (upperMask && upperMask[i + 3] > 32) continue
      for (let channel = 0; channel < 3; channel++) sprite.data[i + channel] = fabric[i + channel]
    }
  } else {
    const mask = fitFabricMask(babyPants ? babyTrouserMask(lowerMask,size) : lowerMask,reference,sprite.data,size)
    sprite.data.set(paintFittedBottom(sprite.data,mask,upperMask,rgb(bottom.primary),rgb(bottom.secondary),size))
  }
  context.putImageData(sprite,0,0)
  return canvas.toDataURL('image/png')
}

function paintPhoenixWatch(ctx: CanvasRenderingContext2D, item: ShopGood, cell: number, hoodie: boolean) {
  const anchors = hoodie ? [[165,245],[144,204],[169,211],[169,197],[151,187]]
    : [[164,235],[137,202],[164,208],[152,197],[145,190]]
  const [x,y] = anchors[cell - 1]
  ctx.save()
  ctx.translate(x,y)
  ctx.rotate(-.7)
  ctx.scale(cell === 1 ? .8 : .95, cell === 1 ? .8 : .95)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = '#211a29'
  ctx.fill(new Path2D('M-5 -13 Q0 -10 5 -12 L6 9 Q0 13 -6 9 Z'))
  ctx.strokeStyle = '#ffffff42'
  ctx.lineWidth = 1.5
  ctx.stroke(new Path2D('M-4 -10 Q0 -8 4 -10 M-4 8 Q0 10 4 8'))
  ctx.fillStyle = item.secondary
  ctx.fill(new Path2D('M-7 -4 L-4 -7 H4 L7 -4 V3 L4 6 H-4 L-7 3 Z'))
  ctx.fillStyle = '#252137'
  ctx.fillRect(-5,-4,10,8)
  ctx.fillStyle = '#afe9c9'
  ctx.fillRect(-3,-2,6,2)
  ctx.restore()
}

export async function wornOutfit(species: string, cell: number, top?: ShopGood, bottom?: ShopGood, accessories: ShopGood[] = []) {
  const illustratedWatch = species === 'dragon' && cell === 2 && top?.id === 'hoodie' && !bottom &&
    accessories.some(item => item.id === 'watch')
  const outfit = illustratedWatch ? '/wardrobe/dragon-cria-hoodie-watch-v2.png' : await renderOutfit(species, cell, top, bottom)
  const remaining = illustratedWatch ? accessories.filter(item => item.id !== 'watch') : accessories
  if (!remaining.length) return outfit
  const art = await image(outfit ?? '/'+species+'-stages.webp')
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas no disponible')
  if (outfit) context.drawImage(art, 0, 0, size, size)
  else {
    const width = art.naturalWidth / 3, height = art.naturalHeight / 2
    context.drawImage(art, cell % 3 * width, Math.floor(cell / 3) * height, width, height, 0, 0, size, size)
  }

  remaining.forEach(item => {
    if (species === 'phoenix' && item.slot === 'wrist') paintPhoenixWatch(context, item, cell, top?.art === 'hoodie')
    else if (species === 'dragon') paintDragonAccessory(context, item, cell, !!top)
  })
  return canvas.toDataURL('image/png')
}

export type ClothingLayout={sx:number;sy:number;x:number;y:number;foot:number}
export async function clothingLayout(species:string,cell:number,top?:ShopGood):Promise<ClothingLayout>{
  const bare=await image('/'+species+'-stages.webp')
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size
  const context=canvas.getContext('2d',{willReadFrequently:true})!
  context.drawImage(bare,cell%3*bare.width/3,Math.floor(cell/3)*bare.height/2,bare.width/3,bare.height/2,0,0,size,size)
  const original=bodyBounds(context.getImageData(0,0,size,size).data,size)
  if(!top)return {sx:1,sy:1,x:0,y:0,foot:original.bottom/size*100}
  const dressed=await image(await wornGarment(species,cell,top))
  context.clearRect(0,0,size,size);context.drawImage(dressed,0,0,size,size)
  const target=bodyBounds(context.getImageData(0,0,size,size).data,size)
  const sx=(target.right-target.left)/Math.max(1,original.right-original.left),sy=(target.bottom-target.top)/Math.max(1,original.bottom-original.top)
  return {sx,sy,x:(target.left-original.left*sx)/size*100,y:(target.top-original.top*sy)/size*100,foot:original.bottom/size*100}
}
