/**
 * kitMirror.ts — Mirror Mountains' painters (chapter 5, story-spec §10.2:
 * "Umbra's mirrors now show only confusing illusions", Guardian Echo, who
 * repeats things and is never sure which reflection is real). A silvery sky,
 * pale far peaks, silver-blue candy mountains with icing snow caps, mint
 * meadows, still mirror lakes holding the world upside down, ornate standing
 * mirrors in gilded frames, alpine chalets, a lakeside gazebo, a cable-car
 * lookout and Echo's mirror palace; the mountains' live props; the mirror
 * sprite and its echo (the tap creature, §8.8) and the Mended Mirror Shard
 * (the chapter's rescue).
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on mid- and foreground shapes, gradients only in the sky, water, mirror
 * glass and glows, far layers lighter and unoutlined. Base tones clear the
 * candy floor (saturation ≥ 70 %, lightness 55–75 %).
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, ease, lerp } from '@/game/duel/util'
import { type G2D, type Pot, INK, fill, ink, lumpy, flower, butterflyAt } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { type Pt, curve, GULL_ART } from '@/game/map/kitBay'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'
import { mix, skyPuff, star5, zzz } from '@/game/map/kitSky'
import { type Tones, glow, rock } from '@/game/map/kitCaves'
import type { TapCreature } from '@/game/map/sectorDef'

type Lobe = readonly [number, number, number]

export const MIR = {
  skyTop: '#6fb6ff',
  skyMid: '#b4e0ff',
  skyLow: '#e4fff4',
  sun: '#fff0a0',
  far: '#c9d2ff',
  farShade: '#b4c0fa',
  farSnow: '#f6f8ff',
  mount: '#7b95fc',
  mountShade: '#5f76e2',
  mountLite: '#c6d3ff',
  snow: '#fbfdff',
  snowShade: '#d6e0fb',
  meadow: '#5fe6a6',
  meadowShade: '#36bf88',
  meadowLip: '#c4fae0',
  pine: '#3de0aa',
  pineShade: '#26a888',
  wood: '#e8a46a',
  woodShade: '#c47f4f',
  plaster: '#fff4e8',
  plasterShade: '#f0d8cc',
  stone: '#cfc8f0',
  stoneShade: '#a9a0dc',
  lakeFar: '#dff6ff',
  lake: '#7dcfff',
  lakeDeep: '#6cc0f5',
  glass: '#c6e8ff',
  glassLow: '#b6f5dc',
  pearl: '#fff4fb',
  pearlShade: '#ead6f2'
}

/** Gilded frames: base, shade, light. */
export const GILT: Tones = ['#ffc94d', '#e8a23a', '#ffe8a3']
export const PEACHY: Tones = ['#ff9f7a', '#e07852', '#ffd4c2']
export const MINTY: Tones = ['#4fe8a8', '#2fbf82', '#b8f7da']

/** Chapter 5's base tones, for the candy-floor check (§9.6.1). */
export const MIRROR_TONES: readonly string[] = [MIR.skyTop, MIR.mount, MIR.meadow, GILT[0], MIR.wood, PEACHY[0], MINTY[0]]

/* ---------------------------------------------------------------- helpers */

const disc = (g: G2D, x: number, y: number, r: number, c: string): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, c)
}

/** A four-point twinkle added to the current path. */
const twinkle = (g: G2D, x: number, y: number, r: number): void => {
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y)
  g.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r)
  g.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y)
  g.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r)
}

/* ------------------------------------------------------------------- sky */

export interface SkyMOpts {
  sun?: readonly [number, number]
  clouds?: readonly (readonly [number, number, number])[]
  /** A soft rainbow: centre x, y and outer radius. */
  rainbow?: readonly [number, number, number]
}

/** The mountains' silvery sky: clear blue fading to a mint-white horizon. */
export const skyM = (g: G2D, o: SkyMOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 440)
  gr.addColorStop(0, MIR.skyTop)
  gr.addColorStop(0.55, MIR.skyMid)
  gr.addColorStop(1, MIR.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.rainbow) {
    const [rx, ry, rr] = o.rainbow
    const RB = ['#ff9ecf', '#ffb36b', '#ffe08a', '#9ff0d0', '#9fd8ff', '#c7a6ff']
    g.globalAlpha = 0.5
    g.lineWidth = 14
    for (let i = 0; i < RB.length; i++) {
      g.beginPath()
      g.arc(rx, ry, rr - 7 - i * 13, PI, TAU)
      g.strokeStyle = RB[i]!
      g.stroke()
    }
    g.globalAlpha = 1
  }
  if (o.sun) {
    const [sx, sy] = o.sun
    const glw = g.createRadialGradient(sx, sy, 30, sx, sy, 190)
    glw.addColorStop(0, 'rgba(255,246,200,0.9)')
    glw.addColorStop(1, 'rgba(255,246,200,0)')
    g.fillStyle = glw
    g.fillRect(sx - 200, sy - 200, 400, 400)
    disc(g, sx, sy, 52, MIR.sun)
  }
  for (const [x, y, s] of o.clouds ?? []) skyPuff(g, x, y, s)
}

/* -------------------------------------------------------------- mountains */

/** Pale far peaks on `base`: [x, width, height] — unoutlined, snow-capped. */
export const farPeaks = (g: G2D, base: number, list: readonly Lobe[]): void => {
  const shape = (x: number, w: number, h: number): void => {
    g.moveTo(x - w / 2, base + 30)
    g.lineTo(x - w * 0.1, base - h * 0.94)
    g.quadraticCurveTo(x, base - h * 1.04, x + w * 0.1, base - h * 0.94)
    g.lineTo(x + w / 2, base + 30)
    g.closePath()
  }
  g.beginPath()
  for (const [x, w, h] of list) shape(x, w, h)
  fill(g, MIR.far)
  g.beginPath()
  for (const [x, w, h] of list) {
    g.moveTo(x + w * 0.02, base - h)
    g.lineTo(x + w * 0.1, base - h * 0.94)
    g.lineTo(x + w / 2, base + 30)
    g.lineTo(x + w * 0.14, base + 30)
    g.closePath()
  }
  fill(g, MIR.farShade)
  g.beginPath()
  for (const [x, w, h] of list) {
    const k = 0.3
    g.moveTo(x - w * 0.1 - (w * 0.4 * k) * 0.95, base - h * (0.94 - k * 0.9))
    g.lineTo(x - w * 0.1, base - h * 0.94)
    g.quadraticCurveTo(x, base - h * 1.04, x + w * 0.1, base - h * 0.94)
    g.lineTo(x + w * 0.1 + w * 0.4 * k * 0.95, base - h * (0.94 - k * 0.9))
    for (let i = 3; i >= 0; i--) {
      const u = i / 4
      const px = x - w * 0.48 * k + u * w * 0.96 * k
      g.quadraticCurveTo(px + w * 0.06 * k, base - h * (0.94 - k * 0.9) + 14, px, base - h * (0.94 - k * 0.9))
    }
    g.closePath()
  }
  fill(g, MIR.farSnow)
}

/** The silhouette of a mid mountain peaking at (x, base − h), `w` wide. */
const peakPath = (g: G2D, x: number, base: number, w: number, h: number, lean: number): void => {
  const px = x + lean * w * 0.1
  g.beginPath()
  g.moveTo(x - w / 2, base + 60)
  g.bezierCurveTo(x - w * 0.36, base - h * 0.2, px - w * 0.16, base - h * 0.84, px - w * 0.05, base - h * 0.97)
  g.quadraticCurveTo(px, base - h * 1.03, px + w * 0.05, base - h * 0.97)
  g.bezierCurveTo(px + w * 0.16, base - h * 0.84, x + w * 0.36, base - h * 0.2, x + w / 2, base + 60)
  g.closePath()
}

