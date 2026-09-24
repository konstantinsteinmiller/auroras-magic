/**
 * kitSands.ts — Sunken Sands' painters (chapter 7, story-spec §10.2: "Time
 * stands still over the frozen sandfalls", Guardian Ember). A sunny candy
 * desert: rounded dunes, striped rose-and-peach mesas, sandfalls pouring off
 * them like honey, a palm oasis, striped caravan tents, a sundial plaza, market
 * stalls under awnings, cute rounded pyramids and Ember's hourglass temple;
 * the chapter's live props; its tap creature (a sand-fox pup who pops up
 * holding a little trinket) and its rescue (the stopped Sand-Clock).
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on mid- and foreground shapes, gradients only in the sky, the far dunes and
 * glows. Warm and bright, never harsh: the sand is a candy gold, the rock a
 * rose pink, the water turquoise. Base tones clear the candy floor
 * (saturation ≥ 70 %, lightness 55–75 %).
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink, flower, twinkleAt, puffAt, moteAt, lanternAt, streakAt } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { K, skyPuff, inkFill, star5 } from '@/game/map/kitSky'
import { type Pt, curve, scallop } from '@/game/map/kitBay'
import type { TapCreature, RescueCollectible } from '@/game/map/sectorDef'
import { disc, band, type Tones } from '@/game/map/kitRidge'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'

type Lobe = readonly [number, number, number]
const LW = 5

export const SS = {
  skyTop: '#4fb4ff',
  skyMid: '#a3dafc',
  skyLow: '#ffe3bc',
  far: '#ffe3b8',
  farShade: '#ffd49c',
  far2: '#ffd392',
  far2Shade: '#fcbd78',
  farPyr: '#ffd8a6',
  farPyrShade: '#f7c790',
  sand: '#ffcf73',
  sandShade: '#f5ae5c',
  sandLite: '#ffe6a8',
  sandDeep: '#e8914a',
  rock: '#f77fa8',
  rockShade: '#dc5f92',
  rockBand: '#ffa873',
  rockLite: '#ffc2d8',
  honey: '#ffc445',
  honeyShade: '#f0a232',
  honeyLite: '#ffe38a',
  stone: '#ffbf73',
  stoneShade: '#f09a55',
  stoneLite: '#ffdca8',
  wall: '#fff1dc',
  wallShade: '#f5d2b4',
  water: '#3fd4f0',
  waterLite: '#b8f4ff',
  glass: '#d8f6ff',
  cactus: '#52d98a',
  cactusShade: '#2fb46e',
  fox: '#ff9a4a',
  foxShade: '#e87a34',
  foxCream: '#fff0d6',
  foxEar: '#ffb8c8',
  iris: '#7a4fd1',
  blush: '#ff9eb5',
  gold: '#ffd24d',
  goldShade: '#e8a83a',
  clay: '#ff8f6b',
  clayShade: '#e06d4e',
  coral: '#ff8a8a',
  coralShade: '#e0667a',
  camel: '#f2b26a',
  camelShade: '#d99050',
  plank: '#e6a46c',
  plankShade: '#bf7f52'
}

/** Mesa stripes: rose rock and a peach band (both clear the candy floor). */
export const MESA = [SS.rock, SS.rockBand] as const
export const MESA_B = [SS.rockBand, SS.rock, '#ffc04d'] as const

/* ------------------------------------------------------------------- sky */

export interface SandSkyOpts {
  sun?: Pt
  puffs?: readonly (readonly [number, number, number])[]
}

/** The desert sky: a deep clear blue warming to a peach horizon, a big sun. */
export const sandSky = (g: G2D, o: SandSkyOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 440)
  gr.addColorStop(0, SS.skyTop)
  gr.addColorStop(0.55, SS.skyMid)
  gr.addColorStop(1, SS.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.sun) {
    const [sx, sy] = o.sun
    const glow = g.createRadialGradient(sx, sy, 40, sx, sy, 240)
    glow.addColorStop(0, 'rgba(255,236,160,0.95)')
    glow.addColorStop(1, 'rgba(255,236,160,0)')
    g.fillStyle = glow
    g.fillRect(sx - 250, sy - 250, 500, 500)
    disc(g, sx, sy, 62, '#ffe066')
    g.beginPath()
    g.arc(sx, sy, 50, 0, TAU)
    g.fillStyle = 'rgba(255,248,200,0.55)'
    g.fill()
  }
  for (const [x, y, s] of o.puffs ?? []) skyPuff(g, x, y, s)
}

/** A far rounded pyramid on the horizon: unoutlined, pale, a softer right face. */
export const farPyramid = (g: G2D, x: number, y: number, w: number, h: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y + 2)
    g.lineTo(x - w * 0.08, y - h + h * 0.08)
    g.quadraticCurveTo(x, y - h - h * 0.02, x + w * 0.08, y - h + h * 0.08)
    g.lineTo(x + w / 2, y + 2)
    g.closePath()
  }
  path()
  fill(g, SS.farPyr)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(x + w * 0.02, y - h - 4)
  g.lineTo(x + w * 0.14, y + 4)
  g.lineTo(x + w, y + 4)
  g.lineTo(x + w, y - h - 4)
  g.closePath()
  fill(g, SS.farPyrShade)
  g.restore()
}

/** Two far bands of dunes, lighter toward the horizon, never outlined: soft
 *  windward slopes, a shaded lee behind every crest. Far pyramids [x, w, h]
 *  sit on the first band's line. */
export const farDunes = (g: G2D, y1: number, y2: number, seed: number, pyramids: readonly Lobe[] = []): void => {
  for (const [px, w, h] of pyramids) farPyramid(g, px, y1 + 6, w, h)
  const bands = [[y1, SS.far, SS.farShade, 46], [y2, SS.far2, SS.far2Shade, 40]] as const
  for (let b = 0; b < bands.length; b++) {
    const [y, col, shade, amp] = bands[b]!
    const r = seeded(seed + b * 77)
    const crests: [number, number, number, number][] = []
    let x = -120 + r() * 80
    while (x < SEC_W + 60) {
      const w = 190 + r() * 150
      crests.push([x, x + w * (0.58 + r() * 0.12), x + w, y - amp * (0.55 + r() * 0.6)])
      x += w * 0.82
    }
    g.beginPath()
    g.moveTo(-120, SEC_H)
    g.lineTo(-120, y)
    for (const [x0, xc, x1, cy] of crests) {
      g.lineTo(x0, y)
      g.bezierCurveTo(x0 + (xc - x0) * 0.4, y - 4, xc - (xc - x0) * 0.3, cy, xc, cy)
      g.quadraticCurveTo(xc + (x1 - xc) * 0.3, cy + 4, x1, y)
    }
    g.lineTo(SEC_W + 200, y)
    g.lineTo(SEC_W + 200, SEC_H)
    g.closePath()
    fill(g, col)
    g.beginPath()
    for (const [, xc, x1, cy] of crests) {
      g.moveTo(xc, cy)
      g.quadraticCurveTo(xc + (x1 - xc) * 0.3, cy + 4, x1, y)
      g.quadraticCurveTo(xc + (x1 - xc) * 0.2, y - (y - cy) * 0.2, xc - 4, cy + 6)
      g.closePath()
    }
    fill(g, shade)
  }
}

/* ------------------------------------------------------------- the land */

/** The sand ground below the curve through `top`: gold, a lit crest, soft
 *  ripples, speckles, and a shaded lee in the hollows. */
export const dunes = (g: G2D, top: readonly Pt[], seed: number, col = SS.sand): void => {
  const area = (): void => {
    g.beginPath()
    curve(g, top)
    g.lineTo(top[top.length - 1]![0], SEC_H + 20)
    g.lineTo(top[0]![0], SEC_H + 20)
    g.closePath()
  }
  area()
  fill(g, col)
  g.save()
  area()
  g.clip()
  const r = seeded(seed)
  const y0 = Math.min(...top.map((p) => p[1]))
  // Soft lee shadows: long low humps.
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const x = 150 + r() * (SEC_W - 300)
    const y = y0 + 110 + r() * (SEC_H - y0 - 60)
    const w = 160 + r() * 160
    g.moveTo(x - w, y + 80)
    g.bezierCurveTo(x - w * 0.4, y - 20, x + w * 0.2, y - 30, x + w, y + 80)
  }
  g.globalAlpha = 0.5
  fill(g, SS.sandShade)
  g.globalAlpha = 1
  g.beginPath()
  curve(g, top.map(([x, y]) => [x, y + 7] as const))
  g.lineWidth = 8
  g.strokeStyle = SS.sandLite
  g.stroke()
  // Ripples.
  g.beginPath()
  for (let i = 0; i < 14; i++) {
    const x = r() * SEC_W
    const y = y0 + 40 + r() * (SEC_H - y0 - 30)
    const w = 18 + r() * 30
    g.moveTo(x - w, y)
    g.quadraticCurveTo(x - w / 2, y - 6, x, y)
    g.quadraticCurveTo(x + w / 2, y - 6, x + w, y)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = SS.sandShade
  g.stroke()
  g.beginPath()
  for (let i = 0; i < 40; i++) {
    const x = r() * SEC_W
    const y = y0 + 30 + r() * (SEC_H - y0 - 20)
    g.moveTo(x + 4, y)
    g.ellipse(x, y, 4, 2.6, 0, 0, TAU)
  }
  fill(g, SS.sandShade)
  g.restore()
  g.beginPath()
  curve(g, top)
  ink(g)
}

/** A heap of sand (a sandfall's foot) on (x, y), w × h. */
export const sandHeap = (g: G2D, x: number, y: number, w: number, h: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.bezierCurveTo(x - w * 0.3, y - h * 0.9, x - w * 0.1, y - h * 1.05, x, y - h)
    g.bezierCurveTo(x + w * 0.12, y - h * 1.05, x + w * 0.3, y - h * 0.9, x + w / 2, y)
    g.closePath()
  }
  path()
  fill(g, SS.honey)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.ellipse(x + w * 0.32, y + h * 0.1, w * 0.3, h * 0.9, 0, 0, TAU)
  fill(g, SS.honeyShade)
  g.beginPath()
  g.ellipse(x - w * 0.14, y - h * 0.7, w * 0.12, h * 0.12, -0.3, 0, TAU)
  fill(g, SS.honeyLite)
  g.restore()
  path()
  ink(g)
}

/** A sand mound — a sand-fox's burrow (a tap creature's hiding place). */
export const sandMound = (g: G2D, x: number, y: number, w: number, h: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y + 2)
    g.bezierCurveTo(x - w * 0.36, y - h * 0.7, x - w * 0.2, y - h, x, y - h)
    g.bezierCurveTo(x + w * 0.2, y - h, x + w * 0.36, y - h * 0.7, x + w / 2, y + 2)
    g.closePath()
  }
  path()
  fill(g, SS.sand)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.ellipse(x + w * 0.34, y + h * 0.2, w * 0.3, h, 0, 0, TAU)
  fill(g, SS.sandShade)
  g.beginPath()
  for (const [dx, dy] of [[-0.24, -0.4], [0.05, -0.62], [-0.02, -0.25], [0.2, -0.3]] as const) {
    g.moveTo(x + dx * w + 4, y + dy * h)
    g.ellipse(x + dx * w, y + dy * h, 4, 2.6, 0, 0, TAU)
  }
  fill(g, SS.sandDeep)
  g.restore()
  path()
  ink(g)
  // A little dark hole peeking at the top.
  g.beginPath()
  g.ellipse(x - w * 0.04, y - h * 0.84, w * 0.16, h * 0.12, 0, 0, TAU)
  fill(g, '#b0663a')
  ink(g, 3)
}

/* ------------------------------------------------------------ sandfalls */

const fallShape = (g: G2D, x: number, top: number, bot: number, w: number): void => {
  const wt = w * 0.62
  const H = bot - top
  const n = 4
  const hw = (u: number): number => lerp(wt, w, u * u) / 2
  g.beginPath()
  g.moveTo(x - wt / 2, top)
  for (let i = 1; i <= n; i++) {
    const u = i / n
    const um = (i - 0.5) / n
    g.quadraticCurveTo(x - hw(um) - (i % 2 ? 7 : -3), top + H * um, x - hw(u), top + H * u)
  }
  g.lineTo(x + w / 2, bot)
  for (let i = n - 1; i >= 0; i--) {
    const u = i / n
    const um = (i + 0.5) / n
    g.quadraticCurveTo(x + hw(um) + (i % 2 ? 7 : -3), top + H * um, x + hw(u), top + H * u)
  }
  g.bezierCurveTo(x + wt * 0.6, top - 16, x - wt * 0.6, top - 16, x - wt / 2, top)
  g.closePath()
}

