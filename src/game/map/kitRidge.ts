/**
 * kitRidge.ts — Rainbow Ridge's painters (chapter 6, story-spec §10.2: "The
 * world's colour is draining from the prismatic bridge", Guardian Prism).
 * Striped candy hills and terraces, rainbow waterfalls, flower fields in
 * every hue, the paint-pot house, the garden prism, the kite pavilion, the
 * crystal-and-rainbow bridge; the chapter's live props; its tap creature (a
 * rainbow-maned foal that trots out leaving a colour trail) and its rescue
 * (the Prism Petal).
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on mid- and foreground shapes, gradients only in the sky and far ridges,
 * far layers lighter and unoutlined. The saturated colour lives in the hill
 * stripes, the falls, the flowers and the landmark; base tones clear the
 * candy floor (saturation ≥ 70 %, lightness 55–75 %).
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink, flower, butterflyAt, twinkleAt, puffAt, bubbleAt, streakAt } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'
import { K, skyPuff, inkFill, mix, star5 } from '@/game/map/kitSky'
import { type Pt, curve, foam } from '@/game/map/kitBay'
import type { TapCreature, RescueCollectible } from '@/game/map/sectorDef'

type Lobe = readonly [number, number, number]
const LW = 5

/** The rainbow, outer band first (kitSky's, so every chapter's rainbow agrees). */
export const RAINBOW = K.rainbow

export const RR = {
  skyTop: '#58aefc',
  skyMid: '#a4ccff',
  skyLow: '#ffd8ee',
  far: '#dcd4ff',
  farStripe: '#ebe5ff',
  far2: '#ffd2e8',
  far2Stripe: '#ffe4f1',
  pink: '#ff7fbf',
  pinkShade: '#e2579f',
  lilac: '#a77cff',
  lilacShade: '#8558e8',
  orange: '#ffa04d',
  yellow: '#ffd84d',
  mint: '#45deb0',
  blue: '#56b6ff',
  wall: '#fff3ea',
  wallShade: '#f2d3e6',
  water: '#4fc8ff',
  waterLite: '#b4ecff',
  tin: '#dcd6f7',
  tinShade: '#b9addf',
  coat: '#fff4fa',
  coatShade: '#f0cbe2',
  horn: '#ffe08a',
  hornBand: '#f5b94f',
  hoof: '#e0a96b',
  iris: '#7a4fd1',
  blush: '#ff9eb5',
  wicker: '#f2b26a',
  wickerShade: '#d08a4a'
}

/** Hill stripe sets: every tone clears the candy floor. */
export const STRIPES = {
  berry: ['#ff7fbf', '#a77cff'],
  sunny: ['#ffa04d', '#ffd84d'],
  cool: ['#56b6ff', '#45deb0'],
  peach: ['#ff8a8a', '#ffc04d'],
  lilac: ['#a77cff', '#56b6ff'],
  mintY: ['#45deb0', '#ffd84d']
} as const satisfies Record<string, readonly string[]>

/** Three tones for a crystal or a candy tree: base, shade, light. */
export type Tones = readonly [string, string, string]
export const CRYSTAL = {
  lilac: ['#b58cff', '#8f64f0', '#e6d8ff'] as Tones,
  pink: ['#ff8cc8', '#e8609f', '#ffd0e8'] as Tones,
  sky: ['#6cc6ff', '#3f98e8', '#cdeeff'] as Tones,
  mint: ['#4fe3b8', '#26b890', '#c2f8e6'] as Tones
}

/* ---------------------------------------------------------------- helpers */

export const circles = (g: G2D, lobes: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
}

export const disc = (g: G2D, x: number, y: number, r: number, colour: string, w = 0): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, colour)
  if (w) ink(g, w)
}

/** Stroke the current path as a thick outlined band: plum under, colour on top. */
export const band = (g: G2D, w: number, col: string, edge = 4): void => {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = w + edge * 2
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = w
  g.strokeStyle = col
  g.stroke()
}

/** Twinkles winking at fixed spots — one path, one fill (a live prop). */
export const glints = (g: G2D, pts: readonly Lobe[], t: number, alive: number, col = '#fffbe0'): void => {
  if (alive <= 0) return
  g.beginPath()
  let painted = false
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i]!
    const k = Math.max(0, sin(t * 2.2 + i * 1.9))
    if (k > 0.05) painted = twinkleAt(g, x, y, r * k * alive, col)
  }
  g.globalAlpha = 1
  if (!painted) fill(g, col)
}

/**
 * Lay the plum cel shade over whatever the current clip holds: everything
 * inside the silhouette `path` builds EXCEPT the silhouette shifted toward the
 * top-left light — a hard-edged band down the right and lower edges.
 */
export const celShade = (g: G2D, path: () => void, shift: Pt, a = 0.14): void => {
  g.save()
  g.translate(-shift[0], -shift[1])
  path()
  g.restore()
  g.rect(-400, -400, SEC_W + 800, SEC_H + 800)
  g.globalAlpha = a
  g.fillStyle = INK
  g.fill('evenodd')
  g.globalAlpha = 1
}

/* ------------------------------------------------------------------- sky */

export interface RidgeSkyOpts {
  sun?: Pt
  /** A soft rainbow behind everything: centre x, y and outer radius. */
  rainbow?: readonly [number, number, number]
  puffs?: readonly (readonly [number, number, number])[]
}

/** Rainbow Ridge's sky: a clear blue lightening to a rosy horizon. */
export const ridgeSky = (g: G2D, o: RidgeSkyOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 450)
  gr.addColorStop(0, RR.skyTop)
  gr.addColorStop(0.55, RR.skyMid)
  gr.addColorStop(1, RR.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.rainbow) {
    const [rx, ry, rr] = o.rainbow
    g.globalAlpha = 0.5
    g.lineWidth = 16
    for (let i = 0; i < RAINBOW.length; i++) {
      g.beginPath()
      g.arc(rx, ry, rr - 8 - i * 15, PI, TAU)
      g.strokeStyle = RAINBOW[i]!
      g.stroke()
    }
    g.globalAlpha = 1
  }
  if (o.sun) {
    const [sx, sy] = o.sun
    const glow = g.createRadialGradient(sx, sy, 30, sx, sy, 200)
    glow.addColorStop(0, 'rgba(255,240,170,0.9)')
    glow.addColorStop(1, 'rgba(255,240,170,0)')
    g.fillStyle = glow
    g.fillRect(sx - 210, sy - 210, 420, 420)
    disc(g, sx, sy, 56, '#ffe36b')
  }
  for (const [x, y, s] of o.puffs ?? []) skyPuff(g, x, y, s)
}

/** Two far bands of round-topped ridges, faintly striped, never outlined. */
export const farRidges = (g: G2D, y1: number, y2: number, seed: number, amp1 = 110, amp2 = 80): void => {
  const bands = [[y1, RR.far, RR.farStripe, amp1], [y2, RR.far2, RR.far2Stripe, amp2]] as const
  for (let b = 0; b < bands.length; b++) {
    const [y, col, st, amp] = bands[b]!
    const r = seeded(seed + b * 101)
    const path = (): void => {
      g.beginPath()
      g.moveTo(-60, SEC_H)
      g.lineTo(-60, y + 10)
      let x = -60
      while (x < SEC_W + 60) {
        const w = 150 + r() * 130
        const h = amp * (0.5 + r() * 0.6)
        const px = x + w / 2
        const py = y - h
        g.bezierCurveTo(x + w * 0.24, y - h * 0.55, px - w * 0.2, py, px, py)
        g.bezierCurveTo(px + w * 0.2, py, x + w - w * 0.24, y - h * 0.55, x + w, y + 10)
        x += w
      }
      g.lineTo(x, SEC_H)
      g.closePath()
    }
    path()
    fill(g, col)
    g.save()
    path()
    g.clip()
    g.beginPath()
    for (let yy = y - amp * 1.1; yy < y + 40; yy += 34) {
      g.moveTo(-60, yy)
      for (let x = -60; x <= SEC_W + 60; x += 60) g.quadraticCurveTo(x + 30, yy - 6, x + 60, yy)
      g.lineTo(SEC_W + 60, yy + 12)
      for (let x = SEC_W + 60; x >= -60; x -= 60) g.quadraticCurveTo(x - 30, yy + 18, x - 60, yy + 12)
      g.closePath()
    }
    fill(g, st)
    g.restore()
  }
}

/* ------------------------------------------------------------- the land */

export interface HillOpts {
  /** Stripe height, SU. */
  band?: number
  /** Stripe wave amplitude, SU. */
  wave?: number
  /** Shift of the lit silhouette toward the top-left (the cel shade's width). */
  shift?: Pt
  /** A lumpy grass (or sand) cap along these crest points. */
  cap?: readonly Pt[]
  capCol?: string
  capLip?: string
  seed?: number
  /** Leave the top band plain for this many SU (under a cap). */
  topPad?: number
  /** A lit rim stroked just inside the crest (a mesa's smooth sandy lip). */
  lip?: readonly Pt[]
}

/**
 * A striped candy mass — a hill, a cliff, a terrace: the silhouette `path`
 * builds, filled with wavy horizontal stripes cycling through `cols`, a thin
 * lit edge on top of each stripe, the plum cel shade, an optional lumpy cap,
 * then the one outline.
 */
export const candyHill = (
  g: G2D, path: () => void, box: readonly [number, number, number, number], cols: readonly string[], o: HillOpts = {}
): void => {
  const [bx, by, bw, bh] = box
  const bandH = o.band ?? 40
  const A = o.wave ?? 6
  const r = seeded(o.seed ?? 5)
  const ph = r() * TAU
  path()
  fill(g, cols[0]!)
  g.save()
  path()
  g.clip()
  const wy = (x: number, y: number, i: number): number => y + A * sin(x * 0.011 + ph + i * 1.7)
  const x0 = bx - 40
  const x1 = bx + bw + 40
  let i = 0
  for (let yy = by + (o.topPad ?? bandH * 0.7); yy < by + bh + bandH; yy += bandH, i++) {
    const col = cols[(i + 1) % cols.length]!
    g.beginPath()
    g.moveTo(x0, wy(x0, yy, i))
    for (let x = x0 + 32; x <= x1; x += 32) g.lineTo(x, wy(x, yy, i))
    for (let x = x1; x >= x0; x -= 32) g.lineTo(x, wy(x, yy + bandH, i + 1))
    g.closePath()
    fill(g, col)
    g.beginPath()
    g.moveTo(x0, wy(x0, yy, i) + 3)
    for (let x = x0 + 32; x <= x1; x += 32) g.lineTo(x, wy(x, yy, i) + 3)
    g.lineWidth = 4
    g.strokeStyle = 'rgba(255,255,255,0.4)'
    g.stroke()
  }
  g.beginPath()
  celShade(g, path, o.shift ?? [30, 16])
  if (o.lip) {
    g.beginPath()
    curve(g, o.lip)
    g.lineWidth = 16
    g.lineCap = 'round'
    g.strokeStyle = o.capCol ?? C.mossLip
    g.stroke()
    g.beginPath()
    curve(g, o.lip.map(([x, y]) => [x, y - 3] as const))
    g.lineWidth = 5
    g.strokeStyle = o.capLip ?? '#ffffff'
    g.stroke()
  }
  if (o.cap) capLumps(g, o.cap, o.capCol ?? C.moss, o.capLip ?? C.mossLip)
  g.restore()
  path()
  ink(g)
}

