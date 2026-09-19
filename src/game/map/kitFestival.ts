/**
 * kitFestival.ts — Friendship Festival's painters (chapter 10, story-spec
 * §10.2: "Umbra is only lonely. The Festival is thrown to invite her in").
 * The whole world throws a party on a sunny meadow at golden hour: striped
 * tents, bunting and paper lanterns, a welcome arch, a carousel of unicorns,
 * market stalls, a ferris wheel and a grand stage with a layer cake — with a
 * nod to every earlier chapter (a seashell stall, cloud-candy, crystals, a
 * snowglobe, a star lantern, a rainbow, and the nine chapter emblems along
 * the stage).
 *
 * The chapter's tap creature is Sprig — chapter 1's moss-sprite, back for
 * the Festival in a party hat, waving a little flag.
 *
 * Same rules as `kit.ts` (art-style §2–§6): flat cel fills, one plum outline
 * on everything mid- and foreground, gradients only in the sky and glows,
 * far layers lighter and unoutlined, every base tone on the candy floor
 * (S ≥ 70 %, L 55–75 %). Live props are cheap: no gradients, no shadowBlur,
 * a handful of paths each.
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp, ease } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink, flower, blob, lumpy } from '@/game/map/kit'
import { K, inkFill, heart, star5 } from '@/game/map/kitSky'
import type { TapCreature } from '@/game/map/sectorDef'

type Lobe = readonly [number, number, number]
export type Pt = readonly [number, number]
const LW = 5

export const F = {
  skyTop: '#5fb0ff',
  skyMid: '#b9b2ff',
  skyWarm: '#ffb4d0',
  skyLow: '#ffd494',
  sun: '#ffe36b',
  far: '#f0cae6',
  far2: '#c2eab6',
  farFair: '#e3b6dc',
  puff: '#fff8f0',
  puffShade: '#ffd7e6',
  cream: '#fff6ea',
  creamShade: '#f4d9e4',
  pink: '#ff7fbf',
  pinkShade: '#e2579f',
  pinkLite: '#ffc4e1',
  lemon: '#ffd34d',
  lemonShade: '#eaa63a',
  lemonLite: '#fff0a6',
  mint: '#3fe0ae',
  mintShade: '#22b58c',
  mintLite: '#aaf3dc',
  sky: '#56b6ff',
  skyShade: '#3d8fe0',
  skyLite: '#b8e2ff',
  lilac: '#a77cff',
  lilacShade: '#7f5ae0',
  lilacLite: '#dccbff',
  coral: '#ff7a8a',
  coralShade: '#e0566e',
  orange: '#ffa04d',
  orangeShade: '#e57a3c',
  violet: '#8f6cff',
  violetShade: '#6f4fe0',
  curtain: '#ff6f8a',
  curtainShade: '#e04a6a',
  floor: '#ffc27a',
  floorShade: '#eba05e',
  love: '#ff5a8a',
  bulb: '#fff6b0',
  glow: '#fff1a8',
  inside: '#6a4a86',
  sprig: '#7ee85a',
  sprigShade: '#62cc4a',
  sprigEar: '#4fbf4a',
  sprigLeaf: '#5fd35a'
}

/** Chapter 10's base tones, for the candy-floor check (§9.6.1): S ≥ 70 %, L 55–75 %. */
export const FEST_TONES: readonly string[] = [
  F.skyTop, F.pink, F.lemon, F.mint, F.sky, F.lilac, F.coral, F.orange, F.violet, F.curtain, F.floor, F.sprig, C.meadow
]

/** The party colours: bunting, balloons, lanterns, cabins. */
export const PARTY: readonly string[] = [F.pink, F.lemon, F.mint, F.sky, F.lilac, F.coral]

/* ---------------------------------------------------------------- helpers */

const circles = (g: G2D, lobes: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
}

const disc = (g: G2D, x: number, y: number, r: number, colour: string, w = 0): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, colour)
  if (w) ink(g, w)
}

/** A four-point twinkle, added to the CURRENT path. */
const tw = (g: G2D, x: number, y: number, r: number): void => {
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y)
  g.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r)
  g.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y)
  g.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r)
}

/** Diagonal candy stripes of `col`, `gap` apart, over the box (clip first). */
const candyStripes = (g: G2D, x: number, y: number, w: number, h: number, col: string, gap: number, band: number, tilt = 0.55): void => {
  g.beginPath()
  const rise = w * tilt
  for (let yy = y - rise; yy < y + h + rise; yy += gap) {
    g.moveTo(x, yy)
    g.lineTo(x + w, yy - rise)
    g.lineTo(x + w, yy - rise + band)
    g.lineTo(x, yy + band)
    g.closePath()
  }
  fill(g, col)
}

/* ------------------------------------------------------------------- sky */

export interface SkyFOpts {
  sun?: Pt
  /** A soft rainbow behind everything: centre x, y and outer radius. */
  rainbow?: readonly [number, number, number]
  puffs?: readonly (readonly [number, number, number])[]
}

/** A soft golden-hour cloud — unoutlined, rosy underneath (the far register). */
export const puffF = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [
    [x - 60 * s, y + 8 * s, 34 * s], [x - 18 * s, y - 12 * s, 44 * s], [x + 34 * s, y - 2 * s, 38 * s], [x + 72 * s, y + 12 * s, 26 * s]
  ]
  circles(g, lobes)
  fill(g, F.puffShade)
  circles(g, lobes.map(([a, b, r]) => [a, b - 6 * s, r * 0.9] as const))
  fill(g, F.puff)
}

/** The Festival's sky: clear blue overhead, warming through lilac and rose to
 *  a golden horizon; a low sun, an optional rainbow, rosy clouds. */
export const skyF = (g: G2D, o: SkyFOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 440)
  gr.addColorStop(0, F.skyTop)
  gr.addColorStop(0.5, F.skyMid)
  gr.addColorStop(0.8, F.skyWarm)
  gr.addColorStop(1, F.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.rainbow) {
    const [rx, ry, rr] = o.rainbow
    g.globalAlpha = 0.5
    g.lineWidth = 15
    for (let i = 0; i < K.rainbow.length; i++) {
      g.beginPath()
      g.arc(rx, ry, rr - 8 - i * 14, PI, TAU)
      g.strokeStyle = K.rainbow[i]!
      g.stroke()
    }
    g.globalAlpha = 1
  }
  if (o.sun) {
    const [sx, sy] = o.sun
    const glow = g.createRadialGradient(sx, sy, 30, sx, sy, 240)
    glow.addColorStop(0, 'rgba(255,238,168,0.95)')
    glow.addColorStop(0.45, 'rgba(255,218,160,0.45)')
    glow.addColorStop(1, 'rgba(255,210,160,0)')
    g.fillStyle = glow
    g.fillRect(sx - 250, sy - 250, 500, 500)
    disc(g, sx, sy, 58, F.sun)
  }
  for (const [x, y, s] of o.puffs ?? []) puffF(g, x, y, s)
}

/** One far hill band, lighter and warmer, never outlined (art-style §5). */
export const farBand = (g: G2D, y: number, col: string, seed: number): void => {
  const r = seeded(seed)
  g.beginPath()
  g.moveTo(0, y + (r() - 0.5) * 30)
  for (let x = 0; x <= SEC_W; x += 192) {
    g.bezierCurveTo(x + 64, y - 36 - r() * 44, x + 128, y + r() * 26, x + 192, y + (r() - 0.5) * 26)
  }
  g.lineTo(SEC_W, SEC_H)
  g.lineTo(0, SEC_H)
  g.closePath()
  fill(g, col)
}

/** Soft far mountain peaks (a nod to Mirror Mountains), unoutlined. */
export const farPeaks = (g: G2D, list: readonly Lobe[], col = '#dcc8f2', snow = '#f7f0ff'): void => {
  g.beginPath()
  for (const [x, y, h] of list) {
    g.moveTo(x - h * 0.9, y)
    g.quadraticCurveTo(x - h * 0.2, y - h * 0.8, x, y - h)
    g.quadraticCurveTo(x + h * 0.2, y - h * 0.8, x + h * 0.9, y)
    g.closePath()
  }
  fill(g, col)
  g.beginPath()
  for (const [x, y, h] of list) {
    g.moveTo(x - h * 0.24, y - h * 0.72)
    g.quadraticCurveTo(x - h * 0.08, y - h * 0.94, x, y - h)
    g.quadraticCurveTo(x + h * 0.08, y - h * 0.94, x + h * 0.24, y - h * 0.72)
    g.quadraticCurveTo(x, y - h * 0.64, x - h * 0.24, y - h * 0.72)
  }
  fill(g, snow)
}

/** A far fair on the horizon: tent and ferris-wheel silhouettes, flat and
 *  unoutlined. `tent` rows are (x, foot y, scale); `wheel` rows (x, hub y, R). */
export type FarThing = readonly ['tent' | 'wheel', number, number, number]
export const farFair = (g: G2D, list: readonly FarThing[], col = F.farFair): void => {
  g.fillStyle = col
  g.strokeStyle = col
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const [kind, x, y, s] of list) {
    if (kind === 'tent') {
      g.beginPath()
      g.moveTo(x - 48 * s, y - 40 * s)
      g.quadraticCurveTo(x - 12 * s, y - 54 * s, x, y - 98 * s)
      g.quadraticCurveTo(x + 12 * s, y - 54 * s, x + 48 * s, y - 40 * s)
      g.lineTo(x + 38 * s, y - 40 * s)
      g.lineTo(x + 38 * s, y + 30 * s)
      g.lineTo(x - 38 * s, y + 30 * s)
      g.lineTo(x - 38 * s, y - 40 * s)
      g.closePath()
      g.moveTo(x - 2 * s, y - 96 * s)
      g.lineTo(x - 2 * s, y - 122 * s)
      g.lineTo(x + 20 * s, y - 114 * s)
      g.lineTo(x + 2 * s, y - 106 * s)
      g.lineTo(x + 2 * s, y - 96 * s)
      g.closePath()
      g.fill()
    } else {
      const R = s
      g.lineWidth = Math.max(3, R * 0.07)
      g.beginPath()
      g.arc(x, y, R, 0, TAU)
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8
        g.moveTo(x, y)
        g.lineTo(x + cos(a) * R, y + sin(a) * R)
      }
      g.stroke()
      g.lineWidth = Math.max(4, R * 0.1)
      g.beginPath()
      g.moveTo(x - R * 0.62, y + R * 1.4)
      g.lineTo(x, y)
      g.lineTo(x + R * 0.62, y + R * 1.4)
      g.stroke()
      g.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + 0.2
        const cx = x + cos(a) * R
        const cy = y + sin(a) * R + R * 0.12
        g.moveTo(cx + R * 0.13, cy)
        g.arc(cx, cy, R * 0.13, 0, TAU)
      }
      g.fill()
    }
  }
}

/** A golden festival ground: an outlined oval of trodden sand with pebbles. */
export const plaza = (g: G2D, x: number, y: number, rx: number, ry: number, seed: number): void => {
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  fill(g, C.path)
  ink(g, 4)
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU
    const d = Math.sqrt(r()) * 0.86
    const px = x + cos(a) * rx * d
    const py = y + sin(a) * ry * d
    g.moveTo(px + 7, py)
    g.ellipse(px, py, 7, 4, 0, 0, TAU)
  }
  fill(g, C.pathShade)
}

/** Confetti already fallen on the ground (paint): a sprinkle of dots. */
export const groundConfetti = (g: G2D, seed: number, n: number, x0: number, y0: number, x1: number, y1: number): void => {
  const r = seeded(seed)
  for (let c = 0; c < 4; c++) {
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0)
      const y = y0 + r() * (y1 - y0)
      const a = r() * PI
      if (i % 4 !== c) continue
      g.moveTo(x + cos(a) * 6, y + sin(a) * 3)
      g.ellipse(x, y, 6, 3, a, 0, TAU)
    }
    fill(g, PARTY[c]!)
  }
}