/** A sandfall pouring like honey from (x, top) to (x, bot), `w` wide at its foot. */
export const sandfall = (g: G2D, x: number, top: number, bot: number, w: number): void => {
  fallShape(g, x, top, bot, w)
  fill(g, SS.honey)
  g.save()
  fallShape(g, x, top, bot, w)
  g.clip()
  const H = bot - top
  g.beginPath()
  g.moveTo(x + w * 0.14, top - 20)
  g.bezierCurveTo(x + w * 0.2, top + H * 0.3, x + w * 0.1, top + H * 0.7, x + w * 0.2, bot + 10)
  g.lineTo(x + w, bot + 10)
  g.lineTo(x + w, top - 20)
  g.closePath()
  fill(g, SS.honeyShade)
  g.beginPath()
  for (const [dx, k] of [[-0.26, 1], [-0.04, 0.7]] as const) {
    g.moveTo(x + w * dx, top - 10)
    g.bezierCurveTo(x + w * (dx - 0.05), top + H * 0.35, x + w * (dx + 0.06), top + H * 0.65, x + w * (dx - 0.04 * k), bot + 10)
  }
  g.lineWidth = w * 0.09
  g.lineCap = 'round'
  g.strokeStyle = SS.honeyLite
  g.stroke()
  // The spill: a glossy bulge where the sand tips over the edge.
  g.beginPath()
  g.ellipse(x - w * 0.12, top + 2, w * 0.22, 5, -0.1, 0, TAU)
  fill(g, '#fff2c0')
  g.restore()
  fallShape(g, x, top, bot, w)
  ink(g)
}

/** The sandfall's flow — a live prop: bright grains streaming down. */
export const sandFlow = (g: G2D, x: number, top: number, bot: number, w: number, t: number, alive: number): void => {
  g.save()
  fallShape(g, x, top, bot, w)
  g.clip()
  const H = bot - top
  const v = t * 130 * alive
  // The grains are `STREAK_ART` where it has landed — one tile at the eight
  // places the clock has pushed it — and the batched path where it has not.
  g.globalAlpha = 0.8
  let painted = false
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const cx = x - w * 0.34 + i * w * 0.22
    for (let j = 0; j < 2; j++) {
      const yy = top + ((v + j * (H / 2 + 20) + i * 53) % (H + 50)) - 30
      painted = streakAt(g, cx - w * 0.05, yy, w * 0.1, 34, '#fff8d6')
    }
  }
  g.globalAlpha = 1
  if (!painted) {
    g.fillStyle = 'rgba(255,248,214,0.8)'
    g.fill()
  }
  g.restore()
}

/** Dust puffs at a sandfall's foot — a live prop (none at rest). */
export const sandPuffs = (g: G2D, x: number, y: number, w: number, t: number, alive: number): void => {
  if (alive <= 0) return
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.55 + i / 3) % 1
    const px = x + (i - 1) * w * 0.4 + (i - 1) * k * 30
    const py = y - 8 - k * 30
    const r = 9 + k * 12
    g.globalAlpha = alive * 0.8 * (1 - k)
    if (!puffAt(g, px, py, r, SS.sandLite)) disc(g, px, py, r, SS.sandLite)
  }
  g.globalAlpha = 1
}

/** Glittering grains drifting on the breeze — a live prop. */
export const sandGlints = (g: G2D, x0: number, y0: number, w: number, h: number, t: number, alive: number, n = 6): void => {
  if (alive <= 0) return
  g.beginPath()
  let lit = false
  for (let i = 0; i < n; i++) {
    const px = x0 + ((t * (14 + i * 3) + i * 173) % w)
    const py = y0 + ((sin(t * 0.7 + i * 2.3) + 1) / 2) * h
    const r = 7 * Math.max(0, sin(t * 2.4 + i * 1.7)) * alive
    if (r > 0.8) lit = twinkleAt(g, px, py, r, '#fff6c8')
  }
  if (!lit) fill(g, '#fff6c8')
}

/* ---------------------------------------------------------------- flora */

/** A palm's trunk leaning `lean` from (x, y); returns its crown. */
export const palmTrunk = (g: G2D, x: number, y: number, s: number, lean: number): Pt => {
  const tx = x + lean * 70 * s
  const ty = y - 220 * s
  const mx = x + lean * 6 * s
  const my = y - 120 * s
  g.beginPath()
  g.moveTo(x - 16 * s, y)
  g.quadraticCurveTo(mx - 12 * s, my, tx - 8 * s, ty)
  g.lineTo(tx + 8 * s, ty)
  g.quadraticCurveTo(mx + 12 * s, my, x + 16 * s, y)
  g.closePath()
  fill(g, SS.plank)
  ink(g)
  g.beginPath()
  for (let i = 1; i < 7; i++) {
    const u = i / 7
    const px = (1 - u) ** 2 * x + 2 * (1 - u) * u * mx + u * u * tx
    const py = (1 - u) ** 2 * y + 2 * (1 - u) * u * my + u * u * ty
    const hw = (15 - 7 * u) * s
    g.moveTo(px - hw + 2, py)
    g.quadraticCurveTo(px, py + 7 * s, px + hw - 2, py)
  }
  ink(g, 2.4)
  return [tx, ty]
}

/** Where `palmTrunk` puts the crown (for the props, without painting). */
export const palmTop = (x: number, y: number, s: number, lean: number): Pt => [x + lean * 70 * s, y - 220 * s]

const FRONDS: readonly Pt[] = [[-2.95, 0.95], [-2.35, 1.05], [-1.8, 0.85], [-1.25, 0.9], [-0.6, 1.05], [0.05, 0.9]]

/** How wide a frond is against its own length. */
const FROND_HW = 24 / 118

/**
 * ONE palm frond, root at the origin, reaching 1 unit along +x and bowed
 * upwards — the blade, its plum edge and its darker midrib.
 */
const frondShape = (g: G2D): void => {
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(0.62, -FROND_HW, 1, 0)
  g.quadraticCurveTo(0.62, FROND_HW * 0.4, 0, 0)
  fill(g, C.canopy)
  ink(g, 4 / 118)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(0.62, -FROND_HW * 0.28, 1, 0)
  g.lineWidth = 3 / 118
  g.strokeStyle = C.canopyShade
  g.stroke()
}

/**
 * A palm frond as a painted still — eighteen of them stand over the three
 * oases, and they were the largest flat vectors left on a painted sector.
 *
 * One blade serves every frond on every palm: the crown fans them out by
 * ROTATING this one shape, stretches it along its own length as the sway
 * lengthens or shortens the reach, and MIRRORS it for the fronds on the far
 * side — which is exactly what the drawing's `side` flip always did.
 */
export const FROND_ART: ItemSpec = {
  ...PROP_ART.frond, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    frondShape(g)
    g.restore()
  }
}

/** The coconut cluster's width in SU at the scale the oases plant them. */
const COCO_S = 0.88
const COCO_UNIT = 40 * COCO_S

/** The three nuts under a crown, at scale `s`. */
const coconutShape = (g: G2D, s: number): void => {
  g.beginPath()
  for (const [dx, dy] of [[-11, 10], [9, 12], [-1, 22]] as const) {
    g.moveTo(dx * s + 10 * s, dy * s)
    g.arc(dx * s, dy * s, 10 * s, 0, TAU)
  }
  fill(g, SS.plankShade)
  ink(g, 3)
}

/** The coconuts as a painted still. They hang under the crown and ride with
 *  the palm, so one picture carried by a scale serves all three trees. */
export const COCONUT_ART: ItemSpec = {
  ...PROP_ART.coconuts, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / COCO_UNIT, s / COCO_UNIT)
    coconutShape(g, COCO_S)
    g.restore()
  }
}

/** A palm's crown of fronds at (tx, ty), swayed by `sway` rad — a live prop. */
export const palmCrown = (g: G2D, tx: number, ty: number, s: number, lean: number, sway: number): void => {
  for (let i = 0; i < FRONDS.length; i++) {
    const [a0, L] = FRONDS[i]!
    const a = a0 + lean * 0.12 + sway * (0.6 + (i % 3) * 0.3)
    const len = 118 * s * L
    const px = tx + cos(a) * len * 0.62
    const py = ty + sin(a) * len * 0.62
    const ex = tx + cos(a) * len
    const ey = ty + sin(a) * len * 0.45 + len * 0.36
    const dx = ex - tx
    const dy = ey - ty
    const d = Math.hypot(dx, dy) || 1
    const nx = (-dy / d) * 24 * s * L
    const ny = (dx / d) * 24 * s * L
    const side = cos(a) < 0 ? -1 : 1
    // The blade under the AFFINE that carries the canonical frond onto this
    // one: its root to the crown, its tip to (ex, ey), and its bow to this
    // frond's own control point.
    //
    // A rotate-and-stretch is NOT enough, and the crown says so out loud: the
    // control sits 0.62 of the way along the UNSQUASHED radial while the tip
    // is squashed and drooped, so a frond reaching upwards doubles back and
    // its chord is a third of its arc. Placed on the chord alone, the whole
    // crown came out flat and the upward fronds collapsed into it. A shear
    // puts the bow back where the drawing had it.
    const cx = px - nx * side - tx
    const cy = py - ny * side - ty
    const vx = (0.62 * dx - cx) / FROND_HW
    const vy = (0.62 * dy - cy) / FROND_HW
    g.save()
    g.translate(tx, ty)
    g.transform(dx, dy, vx, vy, 0, 0)
    const painted = drawItem(g, FROND_ART, 1)
    g.restore()
    if (painted) continue
    g.beginPath()
    g.moveTo(tx, ty)
    g.quadraticCurveTo(px - nx * side, py - ny * side, ex, ey)
    g.quadraticCurveTo(px + nx * 0.4 * side, py + ny * 0.4 * side, tx, ty)
    fill(g, C.canopy)
    ink(g, 4)
    g.beginPath()
    g.moveTo(tx, ty)
    g.quadraticCurveTo(px, py, ex, ey)
    g.lineWidth = 3
    g.strokeStyle = C.canopyShade
    g.stroke()
  }
  g.save()
  g.translate(tx, ty)
  const nuts = drawItem(g, COCONUT_ART, 40 * s)
  g.restore()
  if (nuts) return
  g.beginPath()
  for (const [dx, dy] of [[-11, 10], [9, 12], [-1, 22]] as const) {
    g.moveTo(tx + dx * s + 10 * s, ty + dy * s)
    g.arc(tx + dx * s, ty + dy * s, 10 * s, 0, TAU)
  }
  fill(g, SS.plankShade)
  ink(g, 3)
}

/** A round little cactus with a pink flower on (x, y). */
export const cactus = (g: G2D, x: number, y: number, s: number, bloom = '#ff7fbf'): void => {
  const shape = (): void => {
    g.beginPath()
    g.roundRect(x - 18 * s, y - 86 * s, 36 * s, 88 * s, 18 * s)
    g.roundRect(x - 44 * s, y - 64 * s, 20 * s, 34 * s, 10 * s)
    g.roundRect(x - 44 * s, y - 40 * s, 30 * s, 16 * s, 8 * s)
    g.roundRect(x + 24 * s, y - 76 * s, 20 * s, 40 * s, 10 * s)
    g.roundRect(x + 14 * s, y - 48 * s, 30 * s, 16 * s, 8 * s)
  }
  shape()
  inkFill(g, SS.cactus, 4)
  g.save()
  shape()
  g.clip()
  g.beginPath()
  g.rect(x + 6 * s, y - 90 * s, 50 * s, 100 * s)
  fill(g, SS.cactusShade)
  g.restore()
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    g.moveTo(x - 8 * s + i * 8 * s, y - 70 * s)
    g.lineTo(x - 8 * s + i * 8 * s, y - 10 * s)
  }
  g.lineWidth = 2
  g.strokeStyle = SS.cactusShade
  g.stroke()
  flower(g, x, y - 90 * s, 10 * s, bloom, 0.4)
}

