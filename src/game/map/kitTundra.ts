/**
 * kitTundra.ts — Twilight Tundra's painters (chapter 8, story-spec §10.2: "The
 * auroras in the sky are trapped in dark ice"). A pastel twilight: a
 * periwinkle-to-rose sky with aurora ribbons, tinted snow, frosted pines,
 * igloos, a frozen lake, snowmen, sleds, glowing ice lanterns, Glace's ice
 * palace, the chapter's snow-hare (the tap creature on every sector) and the
 * Frozen Star Shard (the rescue on 8-3).
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on everything mid- and foreground, gradients only in the sky and far snow.
 * Twilight is painted through HUE, never through darkness (§2.3): the sky's
 * top is a bright periwinkle, the snow is lilac- and rose-tinted (never grey),
 * and every light is warm.
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp, ease } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink, twinkleAt } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { inkFill, mix, star5, heart, cloud } from '@/game/map/kitSky'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'

type Lobe = readonly [number, number, number]
export type Pt = readonly [number, number]
const LW = 5

export const T = {
  skyTop: '#8577ff',
  skyMid: '#b77cff',
  skyLow: '#ff7dc4',
  horizon: '#ffb0cf',
  far: '#e8dcff',
  farTop: '#f4eeff',
  far2: '#d9c8fc',
  far2Top: '#ebe1ff',
  farPine: '#c4b4f6',
  snow: '#f8f3ff',
  snowShade: '#d9c8ff',
  snowDeep: '#bea8f4',
  snowPink: '#ffdcef',
  ice: '#7fd0ff',
  iceShade: '#55a8ef',
  iceLite: '#caefff',
  iceWall: '#c8ecff',
  iceWallShade: '#a6c8fb',
  pine: '#45e0b8',
  pineShade: '#26b392',
  pineLite: '#a6f5de',
  pink: '#ff7fbf',
  pinkShade: '#e2579f',
  pinkLite: '#ffc4e1',
  lemon: '#ffd34d',
  lemonShade: '#eaa63a',
  mint: '#3fe0ae',
  lilac: '#a77cff',
  lilacShade: '#8458e6',
  blue: '#56b6ff',
  coral: '#ff7a8a',
  coralShade: '#e0566e',
  carrot: '#ff9a3d',
  glow: '#ffcf5c',
  glowLite: '#fff0b0',
  metal: '#9d8cf2',
  metalShade: '#7a66d6',
  wood: '#e8a06c',
  woodShade: '#c07850'
}

/** Chapter 8's base tones, for the candy-floor check (§9.6.1). */
export const TUNDRA_TONES: readonly string[] = [T.skyTop, T.skyMid, T.skyLow, T.ice, T.pine, T.pink, T.lemon, T.mint, T.lilac, T.blue]

export type Tones = readonly [string, string, string]
export const PINE_T: Tones = [T.pine, T.pineShade, T.pineLite]
export const PINK_T: Tones = [T.pink, T.pinkShade, T.pinkLite]
export const LILAC_T: Tones = ['#8c8cff', '#6a66e6', '#c8c8ff']
/** A snowy "pot" for plain igloos and snow-walled buildings. */
export const SNOW_POT: Pot = { id: 'snow', base: T.snow, shade: T.snowShade, lite: '#ffffff' }

/* ---------------------------------------------------------------- helpers */

const circles = (g: G2D, lobes: readonly Lobe[], dx = 0, dy = 0, k = 1): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + dx * r + r * k, y + dy * r)
    g.arc(x + dx * r, y + dy * r, r * k, 0, TAU)
  }
}

export const disc = (g: G2D, x: number, y: number, r: number, colour: string, w = 0): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, colour)
  if (w) ink(g, w)
}

/** A smooth path through points (quadratic midpoints), optionally closed. */
export const smooth = (g: G2D, pts: readonly Pt[], move = true): void => {
  if (move) g.moveTo(...pts[0]!)
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!
    const [bx, by] = pts[i + 1]!
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.lineTo(...pts[pts.length - 1]!)
}

/** A four-point twinkle added to the CURRENT path. */
export const twinkle = (g: G2D, x: number, y: number, r: number): void => {
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y)
  g.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r)
  g.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y)
  g.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r)
}

/** A six-armed snowflake (stroked), centre (x, y), arm `r`. */
export const flake = (g: G2D, x: number, y: number, r: number, rot = 0): void => {
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * PI) / 3
    const ex = x + cos(a) * r
    const ey = y + sin(a) * r
    g.moveTo(x, y)
    g.lineTo(ex, ey)
    const mx = x + cos(a) * r * 0.55
    const my = y + sin(a) * r * 0.55
    g.moveTo(mx + cos(a + 0.9) * r * 0.3, my + sin(a + 0.9) * r * 0.3)
    g.lineTo(mx, my)
    g.lineTo(mx + cos(a - 0.9) * r * 0.3, my + sin(a - 0.9) * r * 0.3)
  }
}

/* ------------------------------------------------------------------- sky */

export interface SkyTOpts {
  /** A crescent moon: centre x, y, radius. */
  moon?: readonly [number, number, number]
  /** Seed of the baked star scatter. */
  stars?: number
  /** Soft cloud wisps, lit pink from below. */
  wisps?: readonly (readonly [number, number, number])[]
}

/** A crescent moon's path (outer circle minus an offset circle). */
const crescent = (g: G2D, x: number, y: number, r: number, d: number): void => {
  const a = Math.acos(d / (2 * r))
  g.beginPath()
  g.arc(x, y, r, a, TAU - a, false)
  g.arc(x + d, y, r, PI + a, PI - a, true)
  g.closePath()
}

/** A twilight wisp — unoutlined, lilac above and rose-lit below. */
export const wisp = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 56 * s, y + 6 * s, 26 * s], [x - 18 * s, y - 8 * s, 34 * s], [x + 30 * s, y, 30 * s], [x + 66 * s, y + 8 * s, 20 * s]]
  circles(g, lobes)
  g.rect(x - 60 * s, y + 4 * s, 128 * s, 24 * s)
  fill(g, '#ffc6e6')
  circles(g, lobes, 0, -0.2, 0.9)
  fill(g, '#f6eaff')
}

/** The tundra's twilight sky: bright periwinkle down to rose, baked stars,
 *  an optional crescent moon and wisps. */
export const skyT = (g: G2D, o: SkyTOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 470)
  gr.addColorStop(0, T.skyTop)
  gr.addColorStop(0.44, T.skyMid)
  gr.addColorStop(0.8, T.skyLow)
  gr.addColorStop(1, T.horizon)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.stars !== undefined) {
    const r = seeded(o.stars)
    g.beginPath()
    for (let i = 0; i < 46; i++) {
      const x = r() * SEC_W
      const y = r() * r() * 300 + 8
      const s = 1.6 + r() * 2.2
      g.moveTo(x + s, y)
      g.arc(x, y, s, 0, TAU)
    }
    for (let i = 0; i < 9; i++) twinkle(g, r() * SEC_W, 20 + r() * 200, 6 + r() * 5)
    g.globalAlpha = 0.9
    fill(g, '#fff8d8')
    g.globalAlpha = 1
  }
  if (o.moon) {
    const [mx, my, mr] = o.moon
    const glow = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2)
    glow.addColorStop(0, 'rgba(255,244,214,0.75)')
    glow.addColorStop(1, 'rgba(255,244,214,0)')
    g.fillStyle = glow
    g.fillRect(mx - mr * 3.3, my - mr * 3.3, mr * 6.6, mr * 6.6)
    crescent(g, mx, my, mr, mr * 0.7)
    fill(g, '#fff3b8')
    g.save()
    crescent(g, mx, my, mr, mr * 0.7)
    g.clip()
    disc(g, mx - mr * 0.5, my - mr * 0.3, mr * 0.2, '#fffbe4')
    disc(g, mx - mr * 0.62, my + mr * 0.3, mr * 0.12, '#ffe79a')
    g.restore()
  }
  for (const [x, y, s] of o.wisps ?? []) wisp(g, x, y, s)
}

/* ---------------------------------------------------------------- aurora */

/** One aurora ribbon: its spine points, colour, light core, width, phase. */
export interface Ribbon { pts: readonly Pt[]; col: string; lite: string; w: number; ph: number }

export const AUR = { green: '#52e89a', greenLite: '#c8ffe2', teal: '#3ee3d4', tealLite: '#c2fbf6', pink: '#ff7fd0', pinkLite: '#ffd0f0' }

/**
 * The aurora (a live prop): each ribbon is a soft glowing band with a bright
 * core and hanging curtain streaks. At rest it hangs still and a little dim
 * ("trapped"); alive, it ripples and the curtains shimmer. No gradients, a
 * handful of strokes per ribbon.
 */
export const aurora = (g: G2D, rs: readonly Ribbon[], t: number, alive: number): void => {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const dim = 0.62 + 0.38 * alive
  for (const r of rs) {
    const n = r.pts.length
    const ys: number[] = []
    for (let i = 0; i < n; i++) ys.push(r.pts[i]![1] + sin(t * 0.8 + i * 1.25 + r.ph) * 16 * alive)
    const spine = (dy: number): void => {
      g.beginPath()
      g.moveTo(r.pts[0]![0], ys[0]! + dy)
      for (let i = 1; i < n - 1; i++) {
        const ax = r.pts[i]![0]
        const bx = r.pts[i + 1]![0]
        g.quadraticCurveTo(ax, ys[i]! + dy, (ax + bx) / 2, (ys[i]! + ys[i + 1]!) / 2 + dy)
      }
      g.lineTo(r.pts[n - 1]![0], ys[n - 1]! + dy)
    }
    // Hanging curtain streaks under the band.
    g.beginPath()
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < 3; j++) {
        const u = (j + 0.5) / 3
        const x = lerp(r.pts[i]![0], r.pts[i + 1]![0], u)
        const y = lerp(ys[i]!, ys[i + 1]!, u)
        const len = r.w * (1.2 + 0.5 * sin(t * 1.7 + i * 2.1 + j * 1.3 + r.ph) * alive + 0.3 * ((i + j) % 2))
        g.moveTo(x, y)
        g.lineTo(x + 4, y + len)
      }
    }
    g.globalAlpha = 0.2 * dim
    g.lineWidth = r.w * 0.34
    g.strokeStyle = r.col
    g.stroke()
    spine(r.w * 0.3)
    g.globalAlpha = 0.24 * dim
    g.lineWidth = r.w * 1.3
    g.stroke()
    spine(0)
    g.globalAlpha = 0.42 * dim
    g.lineWidth = r.w * 0.62
    g.stroke()
    spine(-r.w * 0.1)
    g.globalAlpha = 0.8 * dim
    g.lineWidth = r.w * 0.16
    g.strokeStyle = r.lite
    g.stroke()
  }
  g.restore()
}

/* -------------------------------------------------------------- far snow */

/** Two far snow bands, lighter and bluer, never outlined, with a sprinkle
 *  of far pines (art-style §5). */