/** A lumpy cap along crest points (grass on a hill, sand on a mesa). */
export const capLumps = (g: G2D, cap: readonly Pt[], col: string, lip: string, rad = 15): void => {
  const lobes: Lobe[] = []
  for (let i = 0; i < cap.length - 1; i++) {
    const [ax, ay] = cap[i]!
    const [ex, ey] = cap[i + 1]!
    const steps = Math.max(1, Math.round(Math.hypot(ex - ax, ey - ay) / 24))
    for (let j = 0; j < steps; j++) {
      const u = j / steps
      lobes.push([ax + (ex - ax) * u, ay + (ey - ay) * u + 6, rad + ((i + j) % 3) * 3])
    }
  }
  const [lx, ly] = cap[cap.length - 1]!
  lobes.push([lx, ly + 6, rad])
  // A solid band under the lumps so the cap reads as one layer.
  g.beginPath()
  curve(g, cap)
  g.lineWidth = rad * 2
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = INK
  g.stroke()
  circles(g, lobes.map(([x, y, rr]) => [x, y, rr + 4] as const))
  fill(g, INK)
  g.beginPath()
  curve(g, cap)
  g.lineWidth = rad * 2 - 8
  g.strokeStyle = col
  g.stroke()
  circles(g, lobes)
  fill(g, col)
  g.beginPath()
  for (let k = 0; k < lobes.length; k += 2) {
    const [x, y, rr] = lobes[k]!
    g.moveTo(x - rr * 0.2 + rr * 0.35, y - rr * 0.35)
    g.ellipse(x - rr * 0.2, y - rr * 0.35, rr * 0.35, rr * 0.18, -0.4, 0, TAU)
  }
  fill(g, lip)
}

/** The front ground below the curve through `top` (run it past both page
 *  edges): grass, a lit lip along the crest, a few soft shade humps. */
export const ground = (g: G2D, top: readonly Pt[], seed: number, col = C.moss, lip = C.mossLip, shade = C.mossShade): void => {
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
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const x = r() * SEC_W
    const y = y0 + 90 + r() * (SEC_H - y0)
    const w = 120 + r() * 140
    g.moveTo(x - w, y + 60)
    g.quadraticCurveTo(x, y - 30, x + w, y + 60)
  }
  g.globalAlpha = 0.55
  fill(g, shade)
  g.globalAlpha = 1
  g.beginPath()
  curve(g, top.map(([x, y]) => [x, y + 7] as const))
  g.lineWidth = 7
  g.strokeStyle = lip
  g.stroke()
  g.restore()
  g.beginPath()
  curve(g, top)
  ink(g)
}

/** Flowers in every hue and grass tufts over a band, skipping `avoid` boxes. */
export const rainbowFlowers = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = [], x0 = 20, x1 = SEC_W - 20
): void => {
  const r = seeded(seed)
  const cols = [RAINBOW[0]!, RAINBOW[2]!, RAINBOW[4]!, RAINBOW[1]!, RAINBOW[5]!, '#ffffff', RAINBOW[3]!]
  const hit = (x: number, y: number): boolean => avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)
  g.beginPath()
  for (let i = 0; i < 24; i++) {
    const x = x0 + r() * (x1 - x0)
    const y = y0 - 6 + r() * (y1 - y0 + 12)
    const h = 12 + r() * 12
    if (hit(x, y)) continue
    g.moveTo(x - 6, y)
    g.quadraticCurveTo(x - 2, y - h, x + 3, y - h - 4)
    g.quadraticCurveTo(x + 2, y - h * 0.4, x + 6, y)
  }
  fill(g, C.mossShade)
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0)
    const y = y0 + r() * (y1 - y0)
    const size = 8 + r() * 7 * (0.6 + (y - y0) / Math.max(1, y1 - y0))
    const rot = r() * TAU
    if (hit(x, y)) continue
    flower(g, x, y, size, cols[i % cols.length]!, rot)
  }
}

/** A long clipped hedge from x0 to x1, its lumps along `y`, flat below to
 *  `y + depth` — a garden's back wall, dotted with rainbow blossoms. */
export const hedgeRow = (g: G2D, x0: number, x1: number, y: number, r: number, depth: number, seed: number): void => {
  const rnd = seeded(seed)
  const lobes: Lobe[] = []
  let x = x0
  while (x <= x1 + r) {
    lobes.push([x, y + (rnd() - 0.5) * 12, r * (0.8 + rnd() * 0.4)])
    x += r * (1.05 + rnd() * 0.4)
  }
  const shape = (): void => {
    circles(g, lobes)
    g.rect(x0 - r, y, x1 - x0 + r * 2, depth)
  }
  shape()
  inkFill(g, C.canopy)
  g.save()
  shape()
  g.clip()
  circles(g, lobes.map(([a, b, rr]) => [a + rr * 0.3, b + rr * 0.55, rr] as const))
  g.rect(x0 - r, y + r * 0.7, x1 - x0 + r * 2, depth)
  fill(g, C.canopyShade)
  g.beginPath()
  for (const [a, b, rr] of lobes) {
    g.moveTo(a - rr * 0.25 + rr * 0.3, b - rr * 0.45)
    g.ellipse(a - rr * 0.25, b - rr * 0.45, rr * 0.3, rr * 0.15, -0.4, 0, TAU)
  }
  fill(g, C.canopyLite)
  g.restore()
  for (let i = 0; i < lobes.length; i++) {
    const [a, b, rr] = lobes[i]!
    flower(g, a + (rnd() - 0.5) * rr, b + rr * (0.1 + rnd() * 0.5), 9, RAINBOW[i % RAINBOW.length]!, rnd() * TAU)
  }
}

/** A tall tulip on a stem at (x, y). */
export const tulip = (g: G2D, x: number, y: number, s: number, col: string): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x - 4 * s, y - 30 * s, x, y - 52 * s)
  band(g, 4 * s, C.mossShade, 2.4)
  g.beginPath()
  g.ellipse(x + 9 * s, y - 20 * s, 10 * s, 4 * s, -0.7, 0, TAU)
  fill(g, C.moss)
  ink(g, 2.4)
  g.beginPath()
  g.moveTo(x - 13 * s, y - 70 * s)
  g.lineTo(x - 6 * s, y - 60 * s)
  g.lineTo(x, y - 74 * s)
  g.lineTo(x + 6 * s, y - 60 * s)
  g.lineTo(x + 13 * s, y - 70 * s)
  g.quadraticCurveTo(x + 15 * s, y - 50 * s, x, y - 48 * s)
  g.quadraticCurveTo(x - 15 * s, y - 50 * s, x - 13 * s, y - 70 * s)
  g.closePath()
  fill(g, col)
  ink(g, 3)
}

/** A candy lollipop tree: a soft stick and a round two-toned canopy. */
export const lollyTree = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  g.beginPath()
  g.roundRect(x - 9 * s, y - 96 * s, 18 * s, 98 * s, 8 * s)
  fill(g, C.trunk)
  ink(g, 4)
  const lobes: Lobe[] = [[x - 46 * s, y - 112 * s, 38 * s], [x, y - 146 * s, 50 * s], [x + 46 * s, y - 114 * s, 40 * s], [x, y - 102 * s, 42 * s]]
  circles(g, lobes)
  inkFill(g, t[0])
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 36 * s, y - 80 * s, 50 * s], [x - 28 * s, y - 66 * s, 40 * s]])
  fill(g, t[1])
  circles(g, [[x - 24 * s, y - 166 * s, 26 * s], [x + 4 * s, y - 178 * s, 17 * s]])
  fill(g, t[2])
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-36, -118], [20, -160], [44, -106]] as const) {
    g.moveTo(x + dx * s + 5 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 5 * s, 0, TAU)
  }
  fill(g, '#ffffff')
}

/* ------------------------------------------------------ rainbow water */

/** The silhouette of a fall pouring from (x, top) to (x, bot), `w` wide at
 *  its foot (a little narrower at the lip). */
export const fallPath = (g: G2D, x: number, top: number, bot: number, w: number): void => {
  const wt = w * 0.84
  const H = bot - top
  g.beginPath()
  g.moveTo(x - wt / 2, top)
  g.bezierCurveTo(x - wt / 2 - 2, top + H * 0.5, x - w / 2, bot - H * 0.2, x - w / 2, bot)
  g.lineTo(x + w / 2, bot)
  g.bezierCurveTo(x + w / 2, bot - H * 0.2, x + wt / 2 + 2, top + H * 0.5, x + wt / 2, top)
  g.quadraticCurveTo(x, top - 18, x - wt / 2, top)
  g.closePath()
}

/** A rainbow waterfall: six colour columns, a gloss on each, one outline. */
export const rainbowFall = (g: G2D, x: number, top: number, bot: number, w: number): void => {
  fallPath(g, x, top, bot, w)
  fill(g, RAINBOW[0]!)
  g.save()
  fallPath(g, x, top, bot, w)
  g.clip()
  const cw = w / RAINBOW.length
  for (let i = 0; i < RAINBOW.length; i++) {
    g.fillStyle = RAINBOW[i]!
    g.fillRect(x - w / 2 + i * cw - 0.5, top - 30, cw + 1, bot - top + 60)
  }
  g.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < RAINBOW.length; i++) g.fillRect(x - w / 2 + i * cw + cw * 0.14, top - 30, cw * 0.18, bot - top + 60)
  g.restore()
  fallPath(g, x, top, bot, w)
  ink(g)
}

/** The fall's flow — a live prop: bright dashes sliding down every column. */
export const fallFlow = (g: G2D, x: number, top: number, bot: number, w: number, t: number, alive: number): void => {
  g.save()
  fallPath(g, x, top, bot, w)
  g.clip()
  const H = bot - top
  const v = t * 150 * alive
  const cw = w / RAINBOW.length
  // The dashes are `STREAK_ART` where it has landed, and the one batched fill
  // they always were where it has not. The fall's own clip is unchanged: it
  // is the call site's path, and that is why the BAND is the sheet.
  g.globalAlpha = 0.6
  let painted = false
  g.beginPath()
  for (let i = 0; i < RAINBOW.length; i++) {
    const cx = x - w / 2 + (i + 0.5) * cw
    for (let j = 0; j < 2; j++) {
      const yy = top + ((v + j * (H / 2 + 20) + i * 41) % (H + 50)) - 30
      painted = streakAt(g, cx - cw * 0.22, yy, cw * 0.44, 30, '#ffffff')
    }
  }
  g.globalAlpha = 1
  if (!painted) {
    g.fillStyle = 'rgba(255,255,255,0.6)'
    g.fill()
  }
  g.restore()
}

