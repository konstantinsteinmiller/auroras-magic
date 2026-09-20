/**
 * flow/pageTurn.ts — how a page of the storybook looks while it turns
 * (story-spec §8.28).
 *
 * Two places turn pages: a scene change (`flow/transition.ts`, which swings a
 * photograph of the frame that is leaving) and the map's own book
 * (`map/map.ts`, which swings the live page). They share the geometry and the
 * paper here, so a turn looks the same wherever it happens — which is the
 * whole point of the book.
 *
 * The model is a page hinged at the spine on its LEFT, swinging away from the
 * reader: at angle 0 it lies flat and covers its rect; at π/2 it is edge-on
 * and gone. What narrows is only its WIDTH (`cos a`), so a caller can draw
 * its content with one horizontal squeeze about the spine — no per-pixel
 * warp, no second canvas.
 */
import { cos, sin, PI } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'
const PAPER = '#fff4e6'

/** Paper tips over once it is past upright: slow, then away. */
export const turnEase = (p: number): number => p * p * (3 - 2 * p)

/** The angle a page turned `p` (0..1) of the way stands at. */
export const turnAngle = (p: number): number => turnEase(Math.max(0, Math.min(1, p))) * (PI / 2)

/** How wide the page still is, as a fraction of flat. */
export const turnWidth = (p: number): number => cos(turnAngle(p))

/**
 * The paper of a page standing at angle `a`, over the rect `(x, y, w, h)` it
 * still covers: the shadow it throws on the page underneath, its own shading
 * (darker toward the lifted edge), the light along that edge, and the ink
 * line of the edge itself. The content is the caller's; this is the paper.
 */
export const shadeTurn = (g: G2D, x: number, y: number, w: number, h: number, a: number): void => {
  const lift = sin(a)
  const reach = Math.max(8, h * 0.09)
  const sh = g.createLinearGradient(x + w, 0, x + w + reach, 0)
  sh.addColorStop(0, `rgba(24,12,34,${(0.42 * Math.max(0.25, lift)).toFixed(3)})`)
  sh.addColorStop(1, 'rgba(24,12,34,0)')
  g.fillStyle = sh
  g.fillRect(x + w, y, reach, h)
  const sg = g.createLinearGradient(x, 0, x + w, 0)
  sg.addColorStop(0, 'rgba(24,12,34,0)')
  sg.addColorStop(0.72, `rgba(24,12,34,${(0.2 * lift).toFixed(3)})`)
  sg.addColorStop(1, `rgba(24,12,34,${(0.44 * lift).toFixed(3)})`)
  g.fillStyle = sg
  g.fillRect(x, y, w, h)
  const lip = Math.max(2, h * 0.006)
  const lg = g.createLinearGradient(x + w - lip, 0, x + w, 0)
  lg.addColorStop(0, 'rgba(255,244,230,0)')
  lg.addColorStop(1, `rgba(255,244,230,${(0.85 * lift).toFixed(3)})`)
  g.fillStyle = lg
  g.fillRect(x + w - lip, y, lip, h)
  g.fillStyle = INK
  g.fillRect(x + w, y, Math.max(1, lip * 0.35), h)
}

/**
 * The book's spine down the left edge of a page, and the gutter shadow the
 * binding casts onto the paper. `x` is the page's left edge.
 */
export const drawSpine = (g: G2D, x: number, y: number, h: number, band: number): void => {
  const w = Math.max(6, band)
  g.fillStyle = '#4a3468'
  g.fillRect(x - w, y, w, h)
  g.fillStyle = INK
  g.fillRect(x - w, y, Math.max(1.5, w * 0.12), h)
  g.fillRect(x - Math.max(1.5, w * 0.12), y, Math.max(1.5, w * 0.12), h)
  // Stitches down the binding.
  g.strokeStyle = 'rgba(255,244,230,0.5)'
  g.lineWidth = Math.max(1.5, w * 0.14)
  g.lineCap = 'round'
  const step = Math.max(18, h / 14)
  g.beginPath()
  for (let sy = y + step * 0.6; sy < y + h - step * 0.3; sy += step) {
    g.moveTo(x - w * 0.5, sy)
    g.lineTo(x - w * 0.5, sy + step * 0.42)
  }
  g.stroke()
  const gut = g.createLinearGradient(x, 0, x + w * 2.2, 0)
  gut.addColorStop(0, 'rgba(24,12,34,0.3)')
  gut.addColorStop(1, 'rgba(24,12,34,0)')
  g.fillStyle = gut
  g.fillRect(x, y, w * 2.2, h)
}

/**
 * A folded corner — the page's own "turn me" handle, at the bottom of its
 * outer edge. `dir` 1 folds the bottom-right corner (turn forward), -1 the
 * bottom-left (turn back). `k` 0..1 lifts it (a press, or the idle hint).
 */
export const drawDogEar = (g: G2D, x: number, y: number, w: number, h: number, dir: 1 | -1, size: number, k: number): void => {
  const s = size * (1 + 0.28 * k)
  const cx = dir > 0 ? x + w : x
  const cy = y + h
  g.save()
  g.beginPath()
  g.moveTo(cx, cy - s)
  g.lineTo(cx, cy)
  g.lineTo(cx - dir * s, cy)
  g.closePath()
  g.fillStyle = 'rgba(24,12,34,0.18)'
  g.fill()
  g.beginPath()
  g.moveTo(cx, cy - s)
  g.lineTo(cx - dir * s, cy)
  g.lineTo(cx - dir * s * 0.12, cy - s * 0.12)
  g.closePath()
  g.fillStyle = PAPER
  g.fill()
  g.lineWidth = Math.max(1.5, s * 0.06)
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}

/** The ribbon that marks the reader's place, hanging over a page's top edge. */
export const drawBookmark = (g: G2D, x: number, y: number, len: number, w: number, colour: string, t: number): void => {
  const sway = sin(t * 1.6) * w * 0.08
  g.save()
  g.beginPath()
  g.moveTo(x - w / 2, y - w * 0.6)
  g.lineTo(x + w / 2, y - w * 0.6)
  g.lineTo(x + w / 2 + sway, y + len)
  g.lineTo(x + sway, y + len - w * 0.55)
  g.lineTo(x - w / 2 + sway, y + len)
  g.closePath()
  g.fillStyle = colour
  g.fill()
  g.lineWidth = Math.max(1.5, w * 0.12)
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}
