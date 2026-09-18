/**
 * Rune glyphs — the clean "printed" form of each rune.
 *
 *   0 = FIRE triangle · 1 = WIND double wave · 2 = ICE zig-zag Z · 3 = EARTH square
 *
 * ONE geometry, two renderers: `drawGlyph` strokes it onto a canvas (the snap
 * flash, the onboarding trace) exactly as the jam build's ui.js did, and
 * `glyphSvgPath` emits the same polyline as an SVG path for the Vue HUD (rune
 * slots, shop plates, the weakness hint). Keeping the vertices in one place is
 * what stops the DOM glyph and the canvas glyph drifting apart.
 */
import { RUNES } from '@/game/duel/config'
import { sin, cos, PI, TAU } from '@/game/duel/util'

/** Outline colour of every glyph. */
export const GLYPH_INK = '#0a0713'
/** Stroke widths as a fraction of the glyph radius: ink halo, then colour. */
export const GLYPH_INK_W = 0.52
export const GLYPH_COL_W = 0.3

/* Segments per glyph (WIND is the odd one out: two sine strokes). EARTH is a
 * 4-gon spun 45 degrees = a square; ICE's Z has three segments. */
const SIDES = [3, 0, 3, 4]

/**
 * The glyph as sub-paths of [x, y] points, centred on (x, y) with radius r.
 * `f` < 1 walks only that fraction of the outline (the onboarding traces the
 * triangle with it). `head` is the point the stroke has reached, so a finger
 * can ride it.
 */
export const glyphPoints = (
  k: number, x: number, y: number, r: number, f = 1
): { paths: [number, number][][]; head: [number, number] } => {
  const paths: [number, number][][] = []
  let head: [number, number] = [x, y]
  if (k === 1) {
    for (let j = 0; j < 2; j++) {
      const sub: [number, number][] = []
      for (let i = 0; i < 13; i++) {
        sub.push([x + (i / 6 - 1) * r, y + (j - 0.5) * r * 0.9 + sin((i / 12) * TAU) * r * 0.26])
      }
      paths.push(sub)
    }
    head = paths[1]![12]!
    return { paths, head }
  }
  // ICE is an open Z, the others are closed polygons — same walk, different
  // vertex source, so one loop covers both.
  const z = k === 2
  const n = SIDES[k]!
  const R = k === 3 ? r * 1.06 : r
  const e = n * f
  const V = (i: number): [number, number] => {
    if (z) return [x + (i & 1 ? r : -r), y + (i < 2 ? -r : r) * 0.8]
    const A = (k === 3 ? PI / 4 : -PI / 2) + (i / n) * TAU
    return [x + cos(A) * R, y + sin(A) * R]
  }
  const sub: [number, number][] = []
  for (let i = 0; i <= e + 1; i++) {
    const u = i > e ? e : i
    const j = u | 0
    const m = u - j
    const a1 = V(j)
    const b1 = V(j + 1)
    head = [a1[0] + (b1[0] - a1[0]) * m, a1[1] + (b1[1] - a1[1]) * m]
    sub.push(head)
  }
  paths.push(sub)
  return { paths, head }
}

/**
 * Draw one rune glyph onto a canvas, centred on x,y with radius r, at alpha
 * `a`. Returns the head of the stroke (see `glyphPoints`).
 */
export const drawGlyph = (
  g: CanvasRenderingContext2D, k: number, x: number, y: number, r: number, a = 1, f = 1
): [number, number] => {
  const { paths, head } = glyphPoints(k, x, y, r, f)
  g.save()
  g.globalAlpha = a
  g.lineCap = g.lineJoin = 'round'
  g.beginPath()
  for (const sub of paths) {
    sub.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)))
  }
  g.lineWidth = r * GLYPH_INK_W
  g.strokeStyle = GLYPH_INK
  g.stroke()
  g.lineWidth = r * GLYPH_COL_W
  g.strokeStyle = RUNES[k]![0]
  g.stroke()
  g.restore()
  return head
}

/** The same glyph as an SVG path `d`, in a box centred on (x, y). */
export const glyphSvgPath = (k: number, x: number, y: number, r: number, f = 1): string =>
  glyphPoints(k, x, y, r, f).paths
    .map((sub) => sub.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`).join(''))
    .join('')
