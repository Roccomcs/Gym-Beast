import type { ShopGood } from './shop-catalog'

export function paintDragonAccessory(ctx: CanvasRenderingContext2D, item: ShopGood) {
  const ink = '#28162e'
  const paint = (outline: string, color: string | CanvasGradient = item.primary, edge = ink) => {
    const path = new Path2D(outline)
    ctx.fillStyle = color
    ctx.fill(path)
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.8; ctx.stroke(path) }
  }
  ctx.save()
  ctx.lineJoin = 'round'
  if (item.art === 'cap') {
    paint('M206 99 L207 90 L213 82 L224 79 L234 81 L241 87 L245 98 L237 103 L219 104 Z')
    paint('M213 99 L214 90 L220 84 L226 83 L225 98 Z', item.secondary, '')
    paint('M237 99 L248 98 L258 102 L256 107 L245 108 L235 104 Z', item.secondary)
    paint('M224 83 L231 83 L236 86 L229 86 Z', '#fff1c1', '')
  } else if (item.art === 'crown') {
    paint('M207 100 L204 86 L214 91 L222 79 L231 88 L242 82 L241 97 L236 102 L219 104 Z')
    paint('M209 97 L220 99 L239 93 L236 101 L220 104 L212 103 Z', item.secondary)
    paint('M218 92 L223 86 L228 91 L224 97 Z', '#ffe7ac', '')
  } else if (item.art === 'watch') {
    ctx.globalCompositeOperation = 'source-atop'
    paint('M194 243 Q205 248 218 243 L219 250 Q207 257 194 251 Z', item.secondary)
    paint('M198 243 L210 241 L215 247 L212 253 L200 254 L196 250 Z')
    paint('M201 245 L208 244 L211 247 L209 251 L201 251 L199 248 Z', '#211b2a')
    paint('M201 247 L208 247 L208 248 L201 249 Z', '#d4ffe4', '')
  }
  ctx.restore()
}
