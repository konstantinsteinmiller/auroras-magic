/**
 * kitSummit.ts — Starlight Summit's painters (chapter 9, story-spec §10.2:
 * "The night sky has gone dark; the stars need reigniting"). A mountain top
 * under a cozy periwinkle night: far snowy peaks, lilac rock, a mint moon-
 * meadow of glowing star-flowers, lantern paths, the observatory, the moon
 * bridge, Nova's Starlight Throne, the chapter's star-calf (the tap creature
 * on every sector) and the Fallen Star (the rescue on 9-3).
 *
 * Same rules as `kit.ts` (art-style §2–§5). Night is painted through HUE,
 * never through darkness (§2.3): the sky's top is a bright periwinkle, the
 * horizon glows rose, the meadow is candy mint, and there are lights
 * everywhere — stars, lanterns, glowing flowers, a big friendly moon.
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp, ease } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { inkFill, mix } from '@/game/map/kitSky'
import { type Pt, type Glow, disc, twinkle, smooth, paperLantern } from '@/game/map/kitTundra'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART } from '@/game/artIds'

type Lobe = readonly [number, number, number]
const LW = 5

export const N = {
  skyTop: '#6b6ef2',
  skyMid: '#8f7cf6',
  skyLow: '#f07fd8',
  horizon: '#ffa3d2',
  far: '#c9bffb',
  farTop: '#ddd5ff',
  far2: '#b6a9f6',
  far2Top: '#cabffa',
  farSnow: '#f4f0ff',
  rock: '#9c8af2',
  rockShade: '#7a66d6',
  rockLite: '#cdc2ff',
  meadow: '#44e2b8',
  meadowShade: '#22b58c',
  meadowLip: '#b5f7e2',
  pond: '#4cc6f2',
  pondShade: '#2f9fe0',
  pondLite: '#bdeeff',
  gold: '#ffd84d',
  goldShade: '#e8b030',
  goldLite: '#fff0a8',
  glow: '#ffe98a',
  glowLite: '#fff8d0',
  wall: '#fff3ea',
  wallShade: '#f0d2e6',
  deep: '#5048b0',
  pink: '#ff7fd0',
  pinkShade: '#e04aab',
  pinkLite: '#ffc4ec',
  blue: '#56b6ff',
  lilac: '#a77cff',
  lilacShade: '#8458e6',
  mint: '#3fe0ae',
  coral: '#ff7a8a',
  wood: '#e8a06c',
  woodShade: '#c07850',
  star: '#fff6c2'
}

/** Chapter 9's base tones, for the candy-floor check (§9.6.1). */
export const SUMMIT_TONES: readonly string[] = [N.skyTop, N.skyMid, N.skyLow, N.rock, N.meadow, N.pond, N.gold, N.pink, N.blue, N.lilac]

export type Tones = readonly [string, string, string]
export const GOLD_T: Tones = [N.gold, N.goldShade, N.goldLite]
export const PINK_N: Tones = [N.pink, N.pinkShade, N.pinkLite]
export const BLUE_N: Tones = ['#7a8cff', '#5a66e0', '#c8d0ff']

/* ---------------------------------------------------------------- helpers */

const circles = (g: G2D, lobes: readonly Lobe[], dx = 0, dy = 0, k = 1): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + dx * r + r * k, y + dy * r)
    g.arc(x + dx * r, y + dy * r, r * k, 0, TAU)
  }
}

/** A soft rounded five-point star path (tips rounded off), centre (x, y). */
export const roundStar = (g: G2D, x: number, y: number, r: number, rot = 0, inner = 0.52): void => {
  g.beginPath()
  const pts: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const a = rot - PI / 2 + (i * PI) / 5
    const rr = i & 1 ? r * inner : r
    pts.push([x + cos(a) * rr, y + sin(a) * rr])
  }
  // Start mid-edge, round every corner with a quadratic.
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const p0 = mid(pts[9]!, pts[0]!)
  g.moveTo(p0[0], p0[1])
  for (let i = 0; i < 10; i++) {
    const c = pts[i]!
    const n = mid(c, pts[(i + 1) % 10]!)
    g.quadraticCurveTo(c[0], c[1], n[0], n[1])
  }
  g.closePath()
}

/* ------------------------------------------------------------------- sky */

export interface SkyNOpts {
  /** The moon: centre x, y, radius, and `full` (else a crescent). */
  moon?: readonly [number, number, number, boolean?]
  stars: number
  /** A soft milky-way band from (x0, y0) to (x1, y1). */
  milky?: readonly [number, number, number, number]
}

/** A crescent path (outer circle minus an offset circle). */
const crescent = (g: G2D, x: number, y: number, r: number, d: number): void => {
  const a = Math.acos(d / (2 * r))
  g.beginPath()
  g.arc(x, y, r, a, TAU - a, false)
  g.arc(x + d, y, r, PI + a, PI - a, true)
  g.closePath()
}

/** The summit's cozy night sky: bright periwinkle down to a rose horizon,
 *  a milky way, lots of stars and a big friendly moon. */
export const skyN = (g: G2D, o: SkyNOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 470)
  gr.addColorStop(0, N.skyTop)
  gr.addColorStop(0.5, N.skyMid)
  gr.addColorStop(0.84, N.skyLow)
  gr.addColorStop(1, N.horizon)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  const r = seeded(o.stars)
  if (o.milky) {
    const [x0, y0, x1, y1] = o.milky
    g.save()
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x0, y0)
    g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 60, x1, y1)
    g.globalAlpha = 0.16
    g.lineWidth = 150
    g.strokeStyle = '#e8dcff'
    g.stroke()
    g.globalAlpha = 0.2
    g.lineWidth = 70
    g.stroke()
    g.restore()
    g.beginPath()
    for (let i = 0; i < 70; i++) {
      const u = r()
      const x = lerp(x0, x1, u)
      const y = lerp(y0, y1, u) - 4 * u * (1 - u) * 60 + (r() - 0.5) * 110
      const s = 0.9 + r() * 1.6
      g.moveTo(x + s, y)
      g.arc(x, y, s, 0, TAU)
    }
    g.globalAlpha = 0.85
    fill(g, '#ffffff')
    g.globalAlpha = 1
  }
  // Star dust and twinkles.
  g.beginPath()
  for (let i = 0; i < 60; i++) {
    const x = r() * SEC_W
    const y = r() * r() * 340 + 6
    const s = 1.5 + r() * 2.4
    g.moveTo(x + s, y)
    g.arc(x, y, s, 0, TAU)
  }
  for (let i = 0; i < 12; i++) twinkle(g, r() * SEC_W, 16 + r() * 240, 6 + r() * 6)
  g.globalAlpha = 0.95
  fill(g, N.star)
  g.globalAlpha = 1
  if (o.moon) {
    const [mx, my, mr, full] = o.moon
    const glow = g.createRadialGradient(mx, my, mr * 0.7, mx, my, mr * 3.4)
    glow.addColorStop(0, 'rgba(255,246,214,0.8)')
    glow.addColorStop(1, 'rgba(255,246,214,0)')
    g.fillStyle = glow
    g.fillRect(mx - mr * 3.5, my - mr * 3.5, mr * 7, mr * 7)
    if (full) {
      disc(g, mx, my, mr, '#fff4c4')
      g.save()
      g.beginPath()
      g.arc(mx, my, mr, 0, TAU)
      g.clip()
      disc(g, mx + mr * 0.4, my + mr * 0.2, mr * 0.9, '#ffeaa8')
      disc(g, mx - mr * 0.34, my - mr * 0.2, mr * 0.18, '#ffe49a')
      disc(g, mx + mr * 0.2, my + mr * 0.36, mr * 0.14, '#ffdc8a')
      disc(g, mx + mr * 0.36, my - mr * 0.34, mr * 0.1, '#ffe49a')
      disc(g, mx - mr * 0.5, my - mr * 0.5, mr * 0.16, '#fffbe6')
      g.restore()
    } else {
      crescent(g, mx, my, mr, mr * 0.72)
      fill(g, '#fff4c4')
      g.save()
      crescent(g, mx, my, mr, mr * 0.72)
      g.clip()
      disc(g, mx - mr * 0.52, my - mr * 0.36, mr * 0.2, '#fffbe6')
      disc(g, mx - mr * 0.64, my + mr * 0.3, mr * 0.12, '#ffe49a')
      g.restore()
    }
  }
}