/** Spray puffs rising off a fall's foot — a live prop (none at rest). */
export const mist = (g: G2D, x: number, y: number, w: number, t: number, alive: number): void => {
  if (alive <= 0) return
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1
    const px = x + (i - 1) * w * 0.34 + sin(k * 4 + i) * 6
    const py = y - 10 - k * 46
    const r = 10 + k * 14
    g.globalAlpha = alive * 0.75 * (1 - k)
    if (!puffAt(g, px, py, r, '#ffffff')) disc(g, px, py, r, '#ffffff')
  }
  g.globalAlpha = 1
}

/** A small arc rainbow of `n` bands at (x, y), outer radius r. */
/** The arc the falls throw: 0.9π of it, six bands, outer radius 96. */
const ARC_A0 = PI * 1.05
const ARC_A1 = PI * 1.95
const ARC_R = 96

/**
 * The waterfall's rainbow arc as a painted still.
 *
 * ONE arc, not `miniRainbow` in general: the span comes from the call site, so
 * a 0.9π bow and the rescue cushions' 2.4-radian one are two different
 * shapes. This is the one a sector flies as a live prop; the others keep their
 * drawing, and `rainbowArc` simply reports that it did not paint.
 */
export const RAINBOW_ARC_ART: ItemSpec = {
  ...PROP_ART.rainbowArc, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / ARC_R, s / ARC_R)
    miniRainbow(g, 0, 0, ARC_R, 7, ARC_A0, ARC_A1, 6)
    g.restore()
  }
}

/** The falls' arc at (x, y), outer radius `r` — painted, or false so the
 *  caller draws `miniRainbow` as before. */
export const rainbowArc = (g: G2D, x: number, y: number, r: number): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, RAINBOW_ARC_ART, r)
  g.restore()
  return hit
}

export const miniRainbow = (g: G2D, x: number, y: number, r: number, bw: number, a0 = PI, a1 = TAU, n = 4): void => {
  g.lineWidth = bw + 0.6
  g.lineCap = 'butt'
  const cols = n >= 6 ? RAINBOW : [RAINBOW[0]!, RAINBOW[2]!, RAINBOW[3]!, RAINBOW[4]!]
  for (let i = 0; i < cols.length; i++) {
    g.beginPath()
    g.arc(x, y, r - bw * (i + 0.5), a0, a1)
    g.strokeStyle = cols[i]!
    g.stroke()
  }
  g.lineCap = 'round'
}

/** A still pool (x, y, rx, ry): water, a lit sheen, one outline. */
export const pool = (g: G2D, x: number, y: number, rx: number, ry: number): void => {
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  fill(g, RR.water)
  ink(g)
  g.save()
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(x - rx * 0.2, y - ry * 0.34, rx * 0.55, ry * 0.3, 0, 0, TAU)
  fill(g, RR.waterLite)
  g.beginPath()
  for (const [dx, dy, w] of [[0.3, 0.2, 60], [-0.5, 0.35, 44], [0.55, -0.1, 36]] as const) {
    g.moveTo(x + dx * rx - w / 2, y + dy * ry)
    g.quadraticCurveTo(x + dx * rx, y + dy * ry - 6, x + dx * rx + w / 2, y + dy * ry)
  }
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.stroke()
  g.restore()
}

/** A lily pad afloat at (x, y), `r` across. */
export const lilyPad = (g: G2D, x: number, y: number, r: number, rot = 0.4): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.ellipse(x, y, r, r * 0.4, 0, rot, TAU + rot - 0.5)
  g.closePath()
  fill(g, C.lily)
  ink(g, 3)
}

/**
 * The giant water-lily of Rainbow Falls, its pad on the water at (x, y):
 * its PETALS are the landmark (back row pot shade, front rows pot base with
 * lit midribs, a golden heart).
 */
export const lotus = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  // The pad.
  g.beginPath()
  g.moveTo(x, y + 4 * s)
  g.ellipse(x, y + 4 * s, 170 * s, 40 * s, 0, 1.75, TAU + 1.35)
  g.closePath()
  fill(g, C.lily)
  ink(g)
  g.save()
  g.beginPath()
  g.ellipse(x, y + 4 * s, 170 * s, 40 * s, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(x + 60 * s, y + 30 * s, 170 * s, 30 * s, 0, 0, TAU)
  fill(g, C.mossShade)
  g.restore()
  const petal = (a: number, L: number, W: number, col: string, mid?: string): void => {
    const dx = cos(a)
    const dy = sin(a)
    const px = -dy
    const py = dx
    const bx = x + dx * 10 * s
    const by = y - 20 * s + dy * 10 * s
    const tx = bx + dx * L * s
    const ty = by + dy * L * s
    g.beginPath()
    g.moveTo(bx, by)
    g.bezierCurveTo(bx + px * W * s, by + py * W * s, tx + px * W * 0.7 * s - dx * L * 0.25 * s, ty + py * W * 0.7 * s - dy * L * 0.25 * s, tx, ty)
    g.bezierCurveTo(tx - px * W * 0.7 * s - dx * L * 0.25 * s, ty - py * W * 0.7 * s - dy * L * 0.25 * s, bx - px * W * s, by - py * W * s, bx, by)
    g.closePath()
    fill(g, col)
    ink(g, 4)
    if (!mid) return
    g.beginPath()
    g.moveTo(bx + dx * L * 0.28 * s, by + dy * L * 0.28 * s)
    g.lineTo(bx + dx * L * 0.74 * s, by + dy * L * 0.74 * s)
    g.lineWidth = 6 * s
    g.lineCap = 'round'
    g.strokeStyle = mid
    g.stroke()
  }
  for (const a of [-2.75, -2.2, -1.57, -0.94, -0.39]) petal(a, 118, 34, pot.shade)
  // The golden heart, between the rows.
  circles(g, [[x - 26 * s, y - 44 * s, 16 * s], [x, y - 52 * s, 18 * s], [x + 26 * s, y - 44 * s, 16 * s]])
  inkFill(g, '#ffd84d', 3.5)
  g.beginPath()
  for (const dx of [-26, 0, 26]) {
    g.moveTo(x + dx * s + 3.5 * s, y - (dx ? 48 : 58) * s)
    g.arc(x + dx * s, y - (dx ? 48 : 58) * s, 3.5 * s, 0, TAU)
  }
  fill(g, '#ffa04d')
  for (const a of [-2.45, -1.9, -1.24, -0.69]) petal(a, 104, 36, pot.base, pot.lite)
  for (const a of [-3.1, -0.04]) petal(a, 96, 30, pot.base, pot.lite)
  petal(-1.57, 66, 40, pot.base, pot.lite)
  g.beginPath()
  g.ellipse(x - 36 * s, y - 104 * s, 9 * s, 4 * s, -0.9, 0, TAU)
  fill(g, '#ffffff')
}

/* ------------------------------------------------------------ crystals */

/** A crystal column standing at (x, y), w × h, leaning `rot`: its three
 *  faces lit, base and shaded, its facet lines, a glint. */
export const crystal = (g: G2D, x: number, y: number, w: number, h: number, rot: number, t: Tones, lw = LW): void => {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  const tip = w * 0.55
  const sil = (): void => {
    g.beginPath()
    g.moveTo(-w / 2, 4)
    g.lineTo(-w / 2, -h + tip)
    g.lineTo(0, -h)
    g.lineTo(w / 2, -h + tip)
    g.lineTo(w / 2, 4)
    g.closePath()
  }
  sil()
  fill(g, t[0])
  g.save()
  sil()
  g.clip()
  g.beginPath()
  g.moveTo(-w / 2 - 4, 10)
  g.lineTo(-w / 2 - 4, -h + tip)
  g.lineTo(0, -h - 4)
  g.lineTo(-w / 6, -h + tip)
  g.lineTo(-w / 6, 10)
  g.closePath()
  fill(g, t[2])
  g.beginPath()
  g.moveTo(w / 6, 10)
  g.lineTo(w / 6, -h + tip)
  g.lineTo(0, -h - 4)
  g.lineTo(w / 2 + 4, -h + tip)
  g.lineTo(w / 2 + 4, 10)
  g.closePath()
  fill(g, t[1])
  g.restore()
  g.beginPath()
  g.moveTo(-w / 6, 2)
  g.lineTo(-w / 6, -h + tip)
  g.lineTo(0, -h)
  g.moveTo(w / 6, 2)
  g.lineTo(w / 6, -h + tip)
  g.lineTo(0, -h)
  g.moveTo(-w / 6, -h + tip)
  g.lineTo(w / 6, -h + tip)
  ink(g, lw * 0.5)
  g.beginPath()
  g.ellipse(-w * 0.34, -h * 0.5, w * 0.06, h * 0.14, 0, 0, TAU)
  fill(g, '#ffffff')
  sil()
  ink(g, lw)
  g.restore()
}

/** A little cluster of crystals at (x, y) — a tap creature's hiding place. */
export const crystalCluster = (g: G2D, x: number, y: number, s: number): void => {
  crystal(g, x - 44 * s, y, 40 * s, 86 * s, -0.36, CRYSTAL.sky, 4)
  crystal(g, x + 46 * s, y, 44 * s, 96 * s, 0.32, CRYSTAL.pink, 4)
  crystal(g, x, y + 2, 58 * s, 132 * s, 0.02, CRYSTAL.lilac, 4.5)
  crystal(g, x - 20 * s, y + 4, 26 * s, 50 * s, -0.12, CRYSTAL.mint, 3.5)
  lumps(g, x, y + 2, 100 * s)
}

/** Grass lumps along a prop's foot, `w` wide. */
export const lumps = (g: G2D, x: number, y: number, w: number): void => {
  const n = Math.max(3, Math.round(w / 22))
  const lobes: Lobe[] = []
  for (let i = 0; i <= n; i++) lobes.push([x - w / 2 + (i / n) * w, y + ((i * 7) % 3) - 2, 10 + ((i * 5) % 3) * 2])
  circles(g, lobes.map(([a, b, r]) => [a, b, r + 3.5] as const))
  fill(g, INK)
  circles(g, lobes)
  fill(g, C.moss)
}

/**
 * The Garden Prism of Prism Garden on its plinth at (x, y): a great crystal
 * with two smaller ones leaning on it. Its FACETS are the landmark (pot lite,
 * base and shade). Returns the heart of the crystal (where its light leaves).
 */