/* ------------------------------------------------------------- roof kit */

/**
 * A swooping striped bell roof (tent, carousel, pavilion): apex (cx, apexY);
 * its front eave is the lower half of the ellipse (cx, eaveY, R, bulge).
 * Stripes alternate `a`/`b`, the right side takes `sa`/`sb`, `lite` is its
 * one highlight.
 */
export const bellRoof = (
  g: G2D, cx: number, apexY: number, eaveY: number, R: number, bulge: number, n: number,
  a: string, b: string, sa: string, sb: string, lite: string, w = LW
): void => {
  const H = eaveY - apexY
  const path = (): void => {
    g.beginPath()
    g.moveTo(cx - R, eaveY)
    g.bezierCurveTo(cx - R * 0.52, eaveY - H * 0.14, cx - R * 0.1, apexY + H * 0.36, cx, apexY)
    g.bezierCurveTo(cx + R * 0.1, apexY + H * 0.36, cx + R * 0.52, eaveY - H * 0.14, cx + R, eaveY)
    g.ellipse(cx, eaveY, R, bulge, 0, 0, PI)
    g.closePath()
  }
  const wedges = (ca: string, cb: string): void => {
    for (const pass of [0, 1]) {
      g.beginPath()
      for (let i = pass; i < n; i += 2) {
        const t0 = PI * (i / n)
        const t1 = PI * ((i + 1) / n)
        g.moveTo(cx, apexY - 6)
        g.lineTo(cx + cos(t0) * R * 1.5, eaveY + sin(t0) * bulge * 1.5 + 12)
        g.lineTo(cx + cos(t1) * R * 1.5, eaveY + sin(t1) * bulge * 1.5 + 12)
        g.closePath()
      }
      fill(g, pass ? cb : ca)
    }
  }
  g.save()
  path()
  g.clip()
  wedges(a, b)
  g.save()
  g.beginPath()
  g.moveTo(cx + 3, apexY - 8)
  g.quadraticCurveTo(cx + R * 0.2, apexY + H * 0.62, cx + R * 0.36, eaveY + bulge + 14)
  g.lineTo(cx + R * 1.6, eaveY + bulge + 14)
  g.lineTo(cx + R * 1.6, apexY - 8)
  g.closePath()
  g.clip()
  wedges(sa, sb)
  g.restore()
  g.beginPath()
  g.ellipse(cx - R * 0.4, apexY + H * 0.62, R * 0.045, H * 0.2, 0.7, 0, TAU)
  fill(g, lite)
  g.restore()
  path()
  ink(g, w)
}

/** Scallops hanging from a bell roof's front eave, alternating `a`/`b`. */
export const valance = (g: G2D, cx: number, eaveY: number, R: number, bulge: number, n: number, a: string, b: string, r: number, w = 3.5): void => {
  for (const pass of [0, 1]) {
    g.beginPath()
    for (let i = pass; i < n; i += 2) {
      const th = PI * ((i + 0.5) / n)
      const x = cx + cos(th) * R * 0.97
      const y = eaveY + sin(th) * bulge
      g.moveTo(x + r, y)
      g.arc(x, y, r, 0, PI)
      g.closePath()
    }
    fill(g, pass ? b : a)
    ink(g, w)
  }
}

/** Where a valance's bulbs sit (one per scallop), for paint and live glow. */
export const valanceBulbs = (cx: number, eaveY: number, R: number, bulge: number, n: number, r: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const th = PI * ((i + 0.5) / n)
    out.push([cx + cos(th) * R * 0.97, eaveY + sin(th) * bulge + r * 0.46])
  }
  return out
}

/** Painted bulbs (unlit cream dots). */
export const bulbDots = (g: G2D, pts: readonly Pt[], r = 5): void => {
  g.beginPath()
  for (const [x, y] of pts) {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  fill(g, F.cream)
  ink(g, 2)
}

/** Bulbs lighting up in a slow chase (a live prop). */
export const bulbGlow = (g: G2D, pts: readonly Pt[], t: number, alive: number, r = 5, every = 2): void => {
  if (alive <= 0) return
  const step = Math.floor(t * 3)
  g.globalAlpha = alive * 0.35
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if ((i + step) % every) continue
    const [x, y] = pts[i]!
    g.moveTo(x + r * 1.9, y)
    g.arc(x, y, r * 1.9, 0, TAU)
  }
  fill(g, F.glow)
  g.globalAlpha = alive
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if ((i + step) % every) continue
    const [x, y] = pts[i]!
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  fill(g, F.bulb)
  g.globalAlpha = 1
}

/** A small pennant flag fixed on a pole top (paint — no wind). */
const flagStill = (g: G2D, x: number, y: number, len: number, h: number, col: string): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x + len * 0.5, y + h * 0.1, x + len, y + h * 0.55)
  g.quadraticCurveTo(x + len * 0.5, y + h * 0.9, x, y + h)
  g.closePath()
  fill(g, col)
  ink(g, 3)
}

/* ------------------------------------------------------------ dressing */

/** A striped festival tent standing at (x, y), `w` wide. */
export const tent = (g: G2D, x: number, y: number, w: number, col: string, shade: string, flag = F.lemon): void => {
  const h = w * 1.18
  const wallTop = y - h * 0.46
  const apex = y - h
  const R = w / 2 + 14
  const walls = (): void => {
    g.beginPath()
    g.rect(x - w / 2, wallTop, w, y - wallTop)
  }
  walls()
  fill(g, F.cream)
  g.save()
  walls()
  g.clip()
  const n = 6
  const sw = w / n
  g.beginPath()
  for (let i = 0; i < n; i += 2) g.rect(x - w / 2 + i * sw, wallTop, sw, y - wallTop)
  fill(g, col)
  g.beginPath()
  g.rect(x + w * 0.18, wallTop, w, h)
  g.clip()
  g.fillStyle = F.creamShade
  g.fillRect(x + w * 0.18, wallTop, w, h)
  g.beginPath()
  for (let i = 0; i < n; i += 2) g.rect(x - w / 2 + i * sw, wallTop, sw, y - wallTop)
  fill(g, shade)
  g.restore()
  walls()
  ink(g)
  // The doorway, flaps tied back.
  g.beginPath()
  g.moveTo(x - w * 0.18, y)
  g.quadraticCurveTo(x - w * 0.03, wallTop + 22, x, wallTop + 18)
  g.quadraticCurveTo(x + w * 0.03, wallTop + 22, x + w * 0.18, y)
  g.closePath()
  fill(g, F.inside)
  ink(g, 3.5)
  bellRoof(g, x, apex, wallTop + 4, R, 10, 8, col, F.cream, shade, F.creamShade, F.cream)
  valance(g, x, wallTop + 4, R, 10, 7, col, F.cream, 11, 3)
  g.beginPath()
  g.moveTo(x, apex + 2)
  g.lineTo(x, apex - 34)
  ink(g, 3)
  flagStill(g, x, apex - 34, 30, 16, flag)
  disc(g, x, apex - 2, 6, F.lemon, 2.4)
}

/** A wrapped present standing at (x, y), `w` × `h`, with a ribbon cross. */
export const giftBox = (g: G2D, x: number, y: number, w: number, h: number, col: string, shade: string, ribbon: string, bow = true): void => {
  const lid = Math.min(18, h * 0.26)
  const body = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h + lid, w, h - lid, [0, 0, 6, 6])
  }
  body()
  fill(g, col)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.22, y - h, w, h)
  fill(g, shade)
  g.restore()
  body()
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - w / 2 - 6, y - h, w + 12, lid + 2, 6)
  fill(g, col)
  ink(g, 4)
  g.beginPath()
  g.rect(x - w * 0.08, y - h + 1, w * 0.16, h - 1)
  fill(g, ribbon)
  ink(g, 2.6)
  if (!bow) return
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * 13, y - h - 8, 14, 8, d * 0.5, 0, TAU)
    fill(g, ribbon)
    ink(g, 3)
  }
  disc(g, x, y - h - 3, 6, ribbon, 2.6)
}

/** Three presents stacked by the gate (a tap creature's hiding place). */
export const giftStack = (g: G2D, x: number, y: number): void => {
  giftBox(g, x + 96, y, 58, 46, F.lemon, F.lemonShade, F.sky)
  giftBox(g, x, y, 140, 76, F.pink, F.pinkShade, F.lemon, false)
  giftBox(g, x - 26, y - 76, 86, 58, F.mint, F.mintShade, F.pink)
}

/** A round flowering hedge (a tap creature's hiding place). */
export const flowerBush = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 56 * s, y - 38 * s, 40 * s], [x, y - 66 * s, 50 * s], [x + 56 * s, y - 38 * s, 40 * s], [x, y - 30 * s, 46 * s]]
  lumpy(g, lobes, C.canopy)
  g.save()
  blob(g, lobes)
  g.clip()
  blob(g, [[x + 44 * s, y - 2 * s, 46 * s], [x - 44 * s, y + 8 * s, 34 * s]])
  fill(g, C.canopyShade)
  blob(g, [[x - 22 * s, y - 102 * s, 22 * s]])
  fill(g, C.canopyLite)
  g.restore()
  const FL: readonly (readonly [number, number, string])[] = [
    [-60, -46, F.pink], [-18, -86, F.lemon], [26, -78, '#ffffff'], [60, -44, F.pink], [-30, -36, F.lilac], [14, -40, F.pink], [44, -12, F.lemon]
  ]
  for (let i = 0; i < FL.length; i++) {
    const [dx, dy, c] = FL[i]!
    flower(g, x + dx * s, y + dy * s, 12 * s, c, i * 0.7)
  }
}

/** Balloons tied low to a present — a balloon bunch resting on the grass
 *  (a tap creature's hiding place). */
export const balloonCluster = (g: G2D, x: number, y: number): void => {
  const B: readonly (readonly [number, number, string])[] = [
    [0, -182, F.lilac], [-30, -142, F.sky], [30, -144, F.lemon], [-50, -96, F.pink], [4, -102, F.mint], [52, -92, F.coral]
  ]
  g.beginPath()
  for (const [dx, dy] of B) {
    g.moveTo(x + dx, y + dy + 34)
    g.quadraticCurveTo(x + dx * 0.4 + 6, y + (dy + 34 - 36) / 2, x, y - 36)
  }
  ink(g, 2.2)
  for (const [dx, dy, c] of B) {
    g.beginPath()
    g.ellipse(x + dx, y + dy, 30, 34, 0, 0, TAU)
    g.moveTo(x + dx, y + dy + 32)
    g.lineTo(x + dx - 6, y + dy + 40)
    g.lineTo(x + dx + 6, y + dy + 40)
    g.closePath()
    fill(g, c)
    ink(g, 3.5)
  }
  g.beginPath()
  for (const [dx, dy] of B) {
    g.moveTo(x + dx - 11 + 6, y + dy - 12)
    g.ellipse(x + dx - 11, y + dy - 12, 6, 10, -0.5, 0, TAU)
  }
  g.globalAlpha = 0.8
  fill(g, '#ffffff')
  g.globalAlpha = 1
  giftBox(g, x, y, 58, 40, F.orange, F.orangeShade, F.cream, false)
}

/** A cotton-candy cloud on a stick (a nod to the Cloud Kingdom). */
export const cloudCandy = (g: G2D, x: number, y: number, s: number, col: string): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - 40 * s)
  g.lineWidth = 7 * s + 4
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 7 * s - 1
  g.strokeStyle = F.cream
  g.stroke()
  circles(g, [[x - 14 * s, y - 50 * s, 14 * s], [x, y - 62 * s, 17 * s], [x + 14 * s, y - 50 * s, 14 * s], [x, y - 44 * s, 13 * s]])
  inkFill(g, col, 2.4)
  disc(g, x - 6 * s, y - 68 * s, 4.5 * s, '#ffffff')
}