export const farSnow = (g: G2D, y1: number, y2: number, seed: number, pines = 10): void => {
  const r = seeded(seed)
  const band = (y: number, base: string, top: string): void => {
    g.beginPath()
    g.moveTo(-10, y + (r() - 0.5) * 30)
    for (let x = 0; x <= SEC_W; x += 192) g.bezierCurveTo(x + 64, y - 36 - r() * 44, x + 128, y + r() * 26, x + 192, y + (r() - 0.5) * 26)
    g.lineTo(SEC_W + 10, SEC_H)
    g.lineTo(-10, SEC_H)
    g.closePath()
    fill(g, base)
    g.save()
    g.clip()
    g.translate(-18, -10)
    g.fillStyle = top
    g.fillRect(0, y - 90, SEC_W + 40, 36)
    g.restore()
  }
  band(y1, T.far, T.farTop)
  // Far pines along the first band's crest, as soft lilac spires.
  g.fillStyle = T.farPine
  for (let i = 0; i < pines; i++) {
    const x = r() * SEC_W
    const h = 26 + r() * 30
    const y = y1 + 14 + r() * 26
    g.beginPath()
    g.moveTo(x, y - h)
    g.quadraticCurveTo(x + h * 0.18, y - h * 0.4, x + h * 0.34, y)
    g.lineTo(x - h * 0.34, y)
    g.quadraticCurveTo(x - h * 0.18, y - h * 0.4, x, y - h)
    g.fill()
  }
  band(y2, T.far2, T.far2Top)
}

/** An outlined snow hill from x0 to x1 peaking at (px, py), cel-shaded
 *  lilac on its far side, with a rose-lit crest. */
export const snowHill = (g: G2D, x0: number, x1: number, px: number, py: number, base: number): void => {
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
  fill(g, T.snow)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(px + (x1 - px) * 0.2, SEC_H)
  g.bezierCurveTo(px + (x1 - px) * 0.25, py + 110, px + (x1 - px) * 0.5, py + 40, x1 + 20, py + 60)
  g.lineTo(x1 + 20, SEC_H)
  fill(g, T.snowShade)
  g.beginPath()
  g.moveTo(x0 + (px - x0) * 0.3, base + 6)
  g.bezierCurveTo(px - (px - x0) * 0.4, py + 16, px - 30, py + 6, px, py + 8)
  g.lineWidth = 8
  g.strokeStyle = T.snowPink
  g.stroke()
  g.restore()
  g.beginPath()
  crest()
  ink(g)
}

/** The front snowfield band, with a rose-lit crest and lilac drift shadows. */
export const snowField = (g: G2D, yl: number, ym: number, yr: number, seed: number): void => {
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
  fill(g, T.snow)
  g.save()
  path()
  g.clip()
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const x = 60 + r() * (SEC_W - 120)
    const y = Math.max(yl, ym, yr) + 60 + r() * 120
    const rx = 90 + r() * 110
    g.moveTo(x + rx, y)
    g.ellipse(x, y, rx, 16 + r() * 10, 0, 0, TAU)
  }
  g.globalAlpha = 0.55
  fill(g, T.snowShade)
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(10, yl + 7)
  g.bezierCurveTo(200, yl - 22, 420, ym - 12, 610, ym + 8)
  g.lineWidth = 8
  g.strokeStyle = T.snowPink
  g.stroke()
  g.restore()
  path()
  ink(g)
}

/** A snowdrift / snowbank — an outlined lumpy mound in snow colours. */
export const drift = (g: G2D, lobes: readonly Lobe[], floor = 0): void => cloud(g, lobes, floor, T.snow, T.snowShade)

/** A trodden path through the snow: a soft lilac groove along `pts`. */
export const trail = (g: G2D, pts: readonly Pt[], w: number): void => {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  smooth(g, pts)
  g.lineWidth = w
  g.strokeStyle = T.snowShade
  g.stroke()
  g.lineWidth = w * 0.5
  g.strokeStyle = '#ece2ff'
  g.stroke()
  g.restore()
}

/** Little hare tracks hopping along `pts` (one set of four prints each). */
export const hareTracks = (g: G2D, pts: readonly Pt[], s = 1): void => {
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const a = i + 1 < pts.length ? Math.atan2(pts[i + 1]![1] - y, pts[i + 1]![0] - x) : 0
    const c = cos(a)
    const sn = sin(a)
    for (const [f, sd, r] of [[10, -6, 5], [10, 6, 5], [-6, -3, 3.4], [-12, 3, 3.4]] as const) {
      const px = x + (c * f - sn * sd) * s
      const py = y + (sn * f + c * sd) * s * 0.6
      g.moveTo(px + r * s, py)
      g.ellipse(px, py, r * s, r * s * 0.62, a, 0, TAU)
    }
  }
  fill(g, T.snowDeep)
}

/** A wooden rack with sleds standing up in it, at (x, y). */
export const sledRack = (g: G2D, x: number, y: number, cols: readonly string[]): void => {
  for (let i = 0; i < cols.length; i++) {
    const sx = x - 44 + i * 44
    const lean = (i - 1) * 0.08
    g.save()
    g.translate(sx, y - 4)
    g.rotate(lean)
    g.beginPath()
    g.roundRect(-16, -108, 32, 104, [16, 16, 6, 6])
    fill(g, cols[i]!)
    ink(g, 4)
    g.beginPath()
    g.moveTo(-9, -84)
    g.lineTo(-9, -16)
    g.moveTo(9, -84)
    g.lineTo(9, -16)
    g.lineWidth = 3
    g.strokeStyle = '#ffffff'
    g.globalAlpha = 0.7
    g.stroke()
    g.globalAlpha = 1
    g.beginPath()
    g.moveTo(-20, -4)
    g.lineTo(-20, -96)
    g.quadraticCurveTo(-20, -120, 0, -122)
    g.moveTo(20, -4)
    g.lineTo(20, -96)
    g.quadraticCurveTo(20, -120, 0, -122)
    g.lineWidth = 9
    g.strokeStyle = INK
    g.lineCap = 'round'
    g.stroke()
    g.lineWidth = 4
    g.strokeStyle = T.lemonShade
    g.stroke()
    g.restore()
  }
  g.beginPath()
  g.roundRect(x - 80, y - 48, 160, 14, 5)
  g.roundRect(x - 84, y - 6, 168, 14, 5)
  fill(g, T.wood)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x - 30, y - 50, 40, 8, 0, PI, TAU)
  g.ellipse(x + 44, y - 50, 30, 7, 0, PI, TAU)
  fill(g, T.snow)
  ink(g, 2.6)
}

/** A small snowbank standing on (x, y), scale `s`. */
export const snowbank = (g: G2D, x: number, y: number, s: number): void =>
  drift(g, [[x - 46 * s, y - 20 * s, 28 * s], [x - 8 * s, y - 40 * s, 38 * s], [x + 36 * s, y - 24 * s, 30 * s], [x, y - 16 * s, 30 * s]])

/**
 * Snow texture and sparkle over a band: lilac bumps, little frost crystals,
 * snowflake "flowers" and winter berries — the snow's grass-and-flowers.
 */
export const snowDress = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const hit = (x: number, y: number): boolean => avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)
  g.beginPath()
  for (let i = 0; i < 22; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const s = 7 + r() * 6
    if (hit(x, y)) continue
    g.moveTo(x - 2 * s, y)
    g.arc(x - s, y, s, PI, TAU)
    g.arc(x + s * 0.8, y, s * 0.8, PI, TAU)
  }
  g.lineWidth = 3.5
  g.strokeStyle = T.snowShade
  g.lineCap = 'round'
  g.stroke()
  const cols = [T.blue, T.pink, T.lilac, T.mint]
  for (let i = 0; i < n; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const s = 7 + r() * 5
    const kind = i % 3
    if (hit(x, y)) continue
    if (kind === 0) {
      // A little frost-flower: a coloured snowflake.
      flake(g, x, y, s, r())
      g.lineWidth = 6
      g.strokeStyle = INK
      g.stroke()
      g.lineWidth = 3
      g.strokeStyle = cols[i % 4]!
      g.stroke()
    } else if (kind === 1) {
      // A sprig of winter berries.
      g.beginPath()
      g.moveTo(x, y + 2)
      g.quadraticCurveTo(x - 3, y - 8, x - 8, y - 12)
      g.moveTo(x, y + 2)
      g.quadraticCurveTo(x + 4, y - 10, x + 9, y - 13)
      ink(g, 2.4)
      g.beginPath()
      for (const [dx, dy] of [[-8, -13], [9, -14], [1, -6]] as const) {
        g.moveTo(x + dx + 5, y + dy)
        g.arc(x + dx, y + dy, 5, 0, TAU)
      }
      fill(g, i % 2 ? T.pink : T.coral)
      ink(g, 2)
    } else {
      // A tiny ice crystal cluster.
      g.beginPath()
      for (const [dx, h, a] of [[-5, 16, -0.3], [3, 22, 0.05], [9, 13, 0.4]] as const) {
        const bx = x + dx
        g.moveTo(bx - 4 * cos(a), y)
        g.lineTo(bx - 4 + sin(a) * h * 0.8, y - h * cos(a) * 0.8)
        g.lineTo(bx + sin(a) * h, y - h * cos(a))
        g.lineTo(bx + 4 + sin(a) * h * 0.8, y - h * cos(a) * 0.8)
        g.lineTo(bx + 4 * cos(a), y)
        g.closePath()
      }
      fill(g, i % 2 ? T.iceLite : '#e4d8ff')
      ink(g, 2.2)
    }
  }
}

/* ----------------------------------------------------------------- flora */

/** A frosted pine standing at (x, y), scale `s`: scalloped tiers, each with
 *  a snow cap dripping over its shoulders and a lilac cel shadow. */
export const frostPine = (g: G2D, x: number, y: number, s: number, tone: Tones = PINE_T, tiers = 3): void => {
  g.beginPath()
  g.roundRect(x - 9 * s, y - 38 * s, 18 * s, 40 * s, 4 * s)
  fill(g, C.trunk)
  ink(g, 4)
  for (let i = 0; i < tiers; i++) {
    const w = (74 - i * 17) * s
    const top = y - (80 + i * 48) * s
    const bot = y - (26 + i * 46) * s
    const tier = (): void => {
      g.beginPath()
      g.moveTo(x, top - 24 * s)
      g.quadraticCurveTo(x + w * 0.3, top + 6 * s, x + w, bot)
      const n = 4
      const step = (2 * w) / n
      for (let j = 0; j < n; j++) g.quadraticCurveTo(x + w - (j + 0.5) * step, bot + 18 * s, x + w - (j + 1) * step, bot)
      g.quadraticCurveTo(x - w * 0.3, top + 6 * s, x, top - 24 * s)
      g.closePath()
    }
    tier()
    fill(g, tone[0])
    g.save()
    tier()
    g.clip()
    g.beginPath()
    g.rect(x + w * 0.16, top - 40 * s, w * 2, bot - top + 60 * s)
    fill(g, tone[1])
    // The snow cap: the tier's own shape lifted, clipped to the tier.
    const lift = (bot - top) * 0.55
    g.translate(0, -lift)
    tier()
    fill(g, T.snow)
    tier()
    g.clip()
    g.translate(0, lift)
    g.beginPath()
    g.rect(x + w * 0.16, top - 60 * s, w * 2, bot - top + 60 * s)
    fill(g, T.snowShade)
    g.restore()
    tier()
    ink(g, 4)
  }
  disc(g, x, y - (80 + (tiers - 1) * 48 + 24) * s, 8 * s, T.snow, 3)
}

/** A round frosted shrub with berries (a tap creature's hiding place). */
export const frostShrub = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 44 * s, y - 34 * s, 32 * s], [x, y - 58 * s, 42 * s], [x + 44 * s, y - 34 * s, 32 * s], [x, y - 30 * s, 40 * s]]
  circles(g, lobes)
  inkFill(g, T.pine)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 40 * s, y - 6 * s, 44 * s], [x - 30 * s, y + 4 * s, 34 * s]])
  fill(g, T.pineShade)
  circles(g, [[x - 40 * s, y - 60 * s, 24 * s], [x - 2 * s, y - 92 * s, 30 * s], [x + 40 * s, y - 60 * s, 22 * s]])
  fill(g, T.snow)
  circles(g, [[x + 30 * s, y - 72 * s, 20 * s]])
  fill(g, T.snowShade)
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-40, -30], [-12, -48], [20, -36], [44, -22], [-4, -22]] as const) {
    g.moveTo(x + dx * s + 6 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 6 * s, 0, TAU)
  }
  fill(g, T.pink)
  ink(g, 2.4)
}