/** A constellation (a live prop): stars joined by little lines. At rest the
 *  lines are faint and the stars small; alive, the lines glow and each star
 *  twinkles in turn. One stroke, one fill. */
export const constellation = (g: G2D, pts: readonly Pt[], links: readonly (readonly [number, number])[], t: number, alive: number): void => {
  g.beginPath()
  for (const [a, b] of links) {
    g.moveTo(...pts[a]!)
    g.lineTo(...pts[b]!)
  }
  g.globalAlpha = 0.3 + 0.45 * alive * (0.8 + 0.2 * sin(t * 1.6))
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = '#fff8d8'
  g.stroke()
  g.globalAlpha = 1
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const k = 0.55 + 0.45 * alive * Math.max(0, sin(t * 2 + i * 1.3))
    twinkle(g, x, y, (6 + 5 * alive) * k + 2)
  }
  g.fillStyle = N.star
  g.fill()
}

/* ------------------------------------------------------------ mountains */

/** A far mountain range — lighter and bluer, never outlined, with soft
 *  snow caps (art-style §5). */
export const farPeaks = (g: G2D, y: number, seed: number, n = 6, col = N.far, snow = N.farSnow): void => {
  const r = seeded(seed)
  const step = SEC_W / (n - 1)
  const peaks: Pt[] = []
  for (let i = 0; i < n; i++) peaks.push([i * step + (r() - 0.5) * step * 0.4, y - 60 - r() * 90])
  const shape = (): void => {
    g.beginPath()
    g.moveTo(-40, y + 30)
    for (const [px, py] of peaks) {
      const d = (y + 30 - py) * 0.95
      g.lineTo(px - d, y + 30)
      g.bezierCurveTo(px - d * 0.5, py + d * 0.3, px - d * 0.2, py, px, py)
      g.bezierCurveTo(px + d * 0.2, py, px + d * 0.5, py + d * 0.3, px + d, y + 30)
    }
    g.lineTo(SEC_W + 40, y + 30)
    g.lineTo(SEC_W + 40, SEC_H)
    g.lineTo(-40, SEC_H)
    g.closePath()
  }
  shape()
  fill(g, col)
  g.save()
  shape()
  g.clip()
  g.beginPath()
  for (const [px, py] of peaks) {
    const d = (y + 30 - py) * 0.95
    const cw = d * 0.46
    const ch = d * 0.3
    g.moveTo(px - cw, py + ch)
    g.lineTo(px - cw, py - 40)
    g.lineTo(px + cw, py - 40)
    g.lineTo(px + cw, py + ch)
    g.quadraticCurveTo(px + cw * 0.5, py + ch * 1.5, px, py + ch * 0.95)
    g.quadraticCurveTo(px - cw * 0.5, py + ch * 1.5, px - cw, py + ch)
  }
  fill(g, snow)
  g.restore()
}

/** An outlined lilac rock hill from x0 to x1 peaking at (px, py), with a
 *  mint moss cap and a cel shadow on its far side. Only its crest is inked
 *  (its ends sink under whatever is in front). */
export const rockHill = (g: G2D, x0: number, x1: number, px: number, py: number, base: number): void => {
  const crest = (): void => {
    g.moveTo(x0, base + 70)
    g.bezierCurveTo(x0 + (px - x0) * 0.2, base + 10, px - (px - x0) * 0.45, py, px, py)
    g.bezierCurveTo(px + (x1 - px) * 0.45, py, x1 - (x1 - px) * 0.2, base + 10, x1, base + 70)
  }
  const path = (): void => {
    g.beginPath()
    crest()
    g.lineTo(x1, SEC_H + 10)
    g.lineTo(x0, SEC_H + 10)
    g.closePath()
  }
  path()
  fill(g, N.rock)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(px + (x1 - px) * 0.18, SEC_H)
  g.bezierCurveTo(px + (x1 - px) * 0.22, py + 110, px + (x1 - px) * 0.5, py + 40, x1 + 20, py + 60)
  g.lineTo(x1 + 20, SEC_H)
  fill(g, N.rockShade)
  // The mossy cap along the crest.
  g.beginPath()
  crest()
  g.lineWidth = 34
  g.strokeStyle = N.meadow
  g.stroke()
  g.lineWidth = 8
  g.strokeStyle = N.meadowLip
  g.beginPath()
  g.moveTo(x0 + (px - x0) * 0.4, base - (base - py) * 0.6)
  g.quadraticCurveTo(px - (px - x0) * 0.2, py - 2, px, py - 6)
  g.stroke()
  g.restore()
  g.beginPath()
  crest()
  ink(g)
}

/** The front moon-meadow band, with a lit lip along its crest. */
export const meadowN = (g: G2D, yl: number, ym: number, yr: number, seed: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(-10, yl)
    g.bezierCurveTo(200, yl - 30, 420, ym - 20, 620, ym)
    g.bezierCurveTo(820, ym + 20, 1000, yr - 30, SEC_W + 10, yr)
    g.lineTo(SEC_W + 10, SEC_H + 10)
    g.lineTo(-10, SEC_H + 10)
    g.closePath()
  }
  path()
  fill(g, N.meadow)
  g.save()
  path()
  g.clip()
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const x = 60 + r() * (SEC_W - 120)
    const y = Math.max(yl, ym, yr) + 70 + r() * 120
    const rx = 90 + r() * 110
    g.moveTo(x + rx, y)
    g.ellipse(x, y, rx, 14 + r() * 10, 0, 0, TAU)
  }
  g.globalAlpha = 0.5
  fill(g, N.meadowShade)
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(10, yl + 7)
  g.bezierCurveTo(200, yl - 22, 420, ym - 12, 610, ym + 8)
  g.lineWidth = 8
  g.strokeStyle = N.meadowLip
  g.stroke()
  g.restore()
  path()
  ink(g)
}

/** A gold path through a list of centre points, `w` wide, with star stones. */
export const goldPath = (g: G2D, pts: readonly Pt[], w: number): void => {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  smooth(g, pts)
  g.lineWidth = w + 10
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = w
  g.strokeStyle = C.path
  g.stroke()
  g.lineWidth = w * 0.3
  g.strokeStyle = N.goldLite
  g.setLineDash([26, 40])
  g.stroke()
  g.restore()
}

/**
 * The meadow's texture and sparkle over a band: grass tufts, glowing
 * star-flowers in candy colours and little pebbles.
 */
export const starDress = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const hit = (x: number, y: number): boolean => avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)
  g.beginPath()
  for (let i = 0; i < 26; i++) {
    const x = r() * SEC_W
    const y = y0 - 10 + r() * (y1 - y0 + 20)
    const h = 12 + r() * 12
    if (hit(x, y)) continue
    g.moveTo(x - 6, y)
    g.quadraticCurveTo(x - 2, y - h, x + 3, y - h - 4)
    g.quadraticCurveTo(x + 2, y - h * 0.4, x + 6, y)
  }
  fill(g, N.meadowShade)
  const cols = [N.pink, N.gold, N.lilac, '#ffffff', N.blue]
  for (let i = 0; i < n; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const s = 8 + r() * 6
    if (hit(x, y)) continue
    starFlower(g, x, y, s, cols[i % cols.length]!, r() * TAU)
  }
}

/** A little star-shaped flower (a rounded five-point star with a gold eye). */
export const starFlower = (g: G2D, x: number, y: number, r: number, col: string, rot: number): void => {
  roundStar(g, x, y, r, rot, 0.56)
  fill(g, col)
  ink(g, 2.4)
  disc(g, x, y, r * 0.3, '#fff4a8', 1.8)
}

/** A round moon-tree: a soft stick and a two-toned crown hung with little
 *  gold star fruits. */