/** The cloud-candy cart at (x, y) — wheels, a candy-pink box, three clouds on
 *  sticks and a little striped parasol. Returns nothing; its balloons are
 *  a live prop tied at (x − 52, y − 84). */
export const candyCart = (g: G2D, x: number, y: number): void => {
  // Parasol pole and canopy (behind the cart).
  g.beginPath()
  g.roundRect(x + 48, y - 214, 8, 140, 4)
  fill(g, F.cream)
  ink(g, 3)
  bellRoof(g, x + 52, y - 252, y - 206, 76, 10, 8, F.lemon, F.cream, F.lemonShade, F.creamShade, F.cream)
  valance(g, x + 52, y - 206, 76, 10, 7, F.lemon, F.cream, 9, 3)
  disc(g, x + 52, y - 254, 6, F.pink, 2.4)
  cloudCandy(g, x - 32, y - 76, 1, F.pinkLite)
  cloudCandy(g, x + 2, y - 80, 1.1, F.skyLite)
  cloudCandy(g, x + 32, y - 74, 0.95, F.lemonLite)
  // Box.
  const box = (): void => {
    g.beginPath()
    g.roundRect(x - 64, y - 88, 128, 62, 10)
  }
  box()
  fill(g, F.pink)
  g.save()
  box()
  g.clip()
  g.beginPath()
  g.rect(x + 24, y - 90, 60, 70)
  fill(g, F.pinkShade)
  g.beginPath()
  g.rect(x - 70, y - 64, 140, 12)
  fill(g, F.lemon)
  g.restore()
  box()
  ink(g)
  g.beginPath()
  g.roundRect(x - 70, y - 96, 140, 14, 7)
  fill(g, F.cream)
  ink(g, 3.5)
  heart(g, x - 30, y - 40, 9)
  fill(g, F.cream)
  ink(g, 2.4)
  // Wheels.
  for (const d of [-1, 1]) {
    disc(g, x + d * 40, y - 18, 18, C.trunk, 4)
    disc(g, x + d * 40, y - 18, 6, F.lemon, 2.4)
  }
  // The handle.
  g.beginPath()
  g.moveTo(x - 64, y - 60)
  g.lineTo(x - 96, y - 72)
  ink(g, 5)
}

/** A picnic blanket (gingham) with a basket, lying at (x, y). */
export const picnic = (g: G2D, x: number, y: number): void => {
  const cloth = (): void => {
    g.beginPath()
    g.moveTo(x - 110, y + 20)
    g.lineTo(x - 70, y - 30)
    g.lineTo(x + 110, y - 30)
    g.lineTo(x + 86, y + 20)
    g.closePath()
  }
  cloth()
  fill(g, F.cream)
  g.save()
  cloth()
  g.clip()
  g.globalAlpha = 0.75
  g.beginPath()
  for (let i = -6; i < 8; i += 2) {
    g.moveTo(x + i * 26 - 20, y - 30)
    g.lineTo(x + i * 26 - 10, y - 30)
    g.lineTo(x + i * 26 - 34, y + 20)
    g.lineTo(x + i * 26 - 44, y + 20)
    g.closePath()
  }
  g.rect(x - 120, y - 18, 240, 10)
  g.rect(x - 120, y + 2, 240, 10)
  fill(g, F.pink)
  g.globalAlpha = 1
  g.restore()
  cloth()
  ink(g, 4)
  // The basket.
  g.beginPath()
  g.arc(x + 20, y - 40, 26, PI, TAU)
  ink(g, 5)
  g.beginPath()
  g.roundRect(x - 12, y - 44, 64, 38, [4, 4, 10, 10])
  fill(g, C.trunk)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - 10, y - 30)
  g.lineTo(x + 50, y - 30)
  g.moveTo(x - 8, y - 18)
  g.lineTo(x + 48, y - 18)
  ink(g, 2.2)
  // Cupcakes.
  for (const [dx, c] of [[-56, F.pinkLite], [-24, F.mintLite]] as const) {
    g.beginPath()
    g.moveTo(x + dx - 12, y - 18)
    g.lineTo(x + dx + 12, y - 18)
    g.lineTo(x + dx + 9, y)
    g.lineTo(x + dx - 9, y)
    g.closePath()
    fill(g, F.sky)
    ink(g, 2.6)
    circles(g, [[x + dx - 6, y - 22, 8], [x + dx + 6, y - 22, 8], [x + dx, y - 28, 9]])
    inkFill(g, c, 2)
    disc(g, x + dx, y - 38, 4, F.coral, 2)
  }
}

/** A tall candy-striped pole (lemon and cream), (x, top) → (x, bottom). */
export const candyPole = (g: G2D, x: number, top: number, bottom: number, w = 30, col = F.lemon): void => {
  const body = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, top, w, bottom - top, 6)
  }
  body()
  fill(g, F.cream)
  g.save()
  body()
  g.clip()
  candyStripes(g, x - w / 2, top, w, bottom - top, col, 34, 15)
  g.beginPath()
  g.rect(x + w * 0.18, top, w, bottom - top)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  body()
  ink(g, 4)
}

/* ------------------------------------------------------------ landmarks */

/** Where the welcome arch's bulbs sit (paint dots + live glow). */
export const archBulbs = (x: number, y: number, w: number): Pt[] => {
  const out: Pt[] = []
  const yb = y - 278
  for (let i = 0; i < 11; i++) {
    if (i === 5) continue
    const a = PI + ((i + 0.5) / 11) * PI
    out.push([x + cos(a) * (w / 2 + 7), yb + sin(a) * 105])
  }
  return out
}
/** The welcome arch's two finial flag-pole tops. */
export const archFlags = (x: number, y: number, w: number): readonly Pt[] => [[x - w / 2, y - 440], [x + w / 2, y - 440]]

/**
 * The Festival's welcome arch standing at (x, y), pillars `w` apart:
 * candy-cane pillars, an arched band with gold trim, a heart medallion, a
 * flower garland, scallops. The pillars and the band are the landmark.
 */
export const welcomeArch = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const yb = y - 278
  const RO = w / 2 + 44
  const RI = w / 2 - 30
  // Pillars.
  for (const d of [-1, 1]) {
    const px = x + d * (w / 2)
    const pillar = (): void => {
      g.beginPath()
      g.roundRect(px - 30, yb + 10, 60, y - 36 - yb - 10, 4)
    }
    pillar()
    fill(g, F.cream)
    g.save()
    pillar()
    g.clip()
    candyStripes(g, px - 30, yb, 60, y - yb, pot.base, 44, 20)
    g.beginPath()
    g.rect(px + 10, yb, 40, y - yb)
    g.clip()
    g.fillStyle = F.creamShade
    g.fillRect(px + 10, yb, 40, y - yb)
    candyStripes(g, px - 30, yb, 60, y - yb, pot.shade, 44, 20)
    g.restore()
    pillar()
    ink(g)
    g.beginPath()
    g.roundRect(px - 42, y - 42, 84, 44, 10)
    fill(g, F.lemon)
    ink(g)
    g.beginPath()
    g.rect(px + 14, y - 38, 26, 36)
    fill(g, F.lemonShade)
    g.beginPath()
    g.roundRect(px - 38, yb + 2, 76, 20, 9)
    fill(g, F.lemon)
    ink(g, 4)
  }
  // The arched band.
  const band = (): void => {
    g.beginPath()
    g.ellipse(x, yb, RO, 140, 0, PI, TAU)
    g.ellipse(x, yb, RI, 70, 0, TAU, PI, true)
    g.closePath()
  }
  band()
  fill(g, pot.base)
  g.save()
  band()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.2, yb - 160, w, 200)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(x, yb, RO - 10, 130, 0, PI, TAU)
  g.lineWidth = 6
  g.strokeStyle = F.lemon
  g.stroke()
  g.beginPath()
  g.ellipse(x, yb, RO - 26, 118, 0, PI * 1.13, PI * 1.36)
  g.lineWidth = 7
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  band()
  ink(g)
  // Scallops under the band's inner edge.
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const a = PI + ((i + 0.5) / 9) * PI
    const sx = x + cos(a) * RI
    const sy = yb + sin(a) * 70
    g.moveTo(sx + 15, sy)
    g.arc(sx, sy, 15, 0, PI)
    g.closePath()
  }
  fill(g, pot.lite)
  ink(g, 3)
  bulbDots(g, archBulbs(x, y, w), 6)
  // The garland of flowers along the band's crown.
  const FC = ['#ffffff', F.lemon, F.lilac, F.sky]
  for (let i = 0; i < 12; i++) {
    const a = PI * 1.06 + (i / 11) * PI * 0.88
    if (i === 5 || i === 6) continue
    flower(g, x + cos(a) * (RO - 4), yb + sin(a) * 136, 12, FC[i % 4]!, i)
  }
  // Finials and their flag poles (the flags are props).
  for (const d of [-1, 1]) {
    const px = x + d * (w / 2)
    const py = yb - 140 * Math.sqrt(Math.max(0, 1 - (w / 2 / RO) ** 2))
    g.beginPath()
    g.moveTo(px, py - 10)
    g.lineTo(px, y - 440)
    ink(g, 3.5)
    disc(g, px, py - 6, 14, F.lemon, 4)
    disc(g, px, y - 442, 5, F.lemon, 2.4)
  }
  // The heart medallion at the crown.
  const my = yb - 106
  disc(g, x, my, 38, F.cream, LW)
  g.beginPath()
  g.arc(x, my, 31, 0, TAU)
  g.lineWidth = 5
  g.strokeStyle = F.lemon
  g.stroke()
  heart(g, x, my + 2, 17)
  fill(g, F.love)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x - 7, my - 5, 4, 6, 0.5, 0, TAU)
  fill(g, '#ffd1e2')
}

/* ------------------------------------------------------------ carousel */

/** The carousel's measures, about its centre x and platform-top `base`. */
export const CAR = { R: 318, H: 168, eave: 224, bulge: 30, n: 14, scal: 22, rx: 300, ry: 44, orbit: 246 } as const

export const carouselBulbs = (cx: number, base: number): Pt[] => valanceBulbs(cx, base - CAR.eave, CAR.R, CAR.bulge, 12, CAR.scal)

/** The carousel's static parts at (cx, base): the platform and the striped
 *  canopy — the canopy is the landmark. Horses, poles and the drum are live. */
export const carousel = (g: G2D, cx: number, base: number, pot: Pot): void => {
  const eave = base - CAR.eave
  const apex = eave - CAR.H
  const { rx, ry } = CAR
  // The platform's skirt, then its top face.
  const skirt = (): void => {
    g.beginPath()
    g.moveTo(cx + rx, base)
    g.ellipse(cx, base, rx, ry, 0, 0, PI)
    g.lineTo(cx - rx, base + 38)
    g.ellipse(cx, base + 38, rx, ry, 0, PI, 0, true)
    g.closePath()
  }
  skirt()
  fill(g, F.sky)
  g.save()
  skirt()
  g.clip()
  g.beginPath()
  g.rect(cx + rx * 0.3, base - 10, rx, 100)
  fill(g, F.skyShade)
  g.restore()
  skirt()
  ink(g)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const th = PI * ((i + 0.5) / 9)
    const px = cx + cos(th) * rx
    const py = base + sin(th) * ry + 19
    g.moveTo(px + 9, py)
    g.ellipse(px, py, 9 * Math.max(0.35, sin(th)), 9, 0, 0, TAU)
  }
  fill(g, F.lemon)
  ink(g, 2.4)
  g.beginPath()
  g.ellipse(cx, base, rx, ry, 0, 0, TAU)
  fill(g, '#ffe6bf')
  ink(g)
  g.beginPath()
  g.ellipse(cx, base, rx * 0.72, ry * 0.7, 0, 0, TAU)
  g.lineWidth = 4
  g.strokeStyle = '#f5cf98'
  g.stroke()
  // The canopy, its scallops and bulbs.
  bellRoof(g, cx, apex, eave, CAR.R, CAR.bulge, CAR.n, pot.base, F.cream, pot.shade, F.creamShade, pot.lite)
  valance(g, cx, eave, CAR.R, CAR.bulge, 12, pot.lite, pot.base, CAR.scal)
  bulbDots(g, carouselBulbs(cx, base), 5)
  // The cupola on top and its flag pole (the flag is a prop).
  g.beginPath()
  g.moveTo(cx, apex - 8)
  g.lineTo(cx, apex - 64)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(cx, apex + 6, 26, 22, 0, PI, TAU)
  g.closePath()
  fill(g, F.lemon)
  ink(g, 4)
  disc(g, cx, apex - 20, 8, F.lemon, 3)
}

