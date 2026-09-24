/**
 * stageArt.ts — FROST LOCK's block of ice (§6.5), as a drawing and as the
 * painting that stands in for it (P12, paint-outstanding 2026-09-24).
 *
 * A frozen duelist stands in a rounded slab of ice, 168 × 214 stage units,
 * for seconds at a time: a FIXED shape planted on her hooves, which a painting
 * can be. It lives here, apart from `render.ts`, so the bench and the tests
 * can reach its reference without pulling the whole renderer (and a `window`)
 * in behind it — the same reason the kits hold their own prop specs.
 *
 * WHAT IS PAINTED: the block's glassy RIM and its two light planes (the
 * facets), with a HOLE in the middle — the duelist is in there, and she has
 * to show through. WHAT STAYS DRAWN: the pale see-through wash that fills it,
 * the snow drifting down its face (the painted `prop-snowflake` once that has
 * landed), and the fade as it cracks away in its last quarter second.
 */
import { drawItem, type ItemSpec } from '@/game/artItem'
import { PROP_ART } from '@/game/artIds'

type G2D = CanvasRenderingContext2D

/** The block about the frozen duelist's hooves: its half-width, its height
 *  and its corner radius, stage units. */
const HALF_W = 84
const HIGH = 214
const CORNER = 30
/** The ice's own pale blue — the wash the drawing fills the block with. */
export const ICE_TINT = '#bfe9ff'
/** The world's ink (`render.INK`). */
const INK = '#3A2340'
/** Stage units per unit of the sheet's scale `s` (`artBox` measures ±2.67
 *  units; the block reaches 214 above its origin). */
export const ICE_U = 100
/** How much of the drawing's ink the REFERENCE keeps (an evenly inked
 *  reference comes back an evenly inked sticker — the creatures' lesson). */
const REF_INK = 0.6

/** The slab's outline about (x, gy), the hooves. A path, not drawn. */
export const iceSlab = (g: G2D, x: number, gy: number): void => {
  g.beginPath()
  g.roundRect(x - HALF_W, gy - HIGH, HALF_W * 2, HIGH, CORNER)
}

/** The two light planes on the glass — a top-left sliver and a bottom-right
 *  wedge — filled in the current style. */
export const iceFacets = (g: G2D, x: number, gy: number): void => {
  g.beginPath()
  g.moveTo(x - 70, gy - 200)
  g.lineTo(x - 30, gy - 200)
  g.lineTo(x - 64, gy - 120)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(x + 40, gy - 30)
  g.lineTo(x + 72, gy - 60)
  g.lineTo(x + 72, gy - 16)
  g.closePath()
  g.fill()
}

/**
 * The block as a painted still, about the hooves. Drawn OPAQUE and HOLLOW:
 * the ice's colour as a band just inside the outline (where a pane of ice
 * shows its colour), the outline, and the two light planes solid white — a
 * half-transparent reference over magenta is a pink block, and a painter
 * paints the pink. The middle is a hole; the game lays its own wash there.
 */
export const FROST_LOCK_ICE_ART: ItemSpec = {
  ...PROP_ART.frostLockIce,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / ICE_U, s / ICE_U)
    g.lineJoin = 'round'
    g.save()
    iceSlab(g, 0, 0)
    g.clip()
    g.lineWidth = 28
    g.strokeStyle = ICE_TINT
    iceSlab(g, 0, 0)
    g.stroke()
    g.restore()
    g.lineWidth = 5 * REF_INK
    g.strokeStyle = INK
    iceSlab(g, 0, 0)
    g.stroke()
    g.fillStyle = '#ffffff'
    iceFacets(g, 0, 0)
    g.restore()
  }
}

/** The painting over a block standing on (x, gy), at the current alpha. False
 *  with nothing drawn when there is no painting (draw the vectors). */
export const frostLockIceAt = (g: G2D, x: number, gy: number): boolean => {
  g.save()
  g.translate(x, gy)
  const hit = drawItem(g, FROST_LOCK_ICE_ART, ICE_U)
  g.restore()
  return hit
}