/** A turquoise oasis pool (x, y, rx, ry), reeds at its ends. */
export const oasis = (g: G2D, x: number, y: number, rx: number, ry: number): void => {
  g.beginPath()
  g.ellipse(x, y, rx + 12, ry + 8, 0, 0, TAU)
  fill(g, SS.sandShade)
  ink(g)
  g.beginPath()
  g.ellipse(x, y + 2, rx, ry, 0, 0, TAU)
  fill(g, SS.water)
  ink(g, 4)
  g.save()
  g.beginPath()
  g.ellipse(x, y + 2, rx, ry, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(x - rx * 0.2, y - ry * 0.3, rx * 0.56, ry * 0.32, 0, 0, TAU)
  fill(g, SS.waterLite)
  g.restore()
  // Reeds.
  g.beginPath()
  for (const [bx, by, n] of [[x - rx * 0.86, y - ry * 0.1, 4], [x + rx * 0.82, y + ry * 0.1, 3]] as const) {
    for (let i = 0; i < n; i++) {
      const rxx = bx + (i - n / 2) * 9
      const h = 44 + (i % 2) * 18
      g.moveTo(rxx - 3, by)
      g.quadraticCurveTo(rxx + (i - 1) * 4, by - h * 0.6, rxx + (i - 1) * 8, by - h)
      g.quadraticCurveTo(rxx + (i - 1) * 3 + 3, by - h * 0.5, rxx + 3, by)
    }
  }
  fill(g, C.moss)
  ink(g, 3)
  g.beginPath()
  for (const [bx, by] of [[x - rx * 0.9, y - ry * 0.1 - 58], [x + rx * 0.84, y + ry * 0.1 - 52]] as const) {
    g.moveTo(bx + 5, by)
    g.ellipse(bx, by, 5, 11, 0, 0, TAU)
  }
  fill(g, '#c98a4a')
  ink(g, 2.4)
}

/* ------------------------------------------------------------ buildings */

/** Where a caravan tent's flagpole stands (its top). */
export const tentFlag = (x: number, y: number, w: number): Pt => [x, y - w * 0.42 - w * 0.4 - 46]

/**
 * A striped caravan tent standing at (x, y), `w` wide: round walls, a
 * big-top roof, a scalloped valance and an open door with a cushion inside.
 * Its STRIPES (roof and walls) are the landmark.
 */
export const tent = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.42
  const top = y - h
  const peak = top - w * 0.4
  const R = w / 2
  // Guy ropes to their pegs.
  g.beginPath()
  g.moveTo(x - R * 0.9, top + 6)
  g.lineTo(x - R * 1.32, y + 4)
  g.moveTo(x + R * 0.9, top + 6)
  g.lineTo(x + R * 1.32, y + 4)
  ink(g, 2.6)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.roundRect(x + d * R * 1.32 - 4, y - 8, 8, 14, 3)
    fill(g, SS.plank)
    ink(g, 2.4)
  }
  // The walls: vertical stripes.
  const walls = (): void => {
    g.beginPath()
    g.moveTo(x - R * 0.92, top)
    g.quadraticCurveTo(x - R * 1.02, y - h * 0.4, x - R * 0.96, y)
    g.quadraticCurveTo(x, y + 14, x + R * 0.96, y)
    g.quadraticCurveTo(x + R * 1.02, y - h * 0.4, x + R * 0.92, top)
    g.closePath()
  }
  walls()
  fill(g, K.wall)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  const n = 7
  for (let i = 0; i < n; i += 2) {
    const u0 = -1 + (i * 2) / n
    const u1 = -1 + ((i + 1) * 2) / n
    g.moveTo(x + u0 * R * 0.9, top - 4)
    g.lineTo(x + u1 * R * 0.9, top - 4)
    g.lineTo(x + u1 * R * 1.02, y + 20)
    g.lineTo(x + u0 * R * 1.02, y + 20)
    g.closePath()
  }
  fill(g, pot.base)
  g.beginPath()
  g.rect(x + R * 0.36, top - 10, R, h + 30)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  walls()
  ink(g)
  // The door: an open flap, a warm dark inside, a cushion.
  const door = (): void => {
    g.beginPath()
    g.moveTo(x - R * 0.24, y + 4)
    g.quadraticCurveTo(x - R * 0.2, top + h * 0.1, x, top + 4)
    g.quadraticCurveTo(x + R * 0.2, top + h * 0.1, x + R * 0.24, y + 4)
    g.closePath()
  }
  door()
  fill(g, '#7a4a86')
  ink(g, 4)
  g.save()
  door()
  g.clip()
  g.beginPath()
  g.ellipse(x, y - 4, R * 0.2, R * 0.08, 0, 0, TAU)
  fill(g, SS.gold)
  ink(g, 2.6)
  g.restore()
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(x + d * R * 0.02, top + 6)
    g.quadraticCurveTo(x + d * R * 0.14, top + h * 0.5, x + d * R * 0.3, y + 2)
    g.lineTo(x + d * R * 0.4, y + 2)
    g.quadraticCurveTo(x + d * R * 0.3, top + h * 0.3, x + d * R * 0.1, top + 2)
    g.closePath()
    fill(g, pot.lite)
    ink(g, 3.5)
    disc(g, x + d * R * 0.26, top + h * 0.56, 5, SS.gold, 2.4)
  }
  // The big-top roof: stripes fanning from the peak.
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - R * 1.06, top + 14)
    g.bezierCurveTo(x - R * 0.7, top - 6, x - R * 0.24, peak + w * 0.12, x, peak)
    g.bezierCurveTo(x + R * 0.24, peak + w * 0.12, x + R * 0.7, top - 6, x + R * 1.06, top + 14)
    g.quadraticCurveTo(x, top + 24, x - R * 1.06, top + 14)
    g.closePath()
  }
  roof()
  fill(g, K.wall)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  const m = 8
  for (let i = 0; i < m; i += 2) {
    const u0 = -1 + (i * 2) / m
    const u1 = -1 + ((i + 1) * 2) / m
    g.moveTo(x, peak - 10)
    g.lineTo(x + u0 * R * 1.2, top + 30)
    g.lineTo(x + u1 * R * 1.2, top + 30)
    g.closePath()
  }
  fill(g, pot.base)
  g.beginPath()
  g.moveTo(x + 4, peak - 10)
  g.bezierCurveTo(x + R * 0.2, peak + w * 0.14, x + R * 0.36, top, x + R * 0.4, top + 30)
  g.lineTo(x + R * 1.3, top + 30)
  g.lineTo(x + R * 1.3, peak - 10)
  g.closePath()
  g.globalAlpha = 0.18
  fill(g, INK)
  g.globalAlpha = 1
  g.beginPath()
  g.ellipse(x - R * 0.42, top - w * 0.03, R * 0.14, R * 0.04, -0.35, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  roof()
  ink(g)
  // The valance: scallops in the pot's shade with gold dots.
  const vn = 9
  g.beginPath()
  g.moveTo(x - R * 1.04, top + 12)
  for (let i = 0; i < vn; i++) {
    const x0 = x - R * 1.04 + (i * R * 2.08) / vn
    const x1 = x - R * 1.04 + ((i + 1) * R * 2.08) / vn
    const yy = top + 14 + 8 * (1 - ((2 * (i + 0.5)) / vn - 1) ** 2)
    g.quadraticCurveTo((x0 + x1) / 2, yy + 22, x1, top + 12 + 8 * (1 - ((2 * (i + 1)) / vn - 1) ** 2))
  }
  g.quadraticCurveTo(x, top + 26, x - R * 1.04, top + 12)
  g.closePath()
  fill(g, pot.shade)
  ink(g, 3.5)
  g.beginPath()
  for (let i = 0; i < vn; i++) {
    const cx = x - R * 1.04 + ((i + 0.5) * R * 2.08) / vn
    const yy = top + 24 + 8 * (1 - ((2 * (i + 0.5)) / vn - 1) ** 2)
    g.moveTo(cx + 4, yy)
    g.arc(cx, yy, 4, 0, TAU)
  }
  fill(g, SS.gold)
  // The flag pole and its gold ball.
  const [fx, fy] = tentFlag(x, y, w)
  g.beginPath()
  g.moveTo(x, peak + 2)
  g.lineTo(fx, fy)
  ink(g, 4)
  disc(g, x, peak, 8, SS.gold, 3)
}

/** A small ridge tent (background), striped c1/c2, at (x, y), `w` wide. */
export const ridgeTent = (g: G2D, x: number, y: number, w: number, c1: string, c2: string): void => {
  const h = w * 0.62
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.quadraticCurveTo(x - w * 0.2, y - h * 0.5, x, y - h)
    g.quadraticCurveTo(x + w * 0.2, y - h * 0.5, x + w / 2, y)
    g.closePath()
  }
  path()
  fill(g, c2)
  g.save()
  path()
  g.clip()
  g.beginPath()
  for (let i = -3; i <= 3; i += 2) {
    g.moveTo(x, y - h - 4)
    g.lineTo(x + ((i - 0.5) / 3.5) * w * 0.6, y + 4)
    g.lineTo(x + ((i + 0.5) / 3.5) * w * 0.6, y + 4)
    g.closePath()
  }
  fill(g, c1)
  g.beginPath()
  g.rect(x + w * 0.1, y - h - 10, w, h + 20)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  path()
  ink(g)
  g.beginPath()
  g.moveTo(x - w * 0.12, y)
  g.quadraticCurveTo(x - w * 0.06, y - h * 0.4, x, y - h * 0.62)
  g.quadraticCurveTo(x + w * 0.06, y - h * 0.4, x + w * 0.12, y)
  g.closePath()
  fill(g, '#7a4a86')
  ink(g, 3.5)
  disc(g, x, y - h - 5, 6, SS.gold, 2.6)
}

/** Where a dome house's finial (a pennant's foot) is. */
export const domeFinial = (x: number, y: number, w: number): Pt => [x, y - w * 0.55 - w * 0.08 - w * 0.62 - 18]

/**
 * A round adobe house at (x, y), `w` wide, under an onion DOME — the
 * landmark (pot base, shade and light), on a gold-trimmed drum.
 */
export const domeHouse = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.55
  const walls = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, [12, 12, 6, 6])
  }
  walls()
  fill(g, SS.wall)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.24, y - h, w, h)
  fill(g, SS.wallShade)
  g.restore()
  walls()
  ink(g)
  // A turquoise band of tiles, the door, two round windows.
  g.beginPath()
  g.rect(x - w / 2, y - h + 14, w, 12)
  fill(g, '#45d6e0')
  ink(g, 3)
  g.beginPath()
  g.roundRect(x - 22, y - h * 0.62, 44, h * 0.62, [22, 22, 2, 2])
  fill(g, C.door)
  ink(g, 4)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.arc(x + d * w * 0.3, y - h * 0.5, 13, 0, TAU)
    fill(g, C.window)
    ink(g, 3.5)
  }
  // The drum, then the onion dome.
  const db = y - h
  const dt = db - w * 0.08
  g.beginPath()
  g.roundRect(x - w * 0.36, dt, w * 0.72, w * 0.08 + 4, 4)
  fill(g, SS.gold)
  ink(g, 4)
  const top = dt - w * 0.62
  const dome = (): void => {
    g.beginPath()
    g.moveTo(x - w * 0.34, dt)
    g.bezierCurveTo(x - w * 0.52, dt - w * 0.24, x - w * 0.18, dt - w * 0.42, x, top)
    g.bezierCurveTo(x + w * 0.18, dt - w * 0.42, x + w * 0.52, dt - w * 0.24, x + w * 0.34, dt)
    g.closePath()
  }
  dome()
  fill(g, pot.base)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  g.moveTo(x + 4, top - 4)
  g.bezierCurveTo(x + w * 0.1, dt - w * 0.36, x + w * 0.3, dt - w * 0.2, x + w * 0.14, dt + 4)
  g.lineTo(x + w * 0.6, dt + 4)
  g.lineTo(x + w * 0.6, top - 4)
  g.closePath()
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  g.beginPath()
  for (const k of [0.3, 0.55]) {
    g.moveTo(x - w * 0.44, dt - w * k * 0.62 + 6)
    g.quadraticCurveTo(x - w * 0.1, dt - w * k * 0.62 + 16, x + w * 0.1, dt - w * k * 0.62 + 12)
  }
  g.stroke()
  g.beginPath()
  g.ellipse(x - w * 0.2, dt - w * 0.3, w * 0.05, w * 0.1, 0.35, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  dome()
  ink(g)
  g.beginPath()
  g.moveTo(x, top)
  g.lineTo(x, top - 12)
  ink(g, 4)
  disc(g, x, top - 14, 7, SS.gold, 3)
}

/** A cute rounded pyramid on (x, y), w × h, in tones (lit face, shaded face,
 *  step light), with a little doorway. */