export interface HorseLook { coat: string; mane: string; saddle: string }
export const HORSES: readonly HorseLook[] = [
  { coat: '#fff6ea', mane: F.pink, saddle: F.sky },
  { coat: '#ffe0ef', mane: F.sky, saddle: F.lemon },
  { coat: '#e2f4ff', mane: F.lemon, saddle: F.pink },
  { coat: '#fff2c2', mane: F.lilac, saddle: F.mint },
  { coat: '#e4fbef', mane: F.coral, saddle: F.lilac },
  { coat: '#efe4ff', mane: F.mint, saddle: F.coral }
]

/** A carousel unicorn, body centre (x, y), facing `dir`; `full` adds the
 *  saddle, horn and eye (the far side's horses are drawn plainer). */
export const horse = (g: G2D, x: number, y: number, s: number, dir: number, L: HorseLook, full: boolean): void => {
  const w = 1 / s
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(-14, 6)
  g.lineTo(-31, 20)
  g.moveTo(-8, 8)
  g.lineTo(-17, 27)
  g.moveTo(13, 6)
  g.quadraticCurveTo(29, 4, 30, 17)
  g.moveTo(19, 8)
  g.lineTo(23, 27)
  g.lineWidth = 7 + 4.4 * w
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 7
  g.strokeStyle = L.coat
  g.stroke()
  circles(g, [[-27, -6, 7], [-33, 3, 6], [-30, 12, 5]])
  inkFill(g, L.mane, 2.2 * w)
  g.beginPath()
  g.ellipse(0, 0, 26, 15, 0, 0, TAU)
  g.moveTo(30, -13)
  g.arc(21, -13, 9, 0, TAU)
  g.moveTo(41, -25)
  g.arc(28, -25, 13, 0, TAU)
  g.moveTo(46, -19)
  g.ellipse(37, -19, 9, 7, 0, 0, TAU)
  g.moveTo(22, -35)
  g.lineTo(24, -45)
  g.lineTo(29, -36)
  inkFill(g, L.coat, 2.2 * w)
  circles(g, [[18, -36, 7], [12, -28, 7], [10, -18, 6]])
  inkFill(g, L.mane, 2.2 * w)
  if (!full) {
    g.restore()
    return
  }
  g.beginPath()
  g.ellipse(-2, -13, 12, 6, 0, 0, TAU)
  fill(g, L.saddle)
  ink(g, 2.2 * w)
  g.beginPath()
  g.moveTo(30, -36)
  g.lineTo(36, -52)
  g.lineTo(37, -35)
  g.closePath()
  fill(g, F.lemon)
  ink(g, 2 * w)
  g.beginPath()
  g.arc(32, -25, 2.6, 0, TAU)
  fill(g, INK)
  g.restore()
}

const drum = (g: G2D, cx: number, top: number, bottom: number): void => {
  g.beginPath()
  g.roundRect(cx - 58, top, 116, bottom - top, 6)
  fill(g, F.cream)
  ink(g, 4)
  g.beginPath()
  g.rect(cx + 20, top + 2, 36, bottom - top - 4)
  fill(g, F.creamShade)
  const my = (top + bottom) / 2
  g.beginPath()
  g.ellipse(cx - 24, my, 13, (bottom - top) * 0.28, 0, 0, TAU)
  g.moveTo(cx + 37, my)
  g.ellipse(cx + 24, my, 13, (bottom - top) * 0.28, 0, 0, TAU)
  fill(g, F.skyLite)
  ink(g, 3)
  g.beginPath()
  g.rect(cx - 58, top, 116, 12)
  g.rect(cx - 58, bottom - 14, 116, 14)
  fill(g, F.lemon)
  ink(g, 3)
}

/** The valance's lower edge at x — where a pole may start without crossing it. */
const valanceFoot = (cx: number, base: number, x: number): number => {
  const k = clamp((x - cx) / CAR.R, -1, 1)
  return base - CAR.eave + CAR.bulge * Math.sqrt(1 - k * k) + CAR.scal + 2
}

/**
 * The carousel turning (a live prop): six unicorns on brass poles going
 * round and bobbing, the far ones behind the mirrored drum. At rest they
 * stand still.
 */
export const carouselLive = (g: G2D, cx: number, base: number, t: number, alive: number): void => {
  const rot = 0.52 + t * 0.3 * alive
  const n = HORSES.length
  const drumTop = base - CAR.eave + CAR.bulge + CAR.scal + 6
  for (const front of [false, true]) {
    if (front) drum(g, cx, drumTop, base + 6)
    // Nearer horses last: walk the depth order without allocating.
    let last = -2
    for (let j = 0; j < n; j++) {
      let pick = -1
      let best = 2
      for (let i = 0; i < n; i++) {
        const d = sin(rot + (i * TAU) / n)
        if (d >= 0 !== front || d <= last || d >= best) continue
        best = d
        pick = i
      }
      if (pick < 0) break
      last = best
      const a = rot + (pick * TAU) / n
      const d = best
      const x = cx + cos(a) * CAR.orbit
      const floor = base + d * CAR.ry * 0.62
      const s = 1.3 + d * 0.14
      const bob = alive * sin(t * 2.4 + pick * 2.1) * 11
      const hy = floor - 64 * s - bob
      g.beginPath()
      g.moveTo(x, valanceFoot(cx, base, x))
      g.lineTo(x, floor)
      g.lineWidth = 9
      g.strokeStyle = INK
      g.lineCap = 'round'
      g.stroke()
      g.lineWidth = 4
      g.strokeStyle = front ? F.lemon : F.lemonShade
      g.stroke()
      horse(g, x, hy, s, front ? -1 : 1, HORSES[pick]!, front)
    }
  }
}

/* ------------------------------------------------------------ the market */

/** A market stall's frame at (x, y), `w` wide: posts, the inside, and its
 *  striped AWNING (the landmark). The counter and goods come after. */
export const stall = (g: G2D, x: number, y: number, w: number, pot: Pot, sign: (g: G2D, x: number, y: number) => void): void => {
  const top = y - 286
  g.beginPath()
  for (const d of [-1, 1]) g.roundRect(x + d * (w / 2 - 10) - 7, top + 30, 14, y - top - 30, 5)
  fill(g, C.trunk)
  ink(g, 4)
  g.beginPath()
  g.rect(x - w / 2 + 4, top + 60, w - 8, y - 80 - top - 60)
  fill(g, '#ffe4cc')
  ink(g, 4)
  g.beginPath()
  g.rect(x - w / 2 + 6, top + 62, w - 12, 30)
  fill(g, '#f7cbb2')
  // The awning: a sloped striped roof, its front board and scallops.
  const yb = top + 22
  const yf = top + 80
  const hb = w * 0.44
  const hf = w / 2 + 18
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - hb, yb)
    g.lineTo(x + hb, yb)
    g.lineTo(x + hf, yf)
    g.lineTo(x - hf, yf)
    g.closePath()
  }
  roof()
  fill(g, F.cream)
  g.save()
  roof()
  g.clip()
  const n = 7
  g.beginPath()
  for (let i = 0; i < n; i += 2) {
    const k0 = i / n
    const k1 = (i + 1) / n
    g.moveTo(x - hb + 2 * hb * k0, yb)
    g.lineTo(x - hb + 2 * hb * k1, yb)
    g.lineTo(x - hf + 2 * hf * k1, yf)
    g.lineTo(x - hf + 2 * hf * k0, yf)
    g.closePath()
  }
  fill(g, pot.base)
  g.beginPath()
  g.ellipse(x - hb * 0.5, yb + 18, 26, 6, -0.12, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  g.beginPath()
  g.roundRect(x - hf - 4, yf - 2, 2 * hf + 8, 16, 5)
  fill(g, pot.shade)
  ink(g, 4)
  for (const pass of [0, 1]) {
    g.beginPath()
    for (let i = pass; i < n; i += 2) {
      const sx = x - hf + (2 * hf * (i + 0.5)) / n
      const r = hf / n
      g.moveTo(sx + r, yf + 14)
      g.arc(sx, yf + 14, r, 0, PI)
      g.closePath()
    }
    fill(g, pass ? pot.lite : pot.base)
    ink(g, 3)
  }
  // The round sign on top.
  g.beginPath()
  g.moveTo(x, yb)
  g.lineTo(x, yb - 12)
  ink(g, 4)
  disc(g, x, yb - 36, 27, F.cream, 4)
  sign(g, x, yb - 36)
}

/** A stall's counter front at (x, y) — also a tap creature's cover. */
export const stallCounter = (g: G2D, x: number, y: number, w: number, col: string, shade: string): void => {
  const h = 70
  const body = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, [2, 2, 8, 8])
  }
  body()
  fill(g, col)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.24, y - h, w, h)
  fill(g, shade)
  g.restore()
  body()
  ink(g)
  g.save()
  body()
  g.clip()
  g.beginPath()
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 7; i++) {
      const dx = x - w / 2 + 20 + i * ((w - 40) / 6) + (j ? (w - 40) / 12 : 0)
      const dy = y - h + 26 + j * 24
      g.moveTo(dx + 5, dy)
      g.arc(dx, dy, 5, 0, TAU)
    }
  }
  g.globalAlpha = 0.55
  fill(g, F.cream)
  g.globalAlpha = 1
  g.restore()
  g.beginPath()
  g.roundRect(x - w / 2 - 8, y - h - 12, w + 16, 16, 7)
  fill(g, '#ffd9a0')
  ink(g, 4)
}

/** Stall signs: a shell, a cloud, a star. */
export const signShell = (g: G2D, x: number, y: number): void => {
  g.beginPath()
  g.moveTo(x, y + 13)
  g.arc(x, y + 13, 22, PI * 1.18, PI * 1.82)
  g.closePath()
  fill(g, F.coral)
  ink(g, 3)
  g.beginPath()
  for (const a of [-0.5, -0.17, 0.17, 0.5]) {
    g.moveTo(x, y + 13)
    g.lineTo(x + sin(a) * 18, y + 13 - cos(a) * 18)
  }
  ink(g, 2)
}
export const signCloud = (g: G2D, x: number, y: number): void => {
  circles(g, [[x - 10, y + 4, 9], [x + 2, y - 4, 12], [x + 13, y + 5, 8]])
  inkFill(g, F.skyLite, 2.2)
}
export const signStar = (g: G2D, x: number, y: number): void => {
  star5(g, x, y + 1, 17)
  fill(g, F.lemon)
  ink(g, 3)
}