/** A round candy tree, frosted: a soft stick and a two-toned crown with a
 *  snow cap. */
export const candyTree = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
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
  circles(g, [[x - 46 * s, y - 150 * s, 30 * s], [x - 4 * s, y - 190 * s, 42 * s], [x + 42 * s, y - 154 * s, 30 * s]])
  fill(g, T.snow)
  circles(g, [[x + 40 * s, y - 166 * s, 26 * s]])
  fill(g, T.snowShade)
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-36, -112], [18, -120], [44, -100]] as const) {
    g.moveTo(x + dx * s + 5 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 5 * s, 0, TAU)
  }
  fill(g, '#ffffff')
}

/* ----------------------------------------------------------------- props */

/** Where a plain lantern's flame sits: for `glows`. */
export type Glow = readonly [number, number, number]

/** Where an ice lantern's flame glows (for `glows`). */
export const iceGlow = (x: number, y: number, s: number): Glow => [x, y - 20 * s, 30 * s]
/** Where a crook lantern glows (for `glows`). */
export const crookGlow = (x: number, y: number, h: number, dir = 1): Glow => [x + dir * 30, y - h + 12, 34]
/** Where a crook's hook ends (a light string can hang from it). */
export const crookTip = (x: number, y: number, h: number, dir = 1): Pt => [x + dir * 30, y - h - 22]

/** An ice-block lantern standing on (x, y): a rounded block of ice with a
 *  little candle inside (the flame's glow is a live prop). */
export const iceLantern = (g: G2D, x: number, y: number, s: number): Glow => {
  const w = 34 * s
  const h = 40 * s
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 8 * s)
  fill(g, T.iceWall)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.18, y - h, w, h)
  fill(g, T.iceWallShade)
  disc(g, x, y - h * 0.45, 12 * s, T.glowLite)
  g.restore()
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 8 * s)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(x - 5 * s, y - h * 0.42, 10 * s, h * 0.34, 3 * s)
  fill(g, '#fff4e6')
  ink(g, 2)
  g.beginPath()
  g.moveTo(x, y - h * 0.62)
  g.quadraticCurveTo(x + 6 * s, y - h * 0.48, x, y - h * 0.42)
  g.quadraticCurveTo(x - 6 * s, y - h * 0.48, x, y - h * 0.62)
  fill(g, T.glow)
  ink(g, 1.8)
  g.beginPath()
  g.ellipse(x - w * 0.22, y - h * 0.7, 3 * s, 8 * s, 0.2, 0, TAU)
  fill(g, '#ffffff')
  return [x, y - h * 0.5, 30 * s]
}

/** A lantern post with a round paper lantern hanging from a crook. */
export const lampCrook = (g: G2D, x: number, y: number, h: number, col: string, dir = 1): Glow => {
  g.beginPath()
  g.roundRect(x - 5, y - h, 10, h, 5)
  fill(g, T.woodShade)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(x, y - h + 4)
  g.quadraticCurveTo(x, y - h - 26, x + dir * 30, y - h - 22)
  g.lineWidth = 11
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = T.woodShade
  g.stroke()
  const lx = x + dir * 30
  const ly = y - h + 12
  g.beginPath()
  g.moveTo(lx, y - h - 22)
  g.lineTo(lx, ly - 18)
  ink(g, 2.4)
  paperLantern(g, lx, ly, 18, col)
  return [lx, ly, 34]
}

/** A round paper lantern at (x, y), radius r. */
export const paperLantern = (g: G2D, x: number, y: number, r: number, col: string): void => {
  g.beginPath()
  g.roundRect(x - r * 0.45, y - r * 1.12, r * 0.9, r * 0.3, 2)
  g.roundRect(x - r * 0.45, y + r * 0.82, r * 0.9, r * 0.3, 2)
  fill(g, T.lemonShade)
  ink(g, 2.4)
  g.beginPath()
  g.ellipse(x, y, r, r * 0.92, 0, 0, TAU)
  fill(g, col)
  g.save()
  g.clip()
  g.beginPath()
  g.ellipse(x, y, r * 0.52, r, 0, 0, TAU)
  fill(g, T.glowLite)
  g.restore()
  g.beginPath()
  g.ellipse(x, y, r, r * 0.92, 0, 0, TAU)
  ink(g, 3)
  g.beginPath()
  g.ellipse(x, y, r * 0.52, r * 0.92, 0, 0, TAU)
  g.moveTo(x - r, y)
  g.lineTo(x + r, y)
  g.lineWidth = 1.8
  g.strokeStyle = INK
  g.globalAlpha = 0.45
  g.stroke()
  g.globalAlpha = 1
}

/** Points along a sagging string from (x0, y0) to (x1, y1). */
export const stringPts = (x0: number, y0: number, x1: number, y1: number, sag: number, n: number): Pt[] => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + sag * 2
  const out: Pt[] = []
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1)
    out.push([(1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1, (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1])
  }
  return out
}

/** A string of little round lights between two posts' tops. */
export const lightString = (g: G2D, x0: number, y0: number, x1: number, y1: number, sag: number, n: number, cols: readonly string[]): void => {
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1)
  ink(g, 2.4)
  const pts = stringPts(x0, y0, x1, y1, sag, n)
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    g.beginPath()
    g.ellipse(x, y + 8, 6.5, 8.5, 0, 0, TAU)
    fill(g, cols[i % cols.length]!)
    ink(g, 2.2)
    g.beginPath()
    g.rect(x - 3.5, y - 1, 7, 4)
    fill(g, INK)
  }
}

/** Warm glows about lights (a live prop): two soft discs each, breathing.
 *  At rest the lights are unlit. No gradients. */
export const glows = (g: G2D, pts: readonly Glow[], t: number, alive: number, col = '#ffe9a0'): void => {
  if (alive <= 0) return
  g.fillStyle = col
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i]!
    const b = 0.85 + 0.15 * sin(t * 2.6 + i * 1.9)
    g.globalAlpha = 0.16 * alive
    g.beginPath()
    g.arc(x, y, r * b, 0, TAU)
    g.fill()
    g.globalAlpha = 0.26 * alive
    g.beginPath()
    g.arc(x, y, r * 0.6 * b, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
}

/** Twinkling lights along a string (a live prop): each bulb's halo pulses. */
export const bulbGlow = (g: G2D, pts: readonly Pt[], t: number, alive: number): void => {
  if (alive <= 0) return
  g.fillStyle = '#fff4c8'
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const r = 13 + 5 * sin(t * 3.4 + i * 2.2)
    g.moveTo(x + r, y + 8)
    g.arc(x, y + 8, r, 0, TAU)
  }
  g.globalAlpha = 0.28 * alive
  g.fill()
  g.globalAlpha = 1
}

/** Snow falling in a box (a live prop): soft flakes drifting down and
 *  swaying. One path, one fill. Nothing at rest. */
export const snowfall = (g: G2D, x0: number, y0: number, w: number, h: number, n: number, t: number, alive: number): void => {
  if (alive <= 0) return
  g.globalAlpha = 0.9 * alive
  g.beginPath()
  let painted = false
  for (let i = 0; i < n; i++) {
    const f = (i * 0.618) % 1
    const sp = 22 + f * 22
    const y = y0 + ((t * sp + i * (h / n) * 2.3) % h)
    const x = x0 + ((i * 131.7) % w) + sin(t * 0.9 + i * 1.7) * 18
    const r = 2.6 + f * 2.8
    g.save()
    g.translate(x, y)
    painted = drawItem(g, SNOWFLAKE_ART, r * 2)
    g.restore()
    if (painted) continue
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  if (!painted) fill(g, '#ffffff')
  g.globalAlpha = 1
}

/** The flake's own width in SU — the reference's line weight is judged at the
 *  biggest of them, which is about six SU across. */
const SNOWFLAKE_UNIT = 6

/**
 * A falling flake as a painted still.
 *
 * The live snow draws plain white discs, because a six-armed flake at three SU
 * is a smudge whatever you draw; a PAINTING of one is a soft flake with a
 * little structure at the same size, which is the whole point of the layer.
 * The drift, the sway, the depth-scaling and the fade stay the system's.
 */
export const SNOWFLAKE_ART: ItemSpec = {
  ...PROP_ART.snowflake, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / SNOWFLAKE_UNIT, s / SNOWFLAKE_UNIT)
    g.beginPath()
    g.arc(0, 0, SNOWFLAKE_UNIT / 2, 0, TAU)
    fill(g, '#ffffff')
    g.restore()
  }
}

/** Twinkles winking at fixed spots (a live prop) — one path, one fill. */
export const winks = (g: G2D, pts: readonly (readonly [number, number, number])[], t: number, alive: number, col = '#fffbe0'): void => {
  if (alive <= 0) return
  g.beginPath()
  let lit = false
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i]!
    const k = Math.max(0, sin(t * 2.2 + i * 1.9))
    if (k > 0.05) lit = twinkleAt(g, x, y, r * k * alive, col)
  }
  if (lit) return
  g.fillStyle = col
  g.fill()
}

/** A shooting star crossing from (x0, y0) along (dx, dy), every `period`
 *  seconds (a live prop). */
export const shootingStar = (g: G2D, x0: number, y0: number, dx: number, dy: number, t: number, alive: number, period = 6, ph = 0): void => {
  if (alive <= 0) return
  const u = ((t + ph) % period) / 1.1
  if (u > 1) return
  const x = x0 + dx * u
  const y = y0 + dy * u
  const len = 0.22
  g.globalAlpha = alive * sin(u * PI)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x - dx * len, y - dy * len)
  g.lineCap = 'round'
  g.lineWidth = 5
  g.strokeStyle = '#fff6c8'
  g.stroke()
  g.lineWidth = 2
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.beginPath()
  if (!twinkleAt(g, x, y, 10, '#fffbe0')) fill(g, '#fffbe0')
  g.globalAlpha = 1
}

/* ------------------------------------------------------------- snowmen */

export interface SnowmanLook { scarf: string; scarfShade: string; hat: 'beanie' | 'muffs' | 'top'; hatCol: string }

/** A chubby snowman standing at (x, y), scale `s`, waving: coal-dot eyes with
 *  catch-lights, a round carrot nose, a scarf and a hat. `wave` tilts the
 *  raised arm (a live prop can pass a moving value). */