export const moonTree = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
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
  for (const [dx, dy] of [[-36, -114], [20, -152], [44, -104], [-6, -100]] as const) {
    roundStar(g, x + dx * s, y + dy * s, 8 * s, dx * 0.1)
    fill(g, N.goldLite)
    ink(g, 2.2)
  }
}

/* ------------------------------------------------------------ lanterns */

/** Where a stone lantern's fire-box glows. */
export const stoneGlow = (x: number, y: number, s: number): Glow => [x, y - 62 * s, 40 * s]

/** A chunky stone lantern standing at (x, y): a round base, a short post,
 *  a fire-box with a warm glowing window, a wide soft roof and a finial. */
export const stoneLantern = (g: G2D, x: number, y: number, s: number): void => {
  const S = (v: number): number => v * s
  g.beginPath()
  g.roundRect(x - S(30), y - S(14), S(60), S(16), S(6))
  fill(g, N.rockLite)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - S(12), y - S(40), S(24), S(28), S(4))
  fill(g, N.rockLite)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - S(26), y - S(86), S(52), S(48), S(8))
  fill(g, N.rock)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - S(15), y - S(78), S(30), S(32), [S(15), S(15), S(3), S(3)])
  fill(g, N.glow)
  ink(g, 3)
  disc(g, x, y - S(60), S(7), N.glowLite)
  g.beginPath()
  g.moveTo(x - S(44), y - S(84))
  g.quadraticCurveTo(x - S(20), y - S(92), x, y - S(112))
  g.quadraticCurveTo(x + S(20), y - S(92), x + S(44), y - S(84))
  g.quadraticCurveTo(x + S(48), y - S(78), x + S(40), y - S(78))
  g.lineTo(x - S(40), y - S(78))
  g.quadraticCurveTo(x - S(48), y - S(78), x - S(44), y - S(84))
  g.closePath()
  fill(g, N.lilac)
  ink(g, 4)
  disc(g, x, y - S(116), S(7), N.gold, 3)
}

/* ------------------------------------------------------------ landmarks */

/** Where the Great Lantern hangs: its centre and radius. */
export const greatLanternAt = (x: number, y: number, h: number): readonly [number, number, number] => [x - 118, y - h + 150, 84]

/**
 * The Great Lantern at the top of the path: a tall wooden crook post
 * standing at (x, y), `h` tall, with a huge round paper lantern hanging from
 * it. The lantern's PAPER (in the pot's colours, gold caps, star cut-outs
 * glowing) is the landmark.
 */
export const greatLantern = (g: G2D, x: number, y: number, h: number, pot: Pot): void => {
  const [lx, ly, R] = greatLanternAt(x, y, h)
  // The post and its crook.
  g.beginPath()
  g.moveTo(x - 30, y)
  g.quadraticCurveTo(x - 8, y - 20, x - 10, y - 60)
  g.lineTo(x - 10, y - h + 40)
  g.quadraticCurveTo(x - 10, y - h - 24, x - 60, y - h - 24)
  g.quadraticCurveTo(x - 110, y - h - 24, x - 118, y - h + 16)
  g.lineWidth = 30
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke()
  g.lineWidth = 20
  g.strokeStyle = N.wood
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = N.woodShade
  g.beginPath()
  g.moveTo(x - 3, y - 60)
  g.lineTo(x - 3, y - h + 40)
  g.stroke()
  // Roots/feet of the post.
  g.beginPath()
  g.ellipse(x - 12, y, 40, 10, 0, 0, TAU)
  fill(g, N.woodShade)
  ink(g, 4)
  // The hanger cord and the gold top cap.
  g.beginPath()
  g.moveTo(lx, y - h + 20)
  g.lineTo(lx, ly - R - 10)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(lx - R * 0.42, ly - R * 1.04, R * 0.84, R * 0.2, 6)
  g.roundRect(lx - R * 0.42, ly + R * 0.86, R * 0.84, R * 0.2, 6)
  fill(g, N.gold)
  ink(g, 4)
  // The paper body.
  const body = (): void => {
    g.beginPath()
    g.ellipse(lx, ly, R, R * 0.92, 0, 0, TAU)
  }
  body()
  fill(g, pot.base)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.ellipse(lx + R * 0.55, ly + R * 0.1, R * 0.75, R * 1.2, 0, 0, TAU)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(lx - R * 0.1, ly, R * 0.5, R * 0.8, 0, 0, TAU)
  fill(g, pot.lite)
  // Ribs.
  g.beginPath()
  for (const k of [0.34, 0.68]) {
    g.moveTo(lx, ly - R)
    g.ellipse(lx, ly, R * k, R * 0.92, 0, -PI / 2, PI / 2)
    g.moveTo(lx, ly - R)
    g.ellipse(lx, ly, R * k, R * 0.92, 0, -PI / 2, PI / 2 + PI, true)
  }
  g.lineWidth = 2.6
  g.strokeStyle = INK
  g.globalAlpha = 0.35
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  body()
  ink(g)
  // A glowing star cut-out in the middle, two little ones either side.
  roundStar(g, lx - R * 0.06, ly + 2, R * 0.3, 0)
  fill(g, N.glowLite)
  ink(g, 3)
  for (const [dx, dy, rr] of [[-0.55, -0.3, 0.1], [0.5, 0.36, 0.09], [0.5, -0.4, 0.07]] as const) {
    roundStar(g, lx + dx * R, ly + dy * R, R * rr, 0.3)
    fill(g, N.glowLite)
    ink(g, 2.2)
  }
  // The tassel.
  g.beginPath()
  g.moveTo(lx, ly + R * 1.06)
  g.lineTo(lx, ly + R * 1.22)
  ink(g, 3)
  g.beginPath()
  g.moveTo(lx - 9, ly + R * 1.5)
  g.quadraticCurveTo(lx - 7, ly + R * 1.26, lx, ly + R * 1.22)
  g.quadraticCurveTo(lx + 7, ly + R * 1.26, lx + 9, ly + R * 1.5)
  g.closePath()
  fill(g, N.pink)
  ink(g, 3)
}

/** An observatory's proportions: dome radius and tower height per width. */
export const OBS = { domeR: 0.62, bodyH: 0.9 }
const TUBE = '#8c96ff'
const TUBE_SHADE = '#6a74e6'

/** Where an observatory's telescope mouth is (for a glint). */
export const scopeMouth = (x: number, y: number, w: number, scope: number): Pt => {
  const R = w * OBS.domeR
  const d = R * 1.26
  return [x + sin(scope) * d, y - w * OBS.bodyH - R * 0.36 - cos(scope) * d]
}

/**
 * The observatory standing at (x, y), `w` wide: a round cream-stone tower
 * with glowing windows and a balcony, under a big DOME in the pot's colours
 * whose shutter stands open, a brass telescope peering out at the stars.
 * The DOME is the landmark.
 */