/** A crystal cluster (a nod to the Crystal Caves) standing at (x, y). */
export const crystals = (g: G2D, x: number, y: number, s: number, col: string, shade: string): void => {
  const P: readonly (readonly [number, number, number, number])[] = [[-16, 30, 10, -0.35], [14, 34, 10, 0.3], [0, 50, 12, 0]]
  for (const [dx, h, hw, a] of P) {
    const bx = x + dx * s
    const ca = cos(a)
    const sa = sin(a)
    const pt = (u: number, v: number): [number, number] => [bx + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s]
    const shape = (): void => {
      g.beginPath()
      g.moveTo(...pt(-hw, 0))
      g.lineTo(...pt(-hw, -h))
      g.lineTo(...pt(0, -h - hw * 1.2))
      g.lineTo(...pt(hw, -h))
      g.lineTo(...pt(hw, 0))
      g.closePath()
    }
    shape()
    fill(g, col)
    g.save()
    shape()
    g.clip()
    g.beginPath()
    g.moveTo(...pt(0, -h - hw * 2))
    g.lineTo(...pt(hw * 2, -h))
    g.lineTo(...pt(hw * 2, 4))
    g.lineTo(...pt(0, 4))
    g.closePath()
    fill(g, shade)
    g.restore()
    shape()
    ink(g, 3)
  }
}

/** A snowglobe (a nod to Twilight Tundra) standing at (x, y). */
export const snowglobe = (g: G2D, x: number, y: number): void => {
  g.beginPath()
  g.arc(x, y - 36, 26, 0, TAU)
  fill(g, '#dff3ff')
  g.save()
  g.clip()
  g.beginPath()
  g.ellipse(x, y - 16, 30, 12, 0, 0, TAU)
  fill(g, '#ffffff')
  g.beginPath()
  g.moveTo(x - 10, y - 20)
  g.lineTo(x, y - 46)
  g.lineTo(x + 10, y - 20)
  g.closePath()
  fill(g, C.pine)
  g.beginPath()
  for (const [dx, dy] of [[-14, -48], [8, -54], [16, -36], [-18, -30], [2, -40]] as const) {
    g.moveTo(x + dx + 2.4, y + dy)
    g.arc(x + dx, y + dy, 2.4, 0, TAU)
  }
  fill(g, '#ffffff')
  g.restore()
  g.beginPath()
  g.arc(x, y - 36, 26, 0, TAU)
  ink(g, 4)
  g.beginPath()
  g.ellipse(x - 9, y - 46, 5, 8, 0.6, 0, TAU)
  fill(g, '#ffffff')
  g.beginPath()
  g.roundRect(x - 24, y - 14, 48, 16, [4, 4, 6, 6])
  fill(g, F.lilac)
  ink(g, 3.5)
}

/** A star lantern (a nod to Starlight Summit) on a little stand at (x, y). */
export const starLantern = (g: G2D, x: number, y: number): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - 40)
  ink(g, 4)
  star5(g, x, y - 56, 20)
  fill(g, F.lemon)
  ink(g, 3.5)
  star5(g, x, y - 56, 8)
  fill(g, '#fff9d6')
}

/* ------------------------------------------------------------ the wheel */

export const WHEEL_CABINS = 8

/** The ferris wheel's frame at hub (cx, cy), radius R, feet at `groundY`:
 *  its A-frame, the boarding deck, and the RIM and hub (the landmark — a
 *  ring, so it reads the same at any turn). Spokes, bulbs and cabins turn
 *  as a live prop. */
export const ferrisFrame = (g: G2D, cx: number, cy: number, R: number, groundY: number, pot: Pot): void => {
  // The A-frame legs, behind the wheel, with a cross brace.
  g.lineCap = 'round'
  g.beginPath()
  for (const d of [-1, 1]) {
    g.moveTo(cx, cy)
    g.lineTo(cx + d * R * 0.62, groundY)
  }
  const by = lerp(cy, groundY, 0.62)
  g.moveTo(cx - R * 0.62 * 0.62, by)
  g.lineTo(cx + R * 0.62 * 0.62, by)
  g.lineWidth = 22 + 2 * LW
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 22
  g.strokeStyle = F.cream
  g.stroke()
  g.beginPath()
  for (const d of [-1, 1]) {
    g.moveTo(cx + d * 6, cy + 20)
    g.lineTo(cx + d * R * 0.62 + d * 6, groundY - 2)
  }
  g.lineWidth = 6
  g.strokeStyle = F.creamShade
  g.stroke()
  // The boarding deck and its steps.
  g.beginPath()
  g.roundRect(cx - R * 0.5, groundY - 22, R, 26, 8)
  fill(g, C.trunk)
  ink(g)
  g.beginPath()
  g.rect(cx + R * 0.1, groundY - 20, R * 0.38, 22)
  fill(g, C.trunkShade)
  g.beginPath()
  g.roundRect(cx - R * 0.66, groundY - 10, R * 0.2, 14, 4)
  fill(g, C.trunk)
  ink(g, 3.5)
  // The rim: a thick ring in the pot, shaded low-right, lit up-left.
  const ring = (): void => {
    g.beginPath()
    g.arc(cx, cy, R, 0, TAU)
    g.arc(cx, cy, R - 22, 0, TAU, true)
  }
  ring()
  fill(g, pot.base)
  g.save()
  ring()
  g.clip()
  g.beginPath()
  g.arc(cx + R * 0.36, cy + R * 0.36, R, 0, TAU)
  fill(g, pot.shade)
  g.beginPath()
  g.arc(cx, cy, R - 11, PI * 1.08, PI * 1.42)
  g.lineWidth = 6
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  ring()
  ink(g)
  // The inner ring.
  g.beginPath()
  g.arc(cx, cy, R * 0.56, 0, TAU)
  g.lineWidth = 12
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = pot.shade
  g.stroke()
  // The hub: a flower of the pot with a heart.
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8
    g.moveTo(cx + cos(a) * 30 + 14, cy + sin(a) * 30)
    g.arc(cx + cos(a) * 30, cy + sin(a) * 30, 14, 0, TAU)
  }
  inkFill(g, pot.base, 3.5)
  disc(g, cx, cy, 30, pot.lite, 4)
  heart(g, cx, cy + 2, 15)
  fill(g, F.love)
  ink(g, 3)
}

/** One gondola hung from its pin (px, py), swinging by `sw`. */
const cabin = (g: G2D, px: number, py: number, sw: number, col: string, shade: string): void => {
  g.save()
  g.translate(px, py)
  g.rotate(sw)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, 14)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(-26, 22)
  g.quadraticCurveTo(-18, 6, 0, 6)
  g.quadraticCurveTo(18, 6, 26, 22)
  g.closePath()
  fill(g, shade)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(-23, 21, 46, 34, [3, 3, 13, 13])
  fill(g, col)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(-16, 26, 32, 14, 6)
  fill(g, F.skyLite)
  ink(g, 2.4)
  g.restore()
}

const CABIN_COLS: readonly (readonly [string, string])[] = [
  [F.pink, F.pinkShade], [F.lemon, F.lemonShade], [F.mint, F.mintShade], [F.sky, F.skyShade],
  [F.lilac, F.lilacShade], [F.coral, F.coralShade], [F.orange, F.orangeShade], [F.lemon, F.lemonShade]
]

/** The ferris wheel turning (a live prop): spokes, rim bulbs, and eight
 *  candy-coloured cabins that always hang level, swinging a little. */
export const ferrisLive = (g: G2D, cx: number, cy: number, R: number, t: number, alive: number): void => {
  const ang = 0.22 + t * 0.14 * alive
  // Spokes.
  g.beginPath()
  for (let i = 0; i < WHEEL_CABINS; i++) {
    const a = ang + (i * TAU) / WHEEL_CABINS
    g.moveTo(cx + cos(a) * 44, cy + sin(a) * 44)
    g.lineTo(cx + cos(a) * (R - 22), cy + sin(a) * (R - 22))
    const b = a + TAU / 16
    g.moveTo(cx + cos(b) * R * 0.56, cy + sin(b) * R * 0.56)
    g.lineTo(cx + cos(b) * (R - 22), cy + sin(b) * (R - 22))
  }
  g.lineWidth = 8
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 3.5
  g.strokeStyle = F.cream
  g.stroke()
  // Rim bulbs.
  const nb = 16
  g.beginPath()
  for (let i = 0; i < nb; i++) {
    const a = ang + (i * TAU) / nb + TAU / 32
    const x = cx + cos(a) * (R - 11)
    const y = cy + sin(a) * (R - 11)
    g.moveTo(x + 4.5, y)
    g.arc(x, y, 4.5, 0, TAU)
  }
  fill(g, F.cream)
  ink(g, 1.8)
  if (alive > 0) {
    const step = Math.floor(t * 4)
    g.globalAlpha = alive * 0.4
    g.beginPath()
    for (let i = 0; i < nb; i++) {
      if ((i + step) % 3) continue
      const a = ang + (i * TAU) / nb + TAU / 32
      const x = cx + cos(a) * (R - 11)
      const y = cy + sin(a) * (R - 11)
      g.moveTo(x + 9, y)
      g.arc(x, y, 9, 0, TAU)
    }
    fill(g, F.glow)
    g.globalAlpha = alive
    g.beginPath()
    for (let i = 0; i < nb; i++) {
      if ((i + step) % 3) continue
      const a = ang + (i * TAU) / nb + TAU / 32
      const x = cx + cos(a) * (R - 11)
      const y = cy + sin(a) * (R - 11)
      g.moveTo(x + 4.5, y)
      g.arc(x, y, 4.5, 0, TAU)
    }
    fill(g, F.bulb)
    g.globalAlpha = 1
  }
  // Cabins.
  for (let i = 0; i < WHEEL_CABINS; i++) {
    const a = ang + (i * TAU) / WHEEL_CABINS
    const [c, sh] = CABIN_COLS[i % CABIN_COLS.length]!
    cabin(g, cx + cos(a) * R, cy + sin(a) * R, alive * sin(t * 1.5 + i * 0.9) * 0.09, c, sh)
  }
}

/* ------------------------------------------------------------ the stage */

/** The stage's measures about its centre x and floor front `fy`. */
export const STAGE = {
  half: 360,
  outer: 344,
  inner: 234,
  back: 26,
  top: 214,
  mainApex: 62,
  mainEave: 200,
  mainR: 252,
  sideDx: 292,
  sideApex: 120,
  sideEave: 210,
  sideR: 112
} as const

/** The apex flag-pole tops of the stage's three roofs (the flags are props). */
export const stageFlags = (cx: number): readonly Pt[] => [
  [cx - STAGE.sideDx, STAGE.sideApex - 52], [cx + STAGE.sideDx, STAGE.sideApex - 52], [cx, STAGE.mainApex - 50]
]

export const stageBulbs = (cx: number): Pt[] => valanceBulbs(cx, STAGE.mainEave, STAGE.mainR, 24, 12, 20)

/** One of the stage's swagged curtains (`side` −1 left, 1 right) — also the
 *  tap creature's cover on the boss sector. */
export const stageCurtain = (g: G2D, cx: number, fy: number, side: number): void => {
  const floor = fy - STAGE.back
  const x0 = cx + side * (STAGE.inner - 10)
  const X = (dx: number): number => cx + side * dx
  const path = (): void => {
    g.beginPath()
    g.moveTo(x0, STAGE.top)
    g.lineTo(X(96), STAGE.top)
    g.quadraticCurveTo(X(150), 330, X(196), 376)
    g.quadraticCurveTo(X(160), 420, X(124), floor)
    g.lineTo(x0, floor)
    g.closePath()
  }
  path()
  fill(g, F.curtain)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(X(96), STAGE.top)
  g.quadraticCurveTo(X(150), 330, X(196), 376)
  g.quadraticCurveTo(X(170), 330, X(130), STAGE.top)
  g.closePath()
  g.moveTo(x0, 390)
  g.quadraticCurveTo(X(190), 400, X(150), floor)
  g.lineTo(x0, floor)
  g.closePath()
  fill(g, F.curtainShade)
  g.beginPath()
  g.moveTo(X(206), STAGE.top + 10)
  g.quadraticCurveTo(X(200), 300, X(214), 370)
  g.moveTo(X(180), 400)
  g.quadraticCurveTo(X(172), 440, X(170), floor)
  ink(g, 2.4)
  g.restore()
  path()
  ink(g)
  // The gold tie-back.
  g.beginPath()
  g.ellipse(X(212), 378, 12, 18, side * 0.4, 0, TAU)
  fill(g, F.lemon)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(X(214), 394)
  g.lineTo(X(218), 416)
  g.moveTo(X(206), 394)
  g.lineTo(X(204), 414)
  ink(g, 4)
  g.lineWidth = 2
  g.strokeStyle = F.lemon
  g.stroke()
}