/**
 * A silver-blue candy mountain peaking `h` above `base`: a shaded right
 * flank, a white icing snow cap dripping down its shoulders, one outline.
 */
export const mountain = (g: G2D, x: number, base: number, w: number, h: number, lean = 0, snow = 0.34): void => {
  const px = x + lean * w * 0.1
  peakPath(g, x, base, w, h, lean)
  fill(g, MIR.mount)
  g.save()
  peakPath(g, x, base, w, h, lean)
  g.clip()
  g.beginPath()
  g.moveTo(px + w * 0.02, base - h * 1.1)
  g.bezierCurveTo(px + w * 0.06, base - h * 0.6, px + w * 0.02, base - h * 0.3, px + w * 0.12, base + 70)
  g.lineTo(x + w, base + 70)
  g.lineTo(x + w, base - h * 1.1)
  g.closePath()
  fill(g, MIR.mountShade)
  // Lit ridges on the sunny flank.
  g.beginPath()
  g.moveTo(px - w * 0.1, base - h * 0.62)
  g.quadraticCurveTo(px - w * 0.2, base - h * 0.4, px - w * 0.26, base - h * 0.12)
  g.moveTo(px - w * 0.04, base - h * 0.5)
  g.quadraticCurveTo(px - w * 0.1, base - h * 0.3, px - w * 0.12, base - h * 0.06)
  g.lineWidth = 5
  g.lineCap = 'round'
  g.strokeStyle = MIR.mountLite
  g.stroke()
  // The snow cap: an icing edge with round drips.
  const sy = base - h * (1 - snow)
  const hw = w * 0.5 * snow * 1.05
  const cap = (): void => {
    g.beginPath()
    g.moveTo(px - hw - 30, base - h * 1.2)
    g.lineTo(px - hw - 30, sy)
    const n = 5
    for (let i = 0; i < n; i++) {
      const x0 = px - hw + (i / n) * hw * 2
      const x1 = px - hw + ((i + 1) / n) * hw * 2
      const d = i % 2 ? 22 : 38
      g.quadraticCurveTo(x0 + (x1 - x0) * 0.1, sy + d, (x0 + x1) / 2, sy + d)
      g.quadraticCurveTo(x1 - (x1 - x0) * 0.1, sy + d, x1, sy)
    }
    g.lineTo(px + hw + 30, sy)
    g.lineTo(px + hw + 30, base - h * 1.2)
    g.closePath()
  }
  cap()
  fill(g, MIR.snow)
  g.save()
  cap()
  g.clip()
  g.beginPath()
  g.moveTo(px + w * 0.02, base - h * 1.1)
  g.lineTo(px + w * 0.06, sy + 60)
  g.lineTo(px + w, sy + 60)
  g.lineTo(px + w, base - h * 1.1)
  g.closePath()
  fill(g, MIR.snowShade)
  g.restore()
  cap()
  g.lineWidth = 3.5
  g.strokeStyle = INK
  g.stroke()
  g.restore()
  peakPath(g, x, base, w, h, lean)
  ink(g)
  g.beginPath()
  g.ellipse(px - w * 0.04, base - h * 0.88, w * 0.018, h * 0.035, 0.4, 0, TAU)
  fill(g, '#ffffff')
}

/* ---------------------------------------------------------------- meadows */

/** A mint meadow below the curve through `top`: a lit lip, grass tufts. */
export const meadowM = (g: G2D, top: readonly Pt[], seed: number, col = MIR.meadow): void => {
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
  g.beginPath()
  curve(g, top.map(([x, y]) => [x, y + 12] as const))
  g.lineWidth = 11
  g.strokeStyle = MIR.meadowLip
  g.stroke()
  const r = seeded(seed)
  const y0 = Math.min(...top.map((p) => p[1]))
  g.beginPath()
  for (let i = 0; i < 30; i++) {
    const x = r() * SEC_W
    const y = y0 + 30 + r() * (SEC_H - y0 - 30)
    const hgt = 10 + r() * 10
    g.moveTo(x - 6, y)
    g.quadraticCurveTo(x - 2, y - hgt, x + 3, y - hgt - 4)
    g.quadraticCurveTo(x + 2, y - hgt * 0.4, x + 6, y)
  }
  fill(g, MIR.meadowShade)
  g.restore()
  g.beginPath()
  curve(g, top)
  ink(g)
}

/** A green hill through the closed outline `pts` (a slope, a terrace): the
 *  shade tone, the base laid back over it toward the light (`shift`). */
export const hillM = (g: G2D, pts: readonly Pt[], shift: Pt = [34, 20]): void => {
  const area = (): void => {
    g.beginPath()
    curve(g, pts)
    g.closePath()
  }
  area()
  fill(g, MIR.meadowShade)
  g.save()
  area()
  g.clip()
  g.save()
  g.translate(-shift[0], -shift[1])
  area()
  fill(g, MIR.meadow)
  g.restore()
  g.beginPath()
  curve(g, pts.slice(1, -1).map(([x, y]) => [x, y + 12] as const))
  g.lineWidth = 10
  g.strokeStyle = MIR.meadowLip
  g.stroke()
  g.restore()
  area()
  ink(g)
}

/** Alpine flowers (and a few tufts) over a band, skipping `avoid` boxes. */
export const alpFlowers = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const cols = ['#ff9fc4', PEACHY[0], '#ffffff', '#b7a0ff', GILT[0]]
  for (let i = 0; i < n; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const size = 8 + r() * 6
    const rot = r() * TAU
    if (avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)) continue
    flower(g, x, y, size, cols[i % cols.length]!, rot)
  }
}

/** A mint pine standing on (x, y), scale `s`. */
export const alpPine = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.rect(x - 8 * s, y - 30 * s, 16 * s, 30 * s)
  fill(g, MIR.wood)
  ink(g, 4)
  for (let i = 0; i < 3; i++) {
    const w = (62 - i * 14) * s
    const top = y - (64 + i * 42) * s
    const bot = y - (20 + i * 40) * s
    const tier = (): void => {
      g.beginPath()
      g.moveTo(x, top - 18 * s)
      g.quadraticCurveTo(x + w * 0.35, top + 10 * s, x + w, bot)
      g.quadraticCurveTo(x, bot + 14 * s, x - w, bot)
      g.quadraticCurveTo(x - w * 0.35, top + 10 * s, x, top - 18 * s)
    }
    tier()
    fill(g, MIR.pine)
    g.save()
    tier()
    g.clip()
    g.beginPath()
    g.rect(x + w * 0.18, top - 30 * s, w, bot - top + 40 * s)
    fill(g, MIR.pineShade)
    g.restore()
    tier()
    ink(g, 4)
  }
}

/** Silver-lilac rock tones for the mountains' boulders. */
export const STONE: Tones = [MIR.stone, MIR.stoneShade, '#f4f0ff']

/** A silver-lilac boulder standing on (x, y), w × h (the caves' boulder). */
export const stone = (g: G2D, x: number, y: number, w: number, h: number, flip = 1): void => rock(g, x, y, w, h, flip, STONE)

/** A low wooden fence from (x0, y0) to (x1, y1) with `n` posts. */
export const railFence = (g: G2D, x0: number, y0: number, x1: number, y1: number, n: number): void => {
  g.beginPath()
  g.moveTo(x0, y0 - 26)
  g.lineTo(x1, y1 - 26)
  g.moveTo(x0, y0 - 12)
  g.lineTo(x1, y1 - 12)
  g.lineWidth = 12
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = MIR.wood
  g.stroke()
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const x = x0 + (x1 - x0) * u
    const y = y0 + (y1 - y0) * u
    g.beginPath()
    g.roundRect(x - 6, y - 38, 12, 40, 5)
    fill(g, MIR.wood)
    ink(g, 3.5)
  }
}

/** A little woodshed on (x, y), scale `s`: a slanted roof over a wall of
 *  stacked log ends. */