export const snowman = (g: G2D, x: number, y: number, s: number, look: SnowmanLook, wave = 0, dir = 1): void => {
  const S = (v: number): number => v * s
  const b1: Lobe = [x, y - S(42), S(46)]
  const b2: Lobe = [x, y - S(104), S(34)]
  const b3: Lobe = [x + dir * S(2), y - S(152), S(27)]
  // Stick arms behind the middle ball.
  const arm = (ax: number, ay: number, a: number, len: number): void => {
    const ex = ax + cos(a) * len
    const ey = ay + sin(a) * len
    g.beginPath()
    g.moveTo(ax, ay)
    g.lineTo(ex, ey)
    g.moveTo(ax + cos(a) * len * 0.62, ay + sin(a) * len * 0.62)
    g.lineTo(ax + cos(a) * len * 0.62 + cos(a - 0.8) * len * 0.3, ay + sin(a) * len * 0.62 + sin(a - 0.8) * len * 0.3)
    g.lineWidth = S(9)
    g.strokeStyle = INK
    g.lineCap = 'round'
    g.stroke()
    g.lineWidth = S(4)
    g.strokeStyle = T.woodShade
    g.stroke()
  }
  arm(x - dir * S(26), y - S(110), dir > 0 ? PI + 0.5 : -0.5, S(56))
  arm(x + dir * S(26), y - S(112), dir > 0 ? -0.7 - wave : PI + 0.7 + wave, S(56))
  circles(g, [b1, b2, b3])
  inkFill(g, T.snow)
  g.save()
  circles(g, [b1, b2, b3])
  g.clip()
  for (const [bx, by, br] of [b1, b2, b3]) {
    g.beginPath()
    g.arc(bx + br * 0.34, by + br * 0.3, br * 0.92, 0, TAU)
    g.arc(bx - br * 0.08, by - br * 0.06, br * 0.96, 0, TAU, true)
    fill(g, T.snowShade)
  }
  g.restore()
  // Pebble buttons.
  g.beginPath()
  for (const dy of [-116, -98, -80]) {
    g.moveTo(x + S(5.5), y + S(dy))
    g.arc(x, y + S(dy), S(5.5), 0, TAU)
  }
  fill(g, look.scarf)
  ink(g, 2.2)
  // The face.
  const [hx, hy] = [b3[0], b3[1]]
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(hx + d * S(10), hy - S(5), S(4.2), S(5.4), 0, 0, TAU)
    fill(g, INK)
    disc(g, hx + d * S(10) - S(1.4), hy - S(7), S(1.6), '#ffffff')
  }
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(hx - S(17), hy + S(5), S(5), S(3), 0, 0, TAU)
  g.moveTo(hx + S(22), hy + S(5))
  g.ellipse(hx + S(17), hy + S(5), S(5), S(3), 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(hx + dir * S(2), hy - S(2))
  g.quadraticCurveTo(hx + dir * S(22), hy + S(1), hx + dir * S(26), hy + S(4))
  g.quadraticCurveTo(hx + dir * S(14), hy + S(8), hx + dir * S(2), hy + S(6))
  g.closePath()
  fill(g, T.carrot)
  ink(g, 2.4)
  g.beginPath()
  g.arc(hx, hy + S(9), S(6), 0.3, PI - 0.3)
  ink(g, 2.2)
  // The scarf, with a tail hanging on the far side.
  g.beginPath()
  g.roundRect(x - dir * S(20) - S(7), y - S(130), S(14), S(40), S(5))
  fill(g, look.scarfShade)
  ink(g, 3)
  g.beginPath()
  g.ellipse(x, y - S(128), S(30), S(10), 0, 0, TAU)
  fill(g, look.scarf)
  ink(g, 3.5)
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    g.moveTo(x - dir * S(20) - S(5) + i * S(5), y - S(90))
    g.lineTo(x - dir * S(20) - S(5) + i * S(5), y - S(82))
  }
  ink(g, 2.4)
  // The hat.
  if (look.hat === 'beanie') {
    g.beginPath()
    g.moveTo(hx - S(26), hy - S(12))
    g.bezierCurveTo(hx - S(26), hy - S(48), hx + S(26), hy - S(48), hx + S(26), hy - S(12))
    g.closePath()
    fill(g, look.hatCol)
    ink(g, 3.5)
    g.beginPath()
    g.roundRect(hx - S(28), hy - S(20), S(56), S(12), S(6))
    fill(g, '#ffffff')
    ink(g, 3)
    disc(g, hx + S(2), hy - S(44), S(9), '#ffffff', 3)
  } else if (look.hat === 'muffs') {
    g.beginPath()
    g.arc(hx, hy - S(2), S(28), PI * 1.1, PI * 1.9)
    g.lineWidth = S(9)
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = S(4.5)
    g.strokeStyle = look.hatCol
    g.stroke()
    for (const d of [-1, 1]) disc(g, hx + d * S(26), hy - S(4), S(10), look.hatCol, 3)
  } else {
    g.beginPath()
    g.roundRect(hx - S(18), hy - S(58), S(36), S(38), S(4))
    fill(g, look.hatCol)
    ink(g, 3.5)
    g.beginPath()
    g.roundRect(hx - S(28), hy - S(24), S(56), S(9), S(4))
    fill(g, look.hatCol)
    ink(g, 3)
    g.beginPath()
    g.rect(hx - S(18), hy - S(34), S(36), S(8))
    fill(g, look.scarf)
  }
}

/* ------------------------------------------------------------ buildings */

/** Where an igloo's stovepipe smokes from. */
export const iglooPipe = (x: number, y: number, R: number): Pt => [x + R * 0.46, y - R * 0.94 * 0.88 - R * 0.34]

/**
 * An igloo standing at (x, y), radius R: a dome of ice blocks in the pot's
 * colours (frosty seams in its light tone), a snow cap, an entrance tunnel
 * with a warm lantern-lit doorway facing `dir`, a lit round window and a
 * little stovepipe. The DOME is the landmark.
 */
export const igloo = (g: G2D, x: number, y: number, R: number, pot: Pot, dir = 1, pipe = true): void => {
  const H = R * 0.94
  const dome = (): void => {
    g.beginPath()
    g.moveTo(x - R, y)
    g.ellipse(x, y, R, H, 0, PI, TAU)
    g.closePath()
  }
  if (pipe) {
    const [px, py] = iglooPipe(x, y, R)
    g.beginPath()
    g.roundRect(px - R * 0.07, py, R * 0.14, R * 0.34, 3)
    fill(g, T.metal)
    ink(g, 4)
    g.beginPath()
    g.roundRect(px - R * 0.1, py - 6, R * 0.2, 12, 5)
    fill(g, T.metalShade)
    ink(g, 3.5)
  }
  const blocks = (cx: number, by: number, rw: number, rh: number, rows: number, seed: number): void => {
    g.beginPath()
    for (let i = 1; i < rows; i++) {
      const yy = by - rh * (i / rows)
      const wx = rw * Math.sqrt(Math.max(0, 1 - (i / rows) ** 2))
      g.moveTo(cx - wx, yy)
      g.quadraticCurveTo(cx, yy + rh * 0.07, cx + wx, yy)
    }
    for (let i = 0; i < rows - 1; i++) {
      const yb = by - rh * (i / rows)
      const yt = by - rh * ((i + 1) / rows)
      const wb = rw * Math.sqrt(Math.max(0, 1 - (i / rows) ** 2))
      const wt = rw * Math.sqrt(Math.max(0, 1 - ((i + 1) / rows) ** 2))
      const n = Math.max(2, Math.round((wb * 2) / (rw * 0.42)))
      for (let j = 1; j < n; j++) {
        const u = (j + ((i + seed) % 2) * 0.5) / n
        if (u >= 1) continue
        const xb = cx - wb + 2 * wb * u
        const xt = cx - wt + 2 * wt * u
        g.moveTo(xb, yb + rh * 0.06 * (1 - Math.abs(u * 2 - 1)))
        g.lineTo(lerp(xb, xt, 0.96), yt + rh * 0.06 * (1 - Math.abs(u * 2 - 1)))
      }
    }
    g.lineWidth = 3.5
    g.strokeStyle = pot.lite
    g.lineCap = 'round'
    g.stroke()
  }
  dome()
  fill(g, pot.base)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  g.ellipse(x + R * 0.62, y + H * 0.1, R * 0.72, H * 1.25, 0, 0, TAU)
  fill(g, pot.shade)
  blocks(x, y, R, H, 5, 0)
  g.beginPath()
  g.ellipse(x - R * 0.5, y - H * 0.62, R * 0.16, H * 0.07, -0.6, 0, TAU)
  fill(g, pot.lite)
  // The snow cap.
  const cap: Lobe[] = [[x - R * 0.42, y - H * 0.9, R * 0.18], [x - R * 0.14, y - H * 1.0, R * 0.22], [x + R * 0.18, y - H * 0.99, R * 0.2], [x + R * 0.44, y - H * 0.86, R * 0.14]]
  circles(g, cap)
  g.moveTo(x + R * 0.5, y - H * 1.04)
  g.ellipse(x, y - H * 1.04, R * 0.5, H * 0.14, 0, 0, TAU)
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  fill(g, T.snow)
  circles(g, cap.map(([a, b, r]) => [a + r * 0.3, b + r * 0.3, r * 0.7] as const))
  g.globalAlpha = 0.55
  fill(g, T.snowShade)
  g.globalAlpha = 1
  g.restore()
  dome()
  ink(g)
  // The lit round window.
  const wx = x - dir * R * 0.46
  const wy = y - H * 0.4
  disc(g, wx, wy, R * 0.13, T.glow, 4)
  disc(g, wx - R * 0.03, wy - R * 0.03, R * 0.07, T.glowLite)
  g.beginPath()
  g.moveTo(wx - R * 0.13, wy)
  g.lineTo(wx + R * 0.13, wy)
  g.moveTo(wx, wy - R * 0.13)
  g.lineTo(wx, wy + R * 0.13)
  ink(g, 2.6)
  // The entrance tunnel.
  const ex = x + dir * R * 0.36
  const ew = R * 0.42
  const eh = R * 0.64
  const tunnel = (): void => {
    g.beginPath()
    g.moveTo(ex - ew, y)
    g.lineTo(ex - ew, y - eh * 0.4)
    g.ellipse(ex, y - eh * 0.4, ew, eh * 0.6, 0, PI, TAU)
    g.lineTo(ex + ew, y)
    g.closePath()
  }
  tunnel()
  fill(g, pot.base)
  g.save()
  tunnel()
  g.clip()
  g.beginPath()
  g.rect(ex + ew * 0.35, y - eh * 1.2, ew * 2, eh * 1.4)
  fill(g, pot.shade)
  blocks(ex, y, ew, eh, 3, 1)
  circles(g, [[ex - ew * 0.45, y - eh * 0.96, ew * 0.34], [ex, y - eh * 1.06, ew * 0.42], [ex + ew * 0.5, y - eh * 0.92, ew * 0.3]])
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  fill(g, T.snow)
  g.restore()
  tunnel()
  ink(g)
  // The doorway: warm lantern light inside.
  const dw = ew * 0.64
  const dh = eh * 0.74
  g.beginPath()
  g.moveTo(ex - dw, y)
  g.lineTo(ex - dw, y - dh * 0.45)
  g.ellipse(ex, y - dh * 0.45, dw, dh * 0.55, 0, PI, TAU)
  g.lineTo(ex + dw, y)
  g.closePath()
  fill(g, T.glow)
  ink(g, 4)
  g.beginPath()
  g.ellipse(ex, y - dh * 0.3, dw * 0.55, dh * 0.42, 0, 0, TAU)
  fill(g, T.glowLite)
  g.beginPath()
  g.ellipse(ex, y - 4, dw * 0.8, 6, 0, 0, TAU)
  fill(g, T.pink)
}

/** Where a skating hut's chimney smokes from. */
export const hutChimney = (x: number, y: number, w: number): Pt => [x + w * 0.26, y - w * 0.52 - w * 0.5]

/**
 * A little wooden skating hut standing at (x, y), `w` wide: log walls, a
 * steep ROOF in the pot's colours under a thick snow cap with icicles, a
 * warm window, a round door and a pair of skates on a peg. The ROOF is the
 * landmark.
 */