export const pyramid = (g: G2D, x: number, y: number, w: number, h: number, t: Tones): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.lineTo(x - w * 0.07, y - h + h * 0.08)
    g.quadraticCurveTo(x, y - h - h * 0.03, x + w * 0.07, y - h + h * 0.08)
    g.lineTo(x + w / 2, y)
    g.quadraticCurveTo(x, y + 8, x - w / 2, y)
    g.closePath()
  }
  path()
  fill(g, t[0])
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(x + 2, y - h - 6)
  g.lineTo(x + w * 0.12, y + 10)
  g.lineTo(x + w, y + 10)
  g.lineTo(x + w, y - h - 6)
  g.closePath()
  fill(g, t[1])
  g.beginPath()
  for (let i = 1; i < 5; i++) {
    const yy = y - (h * i) / 5
    g.moveTo(x - w / 2, yy)
    g.lineTo(x + w / 2, yy)
  }
  g.lineWidth = 3
  g.strokeStyle = t[2]
  g.stroke()
  g.restore()
  path()
  ink(g)
  g.beginPath()
  g.moveTo(x + 2, y - h + h * 0.06)
  g.lineTo(x + w * 0.12, y + 2)
  ink(g, 2.6)
  g.beginPath()
  g.roundRect(x - w * 0.08, y - h * 0.22, w * 0.12, h * 0.22, [w * 0.06, w * 0.06, 2, 2])
  fill(g, '#7a4a86')
  ink(g, 3)
}

/* ------------------------------------------------------ the sundial */

/** Where a sundial's dial centre is. */
export const dialCentre = (x: number, y: number, s: number): Pt => [x, y - 250 * s]

/**
 * The sundial of the plaza, standing at (x, y): a round sun-disc on a
 * column, a smiling sun at its heart and a gnomon casting the hour's shadow.
 * The DIAL'S RIM and the COLUMN are the landmark.
 */
export const sundial = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  // Two round steps.
  for (const [w, yy, hh] of [[190, 0, 22], [140, -22, 18]] as const) {
    g.beginPath()
    g.moveTo(x - w * s / 2, y + yy * s - hh * s)
    g.lineTo(x - w * s / 2, y + yy * s)
    g.ellipse(x, y + yy * s, (w * s) / 2, 16 * s, 0, PI, 0, true)
    g.lineTo(x + (w * s) / 2, y + yy * s - hh * s)
    g.closePath()
    fill(g, SS.stoneShade)
    ink(g)
    g.beginPath()
    g.ellipse(x, y + yy * s - hh * s, (w * s) / 2, 16 * s, 0, 0, TAU)
    fill(g, SS.stone)
    ink(g)
  }
  // The column.
  const colTop = y - 190 * s
  const col = (): void => {
    g.beginPath()
    g.moveTo(x - 30 * s, y - 40 * s)
    g.lineTo(x - 22 * s, colTop)
    g.lineTo(x + 22 * s, colTop)
    g.lineTo(x + 30 * s, y - 40 * s)
    g.closePath()
  }
  col()
  fill(g, pot.base)
  g.save()
  col()
  g.clip()
  g.beginPath()
  g.rect(x + 8 * s, colTop, 40 * s, 200 * s)
  fill(g, pot.shade)
  g.beginPath()
  g.rect(x - 16 * s, colTop + 20 * s, 7 * s, 110 * s)
  fill(g, pot.lite)
  g.restore()
  col()
  ink(g)
  for (const yy of [y - 70 * s, colTop + 12 * s]) {
    g.beginPath()
    g.roundRect(x - 34 * s, yy - 8 * s, 68 * s, 16 * s, 8 * s)
    fill(g, SS.gold)
    ink(g, 3.5)
  }
  // The dial.
  const [cx, cy] = dialCentre(x, y, s)
  const R = 104 * s
  disc(g, cx, cy, R, pot.base)
  g.save()
  g.beginPath()
  g.arc(cx, cy, R, 0, TAU)
  g.clip()
  g.beginPath()
  g.arc(cx + R * 0.16, cy + R * 0.16, R, 0, TAU)
  g.arc(cx - R * 0.1, cy - R * 0.1, R * 0.96, 0, TAU, true)
  fill(g, pot.shade)
  g.beginPath()
  g.arc(cx, cy, R * 0.9, PI * 1.05, PI * 1.45)
  g.lineWidth = 6 * s
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  g.beginPath()
  g.arc(cx, cy, R, 0, TAU)
  ink(g)
  // The face: cream, twelve hour dots, the smiling sun.
  disc(g, cx, cy, R * 0.78, SS.wall, 4)
  g.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12
    const r = i % 3 === 0 ? 6.5 * s : 4 * s
    g.moveTo(cx + cos(a) * R * 0.66 + r, cy + sin(a) * R * 0.66)
    g.arc(cx + cos(a) * R * 0.66, cy + sin(a) * R * 0.66, r, 0, TAU)
  }
  fill(g, SS.stoneShade)
  sunFace(g, cx, cy, 30 * s)
}

/** A smiling sun (rays and a face) centred (x, y), radius r. */
export const sunFace = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8
    g.moveTo(x + cos(a - 0.2) * r * 0.9, y + sin(a - 0.2) * r * 0.9)
    g.quadraticCurveTo(x + cos(a) * r * 1.7, y + sin(a) * r * 1.7, x + cos(a + 0.2) * r * 0.9, y + sin(a + 0.2) * r * 0.9)
  }
  fill(g, SS.gold)
  ink(g, 2.6)
  disc(g, x, y, r, SS.gold, 3)
  g.beginPath()
  g.arc(x - r * 0.34, y - r * 0.08, r * 0.14, PI, TAU)
  g.moveTo(x + r * 0.48, y - r * 0.08)
  g.arc(x + r * 0.34, y - r * 0.08, r * 0.14, PI, TAU)
  g.moveTo(x - r * 0.3, y + r * 0.26)
  g.quadraticCurveTo(x, y + r * 0.52, x + r * 0.3, y + r * 0.26)
  ink(g, 2.4)
  g.globalAlpha = 0.6
  g.beginPath()
  g.ellipse(x - r * 0.56, y + r * 0.22, r * 0.14, r * 0.09, 0, 0, TAU)
  g.moveTo(x + r * 0.7, y + r * 0.22)
  g.ellipse(x + r * 0.56, y + r * 0.22, r * 0.14, r * 0.09, 0, 0, TAU)
  fill(g, SS.blush)
  g.globalAlpha = 1
}

/** The gnomon's shadow on the dial, at angle `a` — a live prop (it moves
 *  again once time flows), then the gnomon itself over the sun's nose. */
export const dialShadow = (g: G2D, cx: number, cy: number, R: number, a: number): void => {
  g.beginPath()
  g.moveTo(cx + cos(a + PI / 2) * 5, cy + sin(a + PI / 2) * 5)
  g.lineTo(cx + cos(a) * R * 0.74 + cos(a + PI / 2) * 2, cy + sin(a) * R * 0.74 + sin(a + PI / 2) * 2)
  g.lineTo(cx + cos(a) * R * 0.74 - cos(a + PI / 2) * 2, cy + sin(a) * R * 0.74 - sin(a + PI / 2) * 2)
  g.lineTo(cx - cos(a + PI / 2) * 5, cy - sin(a + PI / 2) * 5)
  g.closePath()
  g.globalAlpha = 0.35
  fill(g, INK)
  g.globalAlpha = 1
  g.save()
  g.translate(cx, cy)
  const set = drawItem(g, GNOMON_ART, GNOMON_UNIT)
  g.restore()
  if (!set) gnomonShape(g, cx, cy)
}

/** The gnomon's blade over the sun's nose, its foot at (cx, cy). */
const gnomonShape = (g: G2D, cx: number, cy: number): void => {
  g.beginPath()
  g.moveTo(cx - 4, cy + 2)
  g.lineTo(cx - 26, cy - 34)
  g.lineTo(cx + 6, cy - 4)
  g.closePath()
  fill(g, SS.gold)
  ink(g, 3)
}

/** The gnomon's height in SU. */
const GNOMON_UNIT = 36

/**
 * 7-3's GNOMON as a painted still — the gold blade standing on the sundial.
 * It never moves; it is drawn in `props()` only because it has to stand ON
 * the hour's shadow wedge, which moves, so the sector painting lacks it and
 * it sat on the painted dial as a flat vector triangle. The wedge under it is
 * light with no edge and stays drawn.
 */
export const GNOMON_ART: ItemSpec = {
  ...PROP_ART.gnomon, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / GNOMON_UNIT, s / GNOMON_UNIT)
    gnomonShape(g, 0, 0)
    g.restore()
  }
}

/** The plaza floor from y0 down: peach-and-cream tiles in perspective. */
export const plaza = (g: G2D, y0: number, vx = SEC_W / 2): void => {
  g.fillStyle = '#ffdcae'
  g.fillRect(-20, y0, SEC_W + 40, SEC_H - y0 + 20)
  const vy = y0 - 360
  const xAt = (xb: number, y: number): number => vx + (xb - vx) * ((y - vy) / (SEC_H + 40 - vy))
  const rows: number[] = []
  for (let y = y0, h = 20; y < SEC_H + 40; y += h, h *= 1.28) rows.push(y)
  rows.push(SEC_H + 60)
  const cols: number[] = []
  for (let xb = -1400; xb <= SEC_W + 1400; xb += 150) cols.push(xb)
  g.beginPath()
  for (let i = 0; i < rows.length - 1; i++) {
    const ya = rows[i]!
    const yb = rows[i + 1]!
    for (let j = 0; j < cols.length - 1; j++) {
      if ((i + j) % 2) continue
      g.moveTo(xAt(cols[j]!, ya), ya)
      g.lineTo(xAt(cols[j + 1]!, ya), ya)
      g.lineTo(xAt(cols[j + 1]!, yb), yb)
      g.lineTo(xAt(cols[j]!, yb), yb)
      g.closePath()
    }
  }
  fill(g, '#ffc27a')
  g.beginPath()
  g.moveTo(-20, y0)
  g.lineTo(SEC_W + 20, y0)
  ink(g)
}

/**
 * An arcade from x0 to x1 standing on `y`, `h` tall: a cream wall with round
 * arches (the sky shows through), a coral cornice and little domes behind.
 */
export const arcade = (g: G2D, x0: number, x1: number, y: number, h: number, n: number, domes: readonly (readonly [number, string])[] = []): void => {
  for (const [dx, col] of domes) {
    g.beginPath()
    g.moveTo(dx - 44, y - h + 4)
    g.bezierCurveTo(dx - 60, y - h - 40, dx - 20, y - h - 60, dx, y - h - 80)
    g.bezierCurveTo(dx + 20, y - h - 60, dx + 60, y - h - 40, dx + 44, y - h + 4)
    g.closePath()
    fill(g, col)
    ink(g, 4)
    g.save()
    g.clip()
    g.beginPath()
    g.rect(dx + 8, y - h - 90, 60, 100)
    g.globalAlpha = 0.18
    fill(g, INK)
    g.globalAlpha = 1
    g.restore()
    disc(g, dx, y - h - 84, 6, SS.gold, 2.6)
  }
  const step = (x1 - x0) / n
  const aw = step * 0.62
  const shape = (): void => {
    g.beginPath()
    g.rect(x0, y - h, x1 - x0, h)
    for (let i = 0; i < n; i++) {
      const cx = x0 + step * (i + 0.5)
      g.moveTo(cx - aw / 2, y + 1)
      g.lineTo(cx - aw / 2, y - h * 0.48)
      g.arc(cx, y - h * 0.48, aw / 2, PI, TAU)
      g.lineTo(cx + aw / 2, y + 1)
      g.closePath()
    }
  }
  shape()
  g.fillStyle = SS.wall
  g.fill('evenodd')
  g.save()
  shape()
  g.clip('evenodd')
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const cx = x0 + step * (i + 0.5)
    g.rect(cx + aw / 2, y - h * 0.9, step - aw, h)
  }
  g.globalAlpha = 0.12
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  shape()
  g.lineWidth = LW
  g.strokeStyle = INK
  g.lineJoin = 'round'
  g.stroke()
  g.beginPath()
  g.roundRect(x0 - 8, y - h - 12, x1 - x0 + 16, 20, 8)
  fill(g, SS.coral)
  ink(g, 4)
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const cx = x0 + step * (i + 0.5)
    g.moveTo(cx + 5, y - h - 2)
    g.arc(cx, y - h - 2, 5, 0, TAU)
  }
  fill(g, '#45d6e0')
}