export const gardenPrism = (g: G2D, x: number, y: number, s: number, pot: Pot): Pt => {
  // The step: a wide, low stone disc.
  drum(g, x, y, 150 * s, 30 * s, 16 * s, RR.wall, RR.wallShade)
  // The golden planter: its mouth (soil), the crystals planted in it, its front.
  const top = y - 60 * s
  const rw = 100 * s
  const ry = 22 * s
  g.beginPath()
  g.ellipse(x, top, rw, ry, 0, 0, TAU)
  fill(g, '#9a6446')
  ink(g)
  const T: Tones = [pot.base, pot.shade, pot.lite]
  crystal(g, x - 60 * s, top + 10 * s, 56 * s, 150 * s, -0.42, T)
  crystal(g, x + 66 * s, top + 10 * s, 60 * s, 170 * s, 0.38, T)
  crystal(g, x, top + 12 * s, 96 * s, 290 * s, 0, T, 6)
  crystal(g, x + 30 * s, top + 14 * s, 34 * s, 70 * s, 0.2, T, 4)
  crystal(g, x - 30 * s, top + 14 * s, 30 * s, 56 * s, -0.25, T, 4)
  const front = (): void => {
    g.beginPath()
    g.moveTo(x - rw, top)
    g.lineTo(x - rw * 0.9, y - 16 * s)
    g.ellipse(x, y - 16 * s, rw * 0.9, ry * 0.9, 0, PI, 0, true)
    g.lineTo(x + rw, top)
    g.ellipse(x, top, rw, ry, 0, 0, PI)
    g.closePath()
  }
  front()
  fill(g, K.lemon)
  g.save()
  front()
  g.clip()
  g.beginPath()
  g.rect(x + rw * 0.4, top - 10 * s, rw, 90 * s)
  fill(g, K.lemonShade)
  g.restore()
  front()
  ink(g)
  g.beginPath()
  g.ellipse(x, top, rw, ry, 0, 0.1, PI - 0.1)
  g.lineWidth = 7 * s
  g.strokeStyle = K.lemonLite
  g.stroke()
  // A garland of rainbow blossoms round the planter.
  for (let i = 0; i < 6; i++) flower(g, x - 72 * s + i * 29 * s, y - 30 * s + (i % 2) * 5 * s, 10 * s, RAINBOW[i]!, i)
  return prismHeart(x, y, s)
}

/** A low round drum at (x, y): radius rx, depth ry (the ellipse), `h` tall. */
export const drum = (g: G2D, x: number, y: number, rx: number, ry: number, h: number, col: string, shade: string): void => {
  g.beginPath()
  g.moveTo(x - rx, y - h)
  g.lineTo(x - rx, y)
  g.ellipse(x, y, rx, ry, 0, PI, 0, true)
  g.lineTo(x + rx, y - h)
  g.closePath()
  fill(g, shade)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - h, rx, ry, 0, 0, TAU)
  fill(g, col)
  ink(g)
}

/** The heart of a Garden Prism at (x, y), scale `s` — where its light leaves. */
export const prismHeart = (x: number, y: number, s: number): Pt => [x, y - 60 * s - 150 * s]

/** Rainbow light fanning out of the prism — a live prop (dark at rest). */
export const prismBeams = (g: G2D, x: number, y: number, a0: number, spread: number, len: number, t: number, alive: number): void => {
  if (alive <= 0) return
  const n = RAINBOW.length
  const sway = sin(t * 0.7) * 0.08
  for (let i = 0; i < n; i++) {
    const a = a0 + sway + (i - (n - 1) / 2) * (spread / n)
    const h = spread / n / 2
    g.globalAlpha = alive * (0.26 + 0.08 * sin(t * 2 + i))
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + cos(a - h) * len, y + sin(a - h) * len)
    g.lineTo(x + cos(a + h) * len, y + sin(a + h) * len)
    g.closePath()
    fill(g, RAINBOW[i]!)
  }
  g.globalAlpha = 1
}

/* ------------------------------------------------------------ buildings */

/** Where a paint-pot house's brush tip and pot mouth are (for its bubbles). */
export const potMouth = (x: number, y: number, w: number): Pt => {
  const k = w / 200
  return [x - 30 * k, y - 216 * k]
}

/**
 * A round cottage whose roof is a PAINT POT, standing at (x, y), `w` wide:
 * the tin, its overflowing paint and the drips are the landmark (pot base,
 * shade and light), round a cream label with a heart.
 */
export const potHouse = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const k = w / 200
  const h = 124 * k
  // Walls: a squat drum.
  const walls = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, [10 * k, 10 * k, 14 * k, 14 * k])
  }
  walls()
  fill(g, RR.wall)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.24, y - h, w, h)
  fill(g, RR.wallShade)
  g.beginPath()
  for (let i = 0; i < 4; i++) g.roundRect(x - w / 2 + 12 * k + i * 44 * k, y - 22 * k - (i % 2) * 40 * k, 24 * k, 11 * k, 5 * k)
  fill(g, RR.wallShade)
  g.restore()
  walls()
  ink(g)
  // Round door, round window, a flower box.
  g.beginPath()
  g.roundRect(x - 24 * k, y - 82 * k, 48 * k, 82 * k, [24 * k, 24 * k, 2, 2])
  fill(g, C.door)
  ink(g, 4)
  disc(g, x + 12 * k, y - 40 * k, 3.5 * k, INK)
  for (const d of [-1, 1]) {
    const wx = x + d * 62 * k
    g.beginPath()
    g.arc(wx, y - 72 * k, 18 * k, 0, TAU)
    fill(g, C.window)
    ink(g, 4)
    g.beginPath()
    g.moveTo(wx - 18 * k, y - 72 * k)
    g.lineTo(wx + 18 * k, y - 72 * k)
    ink(g, 2.6)
  }
  g.beginPath()
  g.roundRect(x - 88 * k, y - 50 * k, 52 * k, 12 * k, 4)
  fill(g, C.trunk)
  ink(g, 3)
  for (let i = 0; i < 3; i++) flower(g, x - 80 * k + i * 18 * k, y - 54 * k, 8 * k, RAINBOW[i * 2]!, i)
  // The paint pot roof.
  const pb = y - h + 12 * k
  const pt = pb - 104 * k
  const bw = 96 * k
  const tw = 106 * k
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - bw, pb)
    g.lineTo(x - tw, pt)
    g.lineTo(x + tw, pt)
    g.lineTo(x + bw, pb)
    g.quadraticCurveTo(x, pb + 24 * k, x - bw, pb)
    g.closePath()
  }
  body()
  fill(g, pot.base)
  g.save()
  body()
  g.clip()
  // The cream label round its middle, with a heart.
  g.beginPath()
  g.moveTo(x - tw, pt + 40 * k)
  g.quadraticCurveTo(x, pt + 56 * k, x + tw, pt + 40 * k)
  g.lineTo(x + tw, pt + 76 * k)
  g.quadraticCurveTo(x, pt + 92 * k, x - tw, pt + 76 * k)
  g.closePath()
  fill(g, RR.wall)
  // Drips spilling over the rim.
  g.beginPath()
  for (const [dx, L] of [[-84, 50], [-50, 74], [-14, 40], [26, 64], [62, 46], [92, 30]] as const) {
    g.roundRect(x + dx * k - 8 * k, pt - 4, 16 * k, L * k, 8 * k)
    g.moveTo(x + dx * k + 10 * k, pt + L * k - 4 * k)
    g.arc(x + dx * k, pt + L * k - 4 * k, 10 * k, 0, TAU)
  }
  fill(g, pot.base)
  g.beginPath()
  g.rect(x + 36 * k, pt - 10, w, 140 * k)
  fill(g, pot.shade)
  g.globalAlpha = 0.14
  g.beginPath()
  g.rect(x + 36 * k, pt + 40 * k, w, 52 * k)
  fill(g, INK)
  g.globalAlpha = 1
  g.beginPath()
  g.ellipse(x - 70 * k, pt + 22 * k, 7 * k, 14 * k, 0.1, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  const hx = x - 44 * k
  const hy = pt + 62 * k
  g.moveTo(hx, hy + 11 * k)
  g.bezierCurveTo(hx - 17 * k, hy, hx - 7 * k, hy - 13 * k, hx, hy - 4 * k)
  g.bezierCurveTo(hx + 7 * k, hy - 13 * k, hx + 17 * k, hy, hx, hy + 11 * k)
  fill(g, pot.base)
  ink(g, 2.6)
  // The wire handle, arching over the mouth.
  g.beginPath()
  g.moveTo(x - tw + 4 * k, pt + 18 * k)
  g.bezierCurveTo(x - tw + 10 * k, pt - 96 * k, x + tw - 10 * k, pt - 96 * k, x + tw - 4 * k, pt + 18 * k)
  band(g, 4 * k + 1, '#c9c2ee', 3)
  for (const d of [-1, 1]) disc(g, x + d * (tw - 4 * k), pt + 18 * k, 7 * k, RR.tin, 3)
  // The rim and the paint's glossy surface.
  g.beginPath()
  g.ellipse(x, pt, tw + 8 * k, 20 * k, 0, 0, TAU)
  fill(g, pot.lite)
  ink(g)
  g.beginPath()
  g.ellipse(x, pt + 2 * k, tw - 4 * k, 13 * k, 0, 0, TAU)
  fill(g, pot.base)
  ink(g, 2.6)
  g.beginPath()
  g.ellipse(x - 34 * k, pt - 1 * k, 30 * k, 5 * k, 0, 0, TAU)
  fill(g, pot.lite)
  // A big brush standing in the paint — the house's chimney.
  g.beginPath()
  g.moveTo(x + 40 * k, pt)
  g.lineTo(x + 72 * k, pt - 116 * k)
  band(g, 13 * k, C.trunk, 4)
  g.beginPath()
  g.moveTo(x + 40 * k, pt - 2 * k)
  g.lineTo(x + 47 * k, pt - 28 * k)
  band(g, 17 * k, '#d8d4ec', 4)
  disc(g, x + 72 * k, pt - 118 * k, 8 * k, K.lemon, 3)
}

/** A paint bucket (a tap creature's hiding place) at (x, y), with its brush. */
export const paintBucket = (g: G2D, x: number, y: number, s: number, col: string, shade: string): void => {
  // The spilled puddle.
  g.beginPath()
  g.ellipse(x + 56 * s, y + 2, 46 * s, 10 * s, 0, 0, TAU)
  g.moveTo(x + 120 * s, y + 4)
  g.ellipse(x + 104 * s, y + 4, 16 * s, 6 * s, 0, 0, TAU)
  fill(g, col)
  ink(g, 3)
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 62 * s, y - 118 * s)
    g.lineTo(x + 62 * s, y - 118 * s)
    g.lineTo(x + 52 * s, y - 4)
    g.quadraticCurveTo(x, y + 8 * s, x - 52 * s, y - 4)
    g.closePath()
  }
  body()
  fill(g, RR.tin)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + 22 * s, y - 130 * s, 60 * s, 140 * s)
  fill(g, RR.tinShade)
  g.beginPath()
  g.rect(x - 70 * s, y - 80 * s, 140 * s, 30 * s)
  fill(g, col)
  g.beginPath()
  for (const [dx, L] of [[-40, 40], [-10, 64], [30, 30], [50, 52]] as const) {
    g.roundRect(x + dx * s - 7 * s, y - 122 * s, 14 * s, L * s, 7 * s)
    g.moveTo(x + dx * s + 9 * s, y - 122 * s + L * s)
    g.arc(x + dx * s, y - 122 * s + L * s, 9 * s, 0, TAU)
  }
  fill(g, col)
  g.beginPath()
  g.rect(x + 22 * s, y - 130 * s, 60 * s, 140 * s)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 118 * s, 66 * s, 15 * s, 0, 0, TAU)
  fill(g, RR.tin)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 117 * s, 56 * s, 10 * s, 0, 0, TAU)
  fill(g, col)
  g.beginPath()
  g.ellipse(x - 18 * s, y - 119 * s, 18 * s, 3 * s, 0, 0, TAU)
  fill(g, '#ffffff')
  // The brush leaning out of it.
  g.beginPath()
  g.moveTo(x + 10 * s, y - 116 * s)
  g.lineTo(x - 40 * s, y - 188 * s)
  band(g, 10 * s, C.trunk, 3.5)
  g.beginPath()
  g.moveTo(x + 6 * s, y - 118 * s)
  g.lineTo(x + 18 * s, y - 104 * s)
  band(g, 16 * s, shade, 3.5)
}