export const skateHut = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.52
  const top = y - h
  // Chimney behind the roof.
  const [cx, cy] = hutChimney(x, y, w)
  g.beginPath()
  g.roundRect(cx - w * 0.06, cy, w * 0.12, w * 0.34, 3)
  fill(g, T.coral)
  ink(g)
  g.beginPath()
  g.roundRect(cx - w * 0.08, cy - 8, w * 0.16, 14, 6)
  fill(g, T.snow)
  ink(g, 3.5)
  // Log walls.
  const walls = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, top, w, h, 6)
  }
  walls()
  fill(g, T.wood)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.2, top, w, h)
  fill(g, T.woodShade)
  g.beginPath()
  for (let i = 1; i < 6; i++) {
    g.moveTo(x - w / 2, top + (h * i) / 6)
    g.lineTo(x + w / 2, top + (h * i) / 6)
  }
  g.lineWidth = 2.6
  g.strokeStyle = INK
  g.globalAlpha = 0.35
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  walls()
  ink(g)
  // Round log ends at the corners.
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    for (const d of [-1, 1]) {
      const lx = x + d * (w / 2 + 2)
      const ly = top + (h * (i + 0.5)) / 6
      g.moveTo(lx + h / 14, ly)
      g.arc(lx, ly, h / 14, 0, TAU)
    }
  }
  fill(g, '#f6c79c')
  ink(g, 2.6)
  // The roof, a steep soft gable, snow on top, icicles under the eaves.
  const e = w * 0.14
  const peak = top - w * 0.5
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 - e, top + 14)
    g.quadraticCurveTo(x - w * 0.2, peak + w * 0.1, x, peak)
    g.quadraticCurveTo(x + w * 0.2, peak + w * 0.1, x + w / 2 + e, top + 14)
    g.quadraticCurveTo(x, top - 2, x - w / 2 - e, top + 14)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 6, peak - 10, w, w)
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  g.beginPath()
  for (let row = 0; row < 3; row++) {
    const yy = top - w * 0.1 - row * w * 0.1
    for (let xx = x - w * 0.62; xx < x - 10; xx += 24) {
      g.moveTo(xx + 12, yy)
      g.arc(xx, yy, 12, 0, PI)
    }
  }
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = pot.base
  g.beginPath()
  for (let row = 0; row < 3; row++) {
    const yy = top - w * 0.1 - row * w * 0.1
    for (let xx = x + 30; xx < x + w * 0.7; xx += 24) {
      g.moveTo(xx + 12, yy)
      g.arc(xx, yy, 12, 0, PI)
    }
  }
  g.stroke()
  g.beginPath()
  g.ellipse(x - w * 0.26, top - w * 0.2, w * 0.06, w * 0.022, -0.8, 0, TAU)
  fill(g, pot.lite)
  // Snow along the ridge, dripping down both slopes.
  g.beginPath()
  g.moveTo(x - w * 0.34, top - w * 0.2)
  g.quadraticCurveTo(x - w * 0.14, peak - 10, x, peak - 14)
  g.quadraticCurveTo(x + w * 0.14, peak - 10, x + w * 0.34, top - w * 0.2)
  for (const [dx, dy] of [[0.26, -0.26], [0.16, -0.3], [0.06, -0.38], [-0.06, -0.38], [-0.16, -0.3], [-0.26, -0.26]] as const) {
    g.quadraticCurveTo(x + dx * w + 0.05 * w, top + dy * w + 0.06 * w, x + dx * w, top + dy * w)
  }
  g.closePath()
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  fill(g, T.snow)
  g.restore()
  roof()
  ink(g)
  // Icicles along the eaves.
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9
    const ix = x - w / 2 - e + (w + 2 * e) * u
    const iy = top + 14 - Math.sin(u * PI) * 14 + 2
    const L = 10 + ((i * 7) % 4) * 5
    g.moveTo(ix - 4, iy)
    g.quadraticCurveTo(ix - 2, iy + L * 0.7, ix, iy + L)
    g.quadraticCurveTo(ix + 2, iy + L * 0.7, ix + 4, iy)
    g.closePath()
  }
  fill(g, T.iceLite)
  ink(g, 2.2)
  // The door, a window glowing warm, the skates.
  g.beginPath()
  g.roundRect(x - w * 0.34, y - h * 0.74, w * 0.24, h * 0.74, [w * 0.12, w * 0.12, 2, 2])
  fill(g, T.pink)
  ink(g, 4)
  disc(g, x - w * 0.14, y - h * 0.36, 3.5, INK)
  heart(g, x - w * 0.22, y - h * 0.52, 6)
  fill(g, '#ffffff')
  const wx = x + w * 0.2
  const wy = y - h * 0.58
  g.beginPath()
  g.roundRect(wx - w * 0.1, wy - w * 0.08, w * 0.2, w * 0.16, 6)
  fill(g, T.glow)
  ink(g, 4)
  g.beginPath()
  g.moveTo(wx, wy - w * 0.08)
  g.lineTo(wx, wy + w * 0.08)
  g.moveTo(wx - w * 0.1, wy)
  g.lineTo(wx + w * 0.1, wy)
  ink(g, 2.6)
  g.beginPath()
  g.roundRect(wx - w * 0.13, wy + w * 0.08, w * 0.26, 10, 4)
  fill(g, T.snow)
  ink(g, 3)
  // A pair of skates hung on a peg.
  const kx = x + w * 0.02
  const ky = y - h * 0.3
  for (const d of [-1, 1]) {
    const bx = kx + d * 11
    g.beginPath()
    g.moveTo(kx, ky - 30)
    g.lineTo(bx, ky - 14)
    ink(g, 1.8)
    g.beginPath()
    g.roundRect(bx - 8, ky - 14, 16, 22, [4, 4, 2, 8])
    fill(g, '#ffffff')
    ink(g, 2.4)
    g.beginPath()
    g.moveTo(bx - 9, ky + 13)
    g.lineTo(bx + 10, ky + 13)
    g.quadraticCurveTo(bx + 14, ky + 12, bx + 12, ky + 8)
    ink(g, 2.4)
  }
}

/** A frozen lake centred (x, y): a snow rim, glassy ice with a pale sheen,
 *  the aurora's reflection, and the swirls of skaters' blades. */
export const frozenLake = (g: G2D, x: number, y: number, rx: number, ry: number, seed: number): void => {
  g.beginPath()
  g.ellipse(x, y + 6, rx + 26, ry + 16, 0, 0, TAU)
  fill(g, T.snowShade)
  ink(g, 4)
  const ice = (): void => {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, TAU)
  }
  ice()
  fill(g, T.ice)
  g.save()
  ice()
  g.clip()
  g.beginPath()
  g.ellipse(x + rx * 0.3, y + ry * 0.55, rx * 0.9, ry * 0.6, 0, 0, TAU)
  fill(g, T.iceShade)
  // The aurora's reflection: two soft bands.
  g.globalAlpha = 0.45
  g.beginPath()
  g.ellipse(x - rx * 0.2, y - ry * 0.28, rx * 0.62, ry * 0.12, -0.05, 0, TAU)
  fill(g, AUR.greenLite)
  g.beginPath()
  g.ellipse(x + rx * 0.3, y - ry * 0.02, rx * 0.4, ry * 0.08, 0.05, 0, TAU)
  fill(g, AUR.pinkLite)
  g.globalAlpha = 1
  g.beginPath()
  g.ellipse(x - rx * 0.42, y - ry * 0.46, rx * 0.2, ry * 0.08, -0.1, 0, TAU)
  fill(g, '#ffffff')
  // Skaters' swirls: loops and figure-eights cut in the ice.
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const sx = x + (r() - 0.5) * rx * 1.1
    const sy = y + (r() - 0.3) * ry * 0.7
    const a = 20 + r() * 26
    g.moveTo(sx - a * 1.8, sy + a * 0.2)
    g.bezierCurveTo(sx - a * 0.6, sy + a * 0.7, sx + a * 0.2, sy - a * 0.9, sx - a * 0.4, sy - a * 0.5)
    g.bezierCurveTo(sx - a, sy - a * 0.1, sx + a * 0.8, sy + a * 0.6, sx + a * 2, sy - a * 0.1)
  }
  g.moveTo(x - rx * 0.5, y + ry * 0.3)
  g.bezierCurveTo(x - rx * 0.2, y + ry * 0.8, x + rx * 0.1, y - ry * 0.2, x + rx * 0.45, y + ry * 0.35)
  g.lineWidth = 3.5
  g.strokeStyle = '#f2fbff'
  g.globalAlpha = 0.85
  g.lineCap = 'round'
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  ice()
  ink(g)
}

/** A wooden sled at (x, y) (the runners' contact), scale `s`, body `col`. */
export const sled = (g: G2D, x: number, y: number, s: number, col: string, dir = 1, rot = 0): void => {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(dir * s, s)
  // Runners.
  g.beginPath()
  g.moveTo(-50, 0)
  g.lineTo(44, 0)
  g.quadraticCurveTo(66, 0, 64, -18)
  g.quadraticCurveTo(62, -30, 52, -26)
  g.lineWidth = 11 / s
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 5 / s
  g.strokeStyle = T.lemonShade
  g.stroke()
  g.beginPath()
  for (const px of [-36, 0, 32]) {
    g.moveTo(px, 0)
    g.lineTo(px, -14)
  }
  ink(g, 3.5 / s)
  // The seat slats.
  g.beginPath()
  g.roundRect(-54, -26, 104, 16, 6)
  fill(g, col)
  ink(g, 3.5 / s)
  g.beginPath()
  g.moveTo(-20, -25)
  g.lineTo(-20, -11)
  g.moveTo(14, -25)
  g.lineTo(14, -11)
  ink(g, 2 / s)
  // The pull rope.
  g.beginPath()
  g.moveTo(56, -24)
  g.quadraticCurveTo(80, -2, 96, -6)
  ink(g, 2.4 / s)
  g.restore()
}

/**
 * The sled shed at the top of the run, standing at (x, y), `w` wide: a tall
 * A-frame whose big ROOF (in the pot's colours, flaring at the eaves, snow
 * on its shoulders) is the landmark; a little plank gable set into it with a
 * warm round window and a double door.
 */