export const observatory = (g: G2D, x: number, y: number, w: number, pot: Pot, scope = -0.7): void => {
  const bh = w * OBS.bodyH
  const top = y - bh
  const R = w * OBS.domeR
  // The telescope, behind the dome's shutter.
  const tube = (): void => {
    g.save()
    g.translate(x, top - R * 0.36)
    g.rotate(scope)
    g.beginPath()
    g.roundRect(-15, -R * 1.2, 30, R * 1.16, 8)
    fill(g, TUBE)
    g.beginPath()
    g.rect(4, -R * 1.2, 12, R * 1.16)
    fill(g, TUBE_SHADE)
    g.beginPath()
    g.roundRect(-15, -R * 1.2, 30, R * 1.16, 8)
    ink(g, 4)
    g.beginPath()
    g.roundRect(-21, -R * 1.3, 42, 22, 8)
    g.roundRect(-18, -R * 0.74, 36, 12, 5)
    fill(g, N.gold)
    ink(g, 3.5)
    g.restore()
  }
  tube()
  // The tower.
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.lineTo(x - w * 0.46, top)
    g.lineTo(x + w * 0.46, top)
    g.lineTo(x + w / 2, y)
    g.closePath()
  }
  body()
  fill(g, N.wall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.16, top, w, bh)
  fill(g, N.wallShade)
  // Stone courses.
  const rr = seeded(5)
  g.beginPath()
  for (let i = 0; i < 10; i++) g.roundRect(x - w * 0.4 + rr() * w * 0.7, top + 20 + rr() * (bh - 50), 26, 12, 6)
  fill(g, N.wallShade)
  g.restore()
  body()
  ink(g)
  // Windows, the door, a star over it.
  for (const [dx, dy] of [[-0.24, 0.3], [0.24, 0.3]] as const) {
    g.beginPath()
    g.roundRect(x + dx * w - w * 0.07, top + dy * bh, w * 0.14, w * 0.2, [w * 0.07, w * 0.07, 3, 3])
    fill(g, N.glow)
    ink(g, 4)
  }
  g.beginPath()
  g.roundRect(x - w * 0.12, y - bh * 0.42, w * 0.24, bh * 0.42, [w * 0.12, w * 0.12, 2, 2])
  fill(g, N.lilac)
  ink(g, 4)
  disc(g, x + w * 0.07, y - bh * 0.2, 3.5, INK)
  roundStar(g, x, y - bh * 0.5, 12, 0)
  fill(g, N.gold)
  ink(g, 3)
  // The balcony ring under the dome.
  g.beginPath()
  g.roundRect(x - w * 0.56, top - 8, w * 1.12, 22, 11)
  fill(g, N.rockLite)
  ink(g, 4)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const bx = x - w * 0.48 + (i * w * 0.96) / 8
    g.moveTo(bx + 3.5, top + 3)
    g.arc(bx, top + 3, 3.5, 0, TAU)
  }
  fill(g, N.gold)
  // The dome.
  const dome = (): void => {
    g.beginPath()
    g.moveTo(x - R, top - 6)
    g.ellipse(x, top - 6, R, R * 0.94, 0, PI, TAU)
    g.closePath()
  }
  dome()
  fill(g, pot.base)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  g.ellipse(x + R * 0.62, top, R * 0.66, R * 1.3, 0, 0, TAU)
  fill(g, pot.shade)
  // Panel seams.
  g.beginPath()
  for (const k of [-0.62, 0.62]) {
    g.moveTo(x + k * R, top - 6)
    g.quadraticCurveTo(x + k * R * 0.8, top - R * 0.7, x, top - R * 0.94)
  }
  g.lineWidth = 3
  g.strokeStyle = pot.lite
  g.stroke()
  g.beginPath()
  g.ellipse(x - R * 0.52, top - R * 0.52, R * 0.16, R * 0.06, -0.7, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  // The open shutter: a slot up the dome, the telescope in it.
  const slot = (): void => {
    g.beginPath()
    g.moveTo(x - R * 0.22, top - 6)
    g.lineTo(x - R * 0.22, top - R * 0.6)
    g.quadraticCurveTo(x - R * 0.2, top - R * 0.92, x, top - R * 0.95)
    g.quadraticCurveTo(x + R * 0.2, top - R * 0.92, x + R * 0.22, top - R * 0.6)
    g.lineTo(x + R * 0.22, top - 6)
    g.closePath()
  }
  slot()
  fill(g, N.deep)
  g.save()
  slot()
  g.clip()
  tube()
  g.restore()
  slot()
  ink(g, 4)
  dome()
  ink(g)
  disc(g, x, top - R * 0.96 - 8, 9, N.gold, 3)
}

/** A brass telescope on a little tripod at (x, y), tilted `a`. */
export const telescope = (g: G2D, x: number, y: number, s: number, a: number): void => {
  g.beginPath()
  g.moveTo(x, y - 50 * s)
  g.lineTo(x - 26 * s, y)
  g.moveTo(x, y - 50 * s)
  g.lineTo(x + 26 * s, y)
  g.moveTo(x, y - 50 * s)
  g.lineTo(x + 4 * s, y + 4 * s)
  g.lineWidth = 9 * s
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 4 * s
  g.strokeStyle = N.woodShade
  g.stroke()
  g.save()
  g.translate(x, y - 54 * s)
  g.rotate(a)
  g.beginPath()
  g.roundRect(-40 * s, -9 * s, 84 * s, 18 * s, 7 * s)
  fill(g, TUBE)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(38 * s, -12 * s, 14 * s, 24 * s, 5 * s)
  fill(g, N.goldShade)
  ink(g, 3.5)
  g.restore()
}

/**
 * The giant star-lily of the Star Garden, rooted at (x, y), scale `s`: a
 * curving stem with broad leaves and one huge bloom of five soft pointed
 * PETALS (in the pot's colours, the landmark) around a glowing heart.
 */
export const starLily = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  const S = (v: number): number => v * s
  const bx = x + S(20)
  const by = y - S(300)
  // The stem.
  g.beginPath()
  g.moveTo(x - S(10), y)
  g.bezierCurveTo(x - S(30), y - S(120), x + S(40), y - S(180), bx - S(8), by + S(40))
  g.lineTo(bx + S(12), by + S(44))
  g.bezierCurveTo(x + S(60), y - S(180), x - S(8), y - S(120), x + S(14), y)
  g.closePath()
  fill(g, N.meadowShade)
  ink(g)
  // Two broad leaves.
  for (const [lx, ly, a, d] of [[x - S(4), y - S(70), -0.9, -1], [x + S(14), y - S(140), 0.7, 1]] as const) {
    g.save()
    g.translate(lx, ly)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(d * S(30), -S(50), 0, -S(110))
    g.quadraticCurveTo(-d * S(30), -S(50), 0, 0)
    fill(g, N.meadow)
    ink(g, 4)
    g.beginPath()
    g.moveTo(0, -S(6))
    g.quadraticCurveTo(d * S(6), -S(50), 0, -S(96))
    ink(g, 2.4)
    g.restore()
  }
  // Back petals (shade), then front petals (base), each a soft point.
  const petal = (a: number, len: number, wid: number): void => {
    g.save()
    g.translate(bx, by)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(wid, -len * 0.3, wid * 0.7, -len * 0.8, 0, -len)
    g.bezierCurveTo(-wid * 0.7, -len * 0.8, -wid, -len * 0.3, 0, 0)
    g.restore()
  }
  for (let i = 0; i < 5; i++) {
    petal(PI / 5 + (i * TAU) / 5, S(128), S(62))
    fill(g, pot.shade)
    ink(g)
  }
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5
    petal(a, S(150), S(72))
    fill(g, pot.base)
    g.save()
    petal(a, S(150), S(72))
    g.clip()
    g.translate(bx, by)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(S(80), -S(20))
    g.lineTo(S(80), -S(170))
    g.lineTo(S(6), -S(170))
    g.closePath()
    fill(g, pot.shade)
    g.beginPath()
    g.ellipse(-S(14), -S(84), S(8), S(30), 0.1, 0, TAU)
    fill(g, pot.lite)
    g.restore()
    petal(a, S(150), S(72))
    ink(g)
  }
  // The glowing heart and stamens.
  disc(g, bx, by, S(38), N.gold, LW)
  disc(g, bx - S(6), by - S(6), S(20), N.goldLite)
  for (let i = 0; i < 5; i++) {
    const a = -PI / 2 + (i - 2) * 0.36
    const ex = bx + cos(a) * S(58)
    const ey = by + sin(a) * S(58)
    g.beginPath()
    g.moveTo(bx + cos(a) * S(30), by + sin(a) * S(30))
    g.lineTo(ex, ey)
    ink(g, 3)
    disc(g, ex, ey, S(7), N.goldLite, 2.4)
  }
}

/** Where the star-lily's heart glows. */
export const lilyHeart = (x: number, y: number, s: number): Glow => [x + 20 * s, y - 300 * s, 54 * s]

/** A moon pond centred (x, y): a mossy rim, periwinkle water, the moon's
 *  reflection, lily pads with little glowing flowers. */