/** A painter's easel at (x, y) with a little rainbow on its canvas. */
export const easel = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.moveTo(x - 34 * s, y)
  g.lineTo(x - 4 * s, y - 160 * s)
  g.moveTo(x + 34 * s, y)
  g.lineTo(x + 4 * s, y - 160 * s)
  g.moveTo(x, y - 150 * s)
  g.lineTo(x + 12 * s, y + 2)
  band(g, 6 * s, C.trunk, 3)
  g.beginPath()
  g.roundRect(x - 46 * s, y - 64 * s, 92 * s, 10 * s, 4)
  fill(g, C.trunkShade)
  ink(g, 3)
  g.beginPath()
  g.roundRect(x - 52 * s, y - 150 * s, 104 * s, 86 * s, 6 * s)
  fill(g, '#fffaf2')
  ink(g, 4)
  g.save()
  g.beginPath()
  g.roundRect(x - 52 * s, y - 150 * s, 104 * s, 86 * s, 6 * s)
  g.clip()
  miniRainbow(g, x, y - 72 * s, 44 * s, 6 * s, PI, TAU, 6)
  disc(g, x + 30 * s, y - 130 * s, 9 * s, '#ffe36b')
  g.restore()
  // The palette hanging on the ledge.
  g.beginPath()
  g.ellipse(x + 36 * s, y - 50 * s, 26 * s, 17 * s, 0.3, 0, TAU)
  fill(g, '#f5c68f')
  ink(g, 3)
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = 0.3 + i * 1.2
    g.moveTo(x + 36 * s + cos(a) * 14 * s + 4 * s, y - 50 * s + sin(a) * 9 * s)
    g.arc(x + 36 * s + cos(a) * 14 * s, y - 50 * s + sin(a) * 9 * s, 4 * s, 0, TAU)
  }
  fill(g, RAINBOW[0]!)
}

/** A round hedge ball studded with flowers (a tap creature's hiding place). */
export const hedgeBall = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 54 * s, y - 42 * s, 42 * s], [x - 10 * s, y - 86 * s, 54 * s], [x + 46 * s, y - 50 * s, 46 * s], [x, y - 36 * s, 48 * s]]
  circles(g, lobes)
  inkFill(g, C.canopy)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 50 * s, y - 10 * s, 58 * s], [x - 40 * s, y + 4 * s, 40 * s]])
  fill(g, C.canopyShade)
  circles(g, [[x - 36 * s, y - 118 * s, 30 * s]])
  fill(g, C.canopyLite)
  g.restore()
  const pts = [[-50, -58], [-14, -104], [24, -72], [52, -44], [-20, -46], [10, -128]] as const
  for (let i = 0; i < pts.length; i++) flower(g, x + pts[i]![0] * s, y + pts[i]![1] * s, 11 * s, RAINBOW[i]!, i)
}

/** A picnic hamper with a checked cloth (a tap creature's hiding place). */
export const hamper = (g: G2D, x: number, y: number, s: number): void => {
  // The handle, behind.
  g.beginPath()
  g.moveTo(x - 50 * s, y - 88 * s)
  g.bezierCurveTo(x - 46 * s, y - 158 * s, x + 46 * s, y - 158 * s, x + 50 * s, y - 88 * s)
  band(g, 9 * s, RR.wicker, 3.5)
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 76 * s, y - 92 * s)
    g.lineTo(x + 76 * s, y - 92 * s)
    g.lineTo(x + 64 * s, y)
    g.lineTo(x - 64 * s, y)
    g.closePath()
  }
  body()
  fill(g, RR.wicker)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + 30 * s, y - 100 * s, 60 * s, 110 * s)
  fill(g, RR.wickerShade)
  g.beginPath()
  for (let i = 1; i < 4; i++) {
    g.moveTo(x - 80 * s, y - 92 * s + i * 23 * s)
    g.lineTo(x + 80 * s, y - 92 * s + i * 23 * s)
  }
  for (let i = -3; i <= 3; i++) {
    g.moveTo(x + i * 22 * s, y - 92 * s)
    g.lineTo(x + i * 19 * s, y)
  }
  g.lineWidth = 2.6
  g.strokeStyle = RR.wickerShade
  g.stroke()
  g.restore()
  body()
  ink(g)
  // The checked cloth draped over the lid.
  const cloth = (): void => {
    g.beginPath()
    g.moveTo(x - 84 * s, y - 94 * s)
    g.quadraticCurveTo(x, y - 116 * s, x + 84 * s, y - 94 * s)
    g.lineTo(x + 72 * s, y - 50 * s)
    g.quadraticCurveTo(x + 56 * s, y - 58 * s, x + 40 * s, y - 66 * s)
    g.quadraticCurveTo(x, y - 80 * s, x - 40 * s, y - 66 * s)
    g.quadraticCurveTo(x - 56 * s, y - 58 * s, x - 72 * s, y - 46 * s)
    g.closePath()
  }
  cloth()
  fill(g, '#ffffff')
  g.save()
  cloth()
  g.clip()
  g.beginPath()
  for (let i = -5; i <= 5; i += 2) g.rect(x + i * 14 * s, y - 120 * s, 14 * s, 80 * s)
  for (let j = 0; j < 4; j += 2) g.rect(x - 90 * s, y - 116 * s + j * 16 * s, 180 * s, 16 * s)
  g.globalAlpha = 0.6
  fill(g, RR.pink)
  g.globalAlpha = 1
  g.restore()
  cloth()
  ink(g, 4)
  // An apple on the lid.
  disc(g, x + 30 * s, y - 112 * s, 13 * s, '#ff6b7f', 3.5)
  g.beginPath()
  g.ellipse(x + 37 * s, y - 128 * s, 7 * s, 3.5 * s, -0.5, 0, TAU)
  fill(g, C.moss)
  ink(g, 2.4)
}

/**
 * The kite pavilion on Kite Cliffs, standing at (x, y), `w` wide: a railed
 * round platform under a two-tier scalloped canopy — the CANOPY is the
 * landmark. Returns the finial (the pennant pole's foot).
 */
export const kitePavilion = (g: G2D, x: number, y: number, w: number, pot: Pot): Pt => {
  const k = w / 220
  // The platform.
  g.beginPath()
  g.ellipse(x, y - 6 * k, w * 0.56, 20 * k, 0, 0, TAU)
  fill(g, C.trunkShade)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 14 * k, w * 0.56, 20 * k, 0, 0, TAU)
  fill(g, C.trunk)
  ink(g)
  const cb = y - 156 * k
  // Posts.
  g.beginPath()
  for (const u of [-0.44, -0.15, 0.15, 0.44]) g.roundRect(x + u * w - 7 * k, cb, 14 * k, y - 14 * k - cb, 5 * k)
  fill(g, RR.wall)
  ink(g, 4)
  // The railing.
  g.beginPath()
  g.moveTo(x - w * 0.46, y - 54 * k)
  g.quadraticCurveTo(x, y - 44 * k, x + w * 0.46, y - 54 * k)
  for (let i = 0; i <= 10; i++) {
    const u = i / 10 - 0.5
    g.moveTo(x + u * w * 0.9, y - 54 * k + (1 - 4 * u * u) * 6 * k)
    g.lineTo(x + u * w * 0.9, y - 22 * k + (1 - 4 * u * u) * 6 * k)
  }
  band(g, 4 * k, RR.wall, 3)
  // The lower canopy.
  const R = w * 0.68
  const lower = (): void => {
    g.beginPath()
    g.moveTo(x - R, cb + 8 * k)
    g.quadraticCurveTo(x - R * 0.6, cb - 60 * k, x, cb - 96 * k)
    g.quadraticCurveTo(x + R * 0.6, cb - 60 * k, x + R, cb + 8 * k)
    const n = 9
    for (let i = n - 1; i >= 0; i--) {
      const x0 = x - R + (i * 2 * R) / n
      g.quadraticCurveTo(x0 + R / n, cb + 30 * k, x0, cb + 8 * k)
    }
    g.closePath()
  }
  const stripes = (top: number, R2: number): void => {
    g.beginPath()
    for (let i = -4; i <= 4; i += 2) {
      g.moveTo(x, top)
      g.lineTo(x + ((i - 0.5) / 4.5) * R2 * 1.15, cb + 40 * k)
      g.lineTo(x + ((i + 0.5) / 4.5) * R2 * 1.15, cb + 40 * k)
      g.closePath()
    }
  }
  lower()
  fill(g, pot.base)
  g.save()
  lower()
  g.clip()
  stripes(cb - 100 * k, R)
  fill(g, pot.lite)
  g.beginPath()
  g.moveTo(x + 20 * k, cb - 110 * k)
  g.quadraticCurveTo(x + R * 0.3, cb - 40 * k, x + R * 0.34, cb + 40 * k)
  g.lineTo(x + R * 2, cb + 40 * k)
  g.lineTo(x + R * 2, cb - 110 * k)
  g.closePath()
  g.globalAlpha = 0.5
  fill(g, pot.shade)
  g.globalAlpha = 1
  g.restore()
  lower()
  ink(g)
  // Pom-poms under the scallops.
  g.beginPath()
  for (let i = 0; i <= 9; i++) {
    const px = x - R + (i * 2 * R) / 9
    g.moveTo(px + 6 * k, cb + 12 * k)
    g.arc(px, cb + 12 * k, 6 * k, 0, TAU)
  }
  fill(g, K.lemon)
  ink(g, 2.4)
  // The upper canopy.
  const ut = cb - 96 * k
  const R2 = w * 0.3
  const upper = (): void => {
    g.beginPath()
    g.moveTo(x - R2, ut + 18 * k)
    g.quadraticCurveTo(x - R2 * 0.5, ut - 40 * k, x, ut - 62 * k)
    g.quadraticCurveTo(x + R2 * 0.5, ut - 40 * k, x + R2, ut + 18 * k)
    const n = 5
    for (let i = n - 1; i >= 0; i--) {
      const x0 = x - R2 + (i * 2 * R2) / n
      g.quadraticCurveTo(x0 + R2 / n, ut + 36 * k, x0, ut + 18 * k)
    }
    g.closePath()
  }
  upper()
  fill(g, pot.shade)
  g.save()
  upper()
  g.clip()
  g.beginPath()
  g.ellipse(x - R2 * 0.36, ut - 16 * k, R2 * 0.14, 20 * k, 0.5, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  upper()
  ink(g)
  disc(g, x, ut - 66 * k, 10 * k, K.lemon, 3.5)
  return [x, ut - 74 * k]
}