export const chalet = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const H = w * 1.02
  const top = y - H
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x, top)
    g.quadraticCurveTo(x - w * 0.16, top + H * 0.42, x - w * 0.5, y - 16)
    g.quadraticCurveTo(x - w * 0.6, y - 4, x - w * 0.5, y)
    g.lineTo(x + w * 0.5, y)
    g.quadraticCurveTo(x + w * 0.6, y - 4, x + w * 0.5, y - 16)
    g.quadraticCurveTo(x + w * 0.16, top + H * 0.42, x, top)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 4, top - 10, w, H + 20)
  fill(g, pot.shade)
  // Shingle scallops, in the other tone on each side.
  for (const [col, x0, x1] of [[pot.shade, x - w * 0.62, x], [pot.base, x + 4, x + w * 0.62]] as const) {
    g.beginPath()
    for (let row = 0; row < 6; row++) {
      const yy = top + H * 0.3 + row * H * 0.12
      for (let xx = x0 + (row % 2) * 11; xx < x1; xx += 22) {
        g.moveTo(xx + 11, yy)
        g.arc(xx, yy, 11, 0, PI)
      }
    }
    g.lineWidth = 3
    g.strokeStyle = col
    g.globalAlpha = col === pot.base ? 0.6 : 1
    g.stroke()
    g.globalAlpha = 1
  }
  g.beginPath()
  g.ellipse(x - w * 0.2, top + H * 0.46, w * 0.03, H * 0.1, 0.35, 0, TAU)
  fill(g, pot.lite)
  // Snow on the roof's shoulders.
  g.beginPath()
  g.moveTo(x - w, top - 20)
  g.lineTo(x + w, top - 20)
  g.lineTo(x + w, top + H * 0.3)
  const n = 7
  for (let k = 0; k < n; k++) {
    const x0 = x + w * 0.5 - (k * w) / n
    const x1 = x + w * 0.5 - ((k + 1) * w) / n
    const yy = top + H * (0.24 + 0.05 * (1 - Math.abs(((k + 0.5) / n) * 2 - 1)))
    g.quadraticCurveTo((x0 + x1) / 2, yy + 26, x1, yy)
  }
  g.lineTo(x - w, top + H * 0.3)
  g.closePath()
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  fill(g, T.snow)
  g.beginPath()
  g.rect(x + 4, top - 20, w, H * 0.5)
  g.globalAlpha = 0.6
  fill(g, T.snowShade)
  g.globalAlpha = 1
  g.restore()
  roof()
  ink(g)
  // The plank gable set into the roof.
  const gt = top + H * 0.36
  const gw = w * 0.3
  const gable = (): void => {
    g.beginPath()
    g.moveTo(x, gt)
    g.lineTo(x + gw, y)
    g.lineTo(x - gw, y)
    g.closePath()
  }
  gable()
  fill(g, T.wood)
  g.save()
  gable()
  g.clip()
  g.beginPath()
  g.rect(x + gw * 0.3, gt, gw, y - gt)
  fill(g, T.woodShade)
  g.beginPath()
  for (let i = -3; i <= 3; i++) {
    g.moveTo(x + i * gw * 0.28, y)
    g.lineTo(x + i * gw * 0.28, gt)
  }
  g.lineWidth = 2.4
  g.strokeStyle = INK
  g.globalAlpha = 0.3
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  gable()
  g.lineJoin = 'round'
  ink(g)
  const [wx, wy] = chaletWindow(x, y, w)
  const wr = w * 0.2
  disc(g, wx, wy, wr * 0.35, T.glow, 4)
  disc(g, wx - wr * 0.08, wy - wr * 0.08, wr * 0.17, T.glowLite)
  g.beginPath()
  g.moveTo(wx - wr * 0.35, wy)
  g.lineTo(wx + wr * 0.35, wy)
  g.moveTo(wx, wy - wr * 0.35)
  g.lineTo(wx, wy + wr * 0.35)
  ink(g, 2.6)
  const dw = w * 0.26
  const dh = (y - gt) * 0.4
  g.beginPath()
  g.roundRect(x - dw / 2, y - dh, dw, dh, [dw / 2, dw / 2, 2, 2])
  fill(g, T.coral)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x, y - dh)
  g.lineTo(x, y)
  ink(g, 3)
  heart(g, x - dw * 0.24, y - dh * 0.5, 5)
  heart(g, x + dw * 0.24, y - dh * 0.5, 5)
  fill(g, '#ffffff')
  disc(g, x, top - 4, 9, T.lemon, 3)
}

/** Where the chalet's round window glows: centre and glow radius. */
export const chaletWindow = (x: number, y: number, w: number): Glow => {
  const gt = y - w * 1.02 * 0.64
  return [x, gt + (y - gt) * 0.36, w * 0.14]
}

/** A cluster of aurora ice crystals growing from the snow at (x, y). */
export const crystals = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  const prisms: readonly (readonly [number, number, number, number])[] = [[-22, 64, 16, -0.32], [22, 52, 14, 0.36], [0, 96, 20, 0.04]]
  for (const [dx, h, r, a] of prisms) {
    g.save()
    g.translate(x + dx * s, y)
    g.rotate(a)
    g.scale(s, s)
    const body = (): void => {
      g.beginPath()
      g.moveTo(-r, 4)
      g.lineTo(-r, -h + r)
      g.quadraticCurveTo(-r * 0.3, -h - r * 0.4, 0, -h - r * 0.5)
      g.quadraticCurveTo(r * 0.3, -h - r * 0.4, r, -h + r)
      g.lineTo(r, 4)
      g.closePath()
    }
    body()
    fill(g, t[0])
    g.save()
    body()
    g.clip()
    g.beginPath()
    g.rect(r * 0.2, -h - r, r, h + r + 8)
    fill(g, t[1])
    g.beginPath()
    g.rect(-r * 0.62, -h + r * 0.2, r * 0.3, h * 0.66)
    fill(g, t[2])
    g.restore()
    body()
    ink(g, LW / s)
    g.restore()
  }
  drift(g, [[x - 34 * s, y + 2, 16 * s], [x, y + 4, 22 * s], [x + 34 * s, y + 2, 16 * s]])
}

/* ---------------------------------------------------------- the palace */

const PAL = {
  wing: 250,
  outer: { dx: 322, top: 214, w: 90, spire: 136 },
  inner: { dx: 172, top: 286, w: 96, spire: 150 },
  keep: { top: 252, spire: 200 }
}

/** Glace's palace's pennant feet: the two outer spires, the two inner, the
 *  keep's (last). */
export const palaceFlags = (x: number, y: number): readonly Pt[] => [
  [x - PAL.outer.dx, y - PAL.outer.top - PAL.outer.spire - 10], [x + PAL.outer.dx, y - PAL.outer.top - PAL.outer.spire - 10],
  [x - PAL.inner.dx, y - PAL.inner.top - PAL.inner.spire - 10], [x + PAL.inner.dx, y - PAL.inner.top - PAL.inner.spire - 10],
  [x, y - PAL.keep.top + 2 - PAL.keep.spire - 10]
]

/** A crystal spire roof on base (cx, by), `rw` half-wide, `h` tall — faceted
 *  like an icicle turned up, in the pot's colours. */
export const crystalSpire = (g: G2D, cx: number, by: number, rw: number, h: number, pot: Pot): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(cx - rw, by)
    g.quadraticCurveTo(cx - rw * 0.9, by - h * 0.36, cx - rw * 0.2, by - h * 0.8)
    g.quadraticCurveTo(cx, by - h * 1.02, cx, by - h)
    g.quadraticCurveTo(cx, by - h * 1.02, cx + rw * 0.2, by - h * 0.8)
    g.quadraticCurveTo(cx + rw * 0.9, by - h * 0.36, cx + rw, by)
    g.quadraticCurveTo(cx, by + rw * 0.2, cx - rw, by)
    g.closePath()
  }
  path()
  fill(g, pot.base)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(cx + 2, by - h - 6)
  g.lineTo(cx + rw * 0.28, by + rw)
  g.lineTo(cx + rw * 2, by + rw)
  g.lineTo(cx + rw * 2, by - h - 6)
  g.closePath()
  fill(g, pot.shade)
  g.beginPath()
  g.moveTo(cx - 2, by - h)
  g.lineTo(cx - rw * 0.46, by + rw)
  g.lineTo(cx - rw * 0.2, by + rw)
  g.closePath()
  fill(g, pot.lite)
  g.lineWidth = 2.4
  g.strokeStyle = INK
  g.globalAlpha = 0.35
  g.beginPath()
  g.moveTo(cx, by - h)
  g.lineTo(cx + rw * 0.28, by + 4)
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  path()
  ink(g)
  disc(g, cx, by - h - 4, 6, T.iceLite, 3)
}

/** An ice tower: translucent walls with a lilac cel side, a lit arched
 *  window, a frosted band, its crystal spire. */
const iceTower = (g: G2D, cx: number, base: number, top: number, w: number, coneH: number, pot: Pot): void => {
  const body = (): void => {
    g.beginPath()
    g.roundRect(cx - w / 2, top, w, base - top, [8, 8, 0, 0])
  }
  body()
  fill(g, T.iceWall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(cx + w * 0.18, top, w, base - top)
  fill(g, T.iceWallShade)
  g.beginPath()
  g.moveTo(cx - w * 0.3, top + 20)
  g.lineTo(cx - w * 0.3, base)
  g.lineWidth = 6
  g.strokeStyle = '#ffffff'
  g.globalAlpha = 0.7
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.roundRect(cx - w * 0.15, top + (base - top) * 0.24, w * 0.3, w * 0.44, [w * 0.15, w * 0.15, 3, 3])
  fill(g, T.glow)
  ink(g, 4)
  g.beginPath()
  g.roundRect(cx - w / 2 - 8, top - 4, w + 16, 18, 9)
  fill(g, T.snow)
  ink(g, 3.5)
  crystalSpire(g, cx, top, w / 2 + 12, coneH, pot)
}

/**
 * Glace's Ice Palace, standing at (x, y): a keep under the tallest crystal
 * spire, two inner and two outer ice towers, an icy curtain wall with round
 * snow merlons, a great arched gate glowing warm, and a snowflake rose
 * window. Every SPIRE is the landmark.
 */
export const icePalace = (g: G2D, x: number, y: number, pot: Pot): void => {
  // The curtain wall.
  const wallTop = y - 140
  g.beginPath()
  g.rect(x - PAL.wing - 40, wallTop, (PAL.wing + 40) * 2, 140)
  for (let wx = x - PAL.wing - 26; wx <= x + PAL.wing + 26; wx += 38) {
    g.moveTo(wx + 15, wallTop)
    g.arc(wx, wallTop, 15, 0, TAU)
  }
  inkFill(g, T.iceWall)
  g.save()
  g.beginPath()
  g.rect(x - PAL.wing - 40, wallTop - 16, (PAL.wing + 40) * 2, 156)
  g.clip()
  g.beginPath()
  g.rect(x + 110, wallTop - 20, 300, 170)
  fill(g, T.iceWallShade)
  // Ice-block courses.
  g.beginPath()
  for (let row = 1; row < 4; row++) {
    const yy = wallTop + row * 35
    g.moveTo(x - PAL.wing - 40, yy)
    g.lineTo(x + PAL.wing + 40, yy)
    for (let bx = x - PAL.wing - 40 + (row % 2) * 30; bx < x + PAL.wing + 40; bx += 60) {
      g.moveTo(bx, yy - 35)
      g.lineTo(bx, yy)
    }
  }
  g.lineWidth = 3
  g.strokeStyle = '#ffffff'
  g.globalAlpha = 0.75
  g.stroke()
  g.globalAlpha = 1
  circles(g, Array.from({ length: 15 }, (_, i) => [x - PAL.wing - 26 + i * 38, wallTop, 15] as const))
  fill(g, T.snow)
  g.restore()
  g.beginPath()
  g.rect(x - PAL.wing - 40, wallTop, (PAL.wing + 40) * 2, 140)
  ink(g)
  // Outer and inner towers.
  for (const d of [-1, 1]) iceTower(g, x + d * PAL.outer.dx, y, y - PAL.outer.top, PAL.outer.w, PAL.outer.spire, pot)
  for (const d of [-1, 1]) iceTower(g, x + d * PAL.inner.dx, y, y - PAL.inner.top, PAL.inner.w, PAL.inner.spire, pot)
  // The keep.
  const kt = y - PAL.keep.top
  const keep = (): void => {
    g.beginPath()
    g.roundRect(x - 108, kt, 216, PAL.keep.top, [10, 10, 0, 0])
  }
  keep()
  fill(g, T.iceWall)
  g.save()
  keep()
  g.clip()
  g.beginPath()
  g.rect(x + 42, kt, 120, PAL.keep.top + 10)
  fill(g, T.iceWallShade)
  g.beginPath()
  g.moveTo(x - 70, kt + 30)
  g.lineTo(x - 70, y)
  g.moveTo(x - 50, kt + 50)
  g.lineTo(x - 50, kt + 120)
  g.lineWidth = 7
  g.strokeStyle = '#ffffff'
  g.globalAlpha = 0.7
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  keep()
  ink(g)
  g.beginPath()
  g.roundRect(x - 118, kt - 6, 236, 20, 10)
  fill(g, T.snow)
  ink(g, 3.5)
  crystalSpire(g, x, kt + 2, 130, PAL.keep.spire, pot)
  // Icicles under the keep's snow band.
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const ix = x - 104 + i * 23
    const L = 12 + (i % 3) * 7
    g.moveTo(ix - 4, kt + 14)
    g.quadraticCurveTo(ix - 1, kt + 14 + L * 0.7, ix, kt + 14 + L)
    g.quadraticCurveTo(ix + 1, kt + 14 + L * 0.7, ix + 4, kt + 14)
    g.closePath()
  }
  fill(g, T.iceLite)
  ink(g, 2)
  // The snowflake rose window.
  const ry = y - 196
  disc(g, x, ry, 40, T.ice, LW)
  disc(g, x, ry, 30, T.iceLite)
  flake(g, x, ry, 26, PI / 6)
  g.lineWidth = 9
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 4.5
  g.strokeStyle = '#ffffff'
  g.stroke()
  // The great gate.
  const gw = 112
  const gh = 132
  g.beginPath()
  g.roundRect(x - gw / 2 - 14, y - gh - 14, gw + 28, gh + 14, [gw / 2 + 14, gw / 2 + 14, 0, 0])
  fill(g, T.snow)
  ink(g, 4)
  const gate = (): void => {
    g.beginPath()
    g.roundRect(x - gw / 2, y - gh, gw, gh, [gw / 2, gw / 2, 0, 0])
  }
  gate()
  fill(g, T.glow)
  g.save()
  gate()
  g.clip()
  g.beginPath()
  g.ellipse(x, y - gh * 0.42, gw * 0.3, gh * 0.4, 0, 0, TAU)
  fill(g, T.glowLite)
  g.beginPath()
  g.moveTo(x, y - gh)
  g.lineTo(x, y)
  g.lineWidth = 3
  g.strokeStyle = T.lemonShade
  g.stroke()
  g.restore()
  gate()
  ink(g)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.arc(x + d * 18, y - gh * 0.46, 5, 0, TAU)
    fill(g, T.lemonShade)
    ink(g, 2.4)
  }
}

