/**
 * emblem.ts — a Signature Spell's emblem (§6.5), the picture that blooms
 * under its recipe when a boss chest grants one: Crystal Ward's prism
 * cluster, Frost Lock's snowflake. Drawn, never written — zero-UI (§8.2).
 *
 * Painted (paint-outstanding.md P14) as TWO stills, not one strip. A strip's
 * panels are one object at different moments, and every strip prompt says so
 * in as many words; a cluster of prisms and a snowflake are two different
 * objects, and a painter told they are "the same emblem" would bend one
 * toward the other.
 *
 * Why the Frost emblem is not the snowfall's `prop-snowflake`: that painting
 * is a soft round SPECK with a faint six-armed ghost inside it — right for a
 * flake a few pixels across in a winter sky, and a white ball here, where the
 * six arms at recipe size ARE the emblem.
 *
 * The bloom (a fade and a swell) is the reveal's transform; nothing moves
 * inside an emblem, so each is one panel.
 */
import { drawItem, type ItemSpec } from '@/game/artItem'
import { ITEM_ART } from '@/game/artIds'
import { PI, sin, cos } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'

/** Crystal Ward: three lilac prisms on one base line, the middle one tallest. */
const prismShape = (g: G2D, s: number): void => {
  g.lineWidth = Math.max(2.5, s * 0.09)
  g.strokeStyle = INK
  const P3: readonly (readonly [number, number])[] = [[-0.42, 0.62], [0, 1], [0.42, 0.7]]
  for (const [dx, h] of P3) {
    const px = dx * s
    g.beginPath()
    g.moveTo(px - s * 0.2, s * 0.5)
    g.lineTo(px - s * 0.2, s * 0.5 - h * s * 0.8)
    g.lineTo(px, s * 0.5 - h * s)
    g.lineTo(px + s * 0.2, s * 0.5 - h * s * 0.8)
    g.lineTo(px + s * 0.2, s * 0.5)
    g.closePath()
    g.fillStyle = '#c9a2ff'
    g.fill()
    g.stroke()
  }
}

/** Frost Lock: a six-armed ice crystal, white with an ice-blue core line. */
const flakeShape = (g: G2D, s: number): void => {
  g.strokeStyle = '#ffffff'
  g.lineWidth = Math.max(4, s * 0.16)
  for (let k = 0; k < 2; k++) {
    g.beginPath()
    for (let j = 0; j < 3; j++) {
      const a = (j * PI) / 3
      g.moveTo(-cos(a) * s * 0.6, -sin(a) * s * 0.6)
      g.lineTo(cos(a) * s * 0.6, sin(a) * s * 0.6)
      for (const sg of [-1, 1]) {
        const bx = sg * cos(a) * s * 0.36
        const by = sg * sin(a) * s * 0.36
        g.moveTo(bx, by)
        g.lineTo(bx + sg * cos(a + 0.8) * s * 0.18, by + sg * sin(a + 0.8) * s * 0.18)
        g.moveTo(bx, by)
        g.lineTo(bx + sg * cos(a - 0.8) * s * 0.18, by + sg * sin(a - 0.8) * s * 0.18)
      }
    }
    g.stroke()
    g.strokeStyle = '#7fd4ff'
    g.lineWidth = Math.max(2, s * 0.07)
  }
}

const emblemShape = (g: G2D, i: number, s: number): void => {
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (i === 0) prismShape(g, s)
  else flakeShape(g, s)
  g.restore()
}

/** The two emblems as painted stills, by Signature Spell index. */
export const EMBLEM_ART: readonly ItemSpec[] = [
  { ...ITEM_ART.emblemWard, frames: 1, draw: (g, s) => emblemShape(g, 0, s) },
  { ...ITEM_ART.emblemFrost, frames: 1, draw: (g, s) => emblemShape(g, 1, s) }
]

/** Signature Spell `i`'s emblem, centred at (x, y), `s` its scale. */
export const drawSignatureEmblem = (g: G2D, i: number, x: number, y: number, s: number): void => {
  const spec = EMBLEM_ART[i === 0 ? 0 : 1]!
  g.save()
  g.translate(x, y)
  if (!drawItem(g, spec, s)) emblemShape(g, i, s)
  g.restore()
}