/** The charm crystal's width — what the reference's facet lines are judged
 *  against. */
const CHARM_UNIT = 20

/**
 * The hanging crystal charm as a painted still.
 *
 * TINTED WHOLE, not in one region: a crystal is three tones of one hue, so a
 * painting in neutral greys keeps its own facets and light when the game
 * multiplies the chapter's colour through it. The string and the sway stay
 * drawn — the string reaches a point the sector picks.
 */
export const CHARM_ART: ItemSpec = {
  ...PROP_ART.charm, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / CHARM_UNIT, s / CHARM_UNIT)
    crystal(g, 0, 0, CHARM_UNIT, CHARM_UNIT * 2, 0, [accent.base, accent.shade, accent.lite], 3)
    g.restore()
  }
}

/** A crystal charm on a string from (x, y), `len` long, swaying `a` — a live prop. */
export const charm = (g: G2D, x: number, y: number, len: number, a: number, t: Tones): void => {
  const ex = x + sin(a) * len
  const ey = y + cos(a) * len
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(ex, ey)
  ink(g, 2.4)
  g.save()
  g.translate(ex, ey - 2)
  g.rotate(PI + a * 0.5)
  const painted = drawItem(g, CHARM_ART, CHARM_UNIT, 0, t[0])
  g.restore()
  if (!painted) crystal(g, ex, ey - 2, 20, 40, PI + a * 0.5, t, 3)
}

/** The windsock's four bands streaming from the origin at scale `s`, its
 *  trailing end pushed by `wv`. */
const windsockShape = (g: G2D, s: number, wv: number): void => {
  const cols = [RR.pink, '#ffffff', RR.pink, '#ffffff']
  for (let i = 0; i < 4; i++) {
    const a = i * 22 * s
    const b = (i + 1) * 22 * s
    const ha = 20 * s - i * 3.4 * s
    const hb = 20 * s - (i + 1) * 3.4 * s
    g.beginPath()
    g.moveTo(a, -ha + wv * (i / 4))
    g.lineTo(b, -hb + wv * ((i + 1) / 4))
    g.lineTo(b, hb + wv * ((i + 1) / 4))
    g.lineTo(a, ha + wv * (i / 4))
    g.closePath()
    fill(g, cols[i]!)
    ink(g, 3)
  }
}

/** The scale the cliffs fly the one windsock at, and the length it gives. */
const WINDSOCK_S = 0.9
const WINDSOCK_UNIT = 88 * WINDSOCK_S

/** The windsock as a painted still, hanging straight. Its lift into the wind
 *  is a rotation and stays drawn; its slow ripple does not survive one
 *  panel, and at a fifteenth of the scene's width nobody counts it. */
export const WINDSOCK_ART: ItemSpec = {
  ...PROP_ART.windsock, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / WINDSOCK_UNIT, s / WINDSOCK_UNIT)
    windsockShape(g, WINDSOCK_S, 0)
    g.restore()
  }
}

/** A crescent windsock on its pole top at (x, y), blowing toward `dir` — a live prop. */
export const windsock = (g: G2D, x: number, y: number, s: number, t: number, alive: number, dir = 1): void => {
  const lift = (1 - alive) * 1.15 + alive * (0.12 + sin(t * 2.3) * 0.08)
  const wv = sin(t * 6) * 5 * alive
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  g.rotate(lift)
  if (!drawItem(g, WINDSOCK_ART, 88 * s)) windsockShape(g, s, wv)
  g.restore()
}

/**
 * The Prism Bridge: a crystal arch of faceted gem blocks (the LANDMARK, in
 * the pot's three tones) under a rainbow deck, on the circle (cx, cy, R)
 * between angles a0 and a1. `T` is the gem band's depth; the deck sits on top.
 */
export const prismBridge = (
  g: G2D, cx: number, cy: number, R: number, a0: number, a1: number, T: number, deck: number, pot: Pot
): void => {
  const Ri = R - T
  const Ro = R + deck
  g.save()
  // The deck's outline and the gem band's, as one plum underlay.
  g.lineCap = 'butt'
  g.beginPath()
  g.arc(cx, cy, (Ri + Ro) / 2, a0, a1)
  g.lineWidth = Ro - Ri + LW * 2
  g.strokeStyle = INK
  g.stroke()
  // The rainbow deck.
  const bw = deck / RAINBOW.length
  for (let i = 0; i < RAINBOW.length; i++) {
    g.beginPath()
    g.arc(cx, cy, Ro - bw * (i + 0.5), a0, a1)
    g.lineWidth = bw + 0.8
    g.strokeStyle = RAINBOW[i]!
    g.stroke()
  }
  g.beginPath()
  g.arc(cx, cy, Ro - bw * 0.4, a0 + 0.01, a1 - 0.01)
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.stroke()
  g.restore()
  // The gem band: rounded blocks, lit along the top, shaded underneath.
  g.save()
  g.lineCap = 'butt'
  for (const [r, w, col] of [[R - T / 2, T, pot.base], [R - T * 0.2, T * 0.24, pot.lite], [Ri + T * 0.15, T * 0.3, pot.shade]] as const) {
    g.beginPath()
    g.arc(cx, cy, r, a0, a1)
    g.lineWidth = w
    g.strokeStyle = col
    g.stroke()
  }
  g.restore()
  const n = 13
  g.beginPath()
  for (let i = 1; i < n; i++) {
    const b = a0 + ((a1 - a0) * i) / n
    g.moveTo(cx + cos(b) * Ri, cy + sin(b) * Ri)
    g.lineTo(cx + cos(b) * R, cy + sin(b) * R)
  }
  ink(g, 3.5)
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const b = a0 + ((a1 - a0) * (i + 0.3)) / n
    const gx = cx + cos(b) * (R - T * 0.34)
    const gy = cy + sin(b) * (R - T * 0.34)
    g.moveTo(gx + T * 0.1, gy)
    g.ellipse(gx, gy, T * 0.1, T * 0.06, b + PI / 2, 0, TAU)
  }
  fill(g, '#ffffff')
  const P = (a: number, r: number): Pt => [cx + cos(a) * r, cy + sin(a) * r]
  // The keystone: a big gem at the crown.
  const am = (a0 + a1) / 2
  const [kx, ky] = P(am, R - T * 0.5)
  const K1 = T * 1.15
  const gem = (): void => {
    g.beginPath()
    g.moveTo(kx, ky - K1 * 0.95)
    g.lineTo(kx + K1 * 0.62, ky - K1 * 0.1)
    g.lineTo(kx, ky + K1 * 0.8)
    g.lineTo(kx - K1 * 0.62, ky - K1 * 0.1)
    g.closePath()
  }
  gem()
  fill(g, pot.lite)
  g.beginPath()
  g.moveTo(kx, ky - K1 * 0.95)
  g.lineTo(kx + K1 * 0.62, ky - K1 * 0.1)
  g.lineTo(kx, ky + K1 * 0.8)
  g.closePath()
  fill(g, pot.base)
  g.beginPath()
  g.moveTo(kx, ky + K1 * 0.8)
  g.lineTo(kx + K1 * 0.62, ky - K1 * 0.1)
  g.lineTo(kx - K1 * 0.62, ky - K1 * 0.1)
  g.closePath()
  g.globalAlpha = 0.5
  fill(g, pot.shade)
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(kx - K1 * 0.62, ky - K1 * 0.1)
  g.lineTo(kx + K1 * 0.62, ky - K1 * 0.1)
  g.moveTo(kx, ky - K1 * 0.95)
  g.lineTo(kx, ky + K1 * 0.8)
  ink(g, 2.6)
  gem()
  ink(g)
  g.beginPath()
  g.ellipse(kx - K1 * 0.22, ky - K1 * 0.4, K1 * 0.08, K1 * 0.16, 0.6, 0, TAU)
  fill(g, '#ffffff')
  // The arch's inner and outer edges, one plum line each.
  g.beginPath()
  g.arc(cx, cy, Ri, a0, a1)
  ink(g)
}

/** A cream bridge-end tower with a cone roof, standing at (x, y). Returns its
 *  finial (a pennant's foot). */
export const ridgeTower = (g: G2D, x: number, y: number, w: number, h: number, roof: Tones): Pt => {
  const body = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, [6, 6, 2, 2])
  }
  body()
  fill(g, RR.wall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.18, y - h, w, h)
  fill(g, RR.wallShade)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.roundRect(x - w * 0.16, y - h * 0.72, w * 0.32, w * 0.46, [w * 0.16, w * 0.16, 3, 3])
  fill(g, C.window)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - w / 2 - 6, y - h - 4, w + 12, 16, 8)
  fill(g, K.lemon)
  ink(g, 3.5)
  const rw = w / 2 + 16
  const ch = w * 1.25
  const by = y - h + 2
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - rw, by)
    g.quadraticCurveTo(x - rw * 0.28, by - ch * 0.32, x, by - ch)
    g.quadraticCurveTo(x + rw * 0.28, by - ch * 0.32, x + rw, by)
    g.quadraticCurveTo(x, by + rw * 0.24, x - rw, by)
    g.closePath()
  }
  path()
  fill(g, roof[0])
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(x + 2, by - ch - 4)
  g.quadraticCurveTo(x + rw * 0.2, by - ch * 0.3, x + rw * 0.3, by + rw)
  g.lineTo(x + rw * 2, by + rw)
  g.lineTo(x + rw * 2, by - ch - 4)
  g.closePath()
  fill(g, roof[1])
  g.beginPath()
  g.ellipse(x - rw * 0.36, by - ch * 0.22, rw * 0.08, ch * 0.16, 0.42, 0, TAU)
  fill(g, roof[2])
  g.restore()
  path()
  ink(g)
  disc(g, x, by - ch - 5, 7, K.lemon, 3)
  return towerFinial(x, y, w, h)
}

/** The finial of a `ridgeTower(x, y, w, h)` — a pennant pole's foot. */
export const towerFinial = (x: number, y: number, w: number, h: number): Pt => [x, y - h + 2 - w * 1.25 - 11]

/** A colour washed halfway to white — for far, unoutlined layers. */
export const mixPale = (c: string, k = 0.5): string => mix(c, '#ffffff', k)

/* ------------------------------------------------ the rainbow-maned foal */

