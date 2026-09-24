/**
 * domArt.ts — the DOM's storybook marks as painted drop-ins
 * (paint-outstanding.md P14; `artIds.CHROME_ART`): the dialogue's paper leaf,
 * the chapter title page's gold star, the local-versus trophy, the "turn me
 * sideways" phone and the ad-blocker explainer's shield.
 *
 * Each is drawn in the DOM as inline SVG or CSS, which a canvas cannot read —
 * so the bench's reference for each is drawn HERE, on the same geometry and in
 * the same colours the component uses (the `rewarded-ad movie camera`'s
 * precedent in `artDraw.ts`). A component shows the painting when the art
 * layer is on and it has decoded (`useArtImage`), and its own drawing
 * otherwise, exactly as before.
 *
 * Pure: plain numbers and canvas calls at draw time only, so a component can
 * import the leaf's slices without pulling a painter in.
 */
import type { ItemSpec } from '@/game/artItem'
import { CHROME_ART } from '@/game/artIds'

type G2D = CanvasRenderingContext2D

/** The reference colours — the values the components' tokens hold
 *  (`theme.sass`: `--am-ink`, `--am-paper`, `--am-gold`, `--am-magic-2`). */
const INK = '#3A2340'
const PAPER = '#FDF6E7'
const GOLD = '#FFD76A'
const GOLD_DEEP = '#F0B846'
const LILAC = '#C7A6FF'
const VIOLET = '#8F6CFF'
const CREAM = '#FFF6E6'

/** A path, filled, then inked at `w` (thin: the painter is given a guide,
 *  not a contour to trace — an evenly inked reference comes back a sticker). */
const shape = (g: G2D, d: string, fill: string, w = 0.6): void => {
  const p = new Path2D(d)
  g.fillStyle = fill
  g.fill(p)
  if (w > 0) {
    g.lineWidth = w
    g.strokeStyle = INK
    g.stroke(p)
  }
}

