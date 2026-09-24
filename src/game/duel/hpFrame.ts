/**
 * hpFrame.ts — the shape of the duel's two HP-bar FRAMES, once, for both art
 * modes (`HpBar.vue`, art-roadmap.md "the HP frames").
 *
 * A frame is three things along the bar: an END MEDALLION with the side's
 * emblem in it (Aurora's star, the night's crescent), a plain RAIL around the
 * recessed track, and a small FINIAL where the rail ends. The bar's width
 * changes with the screen — ~140 px a side on a portrait phone, ~400 stage
 * units in landscape — so only the rail may stretch: the two ends are drawn
 * at a fixed size and the rail between them is plain, the same all along.
 *
 * Everything here is in units of the RAIL'S HEIGHT (`R`), in LOCAL
 * coordinates: x runs from the medallion's outer edge (0) along the bar to
 * the finial's tip (`END`), y from the rail's top (0) to its bottom (1). The
 * foe's frame is the same layout mirrored — medallion on the right — and
 * `side` does the mirroring, nowhere else.
 *
 * Three readers, one geometry:
 *   · the DRAWN frame (`HpBar.vue`): the two ends as inline SVG from the path
 *     builders below, the rail as CSS, every colour a `--am-*` token;
 *   · the REFERENCE the painter paints from (`artDraw.ts` → `HP_FRAME_ART`):
 *     the same paths on a canvas, the track left as a hole, the rail at its
 *     reference length `MID_REF`;
 *   · the PAINTED frame (`HpBar.vue` again): one image laid on as a CSS
 *     `border-image`, sliced at `SLICE_L` / `SLICE_R` so the medallion and
 *     the finial are never stretched and only the plain rail is
 *     (`paintedSlices`).
 */
import type { ItemSpec } from '@/game/artItem'
import { HP_FRAMES } from '@/game/artIds'

export type HpSide = 'aurora' | 'foe'

type Pt = readonly [number, number]

/* ─────────────────────────────────── the layout ─────────────────────────── */

/** The medallion: centre and outer radius. It overhangs the rail by 0.2 R
 *  above and below, and nothing else in the frame reaches further — the
 *  painted box (`paintedBox`) is measured on exactly that. */
export const MED_C: Pt = [0.7, 0.5]
export const MED_R = 0.7
/** The emblem's disc inside the ring. */
export const DISC_R = 0.51
/** The rail's band, above and below the track. */
export const BAND = 0.17
/** The track (the window the health shows in): its span and its rounding. */
export const WIN_Y0 = BAND
export const WIN_Y1 = 1 - BAND
export const WIN_R = (WIN_Y1 - WIN_Y0) / 2
/** The track's anchored end starts clear of the medallion. */
export const WIN_X0 = 1.52
/** The rail's rounded end, the track's end and the finial's tip, measured
 *  BACK from the tip (`END` in the reference). */
export const RAIL_END_IN = 0.24
export const WIN_END_IN = RAIL_END_IN + BAND
/** The finial's bead: its radius, its outer edge on the tip. */
const BEAD_R = 0.2
const BEAD_IN = BEAD_R

/**
 * The two slices of the painted frame. Left of `SLICE_L` is the medallion and
 * the track's rounded near end; right of `SLICE_R` the track's far end and
 * the finial. Between them the rail is plain and is the only part stretched.
 * Each sits well past the rounding — a quarter of a rail at the medallion,
 * clear of the leaves' tips at the finial — so a painting that lands a few
 * percent off the reference still slices on plain rail.
 */
export const SLICE_L = WIN_X0 + WIN_R + 0.25
export const SLICE_R_IN = WIN_END_IN + WIN_R + 0.45
/** The rail's plain stretch in the REFERENCE, which the game then stretches. */
export const MID_REF = 1.6
/** The reference frame's full length, medallion edge to finial tip. */
export const END = SLICE_L + MID_REF + SLICE_R_IN

/** The drawn ends' own boxes, in local units: the medallion's box sits at the
 *  frame's start, the finial's at its end (x relative to the tip). */
export const CAP_NEAR = { x: -0.1, y: -0.3, w: SLICE_L + 0.1, h: 1.6 }
export const CAP_FAR = { x: -(SLICE_R_IN + 0.02), y: -0.3, w: SLICE_R_IN + 0.12, h: 1.6 }