export const moonPond = (g: G2D, x: number, y: number, rx: number, ry: number, moonX: number): void => {
  g.beginPath()
  g.ellipse(x, y + 6, rx + 24, ry + 16, 0, 0, TAU)
  fill(g, N.meadowShade)
  ink(g, 4)
  const water = (): void => {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, TAU)
  }
  water()
  fill(g, N.pond)
  g.save()
  water()
  g.clip()
  g.beginPath()
  g.ellipse(x + rx * 0.3, y + ry * 0.6, rx * 0.9, ry * 0.55, 0, 0, TAU)
  fill(g, N.pondShade)
  // The moon's reflection: a soft column of light.
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(moonX, y - ry * 0.1, 46, ry * 0.7, 0, 0, TAU)
  fill(g, N.pondLite)
  g.globalAlpha = 1
  g.beginPath()
  for (const [dy, w] of [[-0.4, 44], [-0.12, 34], [0.16, 24], [0.42, 14]] as const) {
    g.moveTo(moonX - w, y + dy * ry)
    g.lineTo(moonX + w, y + dy * ry)
  }
  g.lineWidth = 5
  g.lineCap = 'round'
  g.strokeStyle = '#fff6d0'
  g.stroke()
  g.restore()
  water()
  ink(g)
}

/** A lily pad with a star-flower, on water at (x, y). */
export const lilyPad = (g: G2D, x: number, y: number, r: number, col: string): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.ellipse(x, y, r, r * 0.45, 0, 0.35, TAU - 0.05)
  g.closePath()
  fill(g, N.meadow)
  ink(g, 3)
  starFlower(g, x + r * 0.2, y - r * 0.2, r * 0.42, col, 0.2)
}

/**
 * The moon bridge over the pond, feet at (x ± w/2, y): a tall round arch whose
 * reflection completes a circle. Its body and RAILS (in the pot's colours,
 * gold trim) are the landmark; round lanterns stand on its end posts.
 */
export const moonBridge = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const R = w / 2
  const H = R * 0.94
  const band = 40
  // The arch body: an annulus sector over the water.
  const arch = (off: number): void => {
    g.beginPath()
    g.ellipse(x, y + off, R, H, 0, PI, TAU)
    g.lineTo(x + R - band, y + off)
    g.ellipse(x, y + off, R - band, H - band * 0.9, 0, TAU, PI, true)
    g.closePath()
  }
  arch(0)
  fill(g, pot.base)
  g.save()
  arch(0)
  g.clip()
  g.beginPath()
  g.rect(x + 8, y - H - 10, R + 10, H + 20)
  fill(g, pot.shade)
  // Plank lines across the band.
  g.beginPath()
  for (let i = 1; i < 14; i++) {
    const a = PI + (i * PI) / 14
    g.moveTo(x + cos(a) * R, y + sin(a) * H)
    g.lineTo(x + cos(a) * (R - band), y + sin(a) * (H - band * 0.9))
  }
  g.lineWidth = 2.6
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  arch(0)
  ink(g)
  // The railing along the crest: posts and a top rail in gold-capped pot.
  const rail = (dr: number): void => {
    g.beginPath()
    g.ellipse(x, y, R + dr, H + dr, 0, PI + 0.06, TAU - 0.06)
  }
  g.beginPath()
  for (let i = 1; i < 12; i++) {
    const a = PI + (i * PI) / 12
    g.moveTo(x + cos(a) * R, y + sin(a) * H)
    g.lineTo(x + cos(a) * (R + 34), y + sin(a) * (H + 34))
  }
  g.lineWidth = 11
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = pot.lite
  g.stroke()
  rail(34)
  g.lineWidth = 16
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 8
  g.strokeStyle = pot.base
  g.stroke()
  rail(36)
  g.lineWidth = 2.6
  g.strokeStyle = pot.lite
  g.stroke()
  // Gold end posts with round lanterns.
  for (const d of [-1, 1]) {
    const px = x + d * (R + 6)
    g.beginPath()
    g.roundRect(px - 9, y - 70, 18, 74, 5)
    fill(g, N.gold)
    ink(g, 4)
    paperLantern(g, px, y - 96, 20, d < 0 ? N.pink : N.blue)
  }
}

/** Where the moon bridge's post lanterns glow. */
export const bridgeGlows = (x: number, y: number, w: number): Glow[] => [[x - w / 2 - 6, y - 96, 40], [x + w / 2 + 6, y - 96, 40]]

/** The bridge's reflection in the pond (paint, under the bridge). */
export const bridgeReflection = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const R = w / 2
  const H = R * 0.94
  const band = 40
  g.save()
  g.globalAlpha = 0.42
  g.beginPath()
  g.ellipse(x, y, R, H * 0.8, 0, 0, PI)
  g.lineTo(x - R + band, y)
  g.ellipse(x, y, R - band, (H - band * 0.9) * 0.8, 0, PI, 0, true)
  g.closePath()
  fill(g, pot.base)
  g.restore()
}

/* -------------------------------------------------------------- throne */

const THR = { back: 170, seatY: 140 }
const HALO = '#dfe2ff'

/** Where the throne's pillar orbs glow, left then right. */
export const throneOrbs = (x: number, y: number): Glow[] => [[x - 300, y - 336, 50], [x + 300, y - 336, 50]]

/** The throne's halo ring: centre and radius (planets orbit on it). */
export const throneHalo = (x: number, y: number): readonly [number, number, number] => [x, y - 90 - THR.back - 20, THR.back + 46]

/**
 * Nova's Starlight Throne on its dais, standing at (x, y): three soft steps of
 * lilac stone with gold trim, a great halo ring behind, the throne whose tall
 * STAR-shaped back (with the seat's canopy, in the pot's colours) is the
 * landmark, and two moon pillars carrying glowing orbs.
 */
export const throne = (g: G2D, x: number, y: number, pot: Pot): void => {
  // The halo ring (an orrery band) behind everything.
  const [hx, hy, hr] = throneHalo(x, y)
  g.beginPath()
  g.ellipse(hx, hy, hr, hr, 0, 0, TAU)
  g.lineWidth = 34
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 24
  g.strokeStyle = HALO
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = '#ffffff'
  g.beginPath()
  g.ellipse(hx, hy, hr - 6, hr - 6, 0, PI * 1.1, PI * 1.6)
  g.stroke()
  // Little stars studded along the ring.
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12 + 0.26
    roundStar(g, hx + cos(a) * hr, hy + sin(a) * hr, 12, a)
    fill(g, i % 3 === 0 ? N.pink : N.gold)
    ink(g, 2.6)
  }
  // Moon pillars.
  for (const d of [-1, 1]) {
    const px = x + d * 300
    const col = (): void => {
      g.beginPath()
      g.roundRect(px - 28, y - 290, 56, 290, [8, 8, 0, 0])
    }
    col()
    fill(g, N.wall)
    g.save()
    col()
    g.clip()
    g.beginPath()
    g.rect(px + 8, y - 300, 40, 300)
    fill(g, N.wallShade)
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      g.moveTo(px - 12 + i * 12, y - 280)
      g.lineTo(px - 12 + i * 12, y - 10)
    }
    g.lineWidth = 3
    g.strokeStyle = N.wallShade
    g.stroke()
    g.restore()
    col()
    ink(g)
    g.beginPath()
    g.roundRect(px - 38, y - 300, 76, 18, 8)
    g.roundRect(px - 38, y - 22, 76, 22, 8)
    fill(g, N.gold)
    ink(g, 4)
    // The crescent cradle and its orb.
    g.beginPath()
    g.arc(px, y - 330, 34, 0.15 * PI, 0.85 * PI)
    g.lineWidth = 20
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = 11
    g.strokeStyle = N.gold
    g.stroke()
    disc(g, px, y - 336, 24, N.glowLite, 4)
    disc(g, px - 7, y - 343, 8, '#ffffff')
  }
  // The dais: three stacked soft steps.
  for (let i = 0; i < 3; i++) {
    const w = 360 - i * 70
    const sy = y - i * 30
    g.beginPath()
    g.roundRect(x - w / 2, sy - 30, w, 34, 12)
    fill(g, N.rockLite)
    g.save()
    g.clip()
    g.beginPath()
    g.rect(x + w * 0.2, sy - 32, w, 40)
    fill(g, N.rock)
    g.restore()
    g.beginPath()
    g.roundRect(x - w / 2, sy - 30, w, 34, 12)
    ink(g, 4)
    g.beginPath()
    g.roundRect(x - w / 2 + 6, sy - 34, w - 12, 10, 5)
    fill(g, N.gold)
    ink(g, 3)
  }
  const sy = y - 90
  // The star back.
  const bx = x
  const byc = sy - THR.back - 20
  roundStar(g, bx, byc, THR.back, 0, 0.56)
  fill(g, pot.base)
  g.save()
  roundStar(g, bx, byc, THR.back, 0, 0.56)
  g.clip()
  g.beginPath()
  g.moveTo(bx, byc - THR.back - 10)
  g.lineTo(bx + THR.back * 1.2, byc - THR.back)
  g.lineTo(bx + THR.back * 1.2, byc + THR.back)
  g.lineTo(bx, byc + THR.back)
  g.closePath()
  fill(g, pot.shade)
  roundStar(g, bx, byc, THR.back * 0.7, 0, 0.56)
  g.lineWidth = 6
  g.strokeStyle = pot.lite
  g.stroke()
  g.beginPath()
  g.ellipse(bx - THR.back * 0.3, byc - THR.back * 0.3, 10, 26, 0.5, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roundStar(g, bx, byc, THR.back, 0, 0.56)
  ink(g, 6)
  // A crescent moon jewel at the heart of the star.
  crescent(g, bx - 6, byc - 10, 34, 24)
  fill(g, N.gold)
  ink(g, 4)
  // The seat and cushion, the arms with little star finials.
  g.beginPath()
  g.roundRect(x - 90, sy - 70, 180, 70, [12, 12, 6, 6])
  fill(g, N.wall)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 30, sy - 80, 100, 90)
  fill(g, N.wallShade)
  g.beginPath()
  g.rect(x - 90, sy - 16, 180, 8)
  fill(g, N.gold)
  g.restore()
  g.beginPath()
  g.roundRect(x - 90, sy - 70, 180, 70, [12, 12, 6, 6])
  ink(g)
  g.beginPath()
  g.roundRect(x - 76, sy - 92, 152, 34, 16)
  fill(g, pot.lite)
  ink(g)
  g.beginPath()
  g.moveTo(x - 50, sy - 76)
  g.quadraticCurveTo(x - 20, sy - 70, x, sy - 76)
  g.moveTo(x + 10, sy - 76)
  g.quadraticCurveTo(x + 36, sy - 70, x + 56, sy - 76)
  g.lineWidth = 3
  g.strokeStyle = pot.base
  g.stroke()
  for (const d of [-1, 1]) {
    g.beginPath()
    g.roundRect(x + d * 100 - 18, sy - 110, 36, 110, 14)
    fill(g, pot.base)
    ink(g)
    roundStar(g, x + d * 100, sy - 124, 18, 0)
    fill(g, N.gold)
    ink(g, 3)
  }
}