export const woodshed = (g: G2D, x: number, y: number, s: number): void => {
  const S = (v: number): number => v * s
  g.beginPath()
  g.rect(x - S(78), y - S(104), S(156), S(104))
  fill(g, MIR.woodShade)
  ink(g)
  g.save()
  g.beginPath()
  g.rect(x - S(70), y - S(96), S(140), S(96))
  g.clip()
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 5; i++) {
      const lx = x - S(64) + i * S(32) + (row % 2) * S(16)
      const ly = y - S(12) - row * S(26)
      g.beginPath()
      g.arc(lx, ly, S(14), 0, TAU)
      fill(g, MIR.wood)
      ink(g, 3)
      g.beginPath()
      g.arc(lx, ly, S(6), 0, TAU)
      g.lineWidth = 2
      g.strokeStyle = MIR.woodShade
      g.stroke()
    }
  }
  g.restore()
  g.beginPath()
  g.moveTo(x - S(96), y - S(96))
  g.lineTo(x - S(84), y - S(128))
  g.lineTo(x + S(92), y - S(114))
  g.lineTo(x + S(100), y - S(86))
  g.closePath()
  fill(g, PEACHY[0])
  ink(g)
  g.beginPath()
  g.moveTo(x - S(90), y - S(100))
  g.lineTo(x + S(96), y - S(90))
  g.lineWidth = S(5)
  g.strokeStyle = PEACHY[2]
  g.stroke()
}

/* ---------------------------------------------------------------- water */

/**
 * A still mirror lake: an ellipse of pale water holding its `reflections`
 * (each part of the world drawn upside down about its own waterline `axis`,
 * faint), shine streaks, an outline.
 */
export const mirrorLake = (
  g: G2D, x: number, y: number, rx: number, ry: number,
  reflections: readonly (readonly [number, () => void])[] = [], a = 0.4
): void => {
  const shape = (): void => {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, TAU)
  }
  shape()
  const gr = g.createLinearGradient(0, y - ry, 0, y + ry)
  gr.addColorStop(0, MIR.lakeFar)
  gr.addColorStop(0.35, MIR.lake)
  gr.addColorStop(1, MIR.lakeDeep)
  g.fillStyle = gr
  g.fill()
  for (const [axis, fn] of reflections) {
    g.save()
    shape()
    g.clip()
    g.globalAlpha = a
    g.translate(0, axis * 2)
    g.scale(1, -1)
    fn()
    g.restore()
    g.globalAlpha = 1
  }
  g.save()
  shape()
  g.clip()
  g.beginPath()
  const r = seeded(Math.round(x + y))
  for (let i = 0; i < 12; i++) {
    const k = r()
    const yy = y - ry * 0.7 + k * ry * 1.5
    const xx = x + (r() - 0.5) * rx * 1.6
    const w = 16 + k * 36
    g.moveTo(xx - w, yy)
    g.lineTo(xx + w, yy)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.stroke()
  g.restore()
  shape()
  ink(g)
}

/** Reed tufts at a lake's edge: [x, y, scale]. */
export const reeds = (g: G2D, list: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, y, s] of list) {
    for (let i = -2; i <= 2; i++) {
      const h = (40 - Math.abs(i) * 8) * s
      const bx = x + i * 6 * s
      g.moveTo(bx - 4 * s, y)
      g.quadraticCurveTo(bx + i * 2 * s, y - h * 0.6, bx + i * 6 * s, y - h)
      g.quadraticCurveTo(bx + i * 2 * s + 3 * s, y - h * 0.5, bx + 4 * s, y)
    }
  }
  fill(g, MIR.pine)
  ink(g, 3)
  g.beginPath()
  for (const [x, y, s] of list) {
    g.moveTo(x - 10 * s + 4 * s, y - 34 * s)
    g.ellipse(x - 10 * s, y - 34 * s, 4 * s, 9 * s, 0, 0, TAU)
  }
  fill(g, MIR.woodShade)
  ink(g, 2.4)
}

/* ------------------------------------------------------------- mirrors */

/** Where a standing mirror's glass sits: centre x, y, rx, ry. */
export const glassOf = (x: number, y: number, s: number): readonly [number, number, number, number] =>
  [x, y - 124 * s, 48 * s, 72 * s]

/** The glass itself: silvery blue, a mint hill in its lower half, shine bars. */
const mirrorGlass = (g: G2D, cx: number, cy: number, rx: number, ry: number): void => {
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU)
  const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry)
  gr.addColorStop(0, '#e6f6ff')
  gr.addColorStop(0.5, MIR.glass)
  gr.addColorStop(1, '#a6d2ff')
  g.fillStyle = gr
  g.fill()
  g.save()
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.moveTo(cx - rx, cy + ry * 0.5)
  g.quadraticCurveTo(cx - rx * 0.2, cy + ry * 0.1, cx + rx, cy + ry * 0.4)
  g.lineTo(cx + rx, cy + ry)
  g.lineTo(cx - rx, cy + ry)
  g.closePath()
  fill(g, MIR.glassLow)
  g.beginPath()
  g.moveTo(cx - rx * 0.7, cy - ry * 0.1)
  g.lineTo(cx - rx * 0.1, cy - ry * 0.8)
  g.moveTo(cx - rx * 0.6, cy + ry * 0.2)
  g.lineTo(cx + rx * 0.05, cy - ry * 0.55)
  g.lineWidth = rx * 0.14
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.stroke()
  g.restore()
}

/**
 * An ornate standing mirror whose foot is at (x, y), scale `s`: an oval
 * glass in a scrolled frame (`frame` tones — gilt, or a pot's colours), a
 * crest with a little star, a pedestal and two curled feet.
 */
export const standMirror = (g: G2D, x: number, y: number, s: number, frame: Tones = GILT): void => {
  const S = (v: number): number => v * s
  const [cx, cy, rx, ry] = glassOf(x, y, s)
  // Pedestal and feet.
  g.beginPath()
  g.moveTo(x - S(10), cy + ry)
  g.lineTo(x - S(8), y - S(14))
  g.lineTo(x + S(8), y - S(14))
  g.lineTo(x + S(10), cy + ry)
  g.closePath()
  fill(g, frame[1])
  ink(g, 3.5)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(x, y - S(14))
    g.quadraticCurveTo(x + d * S(26), y - S(16), x + d * S(34), y - S(4))
    g.lineWidth = S(12) + 7
    g.strokeStyle = INK
    g.lineCap = 'round'
    g.stroke()
    g.lineWidth = S(12)
    g.strokeStyle = frame[0]
    g.stroke()
  }
  // Side scrolls.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.arc(cx + d * (rx + S(14)), cy + S(10), S(10), 0, TAU)
    fill(g, frame[0])
    ink(g, 3)
    g.beginPath()
    g.arc(cx + d * (rx + S(14)), cy + S(10), S(4), 0, TAU)
    fill(g, frame[1])
  }
  // The crest: three lobes and a star.
  lumpy(g, [[cx - S(20), cy - ry - S(6), S(12)], [cx, cy - ry - S(16), S(16)], [cx + S(20), cy - ry - S(6), S(12)]], frame[0], 3.5)
  star5(g, cx, cy - ry - S(40), S(13))
  fill(g, frame[2])
  ink(g, 3)
  // The frame ring.
  g.beginPath()
  g.ellipse(cx, cy, rx + S(13), ry + S(13), 0, 0, TAU)
  fill(g, frame[0])
  g.save()
  g.beginPath()
  g.ellipse(cx, cy, rx + S(13), ry + S(13), 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(cx + S(12), cy + S(12), rx + S(13), ry + S(13), 0, 0, TAU)
  g.ellipse(cx + S(4), cy + S(4), rx + S(1), ry + S(1), 0, 0, TAU)
  g.fillStyle = frame[1]
  g.fill('evenodd')
  g.restore()
  g.beginPath()
  g.ellipse(cx, cy, rx + S(13), ry + S(13), 0, 0, TAU)
  ink(g)
  // Beads round the frame.
  g.beginPath()
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU
    const bx = cx + cos(a) * (rx + S(6.5))
    const by = cy + sin(a) * (ry + S(6.5))
    g.moveTo(bx + S(2.6), by)
    g.arc(bx, by, S(2.6), 0, TAU)
  }
  fill(g, frame[2])
  mirrorGlass(g, cx, cy, rx, ry)
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU)
  ink(g, 4)
}