/* ───────────────────────────────── shape builders ───────────────────────── */

/** Chaikin corner-cutting: a hard polygon in, a soft hand-drawn outline out. */
const soften = (pts: readonly Pt[], rounds = 2): Pt[] => {
  let p: Pt[] = [...pts]
  for (let r = 0; r < rounds; r++) {
    const q: Pt[] = []
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!
      const b = p[(i + 1) % p.length]!
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    p = q
  }
  return p
}

const f3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()

/** A closed polygon as SVG path data (also fine for `Path2D`). */
export const polyD = (pts: readonly Pt[]): string =>
  `M${pts.map(([x, y]) => `${f3(x)} ${f3(y)}`).join('L')}Z`

export const circleD = (cx: number, cy: number, r: number): string =>
  `M${f3(cx - r)} ${f3(cy)}A${f3(r)} ${f3(r)} 0 1 0 ${f3(cx + r)} ${f3(cy)}A${f3(r)} ${f3(r)} 0 1 0 ${f3(cx - r)} ${f3(cy)}Z`

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt
  })

/** A five-point star with soft, rounded tips — the map's node star. */
export const starPts = (cx: number, cy: number, ro: number, ri: number): Pt[] => {
  const hard: Pt[] = []
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const r = k % 2 ? ri : ro
    hard.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return soften(hard, 2)
}

/** A four-point twinkle, the game's spark. */
export const sparkPts = (cx: number, cy: number, r: number): Pt[] => {
  const hard: Pt[] = []
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4
    const rr = k % 2 ? r * 0.3 : r
    hard.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return soften(hard, 1)
}

/**
 * A crescent moon: the lit rim of a disc of radius `r` whose dark part is
 * bitten out by a second disc of radius `br` at `(bx, by)`. It opens toward
 * the bite. Built by sampling, not by solving for the horns: the part of
 * each rim that lies outside (inside) the other disc, joined up.
 */
export const crescentPts = (cx: number, cy: number, r: number, bx: number, by: number, br: number): Pt[] => {
  const N = 96
  const rim = (ox: number, oy: number, rr: number, keep: (p: Pt) => boolean): Pt[] => {
    const pts = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2
      return [ox + Math.cos(a) * rr, oy + Math.sin(a) * rr] as Pt
    })
    const k = pts.map(keep)
    // Start at the first kept point that follows a dropped one: the run of
    // kept points is then one unbroken arc.
    let s = k.findIndex((v, i) => v && !k[(i - 1 + N) % N])
    if (s < 0) s = 0
    const out: Pt[] = []
    for (let j = 0; j < N; j++) {
      const i = (s + j) % N
      if (k[i]) out.push(pts[i]!)
      else if (out.length) break
    }
    return out
  }
  const outer = rim(cx, cy, r, ([x, y]) => Math.hypot(x - bx, y - by) > br)
  const inner = rim(bx, by, br, ([x, y]) => Math.hypot(x - cx, y - cy) < r)
  // The inner edge runs from where the outer rim ended back to where it began.
  const end = outer[outer.length - 1]!
  const near = (p: Pt): number => Math.hypot(p[0] - end[0], p[1] - end[1])
  const back = near(inner[0]!) <= near(inner[inner.length - 1]!) ? inner : [...inner].reverse()
  return [...outer, ...back]
}

/* ─────────────────────────────── the frame's parts ──────────────────────── */

/** Which paint a part wears. The DOM maps each to a `--am-*` token
 *  (`HpBar.vue`), the reference to `REF_PAINT` below. */
export type Paint =
  | 'ring' | 'ringLite' | 'ringShade' | 'disc' | 'discShade' | 'emblem' | 'emblemShade' | 'emblemLite'
  | 'bead' | 'beadLite' | 'leaf' | 'leafShade' | 'dot'

export interface Part { d: string; paint: Paint; ink?: number }

/**
 * The medallion, in local units. Aurora's: a cream disc in a gold ring set
 * with little pearls, a soft gold star on it. The night's: a deep indigo disc
 * in a moonlit-silver ring, a silver crescent and one small twinkle — calm
 * and dreamy, every edge round and every tip blunt.
 */