/* ------------------------------------------------------- the market */

/**
 * A market stall at (x, y), `w` wide: two poles, a counter heaped with fruit,
 * and a striped, scalloped AWNING — the landmark on the market's big stall.
 * Returns the awning's two front corners (for strings of lanterns).
 */
export const stall = (g: G2D, x: number, y: number, w: number, pot: Pot, goods: number): readonly [Pt, Pt] => {
  const h = w * 0.86
  const top = y - h
  // Poles.
  g.beginPath()
  for (const d of [-1, 1]) g.roundRect(x + d * w * 0.44 - 6, top, 12, h, 5)
  fill(g, SS.plank)
  ink(g, 3.5)
  // The counter with its cloth.
  g.beginPath()
  g.roundRect(x - w * 0.46, y - 70, w * 0.92, 70, 6)
  fill(g, SS.plank)
  ink(g)
  const cloth = (): void => {
    g.beginPath()
    g.moveTo(x - w * 0.46, y - 62)
    g.lineTo(x + w * 0.46, y - 62)
    g.lineTo(x + w * 0.46, y - 30)
    const n = 6
    for (let i = n - 1; i >= 0; i--) {
      const x0 = x - w * 0.46 + (i * w * 0.92) / n
      g.quadraticCurveTo(x0 + (w * 0.46) / n, y - 14, x0, y - 30)
    }
    g.closePath()
  }
  cloth()
  fill(g, pot.lite)
  ink(g, 3.5)
  g.beginPath()
  g.rect(x - w * 0.46, y - 50, w * 0.92, 7)
  fill(g, pot.shade)
  // The goods.
  const r = seeded(goods)
  const piles = [SS.fox, C.moss, '#a77cff', '#ff6b7f', SS.gold] as const
  for (let p = 0; p < 3; p++) {
    const px = x - w * 0.3 + p * w * 0.3
    const col = piles[(goods + p) % piles.length]!
    const rr = 10 + r() * 3
    const lobes: Lobe[] = []
    for (let i = 0; i < 3; i++) lobes.push([px - rr * 2 + i * rr * 2, y - 70 - rr * 0.6, rr])
    for (let i = 0; i < 2; i++) lobes.push([px - rr + i * rr * 2, y - 70 - rr * 2.2, rr])
    lobes.push([px, y - 70 - rr * 3.6, rr])
    for (const [lx, ly, lr] of lobes) {
      disc(g, lx, ly, lr, col, 3)
      g.beginPath()
      g.ellipse(lx - lr * 0.35, ly - lr * 0.35, lr * 0.26, lr * 0.16, -0.5, 0, TAU)
      fill(g, '#ffffff')
    }
  }
  // The awning: stripes, a shade, a scalloped front.
  const al = x - w * 0.56
  const ar = x + w * 0.56
  const aTop = top - 34
  const aw = (): void => {
    g.beginPath()
    g.moveTo(x - w * 0.42, aTop)
    g.lineTo(x + w * 0.42, aTop)
    g.lineTo(ar, top + 24)
    const n = 7
    for (let i = n - 1; i >= 0; i--) {
      const x0 = al + (i * (ar - al)) / n
      g.quadraticCurveTo(x0 + (ar - al) / n / 2, top + 50, x0, top + 24)
    }
    g.closePath()
  }
  aw()
  fill(g, K.wall)
  g.save()
  aw()
  g.clip()
  g.beginPath()
  const n = 7
  for (let i = 0; i < n; i += 2) {
    const u0 = i / n
    const u1 = (i + 1) / n
    g.moveTo(lerp(x - w * 0.42, x + w * 0.42, u0), aTop - 4)
    g.lineTo(lerp(x - w * 0.42, x + w * 0.42, u1), aTop - 4)
    g.lineTo(lerp(al, ar, u1), top + 60)
    g.lineTo(lerp(al, ar, u0), top + 60)
    g.closePath()
  }
  fill(g, pot.base)
  g.beginPath()
  g.rect(x + w * 0.2, aTop - 10, w, 100)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.beginPath()
  g.rect(al - 10, top + 20, ar - al + 20, 40)
  g.globalAlpha = 0.5
  fill(g, pot.shade)
  g.globalAlpha = 1
  g.restore()
  aw()
  ink(g)
  // A gold ridge bar.
  g.beginPath()
  g.roundRect(x - w * 0.46, aTop - 8, w * 0.92, 14, 7)
  fill(g, SS.gold)
  ink(g, 3.5)
  return [[al + 8, top + 30], [ar - 8, top + 30]]
}

/** A string of lanterns from a to b, sagging `sag`, bobbing — a live prop,
 *  glowing once alive. */
export const lanterns = (g: G2D, a: Pt, b: Pt, sag: number, cols: readonly string[], t: number, alive: number): void => {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2 + sag
  g.beginPath()
  g.moveTo(a[0], a[1])
  g.quadraticCurveTo(mx, my, b[0], b[1])
  ink(g, 2.4)
  const n = cols.length
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / (n + 1)
    const px = (1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0]
    const py = (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1]
    const sw = alive > 0 ? sin(t * 2 + i * 1.3) * 0.18 * alive : 0
    const lx = px + sin(sw) * 18
    const ly = py + cos(sw) * 18
    g.beginPath()
    g.moveTo(px, py)
    g.lineTo(lx, ly - 12)
    ink(g, 2)
    if (alive > 0) {
      g.globalAlpha = alive * (0.3 + 0.12 * sin(t * 3 + i))
      disc(g, lx, ly, 22, '#fff1a8')
      g.globalAlpha = 1
    }
    g.save()
    g.translate(lx, ly)
    const painted = lanternAt(g, 22, cols[i]!)
    g.restore()
    if (painted) continue
    g.beginPath()
    g.ellipse(lx, ly, 11, 13, 0, 0, TAU)
    fill(g, cols[i]!)
    ink(g, 3)
    g.beginPath()
    g.roundRect(lx - 6, ly - 17, 12, 6, 2)
    g.roundRect(lx - 5, ly + 11, 10, 5, 2)
    fill(g, SS.gold)
    ink(g, 2)
  }
}

/** A patterned rug lying on the sand at (x, y), w × h. */
export const rug = (g: G2D, x: number, y: number, w: number, h: number, c1: string, c2: string): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 + h * 0.5, y - h / 2)
    g.lineTo(x + w / 2 + h * 0.2, y - h / 2)
    g.lineTo(x + w / 2 - h * 0.1, y + h / 2)
    g.lineTo(x - w / 2 - h * 0.2, y + h / 2)
    g.closePath()
  }
  path()
  fill(g, c1)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.ellipse(x, y, w * 0.26, h * 0.3, 0, 0, TAU)
  fill(g, c2)
  g.beginPath()
  g.ellipse(x, y, w * 0.12, h * 0.14, 0, 0, TAU)
  fill(g, SS.gold)
  g.beginPath()
  g.rect(x - w, y - h / 2 + 5, w * 2, 6)
  g.rect(x - w, y + h / 2 - 11, w * 2, 6)
  fill(g, SS.gold)
  g.restore()
  path()
  ink(g, 4)
  g.beginPath()
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    g.moveTo(lerp(x - w / 2 - h * 0.2, x + w / 2 - h * 0.1, u), y + h / 2)
    g.lineTo(lerp(x - w / 2 - h * 0.2, x + w / 2 - h * 0.1, u), y + h / 2 + 8)
  }
  ink(g, 2.4)
}

/** A round cushion on (x, y). */
export const cushion = (g: G2D, x: number, y: number, w: number, col: string): void => {
  g.beginPath()
  g.ellipse(x, y - w * 0.18, w / 2, w * 0.22, 0, 0, TAU)
  fill(g, col)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x - w * 0.14, y - w * 0.26, w * 0.14, w * 0.05, -0.2, 0, TAU)
  fill(g, '#ffffff')
  for (const d of [-1, 1]) disc(g, x + d * w * 0.5, y - w * 0.1, 5, SS.gold, 2.2)
}

/** A clay amphora on (x, y), `s` scale, painted with a cream zig-zag — a
 *  tap creature's hiding place. */
export const amphora = (g: G2D, x: number, y: number, s: number, col = SS.clay, shade = SS.clayShade): void => {
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(x + d * 28 * s, y - 118 * s)
    g.bezierCurveTo(x + d * 62 * s, y - 124 * s, x + d * 66 * s, y - 88 * s, x + d * 44 * s, y - 80 * s)
    band(g, 7 * s, col, 3)
  }
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 24 * s, y - 128 * s)
    g.bezierCurveTo(x - 26 * s, y - 104 * s, x - 62 * s, y - 96 * s, x - 60 * s, y - 56 * s)
    g.bezierCurveTo(x - 58 * s, y - 14 * s, x - 30 * s, y, x, y)
    g.bezierCurveTo(x + 30 * s, y, x + 58 * s, y - 14 * s, x + 60 * s, y - 56 * s)
    g.bezierCurveTo(x + 62 * s, y - 96 * s, x + 26 * s, y - 104 * s, x + 24 * s, y - 128 * s)
    g.closePath()
  }
  body()
  fill(g, col)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.ellipse(x + 44 * s, y - 40 * s, 40 * s, 90 * s, 0, 0, TAU)
  fill(g, shade)
  g.beginPath()
  g.moveTo(x - 64 * s, y - 70 * s)
  for (let i = 0; i < 8; i++) g.lineTo(x - 64 * s + (i + 0.5) * 16 * s, y - (i % 2 ? 70 : 82) * s)
  g.lineWidth = 5 * s
  g.strokeStyle = SS.wall
  g.stroke()
  g.beginPath()
  g.ellipse(x - 30 * s, y - 62 * s, 7 * s, 16 * s, 0.3, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.roundRect(x - 32 * s, y - 138 * s, 64 * s, 14 * s, 7 * s)
  fill(g, col)
  ink(g, 4)
}

/** A stack of woven baskets heaped with fruit — a tap creature's hiding place. */
export const basketStack = (g: G2D, x: number, y: number, s: number): void => {
  const basket = (bx: number, by: number, w: number, h: number, fruit?: string): void => {
    const path = (): void => {
      g.beginPath()
      g.moveTo(bx - w / 2, by - h)
      g.lineTo(bx + w / 2, by - h)
      g.quadraticCurveTo(bx + w * 0.46, by, bx + w * 0.3, by)
      g.lineTo(bx - w * 0.3, by)
      g.quadraticCurveTo(bx - w * 0.46, by, bx - w / 2, by - h)
      g.closePath()
    }
    if (fruit) {
      for (let i = 0; i < 4; i++) disc(g, bx - w * 0.3 + i * w * 0.2, by - h - 6 * s - (i % 2) * 8 * s, 12 * s, fruit, 3)
      disc(g, bx, by - h - 22 * s, 12 * s, fruit, 3)
    }
    path()
    fill(g, '#f2b26a')
    g.save()
    path()
    g.clip()
    g.beginPath()
    g.rect(bx + w * 0.14, by - h - 4, w, h + 8)
    fill(g, '#d08a4a')
    g.beginPath()
    for (let i = 1; i < 3; i++) {
      g.moveTo(bx - w / 2, by - (h * i) / 3)
      g.lineTo(bx + w / 2, by - (h * i) / 3)
    }
    g.lineWidth = 2.6
    g.strokeStyle = '#d08a4a'
    g.stroke()
    g.restore()
    path()
    ink(g)
    g.beginPath()
    g.roundRect(bx - w / 2 - 4, by - h - 6, w + 8, 12, 6)
    fill(g, '#d08a4a')
    ink(g, 3.5)
  }
  basket(x + 50 * s, y, 84 * s, 48 * s, C.moss)
  basket(x - 26 * s, y, 110 * s, 62 * s)
  basket(x - 22 * s, y - 68 * s, 92 * s, 50 * s, SS.fox)
}