/** A frosted topiary: an ice-blue ball hedge in a snow-lipped box (a tap
 *  creature's hiding place). */
export const iceHedge = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 44 * s, y - 80 * s, 32 * s], [x, y - 108 * s, 44 * s], [x + 44 * s, y - 80 * s, 32 * s], [x, y - 70 * s, 40 * s]]
  circles(g, lobes)
  inkFill(g, T.pine)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 40 * s, y - 50 * s, 46 * s], [x - 30 * s, y - 36 * s, 34 * s]])
  fill(g, T.pineShade)
  circles(g, [[x - 34 * s, y - 108 * s, 24 * s], [x, y - 146 * s, 36 * s], [x + 36 * s, y - 108 * s, 22 * s]])
  fill(g, T.snow)
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-40, -86], [12, -96], [38, -72], [-8, -66]] as const) {
    g.moveTo(x + dx * s + 6 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 6 * s, 0, TAU)
  }
  fill(g, T.iceLite)
  ink(g, 2.2)
  g.beginPath()
  g.roundRect(x - 52 * s, y - 46 * s, 104 * s, 46 * s, 8 * s)
  fill(g, T.lilac)
  ink(g)
  g.beginPath()
  g.rect(x + 18 * s, y - 42 * s, 30 * s, 38 * s)
  fill(g, T.lilacShade)
  g.beginPath()
  g.roundRect(x - 56 * s, y - 52 * s, 112 * s, 14 * s, 7 * s)
  fill(g, T.snow)
  ink(g, 3)
}

/** A big round tree whose frosted CROWN (in the pot's colours) is the
 *  landmark, hung with glassy baubles — the heart of the Aurora Grove. */
export const auroraTree = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  g.beginPath()
  g.moveTo(x - 60 * s, y)
  g.quadraticCurveTo(x - 30 * s, y - 20 * s, x - 28 * s, y - 90 * s)
  g.bezierCurveTo(x - 32 * s, y - 160 * s, x - 20 * s, y - 200 * s, x - 22 * s, y - 230 * s)
  g.lineTo(x + 24 * s, y - 230 * s)
  g.bezierCurveTo(x + 22 * s, y - 200 * s, x + 34 * s, y - 160 * s, x + 30 * s, y - 90 * s)
  g.quadraticCurveTo(x + 34 * s, y - 20 * s, x + 66 * s, y)
  g.closePath()
  fill(g, C.trunk)
  ink(g, 6)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 6 * s, y - 240 * s, 80 * s, 250 * s)
  fill(g, C.trunkShade)
  g.restore()
  const lobes: Lobe[] = [
    [x - 150 * s, y - 250 * s, 82 * s], [x - 70 * s, y - 330 * s, 98 * s], [x + 60 * s, y - 336 * s, 98 * s],
    [x + 150 * s, y - 258 * s, 82 * s], [x, y - 236 * s, 96 * s]
  ]
  circles(g, lobes)
  inkFill(g, pot.base, 6)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 120 * s, y - 196 * s, 104 * s], [x - 110 * s, y - 186 * s, 70 * s]])
  fill(g, pot.shade)
  circles(g, [[x - 80 * s, y - 380 * s, 60 * s], [x + 20 * s, y - 400 * s, 54 * s]])
  fill(g, pot.lite)
  // Snow resting on the crown's top.
  circles(g, [[x - 150 * s, y - 318 * s, 42 * s], [x - 70 * s, y - 418 * s, 50 * s], [x + 60 * s, y - 424 * s, 50 * s], [x + 150 * s, y - 326 * s, 40 * s], [x - 5 * s, y - 440 * s, 46 * s]])
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  fill(g, T.snow)
  circles(g, [[x + 70 * s, y - 440 * s, 30 * s], [x + 160 * s, y - 336 * s, 26 * s]])
  fill(g, T.snowShade)
  g.restore()
  // Glassy baubles hanging from the crown.
  const bs: readonly (readonly [number, number, string])[] = [
    [-150, -196, AUR.teal], [-60, -236, T.pink], [40, -216, T.lemon], [130, -200, AUR.green], [-110, -290, T.lemon], [90, -280, T.pink]
  ]
  for (const [dx, dy, c] of bs) {
    g.beginPath()
    g.moveTo(x + dx * s, y + (dy - 26) * s)
    g.lineTo(x + dx * s, y + (dy - 12) * s)
    ink(g, 2.4)
    disc(g, x + dx * s, y + dy * s, 12 * s, c, 3)
    disc(g, x + (dx - 4) * s, y + (dy - 4) * s, 3.5 * s, '#ffffff')
  }
}

/* ------------------------------------------------------ the snow-hare */

export interface HareLook { coat: string; shade: string; scarf: string; scarfShade: string }
export const HARE: Record<string, HareLook> = {
  pink: { coat: '#fbf8ff', shade: '#dccff6', scarf: '#ff7fbf', scarfShade: '#e2579f' },
  mint: { coat: '#fbf8ff', shade: '#dccff6', scarf: '#3fe0ae', scarfShade: '#22b58c' },
  lemon: { coat: '#fbf8ff', shade: '#dccff6', scarf: '#ffd34d', scarfShade: '#eaa63a' },
  sky: { coat: '#fbf8ff', shade: '#dccff6', scarf: '#56b6ff', scarfShade: '#3d8fe0' },
  lilac: { coat: '#fbf8ff', shade: '#dccff6', scarf: '#a77cff', scarfShade: '#8458e6' }
}

const IRIS = '#7a4fd1'

/**
 * The chapter's chibi snow-hare, feet at (x, y), scale `s`, facing `dir`:
 * a round body, a head as big as the body, two long soft ears (pink inside),
 * big glossy eyes, a blush, a pom tail and a little scarf. `ears` 0 folded
 * back → 1 up; `eye` 0 closed → 1 open; `shake` tilts it in a shiver.
 *
 * PAINTED (§8.8, `CREATURE_ART.snowHare`): the three panels of `HARE_ART` are
 * the two things the peek animates between — ears folded and eyes shut, ears
 * up, then awake — and `ears + eye` walks the strip, cross-fading. Only the
 * SCARF changes between the chapter's five hares, so it is the tinted region
 * and one painting serves all five. The lean, the rise and the shiver stay
 * here: they are a translate and a rotate, and they carry a painting as well
 * as they carried the vectors.
 */
export const snowHare = (g: G2D, x: number, y: number, s: number, dir: number, look: HareLook, ears: number, eye: number, shake = 0): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  g.rotate(shake * 0.14)
  const painted = drawItem(g, HARE_ART, HARE_UNIT * s, clamp(ears, 0, 1) + clamp(eye, 0, 1), look.scarf)
  g.restore()
  if (painted) return
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  g.rotate(shake * 0.14)
  hareShape(g, s, look, ears, eye, shake)
  g.restore()
}

/** The hare itself, feet at the origin, facing +x, in its own units — the
 *  drawing the painting stands in for, and the reference the bench renders. */