/** Where the throne's star back sits: centre and radius. */
export const throneStar = (x: number, y: number): readonly [number, number, number] => [x, y - 90 - THR.back - 20, THR.back]

/* ------------------------------------------------------- tap covers */

/** A wooden crate with a star stencil (a tap creature's hiding place). */
export const starCrate = (g: G2D, x: number, y: number, s: number): void => {
  const w = 110 * s
  const h = 84 * s
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 8 * s)
  fill(g, N.wood)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.18, y - h, w, h)
  fill(g, N.woodShade)
  g.restore()
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 8 * s)
  ink(g)
  g.beginPath()
  g.moveTo(x - w / 2, y - h * 0.5)
  g.lineTo(x + w / 2, y - h * 0.5)
  ink(g, 2.6)
  roundStar(g, x - 4 * s, y - h * 0.5, 22 * s, 0)
  fill(g, N.gold)
  ink(g, 3)
  // A rolled star chart leaning out of it.
  g.save()
  g.translate(x + w * 0.3, y - h)
  g.rotate(0.4)
  g.beginPath()
  g.roundRect(-8 * s, -46 * s, 16 * s, 56 * s, 8 * s)
  fill(g, N.blue)
  ink(g, 3)
  g.restore()
}

/** A round mossy boulder (a tap creature's hiding place). */
export const moonRock = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 40 * s, y - 36 * s, 38 * s], [x + 6 * s, y - 60 * s, 50 * s], [x + 48 * s, y - 34 * s, 36 * s], [x, y - 30 * s, 44 * s]]
  circles(g, lobes)
  inkFill(g, N.rock)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 46 * s, y - 6 * s, 50 * s], [x - 20 * s, y + 8 * s, 40 * s]])
  fill(g, N.rockShade)
  circles(g, [[x - 20 * s, y - 102 * s, 34 * s], [x + 20 * s, y - 108 * s, 28 * s]])
  fill(g, N.meadow)
  g.beginPath()
  g.ellipse(x - 34 * s, y - 56 * s, 12 * s, 6 * s, -0.5, 0, TAU)
  fill(g, N.rockLite)
  g.restore()
  starFlower(g, x - 18 * s, y - 92 * s, 10 * s, N.pink, 0.2)
  starFlower(g, x + 22 * s, y - 100 * s, 9 * s, N.gold, 1)
}

/** A round bush of glowing star-flowers (a tap creature's hiding place). */
export const starBush = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 44 * s, y - 34 * s, 32 * s], [x, y - 58 * s, 42 * s], [x + 44 * s, y - 34 * s, 32 * s], [x, y - 30 * s, 40 * s]]
  circles(g, lobes)
  inkFill(g, N.meadow)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 40 * s, y - 6 * s, 44 * s], [x - 30 * s, y + 4 * s, 34 * s]])
  fill(g, N.meadowShade)
  circles(g, [[x - 24 * s, y - 84 * s, 18 * s]])
  fill(g, N.meadowLip)
  g.restore()
  const fl: readonly (readonly [number, number, string])[] = [[-40, -40, N.pink], [-8, -66, N.gold], [28, -44, N.blue], [46, -20, N.pink], [0, -26, N.lilac]]
  for (const [dx, dy, c] of fl) starFlower(g, x + dx * s, y + dy * s, 11 * s, c, dx)
}

/** A gold-banded star urn with a round topiary (a tap creature's hiding
 *  place). */
export const starUrn = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 40 * s, y - 84 * s, 32 * s], [x, y - 112 * s, 44 * s], [x + 40 * s, y - 84 * s, 32 * s], [x, y - 76 * s, 40 * s]]
  circles(g, lobes)
  inkFill(g, N.meadow)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 40 * s, y - 54 * s, 46 * s]])
  fill(g, N.meadowShade)
  g.restore()
  for (const [dx, dy, c] of [[-34, -96, N.gold], [10, -132, N.pink], [34, -84, N.gold], [-4, -88, N.blue]] as const) starFlower(g, x + dx * s, y + dy * s, 10 * s, c, dx)
  const urn = (): void => {
    g.beginPath()
    g.moveTo(x - 50 * s, y - 56 * s)
    g.lineTo(x + 50 * s, y - 56 * s)
    g.quadraticCurveTo(x + 50 * s, y - 10 * s, x + 26 * s, y - 6 * s)
    g.lineTo(x + 30 * s, y)
    g.lineTo(x - 30 * s, y)
    g.lineTo(x - 26 * s, y - 6 * s)
    g.quadraticCurveTo(x - 50 * s, y - 10 * s, x - 50 * s, y - 56 * s)
    g.closePath()
  }
  urn()
  fill(g, N.lilac)
  g.save()
  urn()
  g.clip()
  g.beginPath()
  g.rect(x + 14 * s, y - 60 * s, 60 * s, 70 * s)
  fill(g, N.lilacShade)
  g.restore()
  urn()
  ink(g)
  g.beginPath()
  g.roundRect(x - 56 * s, y - 64 * s, 112 * s, 14 * s, 7 * s)
  fill(g, N.gold)
  ink(g, 3)
  roundStar(g, x - 4 * s, y - 32 * s, 13 * s, 0)
  fill(g, N.gold)
  ink(g, 2.6)
}

/* ------------------------------------------------------- the star-calf */