/** A glint sweeping across a standing mirror's glass — a live prop. */
export const mirrorGlint = (g: G2D, x: number, y: number, s: number, t: number, alive: number, ph = 0, period = 3.4): void => {
  if (alive <= 0) return
  const u = ((t + ph) % period) / period
  if (u > 0.5) return
  const [cx, cy, rx, ry] = glassOf(x, y, s)
  const k = u / 0.5
  g.save()
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU)
  g.clip()
  const bx = cx - rx * 1.4 + k * rx * 2.8
  g.beginPath()
  g.moveTo(bx - ry * 0.6, cy + ry)
  g.lineTo(bx + ry * 0.6, cy - ry)
  g.globalAlpha = alive * sin(k * PI)
  g.lineWidth = rx * 0.45
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.restore()
  g.globalAlpha = 1
}

/* ------------------------------------------------------------ buildings */

/** A round lakeside gazebo on its deck at (x, y), scale `s`: white pillars
 *  and a bell-dome ROOF — the landmark, in `pot`. */
export const gazebo = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  const S = (v: number): number => v * s
  // Deck.
  g.beginPath()
  g.ellipse(x, y, S(118), S(24), 0, 0, TAU)
  fill(g, MIR.wood)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - S(4), S(104), S(16), 0, 0, TAU)
  fill(g, '#f5c08e')
  // Back pillars, the rail, front pillars.
  const eave = y - S(150)
  g.beginPath()
  for (const dx of [-54, 54]) g.rect(x + S(dx) - S(7), eave, S(14), y - S(8) - eave)
  fill(g, MIR.plasterShade)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(x - S(100), y - S(44))
  g.quadraticCurveTo(x, y - S(30), x + S(100), y - S(44))
  g.moveTo(x - S(100), y - S(26))
  g.quadraticCurveTo(x, y - S(12), x + S(100), y - S(26))
  g.lineWidth = S(7) + 6
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = S(7)
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.beginPath()
  for (const dx of [-100, -34, 34, 100]) g.roundRect(x + S(dx) - S(9), eave, S(18), y - eave + S(4), S(4))
  fill(g, MIR.plaster)
  ink(g, 4)
  // The bell dome.
  const dome = (): void => {
    g.beginPath()
    g.moveTo(x - S(140), eave + S(8))
    g.bezierCurveTo(x - S(120), eave - S(30), x - S(70), eave - S(40), x - S(40), eave - S(78))
    g.quadraticCurveTo(x - S(10), eave - S(118), x, eave - S(126))
    g.quadraticCurveTo(x + S(10), eave - S(118), x + S(40), eave - S(78))
    g.bezierCurveTo(x + S(70), eave - S(40), x + S(120), eave - S(30), x + S(140), eave + S(8))
    g.quadraticCurveTo(x, eave - S(10), x - S(140), eave + S(8))
    g.closePath()
  }
  dome()
  fill(g, pot.base)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  g.moveTo(x + S(6), eave - S(140))
  g.bezierCurveTo(x + S(20), eave - S(80), x + S(40), eave - S(30), x + S(60), eave + S(20))
  g.lineTo(x + S(160), eave + S(20))
  g.lineTo(x + S(160), eave - S(140))
  g.closePath()
  fill(g, pot.shade)
  g.beginPath()
  for (const dx of [-80, -26, 26, 80]) {
    g.moveTo(x + S(dx * 0.1), eave - S(118))
    g.quadraticCurveTo(x + S(dx * 0.7), eave - S(60), x + S(dx * 1.4), eave + S(6))
  }
  g.lineWidth = 3
  g.strokeStyle = pot.lite
  g.stroke()
  g.beginPath()
  g.ellipse(x - S(56), eave - S(46), S(22), S(8), -0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  dome()
  ink(g)
  // A scalloped valance under the dome's rim.
  g.beginPath()
  const n = 8
  g.moveTo(x - S(132), eave + S(4))
  for (let i = 0; i < n; i++) {
    const x0 = x - S(132) + (i * S(264)) / n
    g.quadraticCurveTo(x0 + S(264) / n / 2, eave + S(30), x0 + S(264) / n, eave + S(4))
  }
  g.closePath()
  fill(g, pot.lite)
  ink(g, 3.5)
  // Finial: a little round mirror on a gold stem.
  g.beginPath()
  g.moveTo(x, eave - S(124))
  g.lineTo(x, eave - S(150))
  g.lineWidth = 9
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 4
  g.strokeStyle = GILT[0]
  g.stroke()
  g.beginPath()
  g.arc(x, eave - S(162), S(14), 0, TAU)
  fill(g, GILT[0])
  ink(g, 3.5)
  g.beginPath()
  g.arc(x, eave - S(162), S(8), 0, TAU)
  fill(g, MIR.glass)
}

/** Where a chalet's chimney top is (see `chalet`). */
export const chaletChimney = (x: number, y: number, w: number): Pt => [x + w * 0.27, y - w * 1.02 - 40]
/** Where a chalet's ridge flag pole tops out (see `chalet`). */
export const chaletFlag = (x: number, y: number, w: number): Pt => [x, y - w * 1.22 - 64]

/** An alpine chalet standing at (x, y), `w` wide: a stone base, a wooden
 *  storey with a heart-cut balcony, and its big overhanging ROOF — the
 *  landmark, in `pot`. */