/** A camel resting on the sand at (x, y), facing `dir`, in a bright saddle cloth. */
export const camel = (g: G2D, x: number, y: number, s: number, dir: number): void => {
  const w = LW / s
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  // Folded legs.
  g.beginPath()
  g.roundRect(-58, -18, 44, 18, 9)
  g.roundRect(14, -18, 44, 18, 9)
  inkFill(g, SS.camelShade, w * 0.8)
  // The tail.
  g.beginPath()
  g.moveTo(-72, -46)
  g.quadraticCurveTo(-90, -40, -84, -22)
  band(g, 6, SS.camelShade, w * 0.6)
  // The neck.
  g.beginPath()
  g.moveTo(40, -62)
  g.quadraticCurveTo(76, -70, 78, -104)
  g.lineTo(102, -106)
  g.quadraticCurveTo(98, -56, 60, -30)
  g.closePath()
  inkFill(g, SS.camel, w)
  // Body and hump as one shape.
  g.beginPath()
  g.ellipse(0, -40, 72, 34, 0, 0, TAU)
  g.moveTo(34, -66)
  g.ellipse(-8, -66, 42, 30, 0, 0, TAU)
  inkFill(g, SS.camel, w)
  g.save()
  g.beginPath()
  g.ellipse(0, -40, 72, 34, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(10, -12, 76, 16, 0, 0, TAU)
  fill(g, SS.camelShade)
  g.restore()
  // The saddle cloth over the hump, with tassels.
  const cloth = (): void => {
    g.beginPath()
    g.moveTo(-48, -76)
    g.quadraticCurveTo(-8, -104, 30, -76)
    g.lineTo(34, -36)
    g.lineTo(-52, -36)
    g.closePath()
  }
  cloth()
  fill(g, SS.coral)
  g.save()
  cloth()
  g.clip()
  g.beginPath()
  g.rect(-60, -62, 100, 10)
  fill(g, '#45d6e0')
  g.beginPath()
  g.rect(-60, -46, 100, 10)
  fill(g, SS.gold)
  g.restore()
  cloth()
  ink(g, w * 0.7)
  g.beginPath()
  for (const tx of [-44, -22, 0, 22]) {
    g.moveTo(tx + 5, -32)
    g.arc(tx, -32, 5, 0, TAU)
  }
  fill(g, SS.gold)
  ink(g, w * 0.45)
  // The head: a soft muzzle, an ear, a sleepy-happy eye.
  g.beginPath()
  g.ellipse(94, -112, 24, 16, 0.25, 0, TAU)
  g.moveTo(126, -102)
  g.ellipse(112, -104, 14, 11, 0.3, 0, TAU)
  inkFill(g, SS.camel, w)
  g.beginPath()
  g.ellipse(80, -126, 6, 10, -0.5, 0, TAU)
  fill(g, SS.camel)
  ink(g, w * 0.7)
  g.beginPath()
  g.arc(94, -114, 6, PI * 0.15, PI * 0.85)
  ink(g, w * 0.55)
  g.beginPath()
  g.moveTo(90, -120)
  g.lineTo(88, -125)
  ink(g, w * 0.4)
  disc(g, 118, -106, 2.2, INK)
  g.beginPath()
  g.arc(112, -98, 5, PI * 0.25, PI * 0.8)
  ink(g, w * 0.45)
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(100, -104, 6, 4, 0, 0, TAU)
  fill(g, SS.blush)
  g.globalAlpha = 1
  g.restore()
}

/* ----------------------------------------------------- Ember's temple */

/** A brazier bowl on its foot at (x, y) (the flame is a prop). Returns the
 *  flame's base. */
export const brazier = (g: G2D, x: number, y: number, s: number): Pt => {
  g.beginPath()
  g.moveTo(x - 14 * s, y)
  g.lineTo(x - 8 * s, y - 40 * s)
  g.lineTo(x + 8 * s, y - 40 * s)
  g.lineTo(x + 14 * s, y)
  g.closePath()
  fill(g, SS.goldShade)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - 26 * s, y - 8 * s, 52 * s, 10 * s, 5 * s)
  fill(g, SS.gold)
  ink(g, 3.5)
  const bowl = (): void => {
    g.beginPath()
    g.moveTo(x - 46 * s, y - 64 * s)
    g.quadraticCurveTo(x - 40 * s, y - 36 * s, x, y - 36 * s)
    g.quadraticCurveTo(x + 40 * s, y - 36 * s, x + 46 * s, y - 64 * s)
    g.closePath()
  }
  bowl()
  fill(g, SS.gold)
  g.save()
  bowl()
  g.clip()
  g.beginPath()
  g.rect(x + 14 * s, y - 70 * s, 40 * s, 40 * s)
  fill(g, SS.goldShade)
  g.restore()
  bowl()
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 64 * s, 46 * s, 9 * s, 0, 0, TAU)
  fill(g, '#b0663a')
  ink(g, 3.5)
  return [x, y - 64 * s]
}

/** The flame's own height in SU, at the scale the braziers burn it. */
const FLAME_UNIT = 80

/**
 * The four tongues about a base at the origin, all leaning together by
 * `lean` (−1 … 1) — the moment each of the strip's three panels is painted
 * from.
 */
const flameShape = (g: G2D, lean: number): void => {
  const tongue = (dx: number, h: number, w: number, col: string, inked: boolean): void => {
    const lx = lean * 6
    g.beginPath()
    g.moveTo(dx - w, 0)
    g.bezierCurveTo(dx - w * 1.1, -h * 0.5, dx - w * 0.3 + lx, -h * 0.7, dx + lx * 1.4, -h)
    g.bezierCurveTo(dx + w * 0.3 + lx, -h * 0.7, dx + w * 1.1, -h * 0.5, dx + w, 0)
    g.quadraticCurveTo(dx, w * 0.4, dx - w, 0)
    g.closePath()
    fill(g, col)
    if (inked) ink(g, 3)
  }
  tongue(-14, 50, 13, '#ff7a59', true)
  tongue(14, 56, 13, '#ff7a59', true)
  tongue(0, 80, 20, '#ff9a4a', true)
  tongue(0, 50, 12, '#ffd84d', false)
}

/**
 * The brazier's flame as a painted strip.
 *
 * §4b kept it as "tongues rebuilt per frame from a height and a lean", which
 * is how it is coded rather than what it looks like: freeze any frame and
 * there is a flame with an edge on it, and the two temple fires are the
 * brightest flat shapes on a painted sector. So the lean becomes three panels
 * that `drawItem` cross-fades — the dance, at a twelfth of its detail — while
 * the height wobble and the waking-up stay the drawing's own y-scale.
 *
 * What it costs, stated rather than hidden: the four tongues used to dance out
 * of phase with each other, and on the painting they lean together.
 */
export const FLAME_ART: ItemSpec = {
  ...PROP_ART.flame, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / FLAME_UNIT, s / FLAME_UNIT)
    flameShape(g, f - 1)
    g.restore()
  }
}

/** A cute flame of rounded tongues on (x, y) — a live prop; at rest, just
 *  two sleepy embers. */
export const flame = (g: G2D, x: number, y: number, s: number, t: number, alive: number): void => {
  if (alive <= 0) {
    // Two sleepy embers: a glowing speck is the shared painted MOTE, tinted
    // ember-orange (B12) — they sit in the dust for the whole of 7-5's wipe.
    if (moteAt(g, x - 10 * s, y - 4 * s, 9 * s, '#ff9a6a')) {
      moteAt(g, x + 10 * s, y - 3 * s, 8 * s, '#ff9a6a')
      return
    }
    disc(g, x - 10 * s, y - 4 * s, 7 * s, '#ff9a6a', 2.4)
    disc(g, x + 10 * s, y - 3 * s, 6 * s, '#ff9a6a', 2.4)
    return
  }
  const k = alive
  // The halo first and always: it is light with no edge, so it stays drawn
  // under whichever flame is on top of it.
  g.globalAlpha = k * 0.3
  disc(g, x, y - 34 * s, 44 * s, '#ffe08a')
  g.globalAlpha = 1
  g.save()
  g.translate(x, y)
  g.scale(s, s * k * (1 + sin(t * 9) * 0.12))
  const painted = drawItem(g, FLAME_ART, FLAME_UNIT, 1 + sin(t * 5))
  g.restore()
  if (painted) return
  const tongue = (dx: number, h: number, w: number, ph: number, col: string, wide = 5): void => {
    const f = sin(t * 9 + ph) * 0.12
    const hh = h * k * (1 + f)
    const lean = sin(t * 5 + ph) * 6 * s
    g.beginPath()
    g.moveTo(x + dx - w, y)
    g.bezierCurveTo(x + dx - w * 1.1, y - hh * 0.5, x + dx - w * 0.3 + lean, y - hh * 0.7, x + dx + lean * 1.4, y - hh)
    g.bezierCurveTo(x + dx + w * 0.3 + lean, y - hh * 0.7, x + dx + w * 1.1, y - hh * 0.5, x + dx + w, y)
    g.quadraticCurveTo(x + dx, y + w * 0.4, x + dx - w, y)
    g.closePath()
    fill(g, col)
    if (wide) ink(g, 3)
  }
  tongue(-14 * s, 50 * s, 13 * s, 1.1, '#ff7a59')
  tongue(14 * s, 56 * s, 13 * s, 2.3, '#ff7a59')
  tongue(0, 80 * s, 20 * s, 0, '#ff9a4a')
  tongue(0, 50 * s, 12 * s, 0.6, '#ffd84d', 0)
}

/** A waisted hourglass tower standing at (x, y), `s` scale, its dome in
 *  `dome` tones. Returns its finial (a pennant's foot). */
export const hgTower = (g: G2D, x: number, y: number, s: number, dome: Tones): Pt => {
  const H = 210 * s
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 46 * s, y)
    g.bezierCurveTo(x - 44 * s, y - H * 0.3, x - 24 * s, y - H * 0.42, x - 24 * s, y - H * 0.5)
    g.bezierCurveTo(x - 24 * s, y - H * 0.58, x - 44 * s, y - H * 0.7, x - 42 * s, y - H)
    g.lineTo(x + 42 * s, y - H)
    g.bezierCurveTo(x + 44 * s, y - H * 0.7, x + 24 * s, y - H * 0.58, x + 24 * s, y - H * 0.5)
    g.bezierCurveTo(x + 24 * s, y - H * 0.42, x + 44 * s, y - H * 0.3, x + 46 * s, y)
    g.closePath()
  }
  body()
  fill(g, SS.wall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + 12 * s, y - H - 4, 60 * s, H + 8)
  fill(g, SS.wallShade)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.roundRect(x - 30 * s, y - H * 0.5 - 7 * s, 60 * s, 14 * s, 7 * s)
  fill(g, SS.gold)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(x - 12 * s, y - H * 0.84, 24 * s, 34 * s, [12 * s, 12 * s, 2, 2])
  g.roundRect(x - 14 * s, y - 50 * s, 28 * s, 50 * s, [14 * s, 14 * s, 2, 2])
  fill(g, '#7a4a86')
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(x - 50 * s, y - H - 10 * s, 100 * s, 16 * s, 8 * s)
  fill(g, SS.gold)
  ink(g, 3.5)
  const dt = y - H - 10 * s
  const top = dt - 70 * s
  const dm = (): void => {
    g.beginPath()
    g.moveTo(x - 44 * s, dt)
    g.bezierCurveTo(x - 56 * s, dt - 30 * s, x - 20 * s, dt - 50 * s, x, top)
    g.bezierCurveTo(x + 20 * s, dt - 50 * s, x + 56 * s, dt - 30 * s, x + 44 * s, dt)
    g.closePath()
  }
  dm()
  fill(g, dome[0])
  g.save()
  dm()
  g.clip()
  g.beginPath()
  g.rect(x + 6 * s, top - 4, 60 * s, 80 * s)
  fill(g, dome[1])
  g.beginPath()
  g.ellipse(x - 18 * s, dt - 26 * s, 5 * s, 11 * s, 0.35, 0, TAU)
  fill(g, dome[2])
  g.restore()
  dm()
  ink(g)
  disc(g, x, top - 6 * s, 6 * s, SS.gold, 2.6)
  return [x, top - 12 * s]
}

const TEMPLE_H = 120

/** The giant hourglass's geometry on the temple at (x, y). */
export const hourglassOf = (x: number, y: number): { x: number; top: number; bot: number; mid: number; rw: number } => {
  const bot = y - TEMPLE_H - 30
  const top = bot - 220
  return { x, top, bot, mid: (top + bot) / 2, rw: 86 }
}

const glassPath = (g: G2D, x: number, top: number, bot: number, rw: number, waist: number): void => {
  const mid = (top + bot) / 2
  const H = bot - top
  g.beginPath()
  g.moveTo(x - rw, top)
  g.bezierCurveTo(x - rw, mid - H * 0.22, x - waist, mid - H * 0.12, x - waist, mid)
  g.bezierCurveTo(x - waist, mid + H * 0.12, x - rw, mid + H * 0.22, x - rw, bot)
  g.lineTo(x + rw, bot)
  g.bezierCurveTo(x + rw, mid + H * 0.22, x + waist, mid + H * 0.12, x + waist, mid)
  g.bezierCurveTo(x + waist, mid - H * 0.12, x + rw, mid - H * 0.22, x + rw, top)
  g.closePath()
}