export interface CalfLook { coat: string; shade: string; spot: string; collar: string }
export const CALF: Record<string, CalfLook> = {
  pink: { coat: '#fff7d6', shade: '#f5da94', spot: '#ffd84d', collar: '#ff7fd0' },
  mint: { coat: '#fff7d6', shade: '#f5da94', spot: '#ffd84d', collar: '#3fe0ae' },
  sky: { coat: '#fff7d6', shade: '#f5da94', spot: '#ffd84d', collar: '#56b6ff' },
  lilac: { coat: '#fff7d6', shade: '#f5da94', spot: '#ffd84d', collar: '#a77cff' },
  coral: { coat: '#fff7d6', shade: '#f5da94', spot: '#ffd84d', collar: '#ff7a8a' }
}

const IRIS = '#5a64e8'

/**
 * The chapter's star-calf — a tiny calf made of starlight — feet at (x, y),
 * scale `s`, facing `dir`: a round cream-gold body sprinkled with star
 * spots, a big head with floppy ears and two gold nub horns, a soft muzzle,
 * big eyes, a bell collar and a star-tipped tail. `eye` 0 asleep → 1 awake.
 */
export const starCalf = (g: G2D, x: number, y: number, s: number, dir: number, look: CalfLook, eye: number, wag = 0): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const painted = drawItem(g, CALF_ART, CALF_UNIT * s, clamp(eye, 0, 1), look.collar)
  g.restore()
  if (painted) return
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  starCalfShape(g, s, look, eye, wag)
  g.restore()
}

/** Horn tip (-118) to the hooves (0) at scale 1 — the calf's own height in SU. */
const CALF_UNIT = 118

/**
 * The star-calf asleep and awake (`CREATURE_ART.starCalf`). Its BELL COLLAR is
 * the tinted region — the five summit calves differ in nothing else — and the
 * tail's wag stays drawn with the rest of the rise.
 */
export const CALF_ART: ItemSpec = {
  ...CREATURE_ART.starCalf, frames: 2, tinted: true,
  draw: (g, sz, f, accent) => {
    const k = sz / CALF_UNIT
    g.save()
    g.scale(k, k)
    starCalfShape(g, 1, { ...CALF.pink!, collar: accent.base }, f, 0)
    g.restore()
  }
}