export const chalet = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const k = w / 260
  const K = (v: number): number => v * k
  const L = x - w / 2
  const base = K(64)
  const upper = K(118)
  const wallTop = y - base - upper
  // Chimney.
  const [chx, chy] = chaletChimney(x, y, w)
  g.beginPath()
  g.roundRect(chx - K(16), chy, K(32), K(110), K(4))
  fill(g, MIR.stone)
  ink(g, 4)
  g.beginPath()
  g.roundRect(chx - K(21), chy - K(8), K(42), K(14), K(4))
  fill(g, MIR.stoneShade)
  ink(g, 3.5)
  // Stone base.
  g.beginPath()
  g.roundRect(L, y - base, w, base, [0, 0, 6, 6])
  fill(g, MIR.stone)
  g.save()
  g.clip()
  g.beginPath()
  const r = seeded(Math.round(x))
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const bx = L + (i + (row % 2) * 0.5) * (w / 6.5) + (r() - 0.5) * 8
      const by = y - base + K(12) + row * K(20)
      g.moveTo(bx + K(14), by)
      g.ellipse(bx, by, K(14), K(7), 0, 0, TAU)
    }
  }
  g.lineWidth = 2.4
  g.strokeStyle = MIR.stoneShade
  g.stroke()
  g.restore()
  g.beginPath()
  g.roundRect(L, y - base, w, base, [0, 0, 6, 6])
  ink(g)
  // Wooden storey with planks and a shaded right side.
  g.beginPath()
  g.rect(L, wallTop, w, upper)
  fill(g, MIR.wood)
  g.save()
  g.clip()
  g.beginPath()
  for (let yy = wallTop + K(20); yy < y - base; yy += K(20)) {
    g.moveTo(L, yy)
    g.lineTo(L + w, yy)
  }
  g.lineWidth = 2.4
  g.strokeStyle = MIR.woodShade
  g.stroke()
  g.beginPath()
  g.rect(x + w * 0.26, wallTop, w, upper)
  g.globalAlpha = 0.3
  fill(g, MIR.woodShade)
  g.globalAlpha = 1
  g.restore()
  g.beginPath()
  g.rect(L, wallTop, w, upper)
  ink(g)
  // Windows with shutters and flower boxes.
  for (const dx of [-0.26, 0.26]) {
    const wx = x + w * dx
    const wy = wallTop + K(22)
    g.beginPath()
    g.roundRect(wx - K(20), wy, K(40), K(44), K(6))
    fill(g, MIR.glass)
    ink(g, 3.5)
    g.beginPath()
    g.moveTo(wx, wy)
    g.lineTo(wx, wy + K(44))
    g.moveTo(wx - K(20), wy + K(20))
    g.lineTo(wx + K(20), wy + K(20))
    ink(g, 2.4)
    for (const d of [-1, 1]) {
      g.beginPath()
      g.roundRect(wx + d * K(31) - K(9), wy, K(18), K(44), K(4))
      fill(g, pot.shade)
      ink(g, 3)
    }
  }
  // The balcony: a rail with heart cut-outs, and flowers along it.
  const by = y - base - K(8)
  g.beginPath()
  g.roundRect(L - K(14), by - K(34), w + K(28), K(36), K(6))
  fill(g, MIR.plaster)
  ink(g, 4)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const hx = L + (i + 0.5) * ((w) / 9)
    const hy = by - K(18)
    const hr = K(6)
    g.moveTo(hx, hy + hr * 0.9)
    g.bezierCurveTo(hx - hr * 1.6, hy - hr * 0.2, hx - hr * 0.6, hy - hr * 1.3, hx, hy - hr * 0.45)
    g.bezierCurveTo(hx + hr * 0.6, hy - hr * 1.3, hx + hr * 1.6, hy - hr * 0.2, hx, hy + hr * 0.9)
  }
  fill(g, MIR.woodShade)
  for (let i = 0; i < 6; i++) flower(g, L + K(10) + i * ((w - K(20)) / 5), by - K(38), K(9), i % 2 ? '#ff9fc4' : PEACHY[0], i)
  // The door in the stone base.
  g.beginPath()
  g.roundRect(x - K(22), y - K(58), K(44), K(58), [K(20), K(20), 2, 2])
  fill(g, MIR.woodShade)
  ink(g, 4)
  g.beginPath()
  g.arc(x + K(12), y - K(28), K(3.4), 0, TAU)
  fill(g, INK)
  // The gable: a cream triangle with a round window, then the roof.
  const ridge = y - w * 1.22
  g.beginPath()
  g.moveTo(L + K(6), wallTop)
  g.lineTo(x, ridge + K(50))
  g.lineTo(L + w - K(6), wallTop)
  g.closePath()
  fill(g, MIR.plaster)
  ink(g, 4)
  g.beginPath()
  g.arc(x, wallTop - K(36), K(16), 0, TAU)
  fill(g, MIR.glass)
  ink(g, 3.5)
  const eave = (d: number): number => wallTop + K(24) + d
  const roof = (): void => {
    g.beginPath()
    g.moveTo(L - K(62), eave(0))
    g.quadraticCurveTo(x - w * 0.3, ridge + K(36), x, ridge)
    g.quadraticCurveTo(x + w * 0.3, ridge + K(36), L + w + K(62), eave(0))
    g.lineTo(L + w + K(48), eave(K(34)))
    g.quadraticCurveTo(x + w * 0.3, ridge + K(84), x, ridge + K(48))
    g.quadraticCurveTo(x - w * 0.3, ridge + K(84), L - K(48), eave(K(34)))
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + K(4), ridge - K(10), w, w)
  fill(g, pot.shade)
  // Shingle scallops along the roof.
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (const d of [-1, 1]) {
    for (let i = 1; i < 9; i++) {
      const u = i / 9
      const sx = x + d * u * (w / 2 + K(55))
      const sy = ridge + u * (eave(0) - ridge) + K(26)
      g.beginPath()
      g.arc(sx, sy, K(10), 0, PI)
      g.stroke()
    }
  }
  g.beginPath()
  g.moveTo(L - K(62), eave(0))
  g.quadraticCurveTo(x - w * 0.3, ridge + K(36), x, ridge)
  g.lineWidth = K(10)
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  roof()
  ink(g)
  // Ridge flag pole.
  const [fx, fy] = chaletFlag(x, y, w)
  g.beginPath()
  g.moveTo(fx, ridge + K(2))
  g.lineTo(fx, fy)
  ink(g, 3.5)
}

/** A little lookout station on stilts at (x, y) with a pyramid ROOF (the
 *  landmark, in `pot`), the cable wheel, and a parked cable-car cabin. */
export const lookout = (g: G2D, x: number, y: number, pot: Pot): void => {
  // Stilts and deck.
  g.beginPath()
  for (const dx of [-70, -20, 30, 80]) g.rect(x + dx - 7, y - 60, 14, 60)
  fill(g, MIR.woodShade)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(x - 100, y - 72, 200, 16, 5)
  fill(g, MIR.wood)
  ink(g, 4)
  // The hut.
  g.beginPath()
  g.roundRect(x - 76, y - 170, 152, 100, 6)
  fill(g, MIR.plaster)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 30, y - 180, 60, 120)
  fill(g, MIR.plasterShade)
  g.restore()
  g.beginPath()
  g.roundRect(x - 76, y - 170, 152, 100, 6)
  ink(g)
  g.beginPath()
  g.roundRect(x - 56, y - 150, 70, 40, 8)
  fill(g, MIR.glass)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(x - 21, y - 150)
  g.lineTo(x - 21, y - 110)
  ink(g, 2.4)
  g.beginPath()
  g.roundRect(x + 26, y - 140, 34, 68, [15, 15, 2, 2])
  fill(g, pot.shade)
  ink(g, 3.5)
  // The roof.
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - 112, y - 160)
    g.quadraticCurveTo(x - 40, y - 230, x, y - 262)
    g.quadraticCurveTo(x + 40, y - 230, x + 112, y - 160)
    g.quadraticCurveTo(x, y - 176, x - 112, y - 160)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 4, y - 270, 120, 120)
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (let row = 0; row < 3; row++) {
    const yy = y - 222 + row * 22
    g.beginPath()
    for (let xx = x - 110; xx < x + 120; xx += 22) g.arc(xx, yy, 11, 0, PI)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(x - 40, y - 206, 22, 7, -0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // The cable wheel on the hut's side.
  g.beginPath()
  g.arc(x + 96, y - 126, 26, 0, TAU)
  fill(g, GILT[0])
  ink(g, 4)
  g.beginPath()
  g.arc(x + 96, y - 126, 14, 0, TAU)
  fill(g, GILT[1])
  ink(g, 3)
}

/** A cable-car cabin hanging from the cable at (x, y): a rounded box in
 *  `t` with a row of windows. */
/** The scale the pass hangs its cabins at, and the width it gives. */
const CABIN_S = 0.62
const CABIN_UNIT = 100 * CABIN_S

/**
 * The cable car's cabin as a painted still, tinted whole — its body, its
 * shaded side and its roof band are three tones of one hue, so one painting
 * in neutral greys wears any of them.
 *
 * The CABLE is not here: `cableAt` runs it between two points the sector
 * picks, so it has no shape of its own. The hanger arm and its gilt knob do,
 * and they ride with the cabin, so they are in the painting.
 */
export const CABIN_ART: ItemSpec = {
  ...PROP_ART.cabin, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / CABIN_UNIT, s / CABIN_UNIT)
    cabinShape(g, 0, 0, CABIN_S, [accent.base, accent.shade, accent.lite])
    g.restore()
  }
}

export const cabin = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, CABIN_ART, 100 * s, 0, t[0])
  g.restore()
  if (!painted) cabinShape(g, x, y, s, t)
}