/** One of the nine chapter emblems on a cream medallion — the whole story,
 *  there to welcome Umbra: leaf, shell, cloud, crystal, mirror, rainbow,
 *  hourglass, snowflake, star. */
export const emblem = (g: G2D, i: number, x: number, y: number, r: number): void => {
  disc(g, x, y, r, F.cream, 3.5)
  g.beginPath()
  g.arc(x, y, r - 5, 0, TAU)
  g.lineWidth = 3
  g.strokeStyle = F.lemon
  g.stroke()
  const k = r * 0.56
  switch (i) {
    case 0:
      g.beginPath()
      g.moveTo(x - k, y + k * 0.7)
      g.quadraticCurveTo(x - k, y - k, x + k * 0.9, y - k * 0.8)
      g.quadraticCurveTo(x + k * 0.7, y + k * 0.8, x - k, y + k * 0.7)
      fill(g, C.moss)
      ink(g, 2.4)
      g.beginPath()
      g.moveTo(x - k * 0.7, y + k * 0.5)
      g.lineTo(x + k * 0.5, y - k * 0.5)
      ink(g, 1.8)
      break
    case 1:
      g.beginPath()
      g.moveTo(x, y + k * 0.9)
      g.arc(x, y + k * 0.9, k * 1.6, PI * 1.2, PI * 1.8)
      g.closePath()
      fill(g, F.coral)
      ink(g, 2.4)
      g.beginPath()
      for (const a of [-0.3, 0, 0.3]) {
        g.moveTo(x, y + k * 0.9)
        g.lineTo(x + sin(a) * k * 1.4, y + k * 0.9 - cos(a) * k * 1.4)
      }
      ink(g, 1.8)
      break
    case 2:
      circles(g, [[x - k * 0.55, y + k * 0.2, k * 0.5], [x, y - k * 0.2, k * 0.62], [x + k * 0.55, y + k * 0.22, k * 0.48]])
      inkFill(g, F.skyLite, 1.6)
      break
    case 3:
      g.beginPath()
      g.moveTo(x, y - k * 1.1)
      g.lineTo(x + k * 0.7, y - k * 0.3)
      g.lineTo(x + k * 0.45, y + k)
      g.lineTo(x - k * 0.45, y + k)
      g.lineTo(x - k * 0.7, y - k * 0.3)
      g.closePath()
      fill(g, '#b06bff')
      ink(g, 2.4)
      g.beginPath()
      g.moveTo(x - k * 0.7, y - k * 0.3)
      g.lineTo(x + k * 0.7, y - k * 0.3)
      g.moveTo(x, y - k * 1.1)
      g.lineTo(x, y + k)
      ink(g, 1.6)
      break
    case 4:
      g.beginPath()
      g.ellipse(x, y, k * 0.72, k, 0, 0, TAU)
      fill(g, '#c8dbff')
      ink(g, 2.4)
      g.beginPath()
      g.moveTo(x - k * 0.3, y - k * 0.3)
      g.lineTo(x + k * 0.1, y - k * 0.6)
      g.lineWidth = 2.6
      g.strokeStyle = '#ffffff'
      g.stroke()
      break
    case 5:
      for (const [rr, c] of [[1.05, F.pink], [0.75, F.lemon], [0.45, F.sky]] as const) {
        g.beginPath()
        g.arc(x, y + k * 0.5, k * rr, PI, TAU)
        g.lineWidth = k * 0.3 + 3
        g.strokeStyle = INK
        g.stroke()
        g.lineWidth = k * 0.3
        g.strokeStyle = c
        g.stroke()
      }
      break
    case 6:
      g.beginPath()
      g.moveTo(x - k * 0.62, y - k)
      g.lineTo(x + k * 0.62, y - k)
      g.lineTo(x, y)
      g.closePath()
      g.moveTo(x - k * 0.62, y + k)
      g.lineTo(x + k * 0.62, y + k)
      g.lineTo(x, y)
      g.closePath()
      fill(g, '#ffc233')
      ink(g, 2.4)
      break
    case 7:
      g.beginPath()
      for (let j = 0; j < 3; j++) {
        const a = (j * PI) / 3 + PI / 2
        g.moveTo(x - cos(a) * k, y - sin(a) * k)
        g.lineTo(x + cos(a) * k, y + sin(a) * k)
      }
      g.lineWidth = 6
      g.strokeStyle = INK
      g.lineCap = 'round'
      g.stroke()
      g.lineWidth = 2.6
      g.strokeStyle = '#6fd0ff'
      g.stroke()
      break
    default:
      star5(g, x, y + 1, k * 1.1)
      fill(g, '#ffd84d')
      ink(g, 2.4)
  }
}

/** A crescent moon at (x, y), radius r — Umbra's own sign. */
const moon = (g: G2D, x: number, y: number, r: number): void => {
  const inner = (): void => {
    g.beginPath()
    g.arc(x + r * 0.42, y - r * 0.28, r * 0.86, 0, TAU)
  }
  g.save()
  g.beginPath()
  g.rect(x - r * 2, y - r * 2, r * 4, r * 4)
  g.arc(x + r * 0.42, y - r * 0.28, r * 0.86, 0, TAU)
  g.clip('evenodd')
  disc(g, x, y, r, F.glow, 4)
  g.restore()
  g.save()
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.clip()
  inner()
  ink(g, 4)
  g.restore()
}

/**
 * The Festival Stage at centre `cx`, floor front `fy`: a night-sky backdrop
 * in Umbra's colours (a crescent moon and stars — the party is hers),
 * swagged curtains, candy pillars, three striped pavilion roofs with a sash
 * banner (the ROOFS are the landmark), a plank floor and a skirt carrying
 * every chapter's emblem.
 */
export const pavilion = (g: G2D, cx: number, fy: number, pot: Pot): void => {
  const S = STAGE
  const floor = fy - S.back
  // Umbra's night sky, hung as the backdrop.
  g.beginPath()
  g.rect(cx - S.inner, S.top, S.inner * 2, floor - S.top + 2)
  fill(g, F.violet)
  ink(g)
  g.save()
  g.beginPath()
  g.rect(cx - S.inner, S.top, S.inner * 2, floor - S.top)
  g.clip()
  g.beginPath()
  g.ellipse(cx, floor + 30, S.inner * 1.1, 90, 0, 0, TAU)
  fill(g, F.violetShade)
  const r = seeded(107)
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const x = cx - S.inner + 20 + r() * (S.inner * 2 - 40)
    const y = S.top + 40 + r() * 200
    tw(g, x, y, 4 + r() * 6)
  }
  fill(g, '#7ff3ff')
  g.restore()
  moon(g, cx + 102, 296, 26)
  for (const [x, y, s] of [[cx - 118, 300, 13], [cx + 150, 262, 9], [cx - 92, 250, 8]] as const) {
    star5(g, x, y, s)
    fill(g, F.lemon)
    ink(g, 2.4)
  }
  // Curtains, then the pillars.
  stageCurtain(g, cx, fy, -1)
  stageCurtain(g, cx, fy, 1)
  for (const d of [-1, 1]) {
    candyPole(g, cx + d * S.outer, S.sideEave + 10, floor + 4, 30)
    candyPole(g, cx + d * S.inner, S.mainEave + 16, floor + 4, 32)
  }
  // The side roofs, then the grand one.
  for (const d of [-1, 1]) {
    const x = cx + d * S.sideDx
    bellRoof(g, x, S.sideApex, S.sideEave, S.sideR, 16, 8, pot.base, F.cream, pot.shade, F.creamShade, pot.lite)
    valance(g, x, S.sideEave, S.sideR, 16, 6, pot.lite, pot.base, 16, 3)
  }
  bellRoof(g, cx, S.mainApex, S.mainEave, S.mainR, 24, 16, pot.base, F.cream, pot.shade, F.creamShade, pot.lite)
  valance(g, cx, S.mainEave, S.mainR, 24, 12, pot.lite, pot.base, 20)
  bulbDots(g, stageBulbs(cx), 5)
  // Finials and flag poles.
  for (const [x, y] of stageFlags(cx)) {
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x, y + 46)
    ink(g, 3.5)
    disc(g, x, y + 50, 9, F.lemon, 3)
    disc(g, x, y - 2, 5, F.lemon, 2.4)
  }
  // The sash banner across the grand roof, a heart at its middle.
  const sy = 150
  const sash = (): void => {
    g.beginPath()
    g.moveTo(cx - 168, sy + 22)
    g.quadraticCurveTo(cx, sy - 6, cx + 168, sy + 22)
    g.lineTo(cx + 168, sy + 50)
    g.quadraticCurveTo(cx, sy + 22, cx - 168, sy + 50)
    g.closePath()
  }
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(cx + d * 160, sy + 26)
    g.lineTo(cx + d * 204, sy + 34)
    g.lineTo(cx + d * 188, sy + 50)
    g.lineTo(cx + d * 204, sy + 66)
    g.lineTo(cx + d * 160, sy + 60)
    g.closePath()
    fill(g, F.skyShade)
    ink(g, 3.5)
  }
  sash()
  fill(g, F.sky)
  g.save()
  sash()
  g.clip()
  g.beginPath()
  g.moveTo(cx - 170, sy + 28)
  g.quadraticCurveTo(cx, sy, cx + 170, sy + 28)
  g.lineWidth = 3
  g.strokeStyle = F.skyLite
  g.stroke()
  g.restore()
  sash()
  ink(g, 4)
  disc(g, cx, sy + 18, 30, F.cream, 4)
  g.beginPath()
  g.arc(cx, sy + 18, 24, 0, TAU)
  g.lineWidth = 4
  g.strokeStyle = F.lemon
  g.stroke()
  heart(g, cx, sy + 20, 14)
  fill(g, F.love)
  ink(g, 3)
  // The plank floor and the emblem skirt.
  g.beginPath()
  g.moveTo(cx - S.half + 18, floor)
  g.lineTo(cx + S.half - 18, floor)
  g.lineTo(cx + S.half, fy)
  g.lineTo(cx - S.half, fy)
  g.closePath()
  fill(g, F.floor)
  ink(g, 4)
  g.beginPath()
  for (let i = -5; i <= 5; i++) {
    g.moveTo(cx + i * 60, floor + 3)
    g.lineTo(cx + i * 64, fy - 3)
  }
  g.lineWidth = 2.4
  g.strokeStyle = F.floorShade
  g.stroke()
  const skirt = (): void => {
    g.beginPath()
    g.roundRect(cx - S.half, fy, S.half * 2, 62, [0, 0, 6, 6])
  }
  skirt()
  fill(g, F.sky)
  g.save()
  skirt()
  g.clip()
  g.beginPath()
  g.rect(cx + S.half * 0.55, fy, S.half, 70)
  fill(g, F.skyShade)
  g.restore()
  skirt()
  ink(g)
  g.beginPath()
  g.rect(cx - S.half, fy, S.half * 2, 10)
  fill(g, F.lemon)
  ink(g, 3)
  for (let i = 0; i < 9; i++) emblem(g, i, cx + (i - 4) * 74, fy + 36, 21)
}