/** A foal's hoof lift for a trot (diagonal pairs), from its step phase. */
const lift = (step: number, ph: number, trot: number): number => Math.max(0, sin(step + ph)) * 10 * trot

/**
 * The chapter's tap creature: a chibi unicorn foal with a rainbow mane and
 * tail, feet at (x, y), scale `s`, facing `dir`. `step` is its trot phase,
 * `trot` 0 (standing) … 1 (trotting).
 */
export const rainbowFoal = (g: G2D, x: number, y: number, s: number, dir: number, step: number, trot: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const painted = drawItem(g, RAINBOW_FOAL_ART, FOAL_UNIT * s, clamp(trot, 0, 1) * (1 + (sin(step) + 1) / 2))
  g.restore()
  if (painted) return
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  rainbowFoalShape(g, s, step, trot)
  g.restore()
}

/** Horn tip (-110) to the hooves (0) at scale 1 — the foal's own height in SU. */
const FOAL_UNIT = 112

/**
 * The rainbow foal's gait (`CREATURE_ART.rainbowFoal`): standing, then the two
 * halves of a trot. `trot` walks it off the standing panel and `sin(step)`
 * swings it between the other two, which `drawItem` cross-fades — the same
 * trick the prop family's birds use for a wing-beat. Its mane is the whole
 * rainbow, so nothing here is tinted, and the rainbow streak it leaves on the
 * grass stays drawn.
 */
export const RAINBOW_FOAL_ART: ItemSpec = {
  ...CREATURE_ART.rainbowFoal, frames: 3,
  draw: (g, sz, f) => {
    const k = sz / FOAL_UNIT
    g.save()
    g.scale(k, k)
    rainbowFoalShape(g, 1, f < 1 ? 0 : (f - 1) * PI - PI / 2, f < 1 ? 0 : 1)
    g.restore()
  }
}

/** The foal itself, hooves at the origin, facing +x, in its own units. */
const rainbowFoalShape = (g: G2D, s: number, step: number, trot: number): void => {
  const w = LW / s
  const bob = -Math.abs(sin(step)) * 3 * trot
  // The tail: three rainbow locks.
  const tail: readonly (readonly [number, number, number, string])[] = [
    [-34, -54 + bob, 12, RAINBOW[0]!], [-44, -42 + bob, 11, RAINBOW[2]!], [-42, -28 + bob, 9, RAINBOW[4]!]
  ]
  for (const [tx, ty, r, c] of tail) {
    g.beginPath()
    g.arc(tx + sin(step * 0.5) * 2 * trot, ty, r, 0, TAU)
    inkFill(g, c, w * 0.8)
  }
  // Far legs.
  g.beginPath()
  for (const [lx, ph] of [[-14, 0], [22, PI]] as const) {
    const up = lift(step, ph, trot)
    g.roundRect(lx - 6, -36 + bob, 12, 36 - up - bob, 6)
  }
  inkFill(g, RR.coatShade, w * 0.8)
  // Barrel.
  g.beginPath()
  g.ellipse(0, -40 + bob, 31, 21, 0, 0, TAU)
  // Near legs, in the same fill.
  for (const [lx, ph] of [[-24, PI], [12, 0]] as const) {
    const up = lift(step, ph, trot)
    g.roundRect(lx - 6.5, -36 + bob, 13, 36 - up - bob, 6.5)
  }
  inkFill(g, RR.coat, w * 0.8)
  g.beginPath()
  for (const [lx, ph] of [[-24, PI], [12, 0]] as const) {
    const up = lift(step, ph, trot)
    g.roundRect(lx - 6.5, -7 - up, 13, 7, [0, 0, 6.5, 6.5])
  }
  fill(g, RR.hoof)
  g.save()
  g.beginPath()
  g.ellipse(0, -40 + bob, 31, 21, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(6, -22 + bob, 34, 9, 0, 0, TAU)
  fill(g, RR.coatShade)
  g.restore()
  // The mane down the back of the neck (behind the head).
  const mane: readonly (readonly [number, number, number, string])[] = [
    [4, -52, 9, RAINBOW[4]!], [6, -65, 10, RAINBOW[3]!], [10, -78, 11, RAINBOW[2]!], [16, -90, 11, RAINBOW[1]!]
  ]
  for (const [mx, my, r, c] of mane) {
    g.beginPath()
    g.arc(mx - 2, my + bob, r, 0, TAU)
    inkFill(g, c, w * 0.8)
  }
  // Neck and head as one outlined shape.
  g.save()
  g.translate(0, bob)
  g.beginPath()
  g.ellipse(18, -60, 13, 18, -0.45, 0, TAU)
  g.moveTo(53, -76)
  g.arc(30, -76, 23, 0, TAU)
  g.moveTo(62, -64)
  g.ellipse(47, -64, 15, 12, 0.15, 0, TAU)
  inkFill(g, RR.coat, w)
  // The ear.
  g.beginPath()
  g.moveTo(14, -90)
  g.quadraticCurveTo(12, -110, 20, -114)
  g.quadraticCurveTo(28, -104, 26, -94)
  g.closePath()
  fill(g, RR.coat)
  ink(g, w * 0.8)
  g.beginPath()
  g.moveTo(17, -94)
  g.quadraticCurveTo(17, -106, 20, -108)
  g.quadraticCurveTo(24, -102, 23, -96)
  g.closePath()
  fill(g, '#ffb3d2')
  // The horn.
  g.beginPath()
  g.moveTo(28, -96)
  g.quadraticCurveTo(36, -112, 44, -128)
  g.quadraticCurveTo(45, -110, 41, -95)
  g.closePath()
  fill(g, RR.horn)
  ink(g, w * 0.75)
  g.beginPath()
  g.moveTo(31, -104)
  g.quadraticCurveTo(37, -101, 42, -106)
  g.moveTo(35, -114)
  g.quadraticCurveTo(40, -112, 43, -116)
  g.lineWidth = 2.4 / s
  g.strokeStyle = RR.hornBand
  g.stroke()
  // The forelock over the horn's root.
  for (const [mx, my, r, c] of [[26, -96, 9, RAINBOW[0]!], [36, -97, 7, RAINBOW[5]!]] as const) {
    g.beginPath()
    g.arc(mx, my, r, 0, TAU)
    inkFill(g, c, w * 0.7)
  }
  // The face: a big glossy eye, blush, nostril, a smile.
  g.beginPath()
  g.ellipse(37, -76, 7, 9, 0, 0, TAU)
  fill(g, RR.iris)
  ink(g, w * 0.5)
  g.beginPath()
  g.ellipse(38, -75, 4.2, 5.6, 0, 0, TAU)
  fill(g, INK)
  disc(g, 35, -80, 2.6, '#ffffff')
  disc(g, 40, -71, 1.3, '#ffffff')
  g.beginPath()
  g.moveTo(42, -84)
  g.lineTo(47, -88)
  g.moveTo(39, -85)
  g.lineTo(41, -90)
  ink(g, w * 0.45)
  g.globalAlpha = 0.6
  g.beginPath()
  g.ellipse(40, -62, 7, 4.5, 0, 0, TAU)
  fill(g, RR.blush)
  g.globalAlpha = 1
  disc(g, 57, -67, 2, INK)
  g.beginPath()
  g.arc(51, -60, 5, PI * 0.2, PI * 0.8)
  ink(g, w * 0.45)
  g.restore()
}

const TRAIL = [RAINBOW[0]!, RAINBOW[2]!, RAINBOW[3]!, RAINBOW[4]!]

/** Where and how a foal peeks: hidden behind its prop at (x, y) (feet on the
 *  ground there), it trots `out` SU toward `dir`, at scale `s`. */
export interface FoalSpot { x: number; y: number; dir: number; s: number; out: number }

/**
 * The tap creature's draw (§8.8 beat 2): the foal trots out from behind its
 * prop, whose FRONT `cover` redraws on top (so k = 0 is the prop alone),
 * leaving a rainbow streak and a few twinkles on the grass behind it.
 */
export const foalTap = (p: FoalSpot, cover: (g: G2D) => void, r = 72): TapCreature => ({
  x: p.x + p.dir * p.out * 0.45,
  y: p.y - 56 * p.s,
  r,
  draw: (g, k, t) => {
    const e = clamp(k, 0, 1)
    if (e > 0.001) {
      const fx = p.x + p.dir * p.out * e
      const x0 = p.x
      const x1 = fx - p.dir * 34 * p.s
      if ((x1 - x0) * p.dir > 4) {
        g.globalAlpha = Math.min(1, e * 1.5)
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(x0, p.y + 2)
        g.lineTo(x1, p.y + 2)
        g.lineWidth = TRAIL.length * 4 + 5
        g.strokeStyle = INK
        g.stroke()
        for (let i = 0; i < TRAIL.length; i++) {
          g.beginPath()
          g.moveTo(x0, p.y - 4 + i * 4)
          g.lineTo(x1, p.y - 4 + i * 4)
          g.lineWidth = 4.6
          g.strokeStyle = TRAIL[i]!
          g.stroke()
        }
        g.beginPath()
        let lit = false
        for (let i = 0; i < 3; i++) {
          const u = (i + 0.5) / 3
          const rr = 9 * Math.max(0, sin(t * 7 + i * 2.1)) * e
          if (rr > 1) lit = twinkleAt(g, lerp(x0, x1, u), p.y - 16 - (i % 2) * 12, rr, '#fffbe0')
        }
        if (!lit) fill(g, '#fffbe0')
        g.globalAlpha = 1
      }
      rainbowFoal(g, fx, p.y, p.s, p.dir, t * 15, Math.min(1, e * 1.2))
    }
    tapCover(g, cover)
  }
})

/* --------------------------------------------------- the Prism Petal */

const PETAL_BANDS = ['#ffb3d9', '#ffd1a8', '#fff0a0', '#b8f5d8', '#b8e2ff', '#dccbff'] as const
const SLEEP = '#d9d2ea'
const SLEEP_SHADE = '#bfb5da'

/** A moss cushion the Petal rests on, at (x, y). */
export const petalCushion = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 44 * s, y - 10 * s, 22 * s], [x - 14 * s, y - 18 * s, 26 * s], [x + 18 * s, y - 17 * s, 25 * s], [x + 46 * s, y - 9 * s, 20 * s]]
  const shape = (): void => {
    circles(g, lobes)
    g.moveTo(x + 66 * s, y - 2 * s)
    g.ellipse(x, y - 2 * s, 66 * s, 12 * s, 0, 0, TAU)
  }
  shape()
  inkFill(g, C.moss, 4)
  g.save()
  shape()
  g.clip()
  g.beginPath()
  g.ellipse(x + 30 * s, y + 6 * s, 60 * s, 16 * s, 0, 0, TAU)
  fill(g, C.mossShade)
  g.restore()
  for (let i = 0; i < 5; i++) flower(g, x - 48 * s + i * 24 * s, y - 16 * s - (i % 2) * 12 * s, 7 * s, RAINBOW[(i * 2 + 1) % 6]!, i)
}