const cabinShape = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  const S = (v: number): number => v * s
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y + S(34))
  g.lineWidth = S(6) + 6
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = S(6)
  g.strokeStyle = GILT[1]
  g.stroke()
  g.beginPath()
  g.arc(x, y, S(8), 0, TAU)
  fill(g, GILT[0])
  ink(g, 3)
  g.beginPath()
  g.roundRect(x - S(46), y + S(30), S(92), S(66), S(16))
  fill(g, t[0])
  ink(g, 4)
  g.beginPath()
  g.rect(x + S(14), y + S(34), S(28), S(58))
  g.globalAlpha = 0.5
  fill(g, t[1])
  g.globalAlpha = 1
  g.beginPath()
  g.roundRect(x - S(50), y + S(26), S(100), S(12), S(6))
  fill(g, t[2])
  ink(g, 3)
  g.beginPath()
  for (const dx of [-26, 0, 26]) g.roundRect(x + S(dx) - S(9), y + S(46), S(18), S(22), S(5))
  fill(g, MIR.glass)
  ink(g, 2.6)
}

/** Echo's mirror palace standing at (x, y): a pearl keep with a great round
 *  mirror window and twin towers — Echo's own symmetry — under onion DOMES
 *  (the landmark, in `pot`). */
export const palace = (g: G2D, x0: number, y0: number, sc: number, pot: Pot): void => {
  g.save()
  g.translate(x0, y0)
  g.scale(sc, sc)
  const x = 0
  const y = 0
  const onion = (cx: number, by: number, w: number, h: number): void => {
    g.beginPath()
    g.moveTo(cx - w / 2, by)
    g.bezierCurveTo(cx - w * 0.66, by - h * 0.34, cx - w * 0.5, by - h * 0.64, cx - w * 0.12, by - h * 0.82)
    g.quadraticCurveTo(cx - w * 0.02, by - h * 0.9, cx, by - h)
    g.quadraticCurveTo(cx + w * 0.02, by - h * 0.9, cx + w * 0.12, by - h * 0.82)
    g.bezierCurveTo(cx + w * 0.5, by - h * 0.64, cx + w * 0.66, by - h * 0.34, cx + w / 2, by)
    g.closePath()
  }
  const dome = (cx: number, by: number, w: number, h: number): void => {
    onion(cx, by, w, h)
    fill(g, pot.base)
    g.save()
    onion(cx, by, w, h)
    g.clip()
    g.beginPath()
    g.moveTo(cx + w * 0.02, by - h)
    g.bezierCurveTo(cx + w * 0.16, by - h * 0.7, cx + w * 0.22, by - h * 0.3, cx + w * 0.1, by + 4)
    g.lineTo(cx + w, by + 4)
    g.lineTo(cx + w, by - h)
    g.closePath()
    fill(g, pot.shade)
    g.beginPath()
    g.ellipse(cx - w * 0.24, by - h * 0.46, w * 0.09, h * 0.14, 0.3, 0, TAU)
    fill(g, pot.lite)
    g.restore()
    onion(cx, by, w, h)
    ink(g)
    // A gilt band and a finial star.
    g.beginPath()
    g.roundRect(cx - w * 0.52, by - 6, w * 1.04, 14, 6)
    fill(g, GILT[0])
    ink(g, 3.5)
    g.beginPath()
    g.moveTo(cx, by - h)
    g.lineTo(cx, by - h - 26)
    g.lineWidth = 9
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = 4
    g.strokeStyle = GILT[0]
    g.stroke()
    star5(g, cx, by - h - 36, 13)
    fill(g, GILT[2])
    ink(g, 3)
  }
  const wall = (x0: number, y0: number, w: number, h: number): void => {
    g.beginPath()
    g.rect(x0, y0, w, h)
    fill(g, MIR.pearl)
    g.save()
    g.clip()
    g.beginPath()
    g.rect(x0 + w * 0.62, y0, w, h)
    fill(g, MIR.pearlShade)
    g.restore()
    g.beginPath()
    g.rect(x0, y0, w, h)
    ink(g)
  }
  const arch = (cx: number, cy: number, w: number, h: number, col: string): void => {
    g.beginPath()
    g.moveTo(cx - w / 2, cy + h / 2)
    g.lineTo(cx - w / 2, cy - h / 2 + w / 2)
    g.arc(cx, cy - h / 2 + w / 2, w / 2, PI, 0)
    g.lineTo(cx + w / 2, cy + h / 2)
    g.closePath()
    fill(g, col)
    ink(g, 3.5)
  }
  // Linking walls with rounded merlons.
  for (const d of [-1, 1]) {
    const x0 = d < 0 ? x - 250 : x + 110
    wall(x0, y - 130, 140, 130)
    g.beginPath()
    for (let i = 0; i < 4; i++) g.roundRect(x0 + 6 + i * 34, y - 150, 24, 24, [10, 10, 0, 0])
    fill(g, MIR.pearl)
    ink(g, 3.5)
    arch(x0 + 70, y - 66, 34, 50, MIR.glass)
  }
  // Twin towers.
  for (const d of [-1, 1]) {
    const tx = x + d * 250
    wall(tx - 52, y - 300, 104, 300)
    arch(tx, y - 214, 36, 56, MIR.glass)
    arch(tx, y - 110, 30, 46, MIR.glass)
    dome(tx, y - 300, 128, 150)
  }
  // The keep.
  wall(x - 124, y - 250, 248, 250)
  g.beginPath()
  g.roundRect(x - 134, y - 262, 268, 18, 6)
  fill(g, GILT[0])
  ink(g, 3.5)
  // The great round mirror window.
  g.beginPath()
  g.arc(x, y - 158, 62, 0, TAU)
  fill(g, GILT[0])
  ink(g)
  mirrorGlass(g, x, y - 158, 48, 48)
  g.beginPath()
  g.arc(x, y - 158, 48, 0, TAU)
  ink(g, 4)
  // Door.
  g.beginPath()
  g.moveTo(x - 38, y)
  g.lineTo(x - 38, y - 52)
  g.arc(x, y - 52, 38, PI, 0)
  g.lineTo(x + 38, y)
  g.closePath()
  fill(g, pot.shade)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x, y - 90)
  g.lineTo(x, y)
  ink(g, 2.6)
  g.beginPath()
  g.arc(x - 10, y - 44, 4, 0, TAU)
  g.moveTo(x + 14, y - 44)
  g.arc(x + 10, y - 44, 4, 0, TAU)
  fill(g, GILT[0])
  dome(x, y - 262, 230, 250)
  g.restore()
}

/** Where the palace's star finials sit (see `palace`): the towers', the keep's. */
export const palaceStars = (x: number, y: number, sc: number): readonly Pt[] =>
  [[x - 250 * sc, y - 486 * sc], [x + 250 * sc, y - 486 * sc], [x, y - 548 * sc]]

/* ------------------------------------------------------------ live props */

/** A small bird gliding with its echo in the lake below (clipped to the
 *  lake ellipse `pool`: x, y, rx, ry) — a live prop. */
export const echoBird = (
  g: G2D, x: number, y: number, axis: number, pool: readonly [number, number, number, number],
  s: number, flap: number, dir: number, a: number
): void => {
  // The same bare-wing curve the bay's gull is, so it wears the gull's
  // painting: `k` = -1 is the echo, and a reflection is a flip of the SAME
  // picture. One sheet, no generation of its own.
  const bird = (by: number, k: number): void => {
    g.save()
    g.translate(x, by)
    g.scale(dir, k)
    const painted = drawItem(g, GULL_ART, 52 * s, flap + 1)
    g.restore()
    if (painted) return
    const wy = -10 * s * flap * k
    g.beginPath()
    g.moveTo(x - 26 * s * dir, by + wy)
    g.quadraticCurveTo(x - 12 * s * dir, by - 12 * s * k + wy * 0.3, x, by)
    g.quadraticCurveTo(x + 12 * s * dir, by - 12 * s * k + wy * 0.3, x + 26 * s * dir, by + wy)
    g.quadraticCurveTo(x + 12 * s * dir, by - 4 * s * k, x, by + 6 * s * k)
    g.quadraticCurveTo(x - 12 * s * dir, by - 4 * s * k, x - 26 * s * dir, by + wy)
    fill(g, '#ffffff')
    ink(g, 2.4)
  }
  g.globalAlpha = a
  bird(y, 1)
  g.save()
  g.beginPath()
  g.ellipse(pool[0], pool[1], pool[2], pool[3], 0, 0, TAU)
  g.clip()
  g.globalAlpha = a * 0.35
  bird(axis * 2 - y, -1)
  g.restore()
  g.globalAlpha = 1
}

