/**
 * potArt.ts — the three paint pots of the colour pick (story-spec §8.7) and
 * the paint one of them throws, as painted items (art-generation-pipeline S6;
 * paint-outstanding.md P7, P14).
 *
 * THE JAR IS DOM, THE REFERENCE IS CANVAS, AND THEY ARE ONE DRAWING. The pots
 * are buttons (`UnboxScene.vue`), drawn as inline SVG; the bench needs a
 * canvas painter to render their reference from. So the SVG's own paths live
 * HERE and both sides draw them — the button binds these `d` strings, and
 * `POT_ART.draw` hands the very same strings to `Path2D`. A reference drawn
 * from a copy would drift from the jar the child actually taps.
 *
 * ONE NEUTRAL JAR, TINTED PER POT. Fifty sectors offer three colours each, so
 * a painting per colour is out of the question: the PAINT — the jar's body
 * and the drip over its lip — is the `tinted` region, painted a neutral
 * lilac-grey and multiplied by the pot's colour (`artTint`), exactly as a
 * gift's ribbon is. The cream lip is the jar's own. The DOM cannot multiply,
 * so `useItemArt` bakes the tinted jar once per colour into a data URL.
 *
 * THE MARK STAYS SVG, over the painting: the petal, the sun and the bell that
 * name a pot without its colour (art-style §4.3, "a hue is never the only
 * cue"). It is a glyph, not a picture — the same three in every biome — and a
 * child tells the pots apart by it at 55 px.
 */
import { ITEM_ART } from '@/game/artIds'
import type { ItemSpec } from '@/game/artItem'
import { TAU } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** The pot's viewBox side: the jar is authored in a 64-unit square. */
export const POT_VIEW = 64
/** The jar's body: a round jar filled to the brim with paint. */
export const POT_BODY = 'M14 26 Q14 56 32 56 Q50 56 50 26 Z'
/** The paint's shadow side: one soft stroke down its right. */
export const POT_SHADE = 'M36 30 Q46 30 44 48 Q40 54 34 54'
/** The jar's cream lip. */
export const POT_LIP = { x: 10, y: 20, w: 44, h: 9, r: 4.5 } as const
/** A drip of paint over the lip. */
export const POT_DRIP = 'M22 26 Q22 36 25 36 Q28 36 28 26 Z'
/** The jar's ink and its lip — the colours the SVG draws them in. */
export const POT_INK = '#3A2340'
export const POT_LIP_FILL = '#fff4e6'

/**
 * How much of the SVG's line survives into the REFERENCE. The jar is inked at
 * 3 units of 64 — a thick, even contour — and an evenly inked reference comes
 * back an evenly inked sticker (the creature family's lesson, and the HP
 * frames'). Thinned, the shapes and their overlaps still say where a line
 * belongs; the button itself keeps its own stroke until a painting lands.
 */
const REF_INK = 0.6

/** The jar at the origin (the viewBox's middle), `s` = the viewBox side. */
const potShape = (g: G2D, s: number, paint: string, shade: string): void => {
  const k = s / POT_VIEW
  g.save()
  g.scale(k, k)
  g.translate(-POT_VIEW / 2, -POT_VIEW / 2)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const body = new Path2D(POT_BODY)
  g.fillStyle = paint
  g.fill(body)
  g.lineWidth = 3 * REF_INK
  g.strokeStyle = POT_INK
  g.stroke(body)
  g.lineWidth = 5
  g.strokeStyle = shade
  g.stroke(new Path2D(POT_SHADE))
  g.beginPath()
  g.roundRect(POT_LIP.x, POT_LIP.y, POT_LIP.w, POT_LIP.h, POT_LIP.r)
  g.fillStyle = POT_LIP_FILL
  g.fill()
  g.lineWidth = 3 * REF_INK
  g.strokeStyle = POT_INK
  g.stroke()
  const drip = new Path2D(POT_DRIP)
  g.fillStyle = paint
  g.fill(drip)
  g.lineWidth = 2.5 * REF_INK
  g.stroke(drip)
  g.restore()
}

/** The paint pot as a painted still: one neutral jar, its paint tinted per
 *  pot. Its mark is not in it — that stays the button's SVG. */
export const POT_ART: ItemSpec = {
  ...ITEM_ART.paintPot, frames: 1, tinted: true,
  draw: (g, s, _f, a) => potShape(g, s, a.base, a.shade)
}

/**
 * The paint in flight (`wipe.drawPaintFlight`): a round glob of the picked
 * colour with a wet highlight, radius `s` at rest. The arc, the swell and the
 * splash stay the drawing's — a transform and a clock.
 */
const blobShape = (g: G2D, s: number, paint: string): void => {
  g.beginPath()
  g.arc(0, 0, s, 0, TAU)
  g.fillStyle = paint
  g.fill()
  // The flight's own 3 px round a 12 px blob.
  g.lineWidth = s * 0.25
  g.strokeStyle = POT_INK
  g.stroke()
  g.beginPath()
  g.arc(-s * 0.3, -s * 0.3, s * 0.3, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.fill()
}

/** The paint blob as a painted still, its paint tinted per pot. */
export const PAINT_BLOB_ART: ItemSpec = {
  ...ITEM_ART.paintBlob, frames: 1, tinted: true,
  draw: (g, s, _f, a) => blobShape(g, s, a.base)
}