/** A five-pointed star as SVG path data, point up. */
const star5 = (cx: number, cy: number, r: number, ir: number): string => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i & 1 ? ir : r
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`
  }
  return `${d}Z`
}

/* ─────────────────────────────── the paper leaf ─────────────────────────── */

/**
 * THE DIALOGUE'S PAPER LEAF, laid on as a CSS 9-slice (`DialogueBubbles.vue`),
 * the HP frames' precedent (`hpFrame.paintedSlices`): the four rounded corners
 * at their own size, the sides stretched along their length, the middle
 * stretched both ways under the words. So the brief asks for a middle that is
 * PLAIN — even cream, no fibre, no spot — for the same reason the HP rail's is.
 *
 * In units of the leaf's corner radius (`LEAF_U` CSS px, the drawn leaf's
 * `border-radius`). The reference leaf is short and wide on purpose: the
 * game stretches it, so its size only decides how many pixels the corners get.
 */
export const LEAF_U = 22
export const LEAF_W = 8
export const LEAF_H = 3
/** The drawn leaf's plum border, in units (`border: 4px`). */
const LEAF_EDGE = 4 / LEAF_U
/** Where the four slices cut, in from the leaf's edge: past the corner's
 *  rounding (1) with room to spare, on plain paper and plain edge. */
export const LEAF_SLICE = 1.35
/** `artBox.measureBox`'s air round every drawable (6 % of the longer side) —
 *  the slicer cuts exactly the box with it. */
const AIR = 0.06

export interface LeafSlices {
  /** The painted box's overhang past the leaf's border-box, in units. */
  out: number
  /** The slices, as fractions of the image: top, right, bottom, left. */
  top: number
  side: number
  /** Each band's drawn width, in units (the same on all four sides). */
  width: number
}

/** How the leaf's painting is sliced and seated (see `LEAF_SLICE`). The
 *  reference's extent is exactly the leaf (its ink is drawn inside it). */
export const leafSlices = (): LeafSlices => {
  const out = Math.max(LEAF_W, LEAF_H) * AIR
  const bw = LEAF_W + out * 2
  const bh = LEAF_H + out * 2
  return { out, top: (out + LEAF_SLICE) / bh, side: (out + LEAF_SLICE) / bw, width: out + LEAF_SLICE }
}

const LEAF_ART: ItemSpec = {
  ...CHROME_ART.leaf,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    g.translate(-LEAF_W / 2, -LEAF_H / 2)
    const e = LEAF_EDGE * 0.7
    g.beginPath()
    g.roundRect(0, 0, LEAF_W, LEAF_H, 1)
    g.fillStyle = PAPER
    g.fill()
    // The plum edge, drawn INSIDE the leaf so its extent is the leaf's.
    g.beginPath()
    g.roundRect(e / 2, e / 2, LEAF_W - e, LEAF_H - e, 1 - e / 2)
    g.lineWidth = e
    g.strokeStyle = INK
    g.stroke()
    g.restore()
  }
}

/* ────────────────────────────── the small stills ───────────────────────── */

/** The chapter title page's gold star (`DialogueBubbles.vue` `.star`), in the
 *  shared icon set's 24-unit box, `s` px per box. */
const STAR_ART: ItemSpec = {
  ...CHROME_ART.star,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 24, s / 24)
    g.translate(-12, -12)
    g.lineJoin = 'round'
    shape(g, star5(12, 12.6, 10, 4.6), GOLD, 0.9)
    g.restore()
  }
}

/** The shared set's `trophy` glyph (`iconPaths.ts`), in its 24-unit box. */
const TROPHY_PARTS = [
  'M7.97 11.59A4.2 4.2 0 1 1 9.38 3.55A0.83 0.83 0 0 1 9.63 4.64L9.61 4.67A0.83 0.83 0 0 1 8.39 5A2.5 2.5 0 1 0 7.52 9.89A0.83 0.83 0 0 1 8.56 10.62L8.57 10.65A0.83 0.83 0 0 1 7.97 11.59Z',
  'M14.62 3.55A4.2 4.2 0 1 1 16.03 11.59A0.83 0.83 0 0 1 15.43 10.65L15.44 10.62A0.83 0.83 0 0 1 16.48 9.89A2.5 2.5 0 1 0 15.61 5A0.83 0.83 0 0 1 14.39 4.67L14.37 4.64A0.83 0.83 0 0 1 14.62 3.55Z',
  'M6.44 5.29A1.7 1.7 0 0 1 8.04 3L15.96 3A1.7 1.7 0 0 1 17.56 5.29L14.51 13.55A1.3 1.3 0 0 1 13.29 14.4L10.71 14.4A1.3 1.3 0 0 1 9.49 13.55L6.44 5.29Z',
  'M10.4 14.7A0.9 0.9 0 0 1 11.3 13.8L12.7 13.8A0.9 0.9 0 0 1 13.6 14.7L13.6 17.1A0.9 0.9 0 0 1 12.7 18L11.3 18A0.9 0.9 0 0 1 10.4 17.1L10.4 14.7Z',
  'M7.18 18.35A1.4 1.4 0 0 1 8.5 17.4L15.5 17.4A1.4 1.4 0 0 1 16.82 18.35L17.15 19.3A1.44 1.44 0 0 1 15.79 21.2L8.21 21.2A1.44 1.44 0 0 1 6.85 19.3L7.18 18.35Z'
] as const

/** The local-versus end screen's cup (`GameScene.vue` `.crown`): gold, with
 *  a small cream star on its bowl. */
const TROPHY_ART: ItemSpec = {
  ...CHROME_ART.trophy,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 24, s / 24)
    g.translate(-12, -12)
    g.lineJoin = 'round'
    const [handleL, handleR, cup, stem, base] = TROPHY_PARTS
    shape(g, handleL, GOLD_DEEP)
    shape(g, handleR, GOLD_DEEP)
    shape(g, stem, GOLD_DEEP)
    shape(g, base, GOLD_DEEP)
    shape(g, cup, GOLD)
    shape(g, star5(12, 7.6, 2.4, 1.05), CREAM, 0.35)
    g.restore()
  }
}

/** The shared set's `shield` glyph (`iconPaths.ts`): a gold rim round a
 *  violet face with a cream star — the ad-blocker explainer's mark. */
const SHIELD_ART: ItemSpec = {
  ...CHROME_ART.shield,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 24, s / 24)
    g.translate(-12, -12)
    g.lineJoin = 'round'
    shape(g, 'M12 2 4 5v6.5c0 4.6 3.2 8.4 8 10.5 4.8-2.1 8-5.9 8-10.5V5l-8-3Z', GOLD)
    shape(g, 'M12 5 6.6 7v4.6c0 3.4 2.2 6.2 5.4 7.8 3.2-1.6 5.4-4.4 5.4-7.8V7L12 5Z', VIOLET, 0.35)
    shape(g, star5(12, 11.6, 3.2, 1.4), CREAM, 0.35)
    g.restore()
  }
}

/**
 * The "turn me sideways" PHONE (`TurnSideways.vue` `.rot`): the shell, its
 * screen and its button — only what the rotation carries. The turn arrow
 * beside it stays drawn (a stroke that is the message, in a motion accent).
 * `s` px per `PHONE_UNIT` of the component's viewBox, centred on its origin.
 */
export const PHONE_UNIT = 50

export const PHONE_ART: ItemSpec = {
  ...CHROME_ART.phone,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / PHONE_UNIT, s / PHONE_UNIT)
    g.lineJoin = 'round'
    g.beginPath()
    g.roundRect(-22, -38, 44, 76, 9)
    g.fillStyle = PAPER
    g.fill()
    g.lineWidth = 2.5
    g.strokeStyle = INK
    g.stroke()
    g.beginPath()
    g.roundRect(-15, -28, 30, 50, 3)
    g.fillStyle = LILAC
    g.fill()
    g.beginPath()
    g.arc(0, 30, 3, 0, Math.PI * 2)
    g.fillStyle = INK
    g.fill()
    g.restore()
  }
}

/** The bench's handles on all five, by id (`artDraw.WORLD_UI_SPECS`). */
export const DOM_ART: Readonly<Record<string, ItemSpec>> = {
  [LEAF_ART.id]: LEAF_ART,
  [STAR_ART.id]: STAR_ART,
  [TROPHY_ART.id]: TROPHY_ART,
  [SHIELD_ART.id]: SHIELD_ART,
  [PHONE_ART.id]: PHONE_ART
}