/** A pair of butterflies mirroring each other about x = `axis` — a live prop. */
export const echoButterflies = (g: G2D, axis: number, y: number, t: number, alive: number, col: string, spread = 160): void => {
  if (alive <= 0) return
  const s = t * 0.5
  const dx = spread * 0.5 + sin(s) * spread * 0.4
  const dy = sin(s * 2) * 30
  const flap = Math.abs(sin(t * 11))
  g.globalAlpha = alive
  // The pair is the same creature the woods' butterfly is, a shade smaller,
  // so it wears the same painting — one sheet for every butterfly in the game.
  for (const d of [-1, 1]) butterflyAt(g, axis + d * dx, y + dy, flap, d < 0 ? col : '#ffffff', 22)
  g.globalAlpha = 1
}

/** A cloud drifting slowly across — a live prop, resting where it was painted. */
export const driftCloud = (g: G2D, x: number, y: number, s: number, t: number, alive: number, span = 60): void => {
  skyPuff(g, x + (alive > 0 ? sin(t * 0.12) * span * alive : 0), y, s)
}

/* --------------------------------------------------- the mirror sprite */

export interface SpriteLook { body: string; shade: string; star: string }
export const SPRITE_PEACH: SpriteLook = { body: '#ffc8b0', shade: '#ff9f86', star: GILT[0] }
export const SPRITE_ECHO: SpriteLook = { body: '#d4e6ff', shade: '#a8c4f8', star: '#ffffff' }

/**
 * A mirror sprite, feet at (x, y), facing `dir`, scale `s`: a round little
 * body, a curly antenna with a star, big eyes, blush, and its near arm
 * raised in a wave (`wave` −1..1).
 */
export const mirrorSprite = (g: G2D, x: number, y: number, s: number, dir: number, wave: number, look: SpriteLook): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const painted = drawItem(g, MIRROR_SPRITE_ART, SPRITE_UNIT * s, (clamp(wave, -1, 1) + 1) / 2, look.body)
  g.restore()
  if (painted) return
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  mirrorSpriteShape(g, s, wave, look)
  g.restore()
}

/** Star tip (-94) to the feet (0) at scale 1 — the sprite's own height in SU. */
const SPRITE_UNIT = 94

/**
 * The mirror sprite's wave (`CREATURE_ART.mirrorSprite`): the arm down, then
 * up. Its BODY is the tinted region — the valley's sprite is peach and its
 * reflection is a cool echo blue, and they are the same little creature.
 */
export const MIRROR_SPRITE_ART: ItemSpec = {
  ...CREATURE_ART.mirrorSprite, frames: 2, tinted: true,
  draw: (g, sz, f, accent) => {
    const k = sz / SPRITE_UNIT
    g.save()
    g.scale(k, k)
    mirrorSpriteShape(g, 1, f * 2 - 1, { body: accent.base, shade: accent.shade, star: SPRITE_PEACH.star })
    g.restore()
  }
}