/** Tip (-62) to stem (48) at scale 1 — the petal's own height in SU. */
const PRISM_PETAL_UNIT = 110

/**
 * The Prism Petal, folded and open (`CREATURE_ART.prismPetal`).
 */
export const PRISM_PETAL_ART: ItemSpec = {
  ...CREATURE_ART.prismPetal, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / PRISM_PETAL_UNIT
    g.save()
    g.scale(k, k)
    prismPetalShape(g, 1, f, f, 0)
    g.restore()
  }
}

/** The petal itself, centred on the origin, in its own units. */
const prismPetalShape = (g: G2D, s: number, o: number, e: number, t: number): void => {
  const S = (v: number): number => v * s
  // The petal: a broad rounded petal with a notch at its tip; folded, it is
  // half as wide and creased down the middle.
  const wf = lerp(0.5, 1, o)
  const petal = (): void => {
    g.beginPath()
    g.moveTo(0, S(48))
    g.bezierCurveTo(-S(50) * wf, S(34), -S(54) * wf, -S(40), -S(20) * wf, -S(58))
    g.quadraticCurveTo(-S(7) * wf, -S(62), 0, -S(52))
    g.quadraticCurveTo(S(7) * wf, -S(62), S(20) * wf, -S(58))
    g.bezierCurveTo(S(54) * wf, -S(40), S(50) * wf, S(34), 0, S(48))
    g.closePath()
  }
  petal()
  fill(g, mix(SLEEP, '#fff4fb', o))
  g.save()
  petal()
  g.clip()
  if (o > 0) {
    // The shimmer: pastel rainbow bands sliding diagonally.
    g.globalAlpha = o
    const sh = (t * 18) % 24
    for (let i = -1; i < PETAL_BANDS.length + 1; i++) {
      g.beginPath()
      const yy = -S(60) + i * S(20) + sh * s * 0.3
      g.moveTo(-S(70), yy + S(20))
      g.lineTo(S(70), yy - S(10))
      g.lineTo(S(70), yy + S(10))
      g.lineTo(-S(70), yy + S(40))
      g.closePath()
      fill(g, PETAL_BANDS[(i + PETAL_BANDS.length) % PETAL_BANDS.length]!)
    }
    g.globalAlpha = 1
  }
  // The fold: the far half in shade while folded.
  if (o < 1) {
    g.globalAlpha = 1 - o
    g.beginPath()
    g.rect(0, -S(60), S(70), S(120))
    fill(g, SLEEP_SHADE)
    g.globalAlpha = 1
  }
  // Crystal facets: two lit planes from the stem to the lobes.
  g.beginPath()
  g.moveTo(0, S(44))
  g.lineTo(-S(30) * wf, -S(44))
  g.moveTo(0, S(44))
  g.lineTo(S(30) * wf, -S(44))
  g.lineWidth = S(3)
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.stroke()
  g.beginPath()
  g.ellipse(-S(26) * wf, -S(26), S(6), S(13), 0.3, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  petal()
  ink(g, 4)
  // The crease / the midrib.
  g.beginPath()
  g.moveTo(0, S(42))
  g.quadraticCurveTo(S(2), 0, 0, -S(48))
  ink(g, lerp(3, 1.8, o))
  // The face.
  const ey = S(6)
  g.beginPath()
  if (o < 0.5) {
    g.moveTo(-S(15), ey)
    g.quadraticCurveTo(-S(10), ey + S(4), -S(5), ey)
    g.moveTo(S(5), ey)
    g.quadraticCurveTo(S(10), ey + S(4), S(15), ey)
    ink(g, 2.4)
  } else {
    g.ellipse(-S(10), ey, S(3.4), S(4.6), 0, 0, TAU)
    g.moveTo(S(13.4), ey)
    g.ellipse(S(10), ey, S(3.4), S(4.6), 0, 0, TAU)
    fill(g, INK)
    disc(g, -S(11), ey - S(2), S(1.4), '#ffffff')
    disc(g, S(9), ey - S(2), S(1.4), '#ffffff')
  }
  g.beginPath()
  g.arc(0, ey + S(8), S(o < 0.5 ? 3 : 5), 0.2, PI - 0.2)
  ink(g, 2.2)
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(-S(18), ey + S(8), S(5), S(3), 0, 0, TAU)
  g.moveTo(S(23), ey + S(8))
  g.ellipse(S(18), ey + S(8), S(5), S(3), 0, 0, TAU)
  fill(g, RR.blush)
  g.globalAlpha = 1
  // Asleep: dimmed under a plum veil.
  if (e < 1) {
    g.globalAlpha = 0.3 * (1 - clamp(e * 1.5, 0, 1))
    petal()
    fill(g, INK)
    g.globalAlpha = 1
  }
}

/**
 * The Prism Petal, the chapter's rescue (§8.8 beat 3), resting on (x, y):
 * k = 0 folded shut, pale and asleep; k = 1 open, shimmering in pastel
 * rainbow bands, awake and smiling, throwing tiny rainbows round itself.
 */
export const prismPetal = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const e = clamp(k, 0, 1)
  const o = e * e * (3 - 2 * e)
  const S = (v: number): number => v * s
  const float = o * (6 + sin(t * 2.4) * 4)
  const cy = y - S(56) - float
  if (e > 0) {
    g.globalAlpha = 0.3 * e
    disc(g, x, cy, S(78), '#fff6fd')
    g.globalAlpha = 0.4 * e
    disc(g, x, cy, S(56), '#ffeefa')
    g.globalAlpha = 1
  }
  // A soft contact shadow.
  g.globalAlpha = 0.22
  g.beginPath()
  g.ellipse(x, y - S(4), S(34), S(7), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  // The petal FOLDS shut asleep and opens awake, which is a change of shape,
  // so it is two panels. Its halo, its shadow on the cushion, the shimmer
  // sliding across it and the little rainbows it throws stay drawn.
  g.save()
  g.translate(x, cy)
  if (!drawItem(g, PRISM_PETAL_ART, PRISM_PETAL_UNIT * s, o < 0.5 ? 0 : 1)) prismPetalShape(g, s, o, e, t)
  g.restore()
  if (e <= 0.3) return
  // Tiny rainbows thrown round it, and twinkles.
  const a = clamp((e - 0.3) / 0.7, 0, 1)
  g.globalAlpha = a
  for (let i = 0; i < 3; i++) {
    const ang = -PI / 2 + (i - 1) * 1.1 + sin(t * 1.2 + i) * 0.12
    const d = S(74 + sin(t * 2 + i * 2) * 5)
    const rx = x + cos(ang) * d
    const ry = cy + sin(ang) * d * 0.9 + S(14)
    miniRainbow(g, rx, ry, S(17), S(3.4), PI + ang + PI / 2 - 1.2, PI + ang + PI / 2 + 1.2)
  }
  g.beginPath()
  let lit = false
  for (let i = 0; i < 4; i++) {
    const r = S(9) * Math.max(0, sin(t * 3 + i * 1.6))
    if (r > 0.5) lit = twinkleAt(g, x + cos(i * 1.7 + 0.4) * S(62), cy + sin(i * 2.3) * S(40), r, '#fff6b0')
  }
  if (!lit) fill(g, '#fff6b0')
  g.globalAlpha = 1
}

/** A rescue collectible for the Prism Petal on its cushion at (x, y). */
export const petalRescue = (x: number, y: number, s: number): RescueCollectible => ({
  x,
  y: y - 56 * s,
  r: 64,
  draw: (g, k, t) => prismPetal(g, x, y, s, k, t)
})

/* ------------------------------------------------------- small props */

/** A butterfly on a lazy loop about (cx, cy) — a live prop, folded at rest.
 *  The same creature the woods' `butterfly` is, so it wears the same painting. */
export const flutter = (g: G2D, cx: number, cy: number, t: number, i: number, col: string, alive: number): void => {
  const sp = t * (0.45 + i * 0.12) + i * 2.1
  const flap = alive > 0 ? 0.25 + Math.abs(sin(t * 11 + i)) * 0.75 : 0.2
  butterflyAt(g, cx + sin(sp) * 80 * alive, cy + sin(sp * 2) * 30 * alive, flap, col)
}

/** Colour bubbles rising from (x, y) — a live prop (none at rest). */
export const colourBubbles = (g: G2D, x: number, y: number, h: number, t: number, alive: number): void => {
  if (alive <= 0) return
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.3 + i / 4) % 1
    const bx = x + sin(k * 6 + i * 2) * 14 + k * 20
    const by = y - k * h
    const r = (6 + (i % 3) * 2.5) * (0.6 + k * 0.6)
    g.globalAlpha = alive * (k < 0.8 ? 1 : (1 - k) * 5)
    if (bubbleAt(g, bx, by, r, RAINBOW[(i * 2) % RAINBOW.length]!)) continue
    disc(g, bx, by, r, RAINBOW[(i * 2) % RAINBOW.length]!, 2.4)
    disc(g, bx - r * 0.35, by - r * 0.35, r * 0.25, '#ffffff')
  }
  g.globalAlpha = 1
}

/** A swallow about the origin, facing right, wings at `flap` (−1 down … 1 up). */
export const swallowShape = (g: G2D, flap: number, col: string): void => {
  const wy = -14 * flap
  g.beginPath()
  g.moveTo(-26, wy)
  g.quadraticCurveTo(-12, -12 + wy * 0.3, 0, 0)
  g.quadraticCurveTo(12, -12 + wy * 0.3, 26, wy)
  g.quadraticCurveTo(12, -4 + wy * 0.2, 0, 6)
  g.quadraticCurveTo(-12, -4 + wy * 0.2, -26, wy)
  fill(g, col)
  ink(g, 2.4)
}

/** The swallow's wingspan in SU at `s` = 1. */
export const SWALLOW_UNIT = 52

/** The swallow as a painted strip: wings down, level, up. It is a different
 *  candy colour on every ridge, so its whole body is the colour-me region. */
export const SWALLOW_ART: ItemSpec = {
  ...PROP_ART.swallow, frames: 3, tinted: true,
  draw: (g, s, f, accent) => {
    g.save()
    g.scale(s / SWALLOW_UNIT, s / SWALLOW_UNIT)
    swallowShape(g, f - 1, accent.base)
    g.restore()
  }
}

/** A little bird of paradise — a candy-coloured swallow gliding. */
export const swallow = (g: G2D, x: number, y: number, s: number, flap: number, dir: number, col: string): void => {
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  if (!drawItem(g, SWALLOW_ART, SWALLOW_UNIT, flap + 1, col)) swallowShape(g, flap, col)
  g.restore()
}

/** Five-point stars along a path through `pts` (a garden's star path). */
export const starPath = (g: G2D, pts: readonly Lobe[]): void => {
  for (const [x, y, r] of pts) {
    star5(g, x, y, r, 0.55)
    fill(g, K.lemon)
    ink(g, 3)
  }
}

/** Soft foam at a fall's foot, re-exported for the sector files. */
export { foam }