export const medallionParts = (side: HpSide): Part[] => {
  const [cx, cy] = MED_C
  // The foe's frame is shown MIRRORED, so its light is drawn pre-mirrored:
  // on screen both frames are lit from the top left.
  const m = side === 'foe'
  const a = (t: number): number => (m ? Math.PI - t * Math.PI : t * Math.PI)
  const band = (r0: number, r1: number, t0: number, t1: number, ox = 0, oy = 0): Pt[] =>
    [...arc(cx, cy, r0, a(t0), a(t1), 16), ...arc(cx + (m ? -ox : ox), cy + oy, r1, a(t1), a(t0), 16)]
  const parts: Part[] = [
    // Its ink is centred on the path, so the path sits half a line inside
    // `MED_R` and the medallion's outer edge lands exactly on it.
    { d: circleD(cx, cy, MED_R - REF_INK / 2), paint: 'ring', ink: 1 },
    // The light lands on the ring's upper left, the shade gathers lower right.
    { d: polyD(band(MED_R - 0.07, DISC_R + 0.06, 0.95, 1.55)), paint: 'ringLite' },
    { d: polyD(band(MED_R - 0.07, DISC_R + 0.05, 0.05, 0.6)), paint: 'ringShade' },
    { d: circleD(cx, cy, DISC_R), paint: 'disc', ink: 0.7 },
    { d: polyD(band(DISC_R - 0.02, DISC_R - 0.04, -0.05, 0.7, -0.06, -0.08)), paint: 'discShade' }
  ]
  // Pearls (Aurora) or tiny stars (the night) set round the ring.
  const ringMid = (MED_R - 0.03 + DISC_R) / 2
  for (let k = 0; k < 8; k++) {
    const t = -Math.PI / 2 + (k * Math.PI) / 4 + Math.PI / 8
    const x = cx + Math.cos(t) * ringMid
    const y = cy + Math.sin(t) * ringMid
    parts.push(side === 'aurora'
      ? { d: circleD(x, y, 0.035), paint: 'dot' }
      : { d: polyD(sparkPts(x, y, 0.05)), paint: 'dot' })
  }
  if (side === 'aurora') {
    parts.push(
      { d: polyD(starPts(cx, cy + 0.015, 0.34, 0.155)), paint: 'emblem', ink: 0.85 },
      { d: polyD(starPts(cx + 0.02, cy + 0.045, 0.2, 0.1)), paint: 'emblemShade' },
      { d: polyD(sparkPts(cx - 0.08, cy - 0.07, 0.07)), paint: 'emblemLite' },
      { d: polyD(sparkPts(cx + 0.3, cy - 0.3, 0.075)), paint: 'emblemLite' }
    )
  } else {
    // Opening toward the bar, so the moon looks along it.
    parts.push(
      { d: polyD(crescentPts(cx, cy, 0.33, cx + 0.15, cy - 0.1, 0.28)), paint: 'emblem', ink: 0.85 },
      { d: polyD(crescentPts(cx - 0.02, cy + 0.03, 0.26, cx + 0.12, cy - 0.12, 0.26)), paint: 'emblemShade' },
      { d: polyD(sparkPts(cx + 0.2, cy - 0.12, 0.08)), paint: 'emblemLite', ink: 0.5 }
    )
  }
  return parts
}

/**
 * The finial where the rail ends, in coordinates relative to the TIP (x ≤ 0):
 * two small leaves curling back along the rail's rounded end, and a bead —
 * a pearl for Aurora, a moonstone for the night.
 */