/** The candles' flame tips on a layer cake at (x, y), scale `s`. */
export const cakeFlames = (x: number, y: number, s: number): readonly Pt[] =>
  [-30, 0, 30].map((dx) => [x + dx * s, y - 222 * s] as const)

/** A three-tier party cake on a gold stand at (x, y), scale `s`. */
export const layerCake = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.moveTo(x - 44 * s, y)
  g.lineTo(x - 16 * s, y - 20 * s)
  g.lineTo(x + 16 * s, y - 20 * s)
  g.lineTo(x + 44 * s, y)
  g.closePath()
  fill(g, F.lemon)
  ink(g, 4)
  g.beginPath()
  g.ellipse(x, y - 24 * s, 126 * s, 12 * s, 0, 0, TAU)
  fill(g, F.lemon)
  ink(g, 4)
  const TIERS: readonly (readonly [number, number, string, string])[] = [
    [212, 58, F.pink, F.pinkShade], [158, 50, F.mint, F.mintShade], [106, 44, F.lemon, F.lemonShade]
  ]
  let yb = y - 28 * s
  const r = seeded(33)
  for (const [tw0, th0, col, shade] of TIERS) {
    const w = tw0 * s
    const h = th0 * s
    const body = (): void => {
      g.beginPath()
      g.roundRect(x - w / 2, yb - h, w, h, 10 * s)
    }
    body()
    fill(g, col)
    g.save()
    body()
    g.clip()
    g.beginPath()
    g.rect(x + w * 0.26, yb - h, w, h)
    fill(g, shade)
    // Frosting drips from the top.
    g.beginPath()
    g.moveTo(x - w / 2 - 4, yb - h - 4)
    g.lineTo(x + w / 2 + 4, yb - h - 4)
    const n = Math.round(w / 26)
    for (let i = n; i >= 0; i--) {
      const dx = x - w / 2 + (i / n) * w
      const len = (10 + ((i * 7) % 3) * 6) * s
      g.lineTo(dx + 6 * s, yb - h + 8 * s)
      g.quadraticCurveTo(dx + 6 * s, yb - h + len + 6 * s, dx, yb - h + len + 6 * s)
      g.quadraticCurveTo(dx - 6 * s, yb - h + len + 6 * s, dx - 6 * s, yb - h + 8 * s)
    }
    g.closePath()
    fill(g, F.cream)
    ink(g, 2.6)
    // Sprinkles.
    for (let c = 0; c < 3; c++) {
      g.beginPath()
      for (let i = 0; i < 6; i++) {
        const sx = x - w / 2 + 12 * s + r() * (w - 24 * s)
        const sy = yb - h * 0.34 + (r() - 0.5) * h * 0.3
        const a = r() * PI
        g.moveTo(sx - cos(a) * 4 * s, sy - sin(a) * 4 * s)
        g.lineTo(sx + cos(a) * 4 * s, sy + sin(a) * 4 * s)
      }
      g.lineWidth = 3.2 * s
      g.lineCap = 'round'
      g.strokeStyle = [F.sky, F.lemon, F.lilac][c]!
      if (col === F.lemon && c === 1) g.strokeStyle = F.pink
      g.stroke()
    }
    g.restore()
    body()
    ink(g, 4)
    yb -= h
  }
  // Three striped candles and their flames.
  for (const [dx, c] of [[-30, F.sky], [0, F.pink], [30, F.lilac]] as const) {
    const cx = x + dx * s
    g.beginPath()
    g.roundRect(cx - 6 * s, yb - 30 * s, 12 * s, 32 * s, 4 * s)
    fill(g, F.cream)
    g.save()
    g.clip()
    candyStripes(g, cx - 6 * s, yb - 30 * s, 12 * s, 32 * s, c, 12 * s, 5 * s, 0.8)
    g.restore()
    g.beginPath()
    g.roundRect(cx - 6 * s, yb - 30 * s, 12 * s, 32 * s, 4 * s)
    ink(g, 3)
    g.beginPath()
    g.moveTo(cx, yb - 56 * s)
    g.quadraticCurveTo(cx + 10 * s, yb - 40 * s, cx, yb - 33 * s)
    g.quadraticCurveTo(cx - 10 * s, yb - 40 * s, cx, yb - 56 * s)
    fill(g, F.orange)
    ink(g, 2.6)
    g.beginPath()
    g.ellipse(cx, yb - 40 * s, 3 * s, 5 * s, 0, 0, TAU)
    fill(g, F.lemonLite)
  }
}

/* ----------------------------------------------------------- live props */

/**
 * A bunch of balloons tied at (x, y), fanned and leaning by `lean` (−1 … 1),
 * bobbing once alive. `cols` sets how many and their colours.
 */
export const balloonBunch = (
  g: G2D, x: number, y: number, s: number, cols: readonly string[], t: number, alive: number, lean = 0, ph = 0
): void => {
  const n = cols.length
  const bx = (i: number): number => {
    const a = (i - (n - 1) / 2) * 0.36 + lean * 0.3 + alive * sin(t * 1.1 + i * 1.7 + ph) * 0.05
    return x + sin(a) * (110 + ((i * 37) % 3) * 18) * s
  }
  const by = (i: number): number => {
    const a = (i - (n - 1) / 2) * 0.36 + lean * 0.3
    return y - cos(a) * (110 + ((i * 37) % 3) * 18) * s + alive * sin(t * 1.6 + i * 2.3 + ph) * 5 * s
  }
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const px = bx(i)
    const py = by(i) + 30 * s
    g.moveTo(x, y)
    g.quadraticCurveTo(lerp(x, px, 0.3) + 8 * s, lerp(y, py, 0.5), px, py)
  }
  ink(g, 2)
  for (let i = 0; i < n; i++) {
    const px = bx(i)
    const py = by(i)
    g.beginPath()
    g.ellipse(px, py, 22 * s, 26 * s, 0, 0, TAU)
    g.moveTo(px, py + 25 * s)
    g.lineTo(px - 5 * s, py + 31 * s)
    g.lineTo(px + 5 * s, py + 31 * s)
    g.closePath()
    fill(g, cols[i]!)
    ink(g, 3)
  }
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const px = bx(i) - 8 * s
    const py = by(i) - 9 * s
    g.moveTo(px + 4 * s, py)
    g.ellipse(px, py, 4 * s, 7 * s, -0.5, 0, TAU)
  }
  g.globalAlpha = 0.8
  fill(g, '#ffffff')
  g.globalAlpha = 1
}

/**
 * Paper lanterns strung along a sagging line from (x0, y0) to (x1, y1): they
 * swing and glow once alive, hang still and unlit at rest.
 */
export const lanternString = (
  g: G2D, x0: number, y0: number, x1: number, y1: number, sag: number, n: number,
  cols: readonly string[], t: number, alive: number, ph = 0
): void => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + sag * 2
  const L = 18
  const at = (i: number): [number, number, number] => {
    const k = (i + 1) / (n + 1)
    const px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1
    const py = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1
    const a = alive * sin(t * 1.7 + i * 1.3 + ph) * 0.2
    return [px, py, a]
  }
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx, my, x1, y1)
  for (let i = 0; i < n; i++) {
    const [px, py, a] = at(i)
    g.moveTo(px, py)
    g.lineTo(px + sin(a) * L, py + cos(a) * L)
  }
  ink(g, 2.4)
  if (alive > 0) {
    g.globalAlpha = alive * (0.22 + 0.06 * sin(t * 2.3 + ph))
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const [px, py, a] = at(i)
      const cx = px + sin(a) * (L + 16)
      const cy = py + cos(a) * (L + 16)
      g.moveTo(cx + 23, cy)
      g.arc(cx, cy, 23, 0, TAU)
    }
    fill(g, F.glow)
    g.globalAlpha = 1
  }
  for (let i = 0; i < n; i++) {
    const [px, py, a] = at(i)
    const cx = px + sin(a) * (L + 16)
    const cy = py + cos(a) * (L + 16)
    g.beginPath()
    g.ellipse(cx, cy, 15, 17, -a, 0, TAU)
    fill(g, cols[i % cols.length]!)
    ink(g, 2.8)
  }
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const [px, py, a] = at(i)
    const cx = px + sin(a) * (L + 16)
    const cy = py + cos(a) * (L + 16)
    // Caps top and bottom, along the lantern's own axis (down = (sin a, cos a)).
    for (const [d, rx, ry] of [[-17, 8, 3.6], [17, 7, 3.2]] as const) {
      const ex = cx + sin(a) * d
      const ey = cy + cos(a) * d
      g.moveTo(ex + cos(a) * rx, ey - sin(a) * rx)
      g.ellipse(ex, ey, rx, ry, -a, 0, TAU)
    }
  }
  fill(g, F.lemonShade)
  ink(g, 2)
  if (alive > 0) {
    g.globalAlpha = alive * 0.85
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const [px, py, a] = at(i)
      const cx = px + sin(a) * (L + 16)
      const cy = py + cos(a) * (L + 16)
      g.moveTo(cx + 5, cy + 2)
      g.ellipse(cx, cy + 2, 5, 8, -a, 0, TAU)
    }
    fill(g, F.lemonLite)
    g.globalAlpha = 1
  }
}

/** Confetti drifting down through a box — each piece shrinks in and out
 *  (art-style §6: shapes shrink rather than fade). Only once alive. */
export const confetti = (g: G2D, x: number, y: number, w: number, h: number, t: number, alive: number, n = 16): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  for (let c = 0; c < 4; c++) {
    g.beginPath()
    for (let i = c; i < n; i += 4) {
      const fall = (t * (0.07 + (i % 5) * 0.012) + i * 0.137) % 1
      const k = sin(fall * PI)
      const px = x + ((i * 0.618) % 1) * w + sin(t * 1.3 + i) * 16
      const py = y + fall * h
      const a = t * (2 + (i % 3)) + i
      const ca = cos(a) * 7 * k
      const sa = sin(a) * 7 * k
      const cb = -sin(a) * 3.5 * k * Math.abs(cos(t * 3 + i))
      const sb = cos(a) * 3.5 * k * Math.abs(cos(t * 3 + i))
      g.moveTo(px - ca - cb, py - sa - sb)
      g.lineTo(px + ca - cb, py + sa - sb)
      g.lineTo(px + ca + cb, py + sa + sb)
      g.lineTo(px - ca + cb, py - sa + sb)
      g.closePath()
    }
    fill(g, PARTY[c]!)
  }
  g.globalAlpha = 1
}

/** Firework sparkles popping in the sky: rows of (x, y, radius, colour,
 *  phase). A ring of twinkles bursts out and shrinks away. Only once alive. */
export const bursts = (g: G2D, list: readonly (readonly [number, number, number, string, number])[], t: number, alive: number): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  for (const [x, y, r, col, ph] of list) {
    const k = ((t + ph) % 3.4) / 3.4
    if (k > 0.5) continue
    const e = k / 0.5
    const rad = r * (1 - (1 - e) * (1 - e))
    const sz = 10 * (1 - e) + 1
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10 + ph
      tw(g, x + cos(a) * rad, y + sin(a) * rad, sz)
    }
    if (e < 0.3) tw(g, x, y, 24 * (1 - e / 0.3))
    fill(g, col)
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10 + ph + TAU / 20
      tw(g, x + cos(a) * rad * 0.6, y + sin(a) * rad * 0.6, sz * 0.6)
    }
    fill(g, '#fffbe0')
  }
  g.globalAlpha = 1
}