/** The sprite itself, feet at the origin, facing +x, in its own units. */
const mirrorSpriteShape = (g: G2D, s: number, wave: number, look: SpriteLook): void => {
  const w = 4.6 / s
  // Feet.
  g.beginPath()
  g.ellipse(-9, -4, 8, 5, 0, 0, TAU)
  g.moveTo(17, -4)
  g.ellipse(9, -4, 8, 5, 0, 0, TAU)
  fill(g, look.shade)
  ink(g, w * 0.7)
  // Antenna and star.
  g.beginPath()
  g.moveTo(0, -54)
  g.quadraticCurveTo(-8, -66, 4, -74)
  ink(g, w * 0.7)
  star5(g, 6, -80, 10)
  fill(g, look.star)
  ink(g, w * 0.6)
  // The waving arm (behind), the other arm.
  g.save()
  g.translate(18, -36)
  g.rotate(-1.1 + wave * 0.5)
  g.beginPath()
  g.ellipse(0, -12, 7, 14, 0, 0, TAU)
  fill(g, look.body)
  ink(g, w * 0.8)
  g.restore()
  // Body.
  g.beginPath()
  g.ellipse(0, -30, 26, 28, 0, 0, TAU)
  fill(g, look.body)
  g.save()
  g.clip()
  g.beginPath()
  g.ellipse(10, -8, 30, 16, 0, 0, TAU)
  fill(g, look.shade)
  g.beginPath()
  g.ellipse(-10, -46, 8, 5, -0.5, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  g.beginPath()
  g.ellipse(0, -30, 26, 28, 0, 0, TAU)
  ink(g, w)
  g.beginPath()
  g.ellipse(-22, -24, 6, 11, 0.5, 0, TAU)
  fill(g, look.body)
  ink(g, w * 0.8)
  // Face.
  for (const ex of [-4, 12]) {
    g.beginPath()
    g.ellipse(ex, -32, 5.5, 7.5, 0, 0, TAU)
    fill(g, INK)
    g.beginPath()
    g.arc(ex - 1.6, -35, 2.2, 0, TAU)
    fill(g, '#ffffff')
  }
  g.beginPath()
  g.arc(4, -22, 5, 0.25, PI - 0.25)
  fill(g, '#ff8fb0')
  ink(g, w * 0.5)
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(-13, -22, 5, 3, 0, 0, TAU)
  g.moveTo(26, -22)
  g.ellipse(21, -22, 5, 3, 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
}

/** Where and how the sprites peek: the pair centred on x, feet at y when
 *  out; `ground` clips them; `rise` how far down they hide; `gap` between. */
export interface SpriteSpot { x: number; y: number; s: number; ground: number; rise: number; gap: number }

/**
 * The tap creature (§8.8 beat 2): a mirror sprite pops up from behind its
 * cover (whose FRONT `cover` redraws on top, so k = 0 is the prop alone) and
 * waves — and a beat later its mirrored twin pops up beside it doing the
 * very same wave, a shimmering mirror line between them.
 */
export const spriteTap = (p: SpriteSpot, cover: (g: G2D) => void, r = 72): TapCreature => ({
  x: p.x,
  y: p.y - 50 * p.s,
  r,
  draw: (g, k, t) => {
    const e1 = ease(clamp(k * 1.25, 0, 1))
    const e2 = ease(clamp(k * 1.25 - 0.25, 0, 1))
    const wave = sin(t * 10)
    if (e1 > 0.001) {
      g.save()
      g.beginPath()
      g.rect(p.x - 300, p.ground - 500, 600, 500)
      g.clip()
      mirrorSprite(g, p.x - p.gap / 2, p.y + (1 - e1) * p.rise, p.s, 1, wave * e1, SPRITE_PEACH)
      if (e2 > 0.001) mirrorSprite(g, p.x + p.gap / 2, p.y + (1 - e2) * p.rise, p.s, -1, wave * e2, SPRITE_ECHO)
      g.restore()
    }
    tapCover(g, cover)
    if (e2 > 0.3) {
      const a = (e2 - 0.3) / 0.7
      const top = p.y - 90 * p.s
      g.globalAlpha = a * 0.7
      g.beginPath()
      g.moveTo(p.x, top)
      g.lineTo(p.x, p.y - 30 * p.s)
      g.lineWidth = 3
      g.lineCap = 'round'
      g.strokeStyle = '#ffffff'
      g.stroke()
      g.globalAlpha = a
      g.beginPath()
      twinkle(g, p.x, top - 6, 9 * (0.7 + 0.3 * sin(t * 8)))
      twinkle(g, p.x + 30 * p.s, top + 10, 6 * (0.7 + 0.3 * sin(t * 8 + 2)))
      twinkle(g, p.x - 30 * p.s, top + 10, 6 * (0.7 + 0.3 * sin(t * 8 + 4)))
      fill(g, '#fffbe0')
      g.globalAlpha = 1
    }
  }
})

/* ------------------------------------------------ the Mended Mirror Shard */

const DULL_GLASS = '#b8b4c8'
const DULL_GILT = '#cbbfa6'

/** Handle foot (0) to the frame's crown (-166) at scale 1 — its height in SU. */
const MENDED_UNIT = 166

/**
 * The Mended Shard, asleep and awake (`CREATURE_ART.mendedShard`): a hand
 * mirror with its glass cracked and dull, then whole and bright. Its halo,
 * its shadow on the path, the chip that flies home and the sparkles stay
 * drawn — and so does its LEAN, which is a rotation.
 */
export const MENDED_SHARD_ART: ItemSpec = {
  ...CREATURE_ART.mendedShard, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / MENDED_UNIT
    g.save()
    g.scale(k, k)
    mendedShardShape(g, 1, f, f, mix(DULL_GILT, GILT[0]!, f), mix('#a89c86', GILT[1]!, f), mix(DULL_GLASS, '#d8f1ff', f))
    g.restore()
  }
}

/** The mirror itself, upright, its handle's foot at the origin, in its units. */
const mendedShardShape = (
  g: G2D, s: number, e: number, k: number, frame: string, frameShade: string, glassC: string
): void => {
  const S = (v: number): number => v * s
  // Handle.
  g.beginPath()
  g.roundRect(-S(9), -S(62), S(18), S(64), S(9))
  fill(g, frame)
  ink(g, 4)
  g.beginPath()
  g.arc(0, 0, S(10), 0, TAU)
  fill(g, frameShade)
  ink(g, 3.5)
  // Frame and glass.
  const gy = -S(112)
  g.beginPath()
  g.ellipse(0, gy, S(48), S(54), 0, 0, TAU)
  fill(g, frame)
  ink(g, 5)
  g.beginPath()
  g.ellipse(0, gy, S(38), S(44), 0, 0, TAU)
  fill(g, glassC)
  if (e > 0.05) {
    g.save()
    g.clip()
    g.globalAlpha = e
    g.beginPath()
    g.moveTo(-S(30), gy + S(8))
    g.lineTo(-S(4), gy - S(36))
    g.moveTo(-S(24), gy + S(24))
    g.lineTo(S(8), gy - S(28))
    g.lineWidth = S(7)
    g.lineCap = 'round'
    g.strokeStyle = '#ffffff'
    g.stroke()
    // The tiny star it reflects.
    star5(g, S(16), gy - S(18), S(9))
    fill(g, GILT[0])
    ink(g, 2)
    g.globalAlpha = 1
    g.restore()
  }
  g.beginPath()
  g.ellipse(0, gy, S(38), S(44), 0, 0, TAU)
  ink(g, 3.5)
  // The crack, fading as it mends.
  if (e < 1) {
    g.globalAlpha = 1 - e
    g.beginPath()
    g.moveTo(-S(26), gy - S(26))
    g.lineTo(-S(8), gy - S(10))
    g.lineTo(-S(16), gy + S(4))
    g.lineTo(S(4), gy + S(16))
    g.lineTo(S(0), gy + S(28))
    ink(g, 3)
    g.globalAlpha = 1
  }
  // Its face.
  const fy = gy + S(10)
  if (k < 0.5) {
    g.beginPath()
    g.arc(-S(12), fy - S(4), S(5.5), PI * 0.15, PI * 0.85)
    g.moveTo(S(17.5), fy - S(1.6))
    g.arc(S(12), fy - S(4), S(5.5), PI * 0.15, PI * 0.85)
    ink(g, 2.6)
  } else {
    for (const ex of [-S(12), S(12)]) {
      g.beginPath()
      g.ellipse(ex, fy - S(4), S(5.5), S(7.5), 0, 0, TAU)
      fill(g, INK)
      g.beginPath()
      g.arc(ex - S(1.8), fy - S(7), S(2.2), 0, TAU)
      fill(g, '#ffffff')
    }
    g.beginPath()
    g.arc(0, fy + S(8), S(6), 0.25, PI - 0.25)
    fill(g, '#ff8fb0')
    ink(g, 2.4)
  }
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(-S(22), fy + S(6), S(5), S(3), 0, 0, TAU)
  g.moveTo(S(27), fy + S(6))
  g.ellipse(S(22), fy + S(6), S(5), S(3), 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
}

/**
 * The Mended Mirror Shard, the chapter's rescue (§8.8 beat 3): a little
 * hand-mirror at (x, y). k = 0: lying tipped on the path, dull and cracked,
 * a chip of its glass fallen beside it, asleep; k = 1: standing up and
 * hovering, the chip flown home, whole and shining, a tiny star in its glass.
 */
export const mendedShard = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const e = ease(clamp(k, 0, 1))
  const S = (v: number): number => v * s
  const lift = e * S(26) + (e > 0 ? sin(t * 2.2) * S(4) * e : 0)
  const ang = lerp(-1.25, 0, e) + (e > 0 ? sin(t * 1.6) * 0.06 * e : 0)
  const frame = mix(DULL_GILT, GILT[0], e)
  const frameShade = mix('#a89c86', GILT[1], e)
  const glassC = mix(DULL_GLASS, '#d8f1ff', e)
  // Shadow on the path.
  g.globalAlpha = 0.22
  g.beginPath()
  g.ellipse(x + S(6), y, S(60), S(9), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  if (k > 0) glow(g, x, y - S(80) - lift, S(110), e, '#f4fdff')
  // Pivot: the handle's end, resting on the path.
  // The mirror LEANS on its handle asleep and stands upright awake, which is
  // a rotation about the handle's end — so the painting is made upright and
  // the drawing tips it. The chip flying home, the zzz and the sparkles are
  // separate things and stay drawn.
  g.save()
  g.translate(x + S(44) * (1 - e), y - S(8) - lift)
  g.rotate(ang)
  if (!drawItem(g, MENDED_SHARD_ART, MENDED_UNIT * s, k < 0.5 ? 0 : 1)) mendedShardShape(g, s, e, k, frame, frameShade, glassC)
  g.restore()
  // The fallen chip: lying by it asleep, flying home as it wakes.
  if (e < 0.98) {
    const q = e
    const cx = lerp(x + S(84), x + S(20), q)
    const cy = lerp(y - S(6), y - S(170), q)
    g.globalAlpha = 1 - q
    g.save()
    g.translate(cx, cy)
    g.rotate(lerp(0.6, 0, q))
    g.beginPath()
    g.moveTo(-S(12), S(6))
    g.lineTo(S(2), -S(12))
    g.lineTo(S(14), S(4))
    g.closePath()
    fill(g, glassC)
    ink(g, 3)
    g.restore()
    g.globalAlpha = 1
  }
  if (k < 0.34) zzz(g, x - S(10), y - S(110), t, 1 - k * 3)
  if (e > 0.2) {
    g.globalAlpha = e
    g.beginPath()
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + (i * TAU) / 4
      const r = S(9) * Math.max(0, sin(t * 3 + i * 1.7))
      if (r < 1) continue
      twinkle(g, x + cos(a) * S(76), y - S(110) - lift + sin(a) * S(58), r)
    }
    fill(g, '#ffffff')
    g.globalAlpha = 1
  }
}