export const finialParts = (side: HpSide): Part[] => {
  const bx = -BEAD_IN
  // A leaf springs from the bead and sweeps back along the rail's rounded
  // end, standing clear above (below) the rail so it reads on it.
  const leaf = (flip: 1 | -1): Pt[] => soften([
    [-0.3, 0.5 - flip * 0.24],
    [-0.46, 0.5 - flip * 0.6],
    [-0.72, 0.5 - flip * 0.7],
    [-0.98, 0.5 - flip * 0.62],
    [-0.76, 0.5 - flip * 0.54],
    [-0.52, 0.5 - flip * 0.36]
  ], 2)
  const vein = (flip: 1 | -1): Pt[] => soften([
    [-0.4, 0.5 - flip * 0.42],
    [-0.62, 0.5 - flip * 0.62],
    [-0.84, 0.5 - flip * 0.64],
    [-0.62, 0.5 - flip * 0.56]
  ], 1)
  return [
    { d: polyD(leaf(1)), paint: 'leaf', ink: 0.7 },
    { d: polyD(leaf(-1)), paint: 'leaf', ink: 0.7 },
    { d: polyD(vein(1)), paint: 'leafShade' },
    { d: polyD(vein(-1)), paint: 'leafShade' },
    { d: circleD(bx, 0.5, BEAD_R), paint: 'bead', ink: 0.85 },
    { d: circleD(bx - 0.05, 0.44, BEAD_R * 0.38), paint: 'beadLite' },
    ...(side === 'foe' ? [{ d: polyD(sparkPts(bx + 0.04, 0.53, 0.06)), paint: 'dot' as const }] : [])
  ]
}

/* ─────────────────────────────── the painted frame ──────────────────────── */

/**
 * The painting's box, in local units: the reference drawing's extent plus the
 * air `artBox.measureBox` puts round every drawable (6 % of its longer side),
 * because the slicer cuts exactly that box and no other.
 */
export const paintedBox = (): { x: number; y: number; w: number; h: number } => {
  const x0 = MED_C[0] - MED_R
  const x1 = END
  const y0 = MED_C[1] - MED_R
  const y1 = MED_C[1] + MED_R
  const pad = Math.max(x1 - x0, y1 - y0) * 0.06
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
}

/**
 * How the painting is laid on as a `border-image`, per side: where it sits
 * (in R, from the rail's top and from the bar's two ends) and the four slice
 * lines (as fractions of the image — `border-image-slice` in %) with the
 * widths they are drawn at (in R — `border-image-width`).
 */
export interface PaintedSlices {
  /** The box's overhang past the bar's medallion end, its tip end, and the
   *  rail's top, in R (all ≥ 0). */
  outNear: number
  outFar: number
  outTop: number
  height: number
  /** Slice lines as fractions of the image: top, near end, bottom, far end. */
  top: number
  near: number
  bottom: number
  far: number
  /** …and the widths those bands are drawn at, in R. */
  topW: number
  nearW: number
  bottomW: number
  farW: number
}

export const paintedSlices = (): PaintedSlices => {
  const b = paintedBox()
  const right = b.x + b.w
  return {
    outNear: -b.x,
    outFar: right - END,
    outTop: -b.y,
    height: b.h,
    top: (WIN_Y0 - b.y) / b.h,
    bottom: (b.y + b.h - WIN_Y1) / b.h,
    near: (SLICE_L - b.x) / b.w,
    far: (right - (END - SLICE_R_IN)) / b.w,
    topW: WIN_Y0 - b.y,
    bottomW: b.y + b.h - WIN_Y1,
    nearW: SLICE_L - b.x,
    farW: right - (END - SLICE_R_IN)
  }
}

/* ────────────────────────────── the reference drawing ───────────────────── */

/**
 * The reference's colours: the same values the tokens hold (`theme.sass` —
 * `tests/duel/hpBar.test.ts` keeps the two in step). A canvas cannot read a
 * custom property, and the bench draws on a canvas.
 */
export const REF_PAINT: Readonly<Record<HpSide, Readonly<Record<Paint | 'rail' | 'railLite' | 'railShade' | 'ink', string>>>> = {
  aurora: {
    ink: '#3A2340',
    ring: '#FFD76A', ringLite: '#FFE9A8', ringShade: '#F0B846',
    disc: '#FDF6E7', discShade: '#F5E7C0',
    emblem: '#FFD76A', emblemShade: '#F0B846', emblemLite: '#FFFDF6',
    bead: '#FFF6E6', beadLite: '#FFFFFF',
    leaf: '#FFE9A8', leafShade: '#FFD76A', dot: '#FFF6E6',
    rail: '#FFD76A', railLite: '#FFE9A8', railShade: '#F0B846'
  },
  foe: {
    ink: '#3A2340',
    ring: '#DCE0F5', ringLite: '#F4F5FD', ringShade: '#A6ACD6',
    disc: '#3A3570', discShade: '#2A2656',
    emblem: '#DCE0F5', emblemShade: '#A6ACD6', emblemLite: '#F4F5FD',
    bead: '#CFC4F4', beadLite: '#F4F5FD',
    leaf: '#DCE0F5', leafShade: '#A6ACD6', dot: '#F4F5FD',
    rail: '#3A3570', railLite: '#DCE0F5', railShade: '#2A2656'
  }
}