/**
 * Ember's Hourglass Temple standing at (x, y): three rounded sandstone tiers,
 * a stair down the middle, and the giant hourglass on top. The hourglass's
 * CAPS, dome and PILLARS are the landmark (pot base, shade and light).
 */
export const hgTemple = (g: G2D, x: number, y: number, pot: Pot): void => {
  // The tiers.
  const tiers = [[400, 0, 44], [310, 44, 40], [220, 84, 36]] as const
  for (const [hw, dy, hh] of tiers) {
    const yy = y - dy
    const tier = (): void => {
      g.beginPath()
      g.roundRect(x - hw, yy - hh, hw * 2, hh + 2, [16, 16, 6, 6])
    }
    tier()
    fill(g, SS.stone)
    g.save()
    tier()
    g.clip()
    g.beginPath()
    g.rect(x + hw * 0.55, yy - hh - 4, hw, hh + 10)
    fill(g, SS.stoneShade)
    g.beginPath()
    g.rect(x - hw, yy - hh, hw * 2, 8)
    fill(g, SS.stoneLite)
    // A frieze of little suns.
    g.beginPath()
    for (let sx = x - hw + 30; sx < x + hw - 20; sx += 56) {
      g.moveTo(sx + 7, yy - hh * 0.45)
      g.arc(sx, yy - hh * 0.45, 7, 0, TAU)
    }
    fill(g, SS.coral)
    g.restore()
    tier()
    ink(g)
  }
  // The stair.
  const st = y - TEMPLE_H
  const stair = (): void => {
    g.beginPath()
    g.moveTo(x - 70, st)
    g.lineTo(x + 70, st)
    g.lineTo(x + 104, y + 2)
    g.lineTo(x - 104, y + 2)
    g.closePath()
  }
  stair()
  fill(g, SS.stoneLite)
  g.save()
  stair()
  g.clip()
  g.beginPath()
  for (let i = 1; i < 8; i++) {
    const yy = st + (i * TEMPLE_H) / 8
    g.moveTo(x - 120, yy)
    g.lineTo(x + 120, yy)
  }
  g.lineWidth = 3
  g.strokeStyle = SS.stoneShade
  g.stroke()
  g.restore()
  stair()
  ink(g)
  // The giant hourglass.
  const hg = hourglassOf(x, y)
  const { top, bot, mid, rw } = hg
  // Pillars behind the glass.
  for (const d of [-1, 1]) {
    const px = x + d * (rw + 24)
    g.beginPath()
    g.roundRect(px - 12, top, 24, bot - top, 8)
    fill(g, pot.shade)
    g.save()
    g.clip()
    g.beginPath()
    g.rect(px - 12, top, 8, bot - top)
    fill(g, pot.lite)
    g.restore()
    g.beginPath()
    g.roundRect(px - 12, top, 24, bot - top, 8)
    ink(g)
    g.beginPath()
    for (const k of [0.25, 0.5, 0.75]) g.roundRect(px - 17, top + (bot - top) * k - 7, 34, 14, 7)
    fill(g, SS.gold)
    ink(g, 3)
  }
  // The glass, its sand and gloss.
  glassPath(g, x, top, bot, rw, 12)
  fill(g, SS.glass)
  g.save()
  glassPath(g, x, top, bot, rw, 12)
  g.clip()
  g.beginPath()
  g.rect(x - rw, mid - 64, rw * 2, 64)
  fill(g, SS.honey)
  g.beginPath()
  g.moveTo(x - rw, bot)
  g.quadraticCurveTo(x - rw * 0.4, bot - 24, x, bot - 48)
  g.quadraticCurveTo(x + rw * 0.4, bot - 24, x + rw, bot)
  g.closePath()
  fill(g, SS.honey)
  g.beginPath()
  g.rect(x + 18, mid - 90, rw, 200)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(x - rw * 0.7, top + 14)
  g.quadraticCurveTo(x - rw * 0.66, mid - 44, x - rw * 0.24, mid - 12)
  g.moveTo(x - rw * 0.24, mid + 12)
  g.quadraticCurveTo(x - rw * 0.66, mid + 44, x - rw * 0.7, bot - 14)
  g.lineWidth = 8
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.stroke()
  g.restore()
  glassPath(g, x, top, bot, rw, 12)
  ink(g)
  // The caps and the dome.
  for (const [cy, h] of [[bot - 6, 32], [top - 26, 30]] as const) {
    const cap = (): void => {
      g.beginPath()
      g.roundRect(x - rw - 46, cy, (rw + 46) * 2, h, 14)
    }
    cap()
    fill(g, pot.base)
    g.save()
    cap()
    g.clip()
    g.beginPath()
    g.rect(x + rw * 0.6, cy - 4, rw * 2, h + 8)
    fill(g, pot.shade)
    g.beginPath()
    g.rect(x - rw - 46, cy, (rw + 46) * 2, 7)
    fill(g, pot.lite)
    g.restore()
    cap()
    ink(g)
  }
  const dt = top - 26
  const dome = (): void => {
    g.beginPath()
    g.moveTo(x - 90, dt + 2)
    g.bezierCurveTo(x - 94, dt - 44, x - 40, dt - 64, x, dt - 66)
    g.bezierCurveTo(x + 40, dt - 64, x + 94, dt - 44, x + 90, dt + 2)
    g.closePath()
  }
  dome()
  fill(g, pot.base)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  g.rect(x + 34, dt - 90, 100, 100)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(x - 56, dt - 28, 8, 16, 0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  dome()
  ink(g)
  sunFace(g, x, dt - 30, 15)
  g.beginPath()
  g.moveTo(x, dt - 66)
  g.lineTo(x, dt - 84)
  ink(g, 4)
  disc(g, x, dt - 88, 7, SS.gold, 3)
}

/** The hourglass's falling stream — a live prop (still, at rest). */
export const hgStream = (g: G2D, x: number, mid: number, bot: number, t: number, alive: number): void => {
  const y0 = mid - 4
  const y1 = bot - 46
  g.beginPath()
  g.moveTo(x, y0)
  g.lineTo(x, y1)
  g.lineWidth = 6
  g.lineCap = 'round'
  g.strokeStyle = SS.honey
  g.stroke()
  if (alive <= 0) return
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const k = (t * 1.2 + i / 4) % 1
    g.moveTo(x + 2.5, lerp(y0, y1, k))
    g.arc(x, lerp(y0, y1, k), 2.5, 0, TAU)
  }
  fill(g, SS.honeyLite)
  g.globalAlpha = alive * 0.8
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.9 + i / 3) % 1
    g.moveTo(x - 18 - k * 20 + 3, y1 + 4 - k * 8)
    g.arc(x - 18 - k * 20, y1 + 4 - k * 8, 3, 0, TAU)
    g.moveTo(x + 18 + k * 20 + 3, y1 + 4 - k * 8)
    g.arc(x + 18 + k * 20, y1 + 4 - k * 8, 3, 0, TAU)
  }
  fill(g, SS.honeyLite)
  g.globalAlpha = 1
}

/* ------------------------------------------------ the sand-fox pup */

export type Trinket = 'gem' | 'shell' | 'coin' | 'key' | 'star'

/** A little trinket at (x, y), `s` scale. */
export const trinket = (g: G2D, kind: Trinket, x: number, y: number, s: number): void => {
  if (kind === 'gem') {
    g.beginPath()
    g.moveTo(x, y - 14 * s)
    g.lineTo(x + 12 * s, y - 4 * s)
    g.lineTo(x, y + 14 * s)
    g.lineTo(x - 12 * s, y - 4 * s)
    g.closePath()
    fill(g, '#45d6e0')
    ink(g, 3)
    g.beginPath()
    g.moveTo(x, y - 14 * s)
    g.lineTo(x - 12 * s, y - 4 * s)
    g.lineTo(x, y - 1 * s)
    g.closePath()
    fill(g, '#b8f7fb')
  } else if (kind === 'shell') {
    scallop(g, x, y + 8 * s, 15 * s, 0, '#ff7fbf', '#ffc0dc')
  } else if (kind === 'coin') {
    disc(g, x, y, 13 * s, SS.gold, 3)
    star5(g, x, y, 7 * s)
    fill(g, SS.goldShade)
  } else if (kind === 'key') {
    g.beginPath()
    g.moveTo(x, y - 4 * s)
    g.lineTo(x, y + 18 * s)
    g.moveTo(x, y + 10 * s)
    g.lineTo(x + 7 * s, y + 10 * s)
    g.moveTo(x, y + 16 * s)
    g.lineTo(x + 6 * s, y + 16 * s)
    band(g, 4 * s, SS.gold, 2.4)
    g.beginPath()
    g.arc(x, y - 10 * s, 8 * s, 0, TAU)
    g.arc(x, y - 10 * s, 3.5 * s, 0, TAU, true)
    fill(g, SS.gold)
    ink(g, 2.6)
  } else {
    star5(g, x, y, 14 * s)
    fill(g, K.lemon)
    ink(g, 3)
  }
}

/**
 * The sand-fox pup, front view, sitting with its seat at (x, y), scale `s`:
 * huge fennec ears, a cream face, a bushy tail. `hold` 0…1 raises its right
 * paw holding `item` up high.
 */
export const sandFox = (g: G2D, x: number, y: number, s: number, hold: number, item: Trinket, t: number): void => {
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, FOX_ART, FOX_UNIT * s)
  g.scale(s, s)
  // The RAISED PAW and its trinket are never painted: the paw swings from the
  // ground to over its head on `hold`, and the trinket is a different object
  // in each of the five sectors — both are exactly what `art-roadmap` §4b
  // keeps with the drawing. So the painting is the pup, and the arm it puts
  // up is drawn over it.
  if (!painted) foxShape(g, s)
  foxPaw(g, s, hold, item, t)
  g.restore()
}

/** Ear tip (-140) to the seat (0) at scale 1 — the pup's own height in SU. */
const FOX_UNIT = 140

/**
 * The sand-fox pup (`CREATURE_ART.sandFox`), sitting, both front paws down.
 * One panel: nothing about the pup itself changes between the five sectors
 * or across the peek — only the arm, which is drawn.
 */
export const FOX_ART: ItemSpec = {
  ...CREATURE_ART.sandFox, frames: 1,
  draw: (g, sz) => {
    const k = sz / FOX_UNIT
    g.save()
    g.scale(k, k)
    foxShape(g, 1)
    g.restore()
  }
}

/** The pup itself, its seat at the origin, in its own units. */
const foxShape = (g: G2D, s: number): void => {
  const w = LW / s
  // The bushy tail, curling up behind on the left.
  g.beginPath()
  g.moveTo(-18, -8)
  g.bezierCurveTo(-70, -10, -84, -60, -60, -86)
  g.bezierCurveTo(-50, -70, -40, -40, -8, -30)
  g.closePath()
  inkFill(g, SS.fox, w * 0.8)
  g.beginPath()
  g.moveTo(-72, -70)
  g.bezierCurveTo(-72, -80, -66, -86, -60, -86)
  g.bezierCurveTo(-56, -78, -56, -72, -58, -66)
  g.closePath()
  fill(g, SS.foxCream)
  // Body.
  g.beginPath()
  g.ellipse(0, -36, 30, 36, 0, 0, TAU)
  inkFill(g, SS.fox, w * 0.8)
  g.beginPath()
  g.ellipse(0, -28, 18, 24, 0, 0, TAU)
  fill(g, SS.foxCream)
  // The resting paw.
  g.beginPath()
  g.ellipse(-18, -8, 10, 8, 0, 0, TAU)
  fill(g, SS.foxCream)
  ink(g, w * 0.6)
  // Ears.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(d * 12, -122)
    g.quadraticCurveTo(d * 40, -178, d * 56, -172)
    g.quadraticCurveTo(d * 60, -136, d * 38, -106)
    g.closePath()
    fill(g, SS.fox)
    ink(g, w * 0.8)
    g.beginPath()
    g.moveTo(d * 20, -120)
    g.quadraticCurveTo(d * 40, -160, d * 50, -158)
    g.quadraticCurveTo(d * 52, -134, d * 38, -114)
    g.closePath()
    fill(g, SS.foxEar)
  }
  // Head.
  g.beginPath()
  g.ellipse(0, -94, 44, 36, 0, 0, TAU)
  g.moveTo(-40, -96)
  g.lineTo(-54, -76)
  g.lineTo(-30, -78)
  g.moveTo(40, -96)
  g.lineTo(54, -76)
  g.lineTo(30, -78)
  inkFill(g, SS.fox, w * 0.8)
  g.beginPath()
  g.ellipse(-14, -78, 18, 14, 0.2, 0, TAU)
  g.moveTo(32, -78)
  g.ellipse(14, -78, 18, 14, -0.2, 0, TAU)
  fill(g, SS.foxCream)
  // Eyes.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(d * 17, -98, 7.5, 9.5, 0, 0, TAU)
    fill(g, SS.iris)
    ink(g, w * 0.5)
    g.beginPath()
    g.ellipse(d * 17, -97, 4.4, 5.8, 0, 0, TAU)
    fill(g, INK)
    disc(g, d * 17 - 2.6, -101.5, 2.6, '#ffffff')
    disc(g, d * 17 + 2.4, -93, 1.2, '#ffffff')
  }
  // Nose, mouth, blush.
  g.beginPath()
  g.ellipse(0, -84, 5, 3.6, 0, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.moveTo(-7, -77)
  g.quadraticCurveTo(-3.5, -73, 0, -77)
  g.quadraticCurveTo(3.5, -73, 7, -77)
  ink(g, w * 0.45)
  g.globalAlpha = 0.6
  g.beginPath()
  g.ellipse(-28, -84, 6, 4, 0, 0, TAU)
  g.moveTo(34, -84)
  g.ellipse(28, -84, 6, 4, 0, 0, TAU)
  fill(g, SS.blush)
  g.globalAlpha = 1
}