/** Two music notes floating up from (x, y) — the carousel's tune. */
export const notes = (g: G2D, x: number, y: number, t: number, alive: number): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.32 + i * 0.5) % 1
    const s = sin(k * PI)
    if (s < 0.05) continue
    const nx = x + i * 70 + sin(k * 6 + i) * 16
    const ny = y - k * 120
    g.beginPath()
    g.ellipse(nx, ny, 9 * s, 7 * s, -0.4, 0, TAU)
    fill(g, i ? F.pink : F.lilac)
    g.moveTo(nx + 8 * s, ny - 2 * s)
    g.lineTo(nx + 8 * s, ny - 30 * s)
    g.quadraticCurveTo(nx + 20 * s, ny - 24 * s, nx + 18 * s, ny - 14 * s)
    ink(g, 2.6)
  }
  g.globalAlpha = 1
}

/** The cake's candles flickering (a live prop): a faint halo, then each
 *  flame redrawn dancing over the painted one. `pts` are flame centres. */
export const flameGlow = (g: G2D, pts: readonly Pt[], t: number, alive: number): void => {
  if (alive <= 0) return
  g.globalAlpha = alive * 0.25
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const r = 17 + sin(t * 9 + i * 2) * 2
    g.moveTo(x + r, y - 2)
    g.arc(x, y - 2, r, 0, TAU)
  }
  fill(g, F.glow)
  g.globalAlpha = alive
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const k = 1 + sin(t * 13 + i * 2.3) * 0.16
    const lean = sin(t * 7 + i) * 2.5
    g.moveTo(x + lean, y - 13 * k)
    g.quadraticCurveTo(x + 9, y + 1, x, y + 8)
    g.quadraticCurveTo(x - 9, y + 1, x + lean, y - 13 * k)
  }
  fill(g, F.orange)
  ink(g, 2.2)
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const k = 1 + sin(t * 11 + i * 1.7) * 0.2
    g.moveTo(x + 2.8, y + 2)
    g.ellipse(x, y + 2, 2.8, 4.6 * k, 0, 0, TAU)
  }
  fill(g, F.lemonLite)
  g.globalAlpha = 1
}

/* --------------------------------------------------------------- banner */

/**
 * The Festival banner: a bunting garland `w` wide hung from (x, y) on the
 * left to (x + w, y) on the right, little pennants in the party colours and
 * a heart hanging at its middle, gently swaying with `t`. No text.
 * Cheap enough to draw every frame (no save/restore, no gradients).
 */
export const festivalBanner = (g: G2D, x: number, y: number, w: number, t: number): void => {
  const u = clamp(w / 34, 7, 30)
  const sway = sin(t * 1.3)
  const x1 = x + w
  const mx = x + w / 2 + sway * w * 0.025
  const my = y + w * 0.22 + sin(t * 0.9) * w * 0.012
  const n = Math.max(4, Math.round(w / (u * 2.7)))
  const lw = clamp(u * 0.12, 1.2, 3)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(mx, my, x1, y)
  g.lineWidth = lw * 1.1
  g.strokeStyle = INK
  g.stroke()
  const gap = 1.4 / (n + 1)
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1)
    if (Math.abs(k - 0.5) < gap) continue
    const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * mx + k * k * x1
    const py = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * my + k * k * y
    const tx = 2 * (1 - k) * (mx - x) + 2 * k * (x1 - mx)
    const ty = 2 * (1 - k) * (my - y) + 2 * k * (y - my)
    const tl = Math.hypot(tx, ty) || 1
    const a = sin(t * 2.6 + i * 1.3) * 0.16
    const ux = tx / tl
    const uy = ty / tl
    const ca = cos(a)
    const sa = sin(a)
    // The pennant's down vector: the cord's normal, swung by `a`.
    const dx0 = -uy
    const dy0 = ux
    const dx = dx0 * ca - dy0 * sa
    const dy = dx0 * sa + dy0 * ca
    g.beginPath()
    g.moveTo(px - ux * u, py - uy * u)
    g.lineTo(px + ux * u, py + uy * u)
    g.lineTo(px + dx * u * 2.2, py + dy * u * 2.2)
    g.closePath()
    fill(g, PARTY[i % PARTY.length]!)
    ink(g, lw)
  }
  // The heart at the middle, on a short ribbon.
  const hx = 0.25 * x + 0.5 * mx + 0.25 * x1
  const hy = 0.25 * y + 0.5 * my + 0.25 * y
  const hs = u * 1.25
  const hsw = sin(t * 2.1) * 0.12
  const hcx = hx + sin(hsw) * hs * 1.6
  const hcy = hy + cos(hsw) * hs * 1.6
  g.beginPath()
  g.moveTo(hx, hy)
  g.lineTo(hcx, hcy - hs * 0.4)
  g.lineWidth = lw
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.arc(hx, hy, u * 0.36, 0, TAU)
  fill(g, F.lemon)
  ink(g, lw)
  heart(g, hcx, hcy, hs)
  fill(g, F.love)
  ink(g, lw * 1.2)
  g.beginPath()
  g.ellipse(hcx - hs * 0.42, hcy - hs * 0.3, hs * 0.16, hs * 0.26, 0.5, 0, TAU)
  fill(g, '#ffd1e2')
}

/* ---------------------------------------------------------------- Sprig */

/** Sprig's party look: hat, hat stripes, flag. */
export interface SprigLook { hat: string; stripe: string; flag: string }

export const SPRIG: Record<'pink' | 'lemon' | 'sky' | 'lilac' | 'mint', SprigLook> = {
  pink: { hat: F.pink, stripe: F.lemon, flag: F.sky },
  lemon: { hat: F.lemon, stripe: F.pink, flag: F.coral },
  sky: { hat: F.sky, stripe: F.lemon, flag: F.pink },
  lilac: { hat: F.lilac, stripe: F.mint, flag: F.lemon },
  mint: { hat: F.mint, stripe: F.pink, flag: F.lilac }
}

/**
 * Sprig, chapter 1's moss-sprite, dressed for the Festival: the same round
 * green ball with leaf ears and a sprout, in a tilted party hat, holding a
 * little flag that waves by `wave` (radians). Body centre (x, y), scale `s`,
 * facing `dir`; `awake` 0 = eyes shut … 1 = wide and smiling.
 */
export const sprig = (g: G2D, x: number, y: number, s: number, awake: number, wave: number, look: SprigLook, dir = 1, t = 0): void => {
  const w = 1 / s
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // The flag, on its stick, behind the body.
  const a = 0.35 + wave
  const ux = sin(a)
  const uy = -cos(a)
  const tx = 15 + ux * 36
  const ty = 6 + uy * 36
  g.beginPath()
  g.moveTo(15, 6)
  g.lineTo(tx, ty)
  ink(g, 3 * w)
  const fl = sin(t * 14) * 3
  g.beginPath()
  g.moveTo(tx, ty)
  g.quadraticCurveTo(tx - uy * 12 - ux * (3 - fl), ty + ux * 12 - uy * (3 - fl), tx - uy * 22 - ux * (6 + fl), ty + ux * 22 - uy * (6 + fl))
  g.quadraticCurveTo(tx - uy * 10 - ux * (11 - fl), ty + ux * 10 - uy * (11 - fl), tx - ux * 13, ty - uy * 13)
  g.closePath()
  fill(g, look.flag)
  ink(g, 2.4 * w)
  // Leaf ears.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(d * 16, -4, 11, 5, d * -0.5, 0, TAU)
    fill(g, F.sprigEar)
    ink(g, 3 * w)
  }
  // The body, with one soft cel shadow.
  g.beginPath()
  g.arc(0, 2, 18, 0, TAU)
  fill(g, F.sprig)
  g.save()
  g.clip()
  g.beginPath()
  g.ellipse(7, 15, 17, 11, -0.4, 0, TAU)
  fill(g, F.sprigShade)
  g.restore()
  g.beginPath()
  g.arc(0, 2, 18, 0, TAU)
  ink(g, 4.4 * w)
  // The sprout (it leans left, clear of the hat).
  g.beginPath()
  g.moveTo(-1, -15)
  g.quadraticCurveTo(-3, -24, 0, -28)
  ink(g, 2.8 * w)
  g.beginPath()
  g.ellipse(-5, -27, 6, 3, 0.6, 0, TAU)
  fill(g, F.sprigLeaf)
  ink(g, 2.2 * w)
  // The party hat.
  g.save()
  g.translate(7.5, -12.5)
  g.rotate(0.42)
  const hat = (): void => {
    g.beginPath()
    g.moveTo(-9.5, 0)
    g.quadraticCurveTo(-3, -12, 0, -24)
    g.quadraticCurveTo(3, -12, 9.5, 0)
    g.quadraticCurveTo(0, 3.5, -9.5, 0)
    g.closePath()
  }
  hat()
  fill(g, look.hat)
  g.save()
  hat()
  g.clip()
  g.beginPath()
  g.moveTo(-12, -6)
  g.lineTo(12, -6)
  g.moveTo(-12, -14)
  g.lineTo(12, -14)
  g.lineWidth = 3.4
  g.strokeStyle = look.stripe
  g.stroke()
  g.restore()
  hat()
  ink(g, 2.6 * w)
  g.beginPath()
  g.arc(0, -25, 3.8, 0, TAU)
  fill(g, F.cream)
  ink(g, 2.2 * w)
  g.restore()
  // The face.
  if (awake > 0.5) {
    g.beginPath()
    for (const d of [-1, 1]) {
      g.moveTo(d * 7 + 2.6, 1)
      g.ellipse(d * 7, 1, 2.6, 3.8, 0, 0, TAU)
    }
    fill(g, INK)
    g.beginPath()
    for (const d of [-1, 1]) {
      g.moveTo(d * 7 - 0.4, -0.8)
      g.arc(d * 7 - 1.2, -0.8, 1.1, 0, TAU)
    }
    fill(g, '#ffffff')
  } else {
    g.beginPath()
    for (const d of [-1, 1]) {
      g.moveTo(d * 7 + 3 * cos(0.2), 2 + 3 * sin(0.2))
      g.arc(d * 7, 2, 3, 0.2, PI - 0.2)
    }
    ink(g, 2.2 * w)
  }
  g.globalAlpha = 0.55
  g.beginPath()
  for (const d of [-1, 1]) {
    g.moveTo(d * 12 + 3.5, 8)
    g.ellipse(d * 12, 8, 3.5, 2, 0, 0, TAU)
  }
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
  if (awake > 0.5) {
    g.beginPath()
    g.moveTo(-3.6, 7.4)
    g.quadraticCurveTo(0, 13, 3.6, 7.4)
    g.closePath()
    fill(g, F.coralShade)
    ink(g, 1.8 * w)
  } else {
    g.beginPath()
    g.arc(0, 8, 3.2, 0.2, PI - 0.2)
    ink(g, 2 * w)
  }
  // The little hand holding the flag.
  g.beginPath()
  g.arc(15, 6, 4.4, 0, TAU)
  fill(g, F.sprig)
  ink(g, 2.4 * w)
  g.restore()
}

/**
 * Sprig's peek-a-boo (§8.8 beat 2): hidden behind `cover` at `from` (body
 * centre), popping out to `to` — waving the flag, hopping — and back.
 * `tap` is the (x, y, r) hit circle over the cover; `clip` keeps Sprig
 * above the ground or inside a stall.
 */
export const sprigTap = (
  tap: readonly [number, number, number], from: Pt, to: Pt, s: number, dir: number, look: SprigLook,
  clip: readonly [number, number, number, number] | null, cover: (g: G2D) => void
): TapCreature => ({
  x: tap[0],
  y: tap[1],
  r: tap[2],
  draw: (g, k, t) => {
    const e = ease(clamp(k, 0, 1))
    if (e > 0.01) {
      const hop = Math.abs(sin(t * 7)) * 5 * e
      g.save()
      if (clip) {
        g.beginPath()
        g.rect(clip[0], clip[1], clip[2], clip[3])
        g.clip()
      }
      sprig(g, lerp(from[0], to[0], e), lerp(from[1], to[1], e) - hop, s, e, sin(t * 10) * 0.5 * e, look, dir, t)
      g.restore()
    }
    cover(g)
  }
})