type G2D = CanvasRenderingContext2D

/** A part's outline weight in the reference, in R — thin on purpose. The
 *  painter is given a guide, not a contour to trace: `artDraw`'s creature
 *  lesson (`CREATURE_REF_INK`) — an evenly inked reference comes back an
 *  evenly inked sticker. */
const REF_INK = 0.013

const fillParts = (g: G2D, parts: readonly Part[], pal: Readonly<Record<string, string>>): void => {
  for (const p of parts) {
    const path = new Path2D(p.d)
    g.fillStyle = pal[p.paint]!
    g.fill(path)
    if (p.ink) {
      g.lineWidth = REF_INK * p.ink
      g.strokeStyle = pal.ink!
      g.stroke(path)
    }
  }
}

/** The rail, with the track cut out of it: a ring of paint round a hole. */
const railPath = (x0: number, x1: number): Path2D => {
  const p = new Path2D()
  // Outer: square under the medallion, rounded at the finial end.
  p.moveTo(x0, 0)
  p.lineTo(x1 - 0.5, 0)
  p.arc(x1 - 0.5, 0.5, 0.5, -Math.PI / 2, Math.PI / 2)
  p.lineTo(x0, 1)
  p.closePath()
  // The track, as the hole: its far end one band in from the rail's end.
  const w0 = WIN_X0 + WIN_R
  const w1 = x1 - BAND - WIN_R
  const cy = 0.5
  p.moveTo(w0, WIN_Y0)
  p.arc(w0, cy, WIN_R, -Math.PI / 2, Math.PI / 2, true)
  p.lineTo(w1, WIN_Y1)
  p.arc(w1, cy, WIN_R, Math.PI / 2, -Math.PI / 2, true)
  p.closePath()
  return p
}

/**
 * The whole frame at its reference length, in local units, at the current
 * transform. The track is a HOLE — magenta in the sheet — because the game
 * draws the health itself, behind the painting.
 */
export const drawFrameRef = (g: G2D, side: HpSide): void => {
  const pal = REF_PAINT[side]
  const railEnd = END - RAIL_END_IN
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const rail = railPath(MED_C[0], railEnd)
  g.fillStyle = pal.rail
  g.fill(rail, 'evenodd')
  // The rail is lit along its top edge and shaded along its foot — the same
  // all the way along, because the game stretches it.
  g.save()
  g.clip(rail, 'evenodd')
  g.fillStyle = pal.railLite
  g.fillRect(MED_C[0], 0.035, railEnd - MED_C[0], 0.045)
  g.fillStyle = pal.railShade
  g.fillRect(MED_C[0], 1 - 0.07, railEnd - MED_C[0], 0.07)
  g.restore()
  g.lineWidth = REF_INK
  g.strokeStyle = pal.ink
  g.stroke(rail)
  g.save()
  g.translate(END, 0)
  fillParts(g, finialParts(side), pal)
  g.restore()
  fillParts(g, medallionParts(side), pal)
  g.restore()
}

/**
 * The two reference drawables (`artSheet.WORLD_UI_SHEETS`). `s` is px per R.
 * Centred on the origin like every item; the foe's is mirrored so the sheet
 * shows it the way round the game does — medallion on the RIGHT.
 */
const frameArt = (side: HpSide): ItemSpec => ({
  kind: HP_FRAMES[side].kind,
  id: HP_FRAMES[side].id,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    if (side === 'foe') g.scale(-1, 1)
    g.translate(-END / 2, -0.5)
    drawFrameRef(g, side)
    g.restore()
  }
})

export const HP_FRAME_ART: Readonly<Record<HpSide, ItemSpec>> = {
  aurora: frameArt('aurora'),
  foe: frameArt('foe')
}