/** The arm the pup puts up, and whatever it is holding. */
const foxPaw = (g: G2D, s: number, hold: number, item: Trinket, t: number): void => {
  const w = LW / s
  const u = clamp(hold, 0, 1)
  const px = lerp(22, 52, u)
  const py = lerp(-20, -130, u)
  g.beginPath()
  g.moveTo(20, -52)
  g.quadraticCurveTo(lerp(26, 54, u), lerp(-40, -80, u), px, py)
  band(g, 13, SS.fox, w * 0.8)
  g.beginPath()
  g.ellipse(px, py, 10, 9, 0, 0, TAU)
  fill(g, SS.foxCream)
  ink(g, w * 0.6)
  if (u > 0.05) {
    trinket(g, item, px + 2, py - 24, 1.4)
    if (u > 0.6) {
      const r = 10 * Math.max(0, sin(t * 6))
      if (r > 1) {
        g.beginPath()
        if (!twinkleAt(g, px + 22, py - 34, r, '#fffbe0')) {
          fill(g, '#fffbe0')
          ink(g, 1.8)
        }
      }
    }
  }
}

/** How a sand-fox pup peeks: its cover's base at (x, y); `hid` / `out` are
 *  the pup's seat heights hidden and fully out; `dig` sprays sand. */
export interface FoxSpot { x: number; y: number; s: number; hid: number; out: number; item: Trinket; dig?: boolean }

/**
 * The tap creature's draw (§8.8 beat 2): the pup pops up from behind its
 * cover (or out of the sand), whose FRONT `cover` redraws on top (so k = 0
 * is the cover alone), and holds its trinket up high.
 */
export const foxTap = (p: FoxSpot, cover: (g: G2D) => void, r = 70): TapCreature => ({
  x: p.x,
  y: p.out - 90 * p.s,
  r,
  draw: (g, k, t) => {
    const e = clamp(k, 0, 1)
    if (e > 0.001) {
      const fy = lerp(p.hid, p.out, e) + (e > 0.95 ? -Math.abs(sin(t * 8)) * 3 : 0)
      g.save()
      g.beginPath()
      g.rect(p.x - 220, p.y - 420, 440, 420 - 2)
      g.clip()
      sandFox(g, p.x, fy, p.s, clamp((e - 0.5) / 0.5, 0, 1), p.item, t)
      g.restore()
    }
    tapCover(g, cover)
    if (p.dig && e > 0.05 && e < 0.98) {
      g.beginPath()
      for (let i = 0; i < 6; i++) {
        const q = (e * 2.2 + i * 0.17) % 1
        const dir = i % 2 ? 1 : -1
        const sx = p.x + dir * (20 + q * 70 + i * 4)
        const sy = p.y - 30 - sin(q * PI) * 60 + i * 2
        // The spray is sand dust: the shared painted puff in the sand's own
        // colour (as `sandPuffs` wears it), once it has landed.
        if (puffAt(g, sx, sy, 5 - q * 2, SS.sand)) continue
        g.moveTo(sx + 5, sy)
        g.arc(sx, sy, 5 - q * 2, 0, TAU)
      }
      fill(g, SS.sand)
      ink(g, 2)
    }
  }
})

/* --------------------------------------------------- the Sand-Clock */

/**
 * The stopped Sand-Clock, the chapter's rescue (§8.8 beat 3), on (x, y):
 * k = 0 it lies on its side, its sand stuck in a heap along the glass, dull
 * and asleep; k = 1 it stands upright, awake and glowing, sand flowing
 * through its waist, a sparkle ticking at its cap.
 */
export const sandClock = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const e = clamp(k, 0, 1)
  const o = e * e * (3 - 2 * e)
  const S = (v: number): number => v * s
  const hop = o * Math.abs(sin(t * 3)) * S(6)
  const cy = y - lerp(S(36), S(66), o) - hop
  if (e > 0) {
    g.globalAlpha = 0.28 * e
    disc(g, x, cy, S(86), '#fff6d6')
    g.globalAlpha = 0.4 * e
    disc(g, x, cy, S(62), '#fff0c0')
    g.globalAlpha = 1
  }
  g.globalAlpha = 0.22
  g.beginPath()
  g.ellipse(x, y - S(2), S(52), S(8), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  g.save()
  g.translate(x, cy)
  g.rotate(lerp(PI / 2, 0, o))
  // The hourglass lies on its side asleep and stands up awake, which is a
  // ROTATION — so the painting is made standing and the drawing turns it.
  if (!drawItem(g, SAND_CLOCK_ART, SAND_CLOCK_UNIT * s, o < 0.5 ? 0 : 1)) {
    g.scale(s, s)
    sandClockShape(g, 1 / s, o, e, t)
  }
  g.restore()
  if (e <= 0.4) return
  sandClockTick(g, x, cy, s, e, t)
}

/** Cap to cap (112) at scale 1 — the hourglass's own height in SU. */
const SAND_CLOCK_UNIT = 112

/**
 * The Hourglass of Ember, asleep and awake (`CREATURE_ART.sandClock`): on its
 * side with the sand heaped along one wall, then upright and running. Its
 * halo, its shadow on the sand and the tick-sparkle at the cap stay drawn.
 * The falling grains stay drawn too — they are a particle stream.
 */
export const SAND_CLOCK_ART: ItemSpec = {
  ...CREATURE_ART.sandClock, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / SAND_CLOCK_UNIT
    g.save()
    g.scale(k, k)
    sandClockShape(g, 1, f, f, 0)
    g.restore()
  }
}

/** The hourglass itself, upright, centred on the origin, in its own units. */
const sandClockShape = (g: G2D, w0: number, o: number, e: number, t: number): void => {
  const w = 4.5 * w0
  // Posts.
  g.beginPath()
  for (const d of [-1, 1]) g.roundRect(d * 30 - 4, -48, 8, 96, 4)
  fill(g, SS.goldShade)
  ink(g, w * 0.8)
  // The glass.
  const glass = (): void => glassPath(g, 0, -46, 46, 24, 4)
  glass()
  fill(g, SS.glass)
  g.save()
  glass()
  g.clip()
  // Asleep: the sand lies along one side (the downhill side once rotated).
  if (o < 1) {
    g.globalAlpha = 1 - o
    g.beginPath()
    g.moveTo(8, -48)
    g.quadraticCurveTo(14, -24, 6, 0)
    g.quadraticCurveTo(14, 24, 8, 48)
    g.lineTo(30, 48)
    g.lineTo(30, -48)
    g.closePath()
    fill(g, SS.honey)
    g.globalAlpha = 1
  }
  // Awake: sand in the top bulb's belly, a heap below, a thin stream.
  if (o > 0) {
    g.globalAlpha = o
    g.beginPath()
    g.rect(-30, -26, 60, 26)
    g.moveTo(-26, 48)
    g.quadraticCurveTo(0, 22, 26, 48)
    g.closePath()
    fill(g, SS.honey)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, 34)
    g.lineWidth = 2.6
    g.strokeStyle = SS.honeyShade
    g.stroke()
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.4 + i / 3) % 1
      g.moveTo(2.2, q * 32)
      g.arc(0, q * 32, 2.2, 0, TAU)
    }
    fill(g, SS.honeyLite)
    g.globalAlpha = 1
  }
  g.beginPath()
  g.moveTo(-16, -38)
  g.quadraticCurveTo(-14, -18, -6, -8)
  g.lineWidth = 4
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.stroke()
  g.restore()
  glass()
  ink(g, w * 0.8)
  // The face, on the lower bulb.
  const fy = 18
  g.beginPath()
  if (o < 0.5) {
    g.moveTo(-11, fy)
    g.quadraticCurveTo(-7, fy + 3.5, -3, fy)
    g.moveTo(3, fy)
    g.quadraticCurveTo(7, fy + 3.5, 11, fy)
    ink(g, 2.2 * w0)
  } else {
    g.ellipse(-7, fy, 2.6, 3.6, 0, 0, TAU)
    g.moveTo(9.6, fy)
    g.ellipse(7, fy, 2.6, 3.6, 0, 0, TAU)
    fill(g, INK)
  }
  g.beginPath()
  g.arc(0, fy + 6, o < 0.5 ? 2.4 : 3.6, 0.2, PI - 0.2)
  ink(g, 2 * w0)
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(-13, fy + 5, 3.4, 2.2, 0, 0, TAU)
  g.moveTo(16.4, fy + 5)
  g.ellipse(13, fy + 5, 3.4, 2.2, 0, 0, TAU)
  fill(g, SS.blush)
  g.globalAlpha = 1
  // The caps.
  for (const cy2 of [-60, 46]) {
    g.beginPath()
    g.roundRect(-38, cy2, 76, 14, 7)
    fill(g, SS.coral)
    ink(g, w * 0.8)
    g.beginPath()
    g.rect(-30, cy2 + 3, 56, 3)
    fill(g, '#ffc4c4')
  }
  disc(g, 0, -66, 5, SS.gold, 2.4 * w0)
  // Asleep: dimmed under a plum veil.
  if (e < 1) {
    g.globalAlpha = 0.32 * (1 - clamp(e * 1.5, 0, 1))
    glass()
    for (const cy2 of [-60, 46]) g.roundRect(-38, cy2, 76, 14, 7)
    for (const d of [-1, 1]) g.roundRect(d * 30 - 4, -48, 8, 96, 4)
    g.moveTo(5, -66)
    g.arc(0, -66, 5, 0, TAU)
    fill(g, INK)
    g.globalAlpha = 1
  }
}

/** The sparkle that pops at the cap once a second, once it is running. */
const sandClockTick = (g: G2D, x: number, cy: number, s: number, e: number, t: number): void => {
  const S = (v: number): number => v * s
  const a = clamp((e - 0.4) / 0.6, 0, 1)
  const ph = t % 1
  const r = S(14) * Math.max(0, 1 - ph / 0.35) * a
  g.globalAlpha = a
  if (r > 1) {
    g.beginPath()
    if (!twinkleAt(g, x + S(34), cy - S(70), r, '#fffbe0')) {
      fill(g, '#fffbe0')
      ink(g, 2)
    }
  }
  g.beginPath()
  let lit = false
  for (let i = 0; i < 3; i++) {
    const rr = S(8) * Math.max(0, sin(t * 3 + i * 2))
    if (rr > 0.5) lit = twinkleAt(g, x + cos(i * 2.1 + 0.5) * S(62), cy + sin(i * 2.1 + 0.5) * S(46), rr, '#fff6b0')
  }
  if (!lit) fill(g, '#fff6b0')
  g.globalAlpha = 1
}

/** A rescue collectible for the Sand-Clock resting on its cushion at (x, y). */
export const clockRescue = (x: number, y: number, s: number): RescueCollectible => ({
  x,
  y: y - 50 * s,
  r: 64,
  draw: (g, k, t) => sandClock(g, x, y, s, k, t)
})
