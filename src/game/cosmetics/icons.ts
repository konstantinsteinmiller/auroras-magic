/**
 * icons.ts — shelf thumbnails for the wardrobe's items: each item's own draw
 * function, baked once onto a small badge and handed to the DOM as a data
 * URL (the chrome owns no canvas, §4.1.4).
 */
import { drawFlowerCrown } from '@/game/cosmetics/rig-cosmetics'

const DRAW: Readonly<Record<string, (g: CanvasRenderingContext2D) => void>> = {
  flowerCrown: drawFlowerCrown
}

const cache = new Map<string, string>()

export const itemIconUrl = (slug: string): string => {
  const hit = cache.get(slug)
  if (hit) return hit
  if (typeof document === 'undefined') return ''
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const g = cv.getContext('2d')
  const draw = DRAW[slug]
  if (!g || !draw) return ''
  // Items are authored in the rig's head space; the crown's middle sits near
  // (1, -19) and spans ~50 units. Centre it on the badge.
  g.translate(64 - 2.4, 64 + 19 * 2.4)
  g.scale(2.4, 2.4)
  draw(g)
  const url = cv.toDataURL()
  cache.set(slug, url)
  return url
}