const hareShape = (g: G2D, s: number, look: HareLook, ears: number, eye: number, shake: number): void => {
  const w = LW / s
  // Ears (behind the head), each flopping back as `ears` drops.
  for (const [ex, a0, far] of [[6, -0.2, 1], [22, 0.12, 0]] as const) {
    g.save()
    g.translate(ex, -84)
    g.rotate(lerp(-1.1, a0, ears) + shake * 0.3 * (far ? -1 : 1))
    g.beginPath()
    g.ellipse(0, -26, 10.5, 30, 0, 0, TAU)
    fill(g, far ? look.shade : look.coat)
    ink(g, w)
    g.beginPath()
    g.ellipse(0.5, -24, 5, 21, 0, 0, TAU)
    fill(g, '#ffb3d2')
    g.restore()
  }
  // Tail, back foot, body, paws and head — outlined once around the union.
  g.beginPath()
  g.moveTo(-26 + 12, -24)
  g.arc(-26, -24, 12, 0, TAU)
  g.moveTo(14, -6)
  g.ellipse(-6, -6, 20, 8.5, 0, 0, TAU)
  g.moveTo(26, -28)
  g.ellipse(-2, -28, 28, 26, 0, 0, TAU)
  g.moveTo(24, -6)
  g.ellipse(16, -6, 8, 6.5, 0, 0, TAU)
  g.moveTo(40, -66)
  g.arc(14, -66, 26, 0, TAU)
  g.moveTo(8, -48)
  g.arc(-2, -48, 10, 0, TAU)
  inkFill(g, look.coat, w)
  g.save()
  g.beginPath()
  g.ellipse(-2, -28, 28, 26, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(6, -6, 30, 12, 0, 0, TAU)
  fill(g, look.shade)
  g.restore()
  // The scarf.
  g.beginPath()
  g.roundRect(-18, -46, 11, 26, 4)
  fill(g, look.scarfShade)
  ink(g, w * 0.6)
  g.beginPath()
  g.ellipse(6, -44, 21, 7, 0.08, 0, TAU)
  fill(g, look.scarf)
  ink(g, w * 0.6)
  // The face.
  if (eye > 0.15) {
    g.beginPath()
    g.ellipse(23, -68, 7, 9.5 * eye, 0, 0, TAU)
    fill(g, IRIS)
    ink(g, w * 0.5)
    g.beginPath()
    g.ellipse(24, -67, 4.2, 5.8 * eye, 0, 0, TAU)
    fill(g, INK)
    disc(g, 20.5, -68 - 4.5 * eye, 2.7, '#ffffff')
    disc(g, 26, -68 + 4 * eye, 1.3, '#ffffff')
  } else {
    g.beginPath()
    g.arc(23, -71, 6, PI * 0.15, PI * 0.85)
    ink(g, w * 0.55)
  }
  g.globalAlpha = 0.6
  g.beginPath()
  g.ellipse(22, -55, 6, 4, 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  heart(g, 38.5, -62, 3.4)
  fill(g, '#ff8fb8')
  g.beginPath()
  g.moveTo(38, -58)
  g.quadraticCurveTo(36, -53, 32, -54)
  g.moveTo(38, -58)
  g.quadraticCurveTo(40, -53, 43, -55)
  ink(g, w * 0.4)
}

/** Ear tip to feet at scale 1 — the hare's own height in SU, which is what
 *  the reference's SIZE clause and its line weight are judged against. */
const HARE_UNIT = 116

/** The hare's coat, which every one of the five looks shares. */
const HARE_COAT = { coat: HARE.pink!.coat, shade: HARE.pink!.shade }

/** The snow-hare's three peek poses, side by side — one painting, five hares. */
export const HARE_ART: ItemSpec = {
  ...CREATURE_ART.snowHare, frames: 3, tinted: true,
  draw: (g, s, f, accent) => {
    const k = s / HARE_UNIT
    g.save()
    g.scale(k, k)
    hareShape(g, k, { ...HARE_COAT, scarf: accent.base, scarfShade: accent.shade }, Math.min(f, 1), Math.max(0, f - 1), 0)
    g.restore()
  }
}

/** Puffs of frost flung off a shaking hare at (x, y), strength `a`. */
export const frostPuff = (g: G2D, x: number, y: number, s: number, a: number, t: number): void => {
  if (a <= 0) return
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const ang = -PI * 0.1 - (i / 6) * PI * 0.8 + sin(t * 3 + i) * 0.1
    const rr = (40 + 34 * a + 6 * sin(t * 9 + i * 2)) * s
    const px = x + cos(ang) * rr
    const py = y - 60 * s + sin(ang) * rr * 0.8
    const pr = (5 + (i % 3) * 3) * s * (0.6 + 0.4 * a)
    g.moveTo(px + pr, py)
    g.arc(px, py, pr, 0, TAU)
  }
  g.globalAlpha = a * 0.95
  g.fillStyle = '#ffffff'
  g.fill()
  g.lineWidth = 2
  g.strokeStyle = T.snowDeep
  g.stroke()
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const ang = -PI * 0.25 - i * PI * 0.25
    twinkle(g, x + cos(ang) * 84 * s * a, y - 70 * s + sin(ang) * 70 * s * a, 8 * s * a)
  }
  fill(g, T.iceLite)
  g.globalAlpha = 1
}

/** A hare's hiding spot: feet position when out, how far it sinks to hide. */
export interface HareSpot { x: number; y: number; s: number; dir: number; rise: number; ground: number; lean?: number }

/**
 * The tap creature's draw (§8.8 beat 2): the snow-hare pops up from behind
 * its cover (whose FRONT `front` redraws on top, so k = 0 is the cover
 * alone), ears springing up, eyes opening, then shivers off a puff of frost.
 */
export const peekHare = (g: G2D, p: HareSpot, k: number, t: number, look: HareLook, front: (g: G2D) => void): void => {
  const e = ease(clamp(k, 0, 1))
  if (k > 0.001) {
    const fy = p.y + (1 - e) * p.rise
    const lx = (p.lean ?? 0) * e
    g.save()
    g.beginPath()
    g.rect(p.x - 300, p.ground - 600, 600, 600)
    g.clip()
    const sh = k > 0.85 ? sin(t * 42) : 0
    snowHare(g, p.x + lx, fy, p.s, p.dir, look, clamp((k - 0.3) * 2, 0, 1), clamp((k - 0.55) * 3, 0, 1), sh)
    g.restore()
  }
  tapCover(g, front)
  if (k > 0.6) frostPuff(g, p.x + (p.lean ?? 0) * e, p.y, p.s, clamp((k - 0.6) / 0.4, 0, 1), t)
}

/* ------------------------------------------------- the Frozen Star Shard */

/** A rounded four-point star-crystal path, centre (x, y), `r` long. */
const shardPath = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r * 0.7, y)
  g.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r * 0.9)
  g.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r * 0.7, y)
  g.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r)
  g.closePath()
}

/**
 * The Frozen Star Shard, the chapter's rescue (§8.8 beat 3), resting on
 * (x, y). k = 0: a sleepy star-crystal locked in a block of ice, dim; k = 1:
 * the ice melted away, the shard awake, glowing and bobbing in aurora light.
 */
export const frostShard = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const o = ease(clamp(k, 0, 1))
  const S = (v: number): number => v * s
  const bob = o * (S(26) + sin(t * 2.2) * S(8))
  const cx = x
  const cy = y - S(58) - bob
  // Glow halo (awake).
  if (o > 0) {
    g.globalAlpha = 0.22 * o
    disc(g, cx, cy, S(88 + sin(t * 3) * 4), '#fff6c8')
    g.globalAlpha = 0.3 * o
    disc(g, cx, cy, S(60), AUR.greenLite)
    g.globalAlpha = 1
  }
  // Soft shadow on the snow.
  g.globalAlpha = 0.22
  g.beginPath()
  g.ellipse(x, y, S(52 - 16 * o), S(10 - 3 * o), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  // The shard. The ICE BLOCK round it melts away and stays drawn — it is a
  // translucent wash over whatever is behind it, and it shrinks per frame.
  g.save()
  g.translate(cx, cy)
  if (!drawItem(g, FROST_SHARD_ART, FROST_SHARD_UNIT * s, k < 0.5 ? 0 : 1)) frostShardShape(g, s, o, k)
  g.restore()
  frostShardIce(g, x, y, s, k, t)
}

/** Point to point (96) at scale 1 — the shard's own height in SU. */
const FROST_SHARD_UNIT = 96

/**
 * The Frozen Star Shard, asleep and awake (`CREATURE_ART.frostShard`): dim
 * and lilac-locked, then lemon-bright and smiling. Its aurora halo, its
 * shadow on the snow and the block of ice it melts out of stay drawn.
 */
export const FROST_SHARD_ART: ItemSpec = {
  ...CREATURE_ART.frostShard, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / FROST_SHARD_UNIT
    g.save()
    g.scale(k, k)
    frostShardShape(g, 1, f, f)
    g.restore()
  }
}

/** The shard itself, centred on the origin, in its own units. */
const frostShardShape = (g: G2D, s: number, o: number, k: number): void => {
  const S = (v: number): number => v * s
  const cx = 0
  const cy = 0
  const r = S(48)
  shardPath(g, cx, cy, r)
  fill(g, mix(T.lemon, '#b9b0d8', (1 - o) * 0.55))
  g.save()
  shardPath(g, cx, cy, r)
  g.clip()
  g.beginPath()
  g.moveTo(cx, cy - r)
  g.lineTo(cx + r, cy - r)
  g.lineTo(cx + r, cy + r)
  g.lineTo(cx, cy + r)
  g.closePath()
  fill(g, mix(T.lemonShade, '#9b90c4', (1 - o) * 0.55))
  g.beginPath()
  g.ellipse(cx - r * 0.2, cy - r * 0.42, r * 0.08, r * 0.2, 0.3, 0, TAU)
  fill(g, '#fffbe0')
  g.restore()
  shardPath(g, cx, cy, r)
  ink(g, 4)
  // The face.
  const ey = cy + S(2)
  g.beginPath()
  if (k < 0.5) {
    g.moveTo(cx - S(15), ey)
    g.quadraticCurveTo(cx - S(10), ey + S(4), cx - S(5), ey)
    g.moveTo(cx + S(5), ey)
    g.quadraticCurveTo(cx + S(10), ey + S(4), cx + S(15), ey)
    ink(g, 2.6)
  } else {
    g.moveTo(cx - S(10) + S(3.5), ey)
    g.ellipse(cx - S(10), ey, S(3.5), S(5), 0, 0, TAU)
    g.moveTo(cx + S(10) + S(3.5), ey)
    g.ellipse(cx + S(10), ey, S(3.5), S(5), 0, 0, TAU)
    fill(g, INK)
    disc(g, cx - S(11), ey - S(2), S(1.4), '#ffffff')
    disc(g, cx + S(9), ey - S(2), S(1.4), '#ffffff')
    g.beginPath()
    g.arc(cx, ey + S(7), S(5), 0.2, PI - 0.2)
    ink(g, 2.4)
  }
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(cx - S(17), ey + S(9), S(4.5), S(3), 0, 0, TAU)
  g.moveTo(cx + S(21.5), ey + S(9))
  g.ellipse(cx + S(17), ey + S(9), S(4.5), S(3), 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  // Asleep: a plum veil dims it, so the sleeping PANEL is the dim one.
  if (k < 1) {
    g.globalAlpha = 0.28 * (1 - clamp(k * 1.5, 0, 1))
    shardPath(g, cx, cy, r)
    fill(g, INK)
    g.globalAlpha = 1
  }
}

/** The block of ice it melts out of, round (x, y). */
const frostShardIce = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const S = (v: number): number => v * s
  const m = clamp(k * 1.4, 0, 1)
  if (m < 1) {
    const bw = S(68) * (1 - m * 0.25)
    const bh = S(96) * (1 - m * 0.45)
    const by = y - bh
    g.globalAlpha = 1 - m
    g.beginPath()
    g.roundRect(x - bw, by, bw * 2, bh, S(16))
    g.fillStyle = 'rgba(200,236,255,0.55)'
    g.fill()
    ink(g, 4)
    g.beginPath()
    g.moveTo(x - bw * 0.6, by + S(14))
    g.lineTo(x - bw * 0.6, by + bh * 0.62)
    g.moveTo(x - bw * 0.38, by + S(12))
    g.lineTo(x - bw * 0.38, by + bh * 0.3)
    g.moveTo(x + bw * 0.62, by + bh * 0.5)
    g.lineTo(x + bw * 0.62, by + bh - S(12))
    g.lineWidth = S(6)
    g.strokeStyle = '#ffffff'
    g.lineCap = 'round'
    g.stroke()
    // A frosty cap and drips.
    circles(g, [[x - bw * 0.5, by + S(2), S(14)], [x, by - S(4), S(20)], [x + bw * 0.5, by + S(2), S(14)]])
    fill(g, T.snow)
    ink(g, 3)
    g.globalAlpha = 1
  }
  if (k <= 0.2) return
  // Awake: little aurora sparkles orbit it.
  const cx = x
  const cy = y - S(58) - ease(clamp(k, 0, 1)) * (S(26) + sin(t * 2.2) * S(8))
  const a = clamp((k - 0.2) / 0.8, 0, 1)
  const cols = [AUR.green, AUR.pink, AUR.teal, T.lemon]
  for (let i = 0; i < 4; i++) {
    const ang = t * 1.4 + (i * TAU) / 4
    g.globalAlpha = a
    g.beginPath()
    twinkle(g, cx + cos(ang) * S(74), cy + sin(ang) * S(40), S(9 + 3 * sin(t * 4 + i)))
    fill(g, cols[i]!)
    ink(g, 1.8)
  }
  g.globalAlpha = 1
}

/** A ribbon of gold stars — used by the palace pennants' tips. */
export const starTip = (g: G2D, x: number, y: number, r: number): void => {
  star5(g, x, y, r)
  fill(g, T.lemon)
  ink(g, 2.4)
}