/** The calf itself, hooves at the origin, facing +x, in its own units. */
const starCalfShape = (g: G2D, s: number, look: CalfLook, eye: number, wag: number): void => {
  const w = LW / s
  // The tail, with a star tip.
  g.beginPath()
  g.moveTo(-30, -36)
  g.quadraticCurveTo(-50, -44 + wag * 6, -52, -62 + wag * 8)
  g.lineWidth = w * 1.6
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = w * 0.7
  g.strokeStyle = look.shade
  g.stroke()
  roundStar(g, -52, -66 + wag * 8, 9, wag * 0.5)
  fill(g, look.spot)
  ink(g, w * 0.5)
  // Far legs.
  g.beginPath()
  for (const lx of [-16, 18]) g.roundRect(lx - 6, -24, 12, 24, 6)
  inkFill(g, look.shade, w)
  // Body, near legs and head, outlined once.
  g.beginPath()
  g.moveTo(28, -30)
  g.ellipse(-2, -30, 30, 21, 0, 0, TAU)
  for (const lx of [-24, 10]) {
    g.moveTo(lx + 7, -20)
    g.roundRect(lx - 7, -24, 14, 24, 7)
  }
  g.moveTo(47, -62)
  g.arc(22, -62, 25, 0, TAU)
  inkFill(g, look.coat, w)
  g.save()
  g.beginPath()
  g.ellipse(-2, -30, 30, 21, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(4, -10, 34, 12, 0, 0, TAU)
  fill(g, look.shade)
  g.restore()
  // Hooves.
  g.beginPath()
  for (const lx of [-24, 10]) g.roundRect(lx - 7, -7, 14, 7, [0, 0, 7, 7])
  fill(g, N.lilac)
  // Star spots on the body.
  for (const [sx, sy, r] of [[-14, -36, 7], [4, -24, 5], [-22, -22, 4.5]] as const) {
    roundStar(g, sx, sy, r, 0.3)
    fill(g, look.spot)
  }
  // Ears (floppy), horns (gold nubs), the muzzle.
  for (const [ex, ey, a, c] of [[6, -80, -0.35, look.shade], [4, -70, 0.2, look.coat]] as const) {
    g.save()
    g.translate(ex, ey)
    g.rotate(a)
    g.beginPath()
    g.ellipse(-14, 0, 15, 7.5, 0, 0, TAU)
    fill(g, c)
    ink(g, w * 0.8)
    g.beginPath()
    g.ellipse(-15, 0.5, 9, 3.6, 0, 0, TAU)
    fill(g, '#ffc4d8')
    g.restore()
  }
  g.beginPath()
  for (const hx of [12, 30]) {
    g.moveTo(hx - 5, -82)
    g.quadraticCurveTo(hx - 4, -96, hx, -97)
    g.quadraticCurveTo(hx + 4, -96, hx + 5, -82)
    g.closePath()
  }
  fill(g, N.gold)
  ink(g, w * 0.6)
  g.beginPath()
  g.ellipse(36, -52, 15, 11, 0, 0, TAU)
  fill(g, '#ffd6e6')
  ink(g, w * 0.6)
  g.beginPath()
  g.moveTo(41.5, -54)
  g.arc(40, -54, 1.8, 0, TAU)
  g.moveTo(35.5, -54)
  g.arc(34, -54, 1.8, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.arc(35, -49, 4.5, 0.3, PI - 0.3)
  ink(g, w * 0.4)
  // The eyes.
  if (eye > 0.15) {
    g.beginPath()
    g.ellipse(24, -68, 7, 9 * eye, 0, 0, TAU)
    fill(g, IRIS)
    ink(g, w * 0.5)
    g.beginPath()
    g.ellipse(25, -67, 4.2, 5.4 * eye, 0, 0, TAU)
    fill(g, INK)
    disc(g, 21.5, -68 - 4.2 * eye, 2.6, '#ffffff')
    disc(g, 27, -67 + 3.6 * eye, 1.3, '#ffffff')
  } else {
    g.beginPath()
    g.arc(24, -71, 6, PI * 0.15, PI * 0.85)
    ink(g, w * 0.55)
  }
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(14, -54, 5.5, 3.6, 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  // The bell collar.
  g.beginPath()
  g.ellipse(10, -42, 18, 6, 0.3, 0, TAU)
  fill(g, look.collar)
  ink(g, w * 0.6)
  disc(g, 16, -34, 6, N.gold, w * 0.5)
}

/** A calf's hiding spot: feet position when out, how far it sinks to hide. */
export interface CalfSpot { x: number; y: number; s: number; dir: number; rise: number; ground: number; lean?: number }

/**
 * The tap creature's draw (§8.8 beat 2): the star-calf rises from behind
 * its cover (whose FRONT `front` redraws on top, so k = 0 is the cover
 * alone), eyes still shut, then blinks awake in a little burst of stars.
 */
export const peekCalf = (g: G2D, p: CalfSpot, k: number, t: number, look: CalfLook, front: (g: G2D) => void): void => {
  const e = ease(clamp(k, 0, 1))
  const lx = (p.lean ?? 0) * e
  if (k > 0.001) {
    const fy = p.y + (1 - e) * p.rise
    // A soft starlight glow behind it once awake.
    if (k > 0.6) {
      g.globalAlpha = (k - 0.6) * 0.8
      disc(g, p.x + lx + p.dir * 10 * p.s, fy - 56 * p.s, 64 * p.s, N.glowLite)
      g.globalAlpha = 1
    }
    g.save()
    g.beginPath()
    g.rect(p.x - 300, p.ground - 600, 600, 600)
    g.clip()
    // Eyes open at the top of the pop — with one blink.
    const open = clamp((k - 0.7) * 4, 0, 1)
    const blink = k >= 1 && sin(t * 7) > 0.92 ? 0 : 1
    starCalf(g, p.x + lx, fy, p.s, p.dir, look, open * blink, sin(t * 10) * e)
    g.restore()
  }
  tapCover(g, front)
  if (k <= 0.7) return
  const a = clamp((k - 0.7) / 0.3, 0, 1)
  const hx = p.x + lx + p.dir * 22 * p.s
  const hy = p.y - 70 * p.s
  g.globalAlpha = a
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const ang = -PI * 0.9 + (i / 4) * PI * 0.8
    const rr = (46 + 16 * a + 6 * sin(t * 6 + i)) * p.s
    twinkle(g, hx + cos(ang) * rr, hy + sin(ang) * rr, (7 + (i % 2) * 4) * p.s * a)
  }
  fill(g, N.gold)
  g.lineWidth = 1.8
  g.strokeStyle = INK
  g.stroke()
  g.globalAlpha = 1
}

/* ------------------------------------------------------ the Fallen Star */

/** Point to point (92) at scale 1 — the star's own width in SU. */
const FALLEN_STAR_UNIT = 92

/**
 * The Fallen Star, asleep and awake (`CREATURE_ART.fallenStar`): dim and
 * lilac, then gold and beaming. Its halo, the dent it makes in the grass and
 * the sparkles turning round it stay drawn.
 */
export const FALLEN_STAR_ART: ItemSpec = {
  ...CREATURE_ART.fallenStar, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / FALLEN_STAR_UNIT
    g.save()
    g.scale(k, k)
    fallenStarShape(g, 1, 46, f, f)
    g.restore()
  }
}

/** The star itself, upright, centred on the origin, in its own units. */
const fallenStarShape = (g: G2D, s: number, R: number, o: number, k: number): void => {
  const S = (v: number): number => v * s
  const body = (): void => roundStar(g, 0, 0, R, 0, 0.55)
  body()
  fill(g, mix(N.gold, '#c7c0ee', (1 - o) * 0.62))
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(0, -R * 1.2, R * 1.3, R * 2.4)
  fill(g, mix(N.goldShade, '#a49ad6', (1 - o) * 0.62))
  g.beginPath()
  g.ellipse(-R * 0.3, -R * 0.45, R * 0.1, R * 0.22, 0.4, 0, TAU)
  fill(g, '#fffbe6')
  g.restore()
  body()
  ink(g, 4)
  // The face, turned with the body.
  g.save()
  const ey = S(2)
  if (k < 0.5) {
    g.beginPath()
    g.moveTo(-S(15), ey)
    g.quadraticCurveTo(-S(10), ey + S(4), -S(5), ey)
    g.moveTo(S(5), ey)
    g.quadraticCurveTo(S(10), ey + S(4), S(15), ey)
    ink(g, 2.6)
    g.beginPath()
    g.arc(0, ey + S(10), S(3), 0.2, PI - 0.2)
    ink(g, 2.2)
  } else {
    g.beginPath()
    g.moveTo(-S(10) + S(4), ey)
    g.ellipse(-S(10), ey, S(4), S(5.6), 0, 0, TAU)
    g.moveTo(S(10) + S(4), ey)
    g.ellipse(S(10), ey, S(4), S(5.6), 0, 0, TAU)
    fill(g, INK)
    disc(g, -S(11.5), ey - S(2.2), S(1.6), '#ffffff')
    disc(g, S(8.5), ey - S(2.2), S(1.6), '#ffffff')
    g.beginPath()
    g.moveTo(-S(6), ey + S(8))
    g.quadraticCurveTo(0, ey + S(15), S(6), ey + S(8))
    g.closePath()
    fill(g, '#ff8fb0')
    ink(g, 2.2)
  }
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(-S(18), ey + S(9), S(5), S(3.2), 0, 0, TAU)
  g.moveTo(S(23), ey + S(9))
  g.ellipse(S(18), ey + S(9), S(5), S(3.2), 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  g.restore()
  // Asleep: a plum veil dims it.
  if (k < 1) {
    g.globalAlpha = 0.3 * (1 - clamp(k * 1.5, 0, 1))
    body()
    fill(g, INK)
    g.globalAlpha = 1
  }
}

/**
 * A Fallen Star, the chapter's rescue (§8.8 beat 3), resting on (x, y).
 * k = 0: a little star lying tipped over in the grass, dim, eyes closed;
 * k = 1: upright and floating, glowing, awake, with a halo of sparkles.
 */
export const fallenStar = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const o = ease(clamp(k, 0, 1))
  const S = (v: number): number => v * s
  const R = S(46)
  const lift = o * (S(38) + sin(t * 2) * S(7))
  const cx = x
  const cy = y - R * 0.72 - lift
  const rot = lerp(-0.62, sin(t * 1.6) * 0.08 * o, o)
  // Glow (awake).
  if (o > 0) {
    g.globalAlpha = 0.2 * o
    disc(g, cx, cy, S(96 + sin(t * 3) * 4), N.glowLite)
    g.globalAlpha = 0.3 * o
    disc(g, cx, cy, S(68), N.glow)
    g.globalAlpha = 1
  }
  // Its little dent in the grass.
  g.globalAlpha = 0.25
  g.beginPath()
  g.ellipse(x, y, S(54 - 20 * o), S(10 - 4 * o), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  // Its TURN is a rotation and its lift a translate, so the painting carries
  // both: the star is painted upright and the drawing tips and floats it.
  g.save()
  g.translate(cx, cy)
  g.rotate(rot)
  if (!drawItem(g, FALLEN_STAR_ART, FALLEN_STAR_UNIT * s, k < 0.5 ? 0 : 1)) fallenStarShape(g, s, R, o, k)
  g.restore()
  if (o <= 0.2) return
  // Awake: a halo of sparkles turning round it.
  const a = clamp((k - 0.2) / 0.8, 0, 1)
  const cols = [N.pink, N.blue, N.gold, N.mint, N.lilac, '#ffffff']
  for (let i = 0; i < 6; i++) {
    const ang = t * 0.9 + (i * TAU) / 6
    g.globalAlpha = a
    g.beginPath()
    twinkle(g, cx + cos(ang) * S(76), cy + sin(ang) * S(30) - S(6), S(8 + 3 * sin(t * 4 + i)))
    fill(g, cols[i]!)
    ink(g, 1.8)
  }
  g.globalAlpha = 1
}

/** The Fallen Star's little bed of flattened grass and petals (paint). */
export const starBed = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.ellipse(x, y, 84 * s, 18 * s, 0, 0, TAU)
  g.globalAlpha = 0.7
  fill(g, N.meadowShade)
  g.globalAlpha = 1
  const r = seeded(17)
  const cols = [N.pink, N.gold, '#ffffff', N.blue]
  for (let i = 0; i < 7; i++) {
    const a = PI * 0.1 + (i / 6) * PI * 0.8
    starFlower(g, x - cos(a) * 80 * s, y + sin(a) * 16 * s - 2, 8 * s, cols[i % 4]!, r() * TAU)
  }
}

/** A soft light ring around a lit landmark (a live prop): unlike a glow
 *  disc it never lies over the landmark's own colour. No gradients. */
export const halo = (g: G2D, x: number, y: number, r0: number, r1: number, t: number, alive: number, col: string = N.glowLite): void => {
  if (alive <= 0) return
  const b = 1 + 0.06 * sin(t * 2.2)
  g.beginPath()
  g.arc(x, y, ((r0 + r1) / 2) * b, 0, TAU)
  g.lineWidth = (r1 - r0) * b
  g.strokeStyle = col
  g.globalAlpha = 0.2 * alive
  g.stroke()
  g.beginPath()
  g.arc(x, y, r0 + (r1 - r0) * 0.22 * b, 0, TAU)
  g.lineWidth = (r1 - r0) * 0.44
  g.globalAlpha = 0.22 * alive
  g.stroke()
  g.globalAlpha = 1
}

/** Glowing flower heads pulsing (a live prop). No gradients. */
export const flowerGlows = (g: G2D, pts: readonly Glow[], t: number, alive: number, col: string = N.glowLite): void => {
  if (alive <= 0) return
  g.fillStyle = col
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i]!
    const b = 0.8 + 0.2 * sin(t * 2.2 + i * 2.4)
    g.globalAlpha = 0.2 * alive
    g.beginPath()
    g.arc(x, y, r * b, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
}

