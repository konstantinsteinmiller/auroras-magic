/**
 * kitCaves.ts — Crystal Caves' painters (chapter 4, story-spec §10.2: "The
 * under-realm's crystals have shattered and gone dark", Guardian Terra).
 * The cavern's back wall and its icing-drip stalactites, lilac rock, the
 * orchid floor with its glow-moss, crystals and crystal clusters, glow
 * mushrooms, lanterns, rails and mine carts, gem heaps, the underground lake,
 * the chasm mist, the lantern bridge house and Terra's geode; the caves' live
 * props; the glowworm (the tap creature, §8.8) and the Shard of Clear Light
 * (the chapter's rescue).
 *
 * Underground is NOT dark here: the walls are soft periwinkle and lilac, lit
 * by glowing crystals and warm lanterns, the floor a candy orchid. Same rules
 * as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline on mid- and
 * foreground shapes, gradients only in the far wall, water, mist and glows.
 * Base tones clear the candy floor (saturation ≥ 70 %, lightness 55–75 %).
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, ease } from '@/game/duel/util'
import { type G2D, type Pot, INK, fill, ink, lumpy, moteAt, twinkleAt, twinklePainted } from '@/game/map/kit'
import { tapCover, coverLayerLive } from '@/game/map/tapCover'
import { type Pt, curve, samplesOf } from '@/game/map/kitBay'
import { mix, zzz } from '@/game/map/kitSky'
import type { TapCreature } from '@/game/map/sectorDef'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'

type Lobe = readonly [number, number, number]
/** A form's three tones: base, shade, light. */
export type Tones = readonly [string, string, string]

export const CAVE = {
  backTop: '#8b7ff2',
  backMid: '#9f84f9',
  backLow: '#f2cbff',
  far: '#c7b6ff',
  farLite: '#e4d9ff',
  far2: '#b19ffb',
  rock: '#9a88f2',
  rockShade: '#7a66dc',
  rockLite: '#d9cfff',
  icing: '#ce8af2',
  icingShade: '#a866dc',
  floor: '#d67cf0',
  floorShade: '#b45ed2',
  floorLip: '#f4c6ff',
  moss: '#4fe3c1',
  mossShade: '#2cb89c',
  mossLite: '#b8fbe9',
  waterFar: '#aef0ff',
  water: '#5fd2f5',
  waterDeep: '#4ab0f0',
  waterLite: '#d4f8ff',
  stem: '#fff1e8',
  stemShade: '#f2cfe6',
  wood: '#e6a46c',
  woodShade: '#bf7f52',
  brass: '#ffb84d',
  brassShade: '#e0913a',
  glass: '#fff1a8',
  flame: '#ffa94d',
  glow: '#fff4b8',
  mist: '#ffd6f4'
}

export const ROCK: Tones = [CAVE.rock, CAVE.rockShade, CAVE.rockLite]
export const PINKC: Tones = ['#ff79b8', '#e0559a', '#ffc6e2']
export const AQUA: Tones = ['#45e6e0', '#1fb8b4', '#b8fbf7']
export const AMETHYST: Tones = ['#b77bff', '#8c50e6', '#e3ccff']
export const GOLD: Tones = ['#ffd14d', '#e8a630', '#fff0a8']
export const SAPPHIRE: Tones = ['#6fa8ff', '#4a7fe0', '#c8dcff']
/** Terra's earthy amber (art-style §4.2), for her throne. */
export const AMBER: Tones = ['#ffb65c', '#e08a3a', '#ffe0a8']

/** Chapter 4's base tones, for the candy-floor check (§9.6.1). */
export const CAVE_TONES: readonly string[] = [
  CAVE.backTop, CAVE.rock, CAVE.floor, CAVE.icing, CAVE.moss, CAVE.water, PINKC[0], AQUA[0], AMETHYST[0], GOLD[0], SAPPHIRE[0]
]

/* ---------------------------------------------------------------- helpers */

const disc = (g: G2D, x: number, y: number, r: number, c: string): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, c)
}

/** A point (px, py) of a shape standing at (x, y), turned by `a`. */
const at = (x: number, y: number, a: number, px: number, py: number): Pt => [
  x + px * cos(a) - py * sin(a),
  y + px * sin(a) + py * cos(a)
]

/** A soft two-ring glow — additive-looking discs, no blur (art-style §6). */
export const glow = (g: G2D, x: number, y: number, r: number, a: number, col = CAVE.glow): void => {
  if (a <= 0) return
  g.globalAlpha = a * 0.22
  disc(g, x, y, r, col)
  g.globalAlpha = a * 0.3
  disc(g, x, y, r * 0.58, col)
  g.globalAlpha = 1
}

/** A baked radial glow on the far wall (gradients live in far layers). */
export const wallGlow = (g: G2D, x: number, y: number, r: number, rgb: string, a = 0.7): void => {
  const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r)
  gr.addColorStop(0, `rgba(${rgb},${a})`)
  gr.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = gr
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

/* --------------------------------------------------------- the far layers */

export interface CaveBackOpts {
  /** Baked glows on the far wall: x, y, radius, "r,g,b". */
  glows?: readonly (readonly [number, number, number, string])[]
  /** Where the wall is lightest (the cavern's glowing depth), 0..1 of the height. */
  low?: number
}

/** The cavern's far wall: periwinkle overhead, a soft lilac-pink glow deep in
 *  the cave, never a dark void. */
export const caveBack = (g: G2D, o: CaveBackOpts = {}): void => {
  const low = o.low ?? 0.62
  const gr = g.createLinearGradient(0, 0, 0, SEC_H)
  gr.addColorStop(0, CAVE.backTop)
  gr.addColorStop(low * 0.6, CAVE.backMid)
  gr.addColorStop(low, CAVE.backLow)
  gr.addColorStop(1, CAVE.backMid)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  for (const [x, y, r, rgb] of o.glows ?? []) wallGlow(g, x, y, r, rgb)
}

/** Far stalagmite columns rising from `base`: [x, width, height] — pale,
 *  unoutlined, with a lit left flank. */
export const farSpires = (g: G2D, base: number, list: readonly Lobe[], col = CAVE.far, lite = CAVE.farLite): void => {
  const shape = (x: number, w: number, h: number, k: number): void => {
    g.moveTo(x - w / 2, base + 40)
    g.bezierCurveTo(x - w * 0.5, base - h * 0.5, x - w * 0.3 * k, base - h, x, base - h)
    g.bezierCurveTo(x + w * 0.3 * k, base - h, x + w * 0.5 * k, base - h * 0.5, x + (w / 2) * k, base + 40)
    g.closePath()
  }
  g.beginPath()
  for (const [x, w, h] of list) shape(x, w, h, 1)
  fill(g, col)
  g.beginPath()
  for (const [x, w, h] of list) {
    g.moveTo(x - w * 0.36, base + 40)
    g.bezierCurveTo(x - w * 0.38, base - h * 0.45, x - w * 0.22, base - h * 0.86, x - w * 0.08, base - h * 0.9)
    g.bezierCurveTo(x - w * 0.14, base - h * 0.5, x - w * 0.12, base - h * 0.1, x - w * 0.1, base + 40)
    g.closePath()
  }
  fill(g, lite)
}

/** Far crystals on the back wall: [x, y, height, angle] — pale, unoutlined. */
export const farCrystals = (g: G2D, list: readonly (readonly [number, number, number, number])[], col = CAVE.farLite): void => {
  g.beginPath()
  for (const [x, y, h, a] of list) {
    const w = h * 0.34
    const P: readonly Pt[] = [[-w / 2, 0], [-w / 2, -h * 0.72], [0, -h], [w / 2, -h * 0.72], [w / 2, 0]]
    for (let i = 0; i < P.length; i++) {
      const [px, py] = at(x, y, a, P[i]![0], P[i]![1])
      if (i) g.lineTo(px, py)
      else g.moveTo(px, py)
    }
    g.closePath()
  }
  fill(g, col)
}

/* ----------------------------------------------------------------- rock */

/**
 * A lilac rock mass whose outline `path` builds (as kitBay's `rockMass`):
 * the shade tone, the base laid back over it shifted toward the top-left
 * light, a few seams, an optional glow-moss cap along `cap`, one outline.
 */
export const caveRock = (
  g: G2D, path: () => void, box: readonly [number, number, number, number], seed: number,
  shift: Pt = [26, 18], cap?: readonly Pt[], seams = 1, t: Tones = ROCK
): void => {
  const [bx, by, bw, bh] = box
  path()
  fill(g, t[1])
  g.save()
  path()
  g.clip()
  g.save()
  g.translate(-shift[0], -shift[1])
  path()
  fill(g, t[0])
  g.restore()
  const r = seeded(seed)
  const n = Math.round(((bw * bh) / 9000) * seams)
  g.beginPath()
  const lites: number[] = []
  for (let i = 0; i < n; i++) {
    const x = bx + r() * bw
    const y = by + r() * bh
    const rx = 20 + r() * 26
    const ry = rx * (0.45 + r() * 0.2)
    g.moveTo(x + cos(0.12 * PI) * rx, y + sin(0.12 * PI) * ry)
    g.ellipse(x, y, rx, ry, 0, 0.12 * PI, 0.88 * PI)
    lites.push(x, y, rx, ry)
  }
  g.lineWidth = 4
  g.lineCap = 'round'
  g.strokeStyle = t[1]
  g.stroke()
  g.beginPath()
  for (let i = 0; i < lites.length; i += 8) {
    const x = lites[i]!
    const y = lites[i + 1]!
    const rx = lites[i + 2]!
    const ry = lites[i + 3]!
    g.moveTo(x + cos(1.2 * PI) * rx * 0.6, y - ry * 0.2 + sin(1.2 * PI) * ry * 0.6)
    g.ellipse(x, y - ry * 0.2, rx * 0.6, ry * 0.6, 0, 1.2 * PI, 1.55 * PI)
  }
  g.strokeStyle = t[2]
  g.stroke()
  if (cap) mossCap(g, cap)
  g.restore()
  path()
  ink(g)
}

/** A glow-moss "icing" along a rock's crest (inside a clip). */
const mossCap = (g: G2D, cap: readonly Pt[]): void => {
  const lobes: Lobe[] = []
  for (let i = 0; i < cap.length - 1; i++) {
    const [ax, ay] = cap[i]!
    const [ex, ey] = cap[i + 1]!
    const steps = Math.max(1, Math.round(Math.hypot(ex - ax, ey - ay) / 24))
    for (let j = 0; j < steps; j++) {
      const u = j / steps
      lobes.push([ax + (ex - ax) * u, ay + (ey - ay) * u + 6, 14 + ((i + j) % 3) * 3])
    }
  }
  lumpy(g, lobes, CAVE.moss, 4)
  g.beginPath()
  for (let i = 0; i < lobes.length; i += 2) {
    const [x, y, rr] = lobes[i]!
    g.moveTo(x - rr * 0.2 + rr * 0.35, y - rr * 0.35)
    g.ellipse(x - rr * 0.2, y - rr * 0.35, rr * 0.35, rr * 0.18, -0.4, 0, TAU)
  }
  fill(g, CAVE.mossLite)
}

/** A rock mass through the closed outline `pts`, glow-moss along `cap`. */
export const ledge = (g: G2D, pts: readonly Pt[], seed: number, cap?: readonly Pt[], t: Tones = ROCK): void => {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  caveRock(
    g,
    () => {
      g.beginPath()
      curve(g, pts)
      g.closePath()
    },
    [x0, y0 + 30, Math.max(...xs) - x0, Math.max(...ys) - y0 - 30],
    seed,
    [30, 20],
    cap,
    1,
    t
  )
}

/** A rounded boulder standing on (x, y), w × h (kitBay's shape, cave tones). */
export const rock = (g: G2D, x: number, y: number, w: number, h: number, flip = 1, t: Tones = ROCK): void => {
  const X = (u: number): number => x + u * w * flip
  const Y = (v: number): number => y - v * h
  const path = (): void => {
    g.beginPath()
    g.moveTo(X(-0.5), Y(0))
    g.bezierCurveTo(X(-0.56), Y(0.55), X(-0.36), Y(1.02), X(-0.06), Y(1))
    g.bezierCurveTo(X(0.12), Y(0.99), X(0.2), Y(0.86), X(0.28), Y(0.8))
    g.bezierCurveTo(X(0.48), Y(0.74), X(0.55), Y(0.34), X(0.5), Y(0))
    g.closePath()
  }
  caveRock(g, path, [x - w / 2, y - h, w, h], Math.round(x + y), [w * 0.14, h * 0.16], undefined, 1.4, t)
}

/** A rounded gumdrop stalagmite standing on (x, y), w × h. */
export const stalagmite = (g: G2D, x: number, y: number, w: number, h: number, t: Tones = ROCK): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.bezierCurveTo(x - w * 0.5, y - h * 0.45, x - w * 0.26, y - h * 0.8, x - w * 0.16, y - h * 0.92)
    g.bezierCurveTo(x - w * 0.08, y - h * 1.02, x + w * 0.08, y - h * 1.02, x + w * 0.16, y - h * 0.92)
    g.bezierCurveTo(x + w * 0.26, y - h * 0.8, x + w * 0.5, y - h * 0.45, x + w / 2, y)
    g.closePath()
  }
  caveRock(g, path, [x - w / 2, y - h, w, h], Math.round(x * 3 + y), [w * 0.2, h * 0.06], undefined, 1.2, t)
  g.beginPath()
  g.ellipse(x - w * 0.1, y - h * 0.84, w * 0.08, h * 0.05, -0.5, 0, TAU)
  fill(g, '#ffffff')
}

/* -------------------------------------------------------- the stalactites */

/** Where the cavern's ceiling edge sits at x: highest mid-cave. */
export const ceilingY = (x: number, yMid: number, yEdge: number): number => {
  const u = (x - SEC_W / 2) / (SEC_W / 2)
  return yMid + (yEdge - yMid) * u * u
}

/**
 * The cavern ceiling: lilac rock overhead, its lower edge a thick candy
 * "icing" that drips down into rounded stalactites. `skip` keeps drips out
 * of [x0, x1] spans (a landmark's top).
 */
export const ceiling = (
  g: G2D, yMid: number, yEdge: number, seed: number, len = 1,
  skip: readonly (readonly [number, number])[] = [], icing = CAVE.icing
): void => {
  const r = seeded(seed)
  const drips: [number, number, number][] = []
  for (let x = 10 + r() * 50; x < SEC_W + 30; x += 54 + r() * 64) {
    const hw = 13 + r() * 12
    const L = (18 + r() * r() * 110) * len
    if (skip.some(([a, b]) => x > a && x < b)) continue
    drips.push([x, hw, L])
  }
  const Y = (x: number): number => ceilingY(x, yMid, yEdge)
  // The icing layer and its drips.
  const icingPath = (): void => {
    g.beginPath()
    g.moveTo(-20, -20)
    g.lineTo(-20, Y(-20) + 16)
    let x = -20
    for (const [dx, hw, L] of drips) {
      for (; x < dx - hw; x += 20) g.lineTo(x, Y(x) + 16)
      const yb = Y(dx) + 16
      g.lineTo(dx - hw, yb)
      g.bezierCurveTo(dx - hw, yb + L * 0.35, dx - hw * 0.5, yb + L * 0.5, dx - hw * 0.52, yb + L * 0.72)
      g.arc(dx, yb + L * 0.72, hw * 0.52, PI, 0, true)
      g.bezierCurveTo(dx + hw * 0.5, yb + L * 0.5, dx + hw, yb + L * 0.35, dx + hw, yb)
      x = dx + hw + 6
    }
    for (; x <= SEC_W + 20; x += 20) g.lineTo(x, Y(x) + 16)
    g.lineTo(SEC_W + 20, -20)
    g.closePath()
  }
  icingPath()
  fill(g, icing)
  g.save()
  icingPath()
  g.clip()
  // Each drip's shaded right flank.
  g.beginPath()
  for (const [dx, hw, L] of drips) {
    const yb = Y(dx) + 16
    g.moveTo(dx + hw * 0.1, yb)
    g.lineTo(dx + hw + 4, yb)
    g.lineTo(dx + hw * 0.7, yb + L * 0.72 + hw * 0.6)
    g.lineTo(dx + hw * 0.1, yb + L * 0.72 + hw * 0.6)
    g.closePath()
  }
  g.globalAlpha = 0.5
  fill(g, CAVE.icingShade)
  g.globalAlpha = 1
  g.restore()
  icingPath()
  ink(g)
  // A glint on every bulb.
  g.beginPath()
  for (const [dx, hw, L] of drips) {
    const yb = Y(dx) + 16 + L * 0.72
    g.moveTo(dx - hw * 0.22 + hw * 0.14, yb)
    g.ellipse(dx - hw * 0.22, yb, hw * 0.14, hw * 0.24, 0, 0, TAU)
  }
  fill(g, '#ffffff')
  // The rock overhead, its scalloped edge lying on the icing.
  const rockPath = (): void => {
    g.beginPath()
    g.moveTo(-20, -20)
    for (let x = -20; x <= SEC_W + 20; x += 30) {
      const y = Y(x) - 6 + ((x / 30) % 2 === 0 ? 0 : 7)
      g.lineTo(x, y)
    }
    g.lineTo(SEC_W + 20, -20)
    g.closePath()
  }
  caveRock(g, rockPath, [0, 0, SEC_W, Math.max(yMid, yEdge)], seed + 1, [0, 14], undefined, 0.8)
}

/* ---------------------------------------------------------------- floors */

/** The cave floor below the curve through `top`: orchid, a lit lip, pebbles. */
export const caveFloor = (g: G2D, top: readonly Pt[], seed: number, col = CAVE.floor): void => {
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
  curve(g, top.map(([x, y]) => [x, y + 13] as const))
  g.lineWidth = 12
  g.strokeStyle = CAVE.floorLip
  g.stroke()
  const r = seeded(seed)
  const y0 = Math.min(...top.map((p) => p[1]))
  g.beginPath()
  for (let i = 0; i < 40; i++) {
    const x = r() * SEC_W
    const y = y0 + 36 + r() * (SEC_H - y0 - 36)
    const w = 5 + r() * 4
    g.moveTo(x + w, y)
    g.ellipse(x, y, w, w * 0.6, 0, 0, TAU)
  }
  fill(g, CAVE.floorShade)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const x = r() * SEC_W
    const y = y0 + 50 + r() * (SEC_H - y0 - 50)
    const w = 18 + r() * 24
    g.moveTo(x - w, y)
    g.quadraticCurveTo(x, y - 8, x + w, y)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = CAVE.floorShade
  g.stroke()
  g.restore()
  g.beginPath()
  curve(g, top)
  ink(g)
}

/** Flat glow-moss mounds on the floor: [x, y, width]. */
export const moss = (g: G2D, list: readonly Lobe[]): void => {
  for (const [x, y, w] of list) {
    const n = Math.max(2, Math.round(w / 26))
    const lobes: Lobe[] = []
    for (let i = 0; i <= n; i++) {
      const u = i / n
      lobes.push([x - w / 2 + u * w, y - sin(u * PI) * 10, 12 + sin(u * PI) * 8])
    }
    lumpy(g, lobes, CAVE.moss, 3.5)
    g.beginPath()
    for (let i = 1; i < lobes.length; i += 2) {
      const [lx, ly, lr] = lobes[i]!
      g.moveTo(lx + lr * 0.3 - lr * 0.2, ly - lr * 0.4)
      g.ellipse(lx - lr * 0.2, ly - lr * 0.4, lr * 0.3, lr * 0.16, -0.3, 0, TAU)
    }
    fill(g, CAVE.mossLite)
  }
}

/**
 * A patch of floor through the closed outline `pts` — a ledge's top seen
 * from above — with, along `edge`, the lilac lip where it drops away into a
 * chasm (`dx` points from the edge into the ground).
 */
export const groundPatch = (g: G2D, pts: readonly Pt[], seed: number, edge?: readonly Pt[], dx = 0): void => {
  const area = (): void => {
    g.beginPath()
    curve(g, pts)
    g.closePath()
  }
  area()
  fill(g, CAVE.floor)
  g.save()
  area()
  g.clip()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const bw = Math.max(...xs) - x0
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 26; i++) {
    const x = x0 + r() * bw
    const y = y0 + 30 + r() * (SEC_H - y0 - 30)
    const w = 5 + r() * 4
    g.moveTo(x + w, y)
    g.ellipse(x, y, w, w * 0.6, 0, 0, TAU)
  }
  fill(g, CAVE.floorShade)
  if (edge) {
    g.beginPath()
    curve(g, edge)
    g.lineWidth = Math.abs(dx) * 2
    g.strokeStyle = CAVE.rock
    g.stroke()
    g.lineWidth = Math.abs(dx) * 0.7
    g.strokeStyle = CAVE.rockShade
    g.stroke()
    g.beginPath()
    curve(g, edge.map(([x, y]) => [x + dx, y] as const))
    ink(g, 4)
  }
  g.restore()
  area()
  ink(g)
}

/** A little cut gem at (x, y), `r` across: a rounded diamond with a lit table. */
export const gem = (g: G2D, x: number, y: number, r: number, t: Tones, kind = 0): void => {
  g.beginPath()
  if (kind === 1) {
    g.arc(x, y, r * 0.8, 0, TAU)
  } else {
    g.moveTo(x - r, y - r * 0.25)
    g.lineTo(x - r * 0.5, y - r * 0.8)
    g.lineTo(x + r * 0.5, y - r * 0.8)
    g.lineTo(x + r, y - r * 0.25)
    g.lineTo(x, y + r * 0.9)
    g.closePath()
  }
  fill(g, t[0])
  ink(g, 2.4)
  g.beginPath()
  if (kind === 1) g.ellipse(x - r * 0.28, y - r * 0.3, r * 0.26, r * 0.18, -0.5, 0, TAU)
  else {
    g.moveTo(x - r * 0.5, y - r * 0.8)
    g.lineTo(x + r * 0.5, y - r * 0.8)
    g.lineTo(x + r * 0.2, y - r * 0.25)
    g.lineTo(x - r * 0.6, y - r * 0.25)
    g.closePath()
  }
  fill(g, t[2])
}

const GEM_TONES: readonly Tones[] = [PINKC, AQUA, GOLD, AMETHYST, SAPPHIRE]

/** Gems sprinkled over a band of floor, skipping `avoid` boxes. */
export const gems = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  for (let i = 0; i < n; i++) {
    const x = 24 + r() * (SEC_W - 48)
    const y = y0 + r() * (y1 - y0)
    const size = 7 + r() * 5
    const k = r() < 0.3 ? 1 : 0
    if (avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)) continue
    gem(g, x, y, size, GEM_TONES[i % GEM_TONES.length]!, k)
  }
}

/** A heap of gems piled on (x, y), `w` wide. */
export const gemHeap = (g: G2D, x: number, y: number, w: number, seed: number): void => {
  const r = seeded(seed)
  const rows = Math.max(2, Math.round(w / 60))
  for (let row = 0; row < rows; row++) {
    const rw = w * (1 - row / (rows + 0.6))
    const n = Math.max(1, Math.round(rw / 26))
    for (let i = 0; i < n; i++) {
      const gx = x - rw / 2 + ((i + 0.5) / n) * rw + (r() - 0.5) * 8
      const gy = y - 10 - row * 17 + (r() - 0.5) * 4
      gem(g, gx, gy, 12 + r() * 4, GEM_TONES[(i + row * 2 + seed) % GEM_TONES.length]!, r() < 0.35 ? 1 : 0)
    }
  }
}

/* -------------------------------------------------------------- crystals */

/** The crystal's silhouette in its own space: base (0, 0), tip up. */
const crystalShape = (g: G2D, w: number, h: number): void => {
  g.beginPath()
  g.moveTo(-w / 2, 0)
  g.lineTo(-w / 2, -h * 0.72)
  g.lineTo(-w * 0.08, -h)
  g.lineTo(w * 0.08, -h)
  g.lineTo(w / 2, -h * 0.72)
  g.lineTo(w / 2, 0)
  g.closePath()
}

/** A crystal's geometry: base x, y, width, height, lean. */
export type CrystalGeom = readonly [number, number, number, number, number]

/** One hexagonal crystal standing on (x, y), `w` × `h`, leaning `a`: a lit
 *  left facet, a shaded right facet, a glint, one outline. */
export const crystal = (g: G2D, x: number, y: number, w: number, h: number, a: number, t: Tones, lw = 4): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  crystalShape(g, w, h)
  fill(g, t[0])
  g.save()
  crystalShape(g, w, h)
  g.clip()
  g.beginPath()
  g.moveTo(w * 0.08, -h - 4)
  g.lineTo(w * 0.22, -h * 0.7)
  g.lineTo(w * 0.22, 4)
  g.lineTo(w, 4)
  g.lineTo(w, -h - 4)
  g.closePath()
  fill(g, t[1])
  g.beginPath()
  g.moveTo(-w * 0.08, -h - 4)
  g.lineTo(-w * 0.2, -h * 0.7)
  g.lineTo(-w * 0.2, 4)
  g.lineTo(-w, 4)
  g.lineTo(-w, -h - 4)
  g.closePath()
  fill(g, t[2])
  g.beginPath()
  g.moveTo(-w * 0.34, -h * 0.62)
  g.lineTo(-w * 0.34, -h * 0.34)
  g.lineWidth = Math.max(2, w * 0.09)
  g.lineCap = 'round'
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.restore()
  crystalShape(g, w, h)
  ink(g, lw)
  g.restore()
}

/** The path of a crystal's middle facet (for a glowworm's light). */
export const facetPath = (g: G2D, c: CrystalGeom): void => {
  const [x, y, w, h, a] = c
  const P: readonly Pt[] = [[-w * 0.2, -2], [-w * 0.2, -h * 0.7], [-w * 0.08, -h], [w * 0.08, -h], [w * 0.22, -h * 0.7], [w * 0.22, -2]]
  g.beginPath()
  for (let i = 0; i < P.length; i++) {
    const [px, py] = at(x, y, a, P[i]![0], P[i]![1])
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.closePath()
}

/** The crystals of a cluster: [dx, w, h, lean], scaled by the cluster's `s`. */
export type ClusterSpec = readonly (readonly [number, number, number, number])[]
export const CLUSTER: ClusterSpec = [[-50, 30, 84, -0.52], [48, 30, 96, 0.46], [-22, 38, 142, -0.18], [24, 36, 120, 0.2], [0, 44, 172, 0.02]]
export const CLUSTER_SMALL: ClusterSpec = [[-26, 26, 64, -0.45], [26, 26, 72, 0.42], [0, 32, 104, 0.02]]

/** The world geometry of crystal `i` of a cluster at (x, y), scale `s`. */
export const clusterGeom = (x: number, y: number, s: number, i: number, spec: ClusterSpec = CLUSTER): CrystalGeom => {
  const [dx, w, h, a] = spec[i]!
  return [x + dx * s, y, w * s, h * s, a]
}

/** A crystal cluster sprouting from a rock lump at (x, y), scale `s`. */
export const cluster = (g: G2D, x: number, y: number, s: number, t: Tones, spec: ClusterSpec = CLUSTER, base = true): void => {
  for (let i = 0; i < spec.length; i++) {
    const [cx, cy, w, h, a] = clusterGeom(x, y, s, i, spec)
    crystal(g, cx, cy, w, h, a, t, s < 0.7 ? 3.5 : 4.5)
  }
  if (base) rock(g, x, y + 10 * s, 150 * s, 40 * s, 1)
}

/* ------------------------------------------------------------- mushrooms */

/** A glow mushroom whose foot is at (x, y), scale `s`: a cream stem, a dome
 *  cap in `t` with lit spots, gills peeping under the rim. */
export const shroom = (g: G2D, x: number, y: number, s: number, t: Tones, lean = 0, lw = 5): void => {
  const S = (v: number): number => v * s
  const tx = x + S(lean * 30)
  const cy = y - S(92)
  const stem = (): void => {
    g.beginPath()
    g.moveTo(x - S(17), y)
    g.bezierCurveTo(x - S(20), y - S(40), tx - S(12), y - S(64), tx - S(12), cy + S(4))
    g.lineTo(tx + S(12), cy + S(4))
    g.bezierCurveTo(tx + S(12), y - S(64), x + S(20), y - S(40), x + S(17), y)
    g.closePath()
  }
  stem()
  fill(g, CAVE.stem)
  g.save()
  stem()
  g.clip()
  g.beginPath()
  g.rect(x + S(3), cy, S(40), y - cy + 4)
  fill(g, CAVE.stemShade)
  g.restore()
  stem()
  ink(g, lw * 0.8)
  // The gills under the rim.
  g.beginPath()
  g.ellipse(tx, cy + S(3), S(60), S(13), 0, 0, TAU)
  fill(g, t[1])
  ink(g, lw * 0.7)
  g.beginPath()
  for (let i = -3; i <= 3; i++) {
    g.moveTo(tx + i * S(14), cy + S(3))
    g.lineTo(tx + i * S(16), cy + S(12))
  }
  g.lineWidth = Math.max(1.5, lw * 0.4)
  g.strokeStyle = t[0]
  g.stroke()
  // The dome.
  const cap = (): void => {
    g.beginPath()
    g.moveTo(tx - S(74), cy)
    g.bezierCurveTo(tx - S(80), cy - S(74), tx + S(80), cy - S(74), tx + S(74), cy)
    g.quadraticCurveTo(tx, cy - S(10), tx - S(74), cy)
    g.closePath()
  }
  cap()
  fill(g, t[0])
  g.save()
  cap()
  g.clip()
  g.beginPath()
  g.ellipse(tx + S(40), cy + S(6), S(62), S(40), 0, 0, TAU)
  fill(g, t[1])
  g.beginPath()
  g.ellipse(tx - S(30), cy - S(42), S(22), S(9), -0.45, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  cap()
  ink(g, lw)
  g.beginPath()
  for (const [dx, dy, r] of SPOTS) {
    g.moveTo(tx + S(dx + r), cy + S(dy))
    g.arc(tx + S(dx), cy + S(dy), S(r), 0, TAU)
  }
  fill(g, t[2])
  ink(g, Math.max(1.6, lw * 0.45))
}
const SPOTS: readonly Lobe[] = [[-40, -22, 9], [-6, -40, 11], [30, -30, 8], [50, -12, 6], [-58, -8, 5], [10, -18, 6]]
/** Where a mushroom's spots sit (for their glow), world coords. */
export const shroomSpots = (x: number, y: number, s: number, lean = 0): Lobe[] =>
  SPOTS.map(([dx, dy, r]) => [x + (lean * 30 + dx) * s, y - 92 * s + dy * s, r * s] as const)

/* ------------------------------------------------------ lanterns & wood */

/** A lantern hanging from (x, y): brass cap, warm glass, a little flame. */
export const lantern = (g: G2D, x: number, y: number, s: number): void => {
  const S = (v: number): number => v * s
  g.beginPath()
  g.arc(x, y + S(4), S(5), 0, TAU)
  ink(g, 2.6)
  g.beginPath()
  g.roundRect(x - S(13), y + S(20), S(26), S(32), S(7))
  fill(g, CAVE.glass)
  ink(g, 3)
  g.beginPath()
  g.ellipse(x, y + S(40), S(5), S(8), 0, 0, TAU)
  fill(g, CAVE.flame)
  g.beginPath()
  g.moveTo(x - S(7), y + S(20))
  g.lineTo(x - S(7), y + S(52))
  g.moveTo(x + S(7), y + S(20))
  g.lineTo(x + S(7), y + S(52))
  g.lineWidth = 2
  g.strokeStyle = CAVE.brassShade
  g.stroke()
  g.beginPath()
  g.moveTo(x - S(17), y + S(22))
  g.quadraticCurveTo(x, y + S(2), x + S(17), y + S(22))
  g.closePath()
  fill(g, CAVE.brass)
  ink(g, 3)
  g.beginPath()
  g.roundRect(x - S(15), y + S(50), S(30), S(8), S(3))
  fill(g, CAVE.brass)
  ink(g, 3)
}

/** A wooden lantern post standing at (x, y), `h` tall, its arm toward `dir`;
 *  returns where the lantern hangs. */
export const lanternPost = (g: G2D, x: number, y: number, h: number, dir = 1, s = 1): Pt => {
  g.beginPath()
  g.roundRect(x - 6, y - h, 12, h, 5)
  fill(g, CAVE.wood)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(x, y - h + 8)
  g.lineTo(x + dir * 44, y - h + 8)
  g.lineWidth = 11
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = CAVE.wood
  g.stroke()
  const hx = x + dir * 38
  const hy = y - h + 10
  lantern(g, hx, hy, s)
  return [hx, hy + 40 * s]
}

/** A lantern's live glow (warm, breathing). Dark at rest. */
export const lanternGlow = (g: G2D, x: number, y: number, r: number, t: number, alive: number, ph = 0): void => {
  if (alive <= 0) return
  glow(g, x, y, r * (0.92 + 0.08 * sin(t * 2.4 + ph)), alive * (0.85 + 0.15 * sin(t * 3.1 + ph)))
}

/** A plank crate on (x, y), `w` square. */
export const crate = (g: G2D, x: number, y: number, w: number): void => {
  g.beginPath()
  g.roundRect(x - w / 2, y - w, w, w, 5)
  fill(g, CAVE.wood)
  ink(g, 4)
  g.beginPath()
  g.rect(x + w * 0.12, y - w + 3, w * 0.36, w - 6)
  g.globalAlpha = 0.35
  fill(g, CAVE.woodShade)
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(x - w / 2 + 6, y - w + 6)
  g.lineTo(x + w / 2 - 6, y - 6)
  g.moveTo(x - w / 2, y - w / 2)
  g.lineTo(x + w / 2, y - w / 2)
  ink(g, 2.6)
}

/** A barrel on (x, y) with candy hoops. */
export const barrel = (g: G2D, x: number, y: number, s: number, hoop = PINKC[0]): void => {
  const S = (v: number): number => v * s
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - S(26), y)
    g.quadraticCurveTo(x - S(37), y - S(38), x - S(26), y - S(76))
    g.lineTo(x + S(26), y - S(76))
    g.quadraticCurveTo(x + S(37), y - S(38), x + S(26), y)
    g.closePath()
  }
  body()
  fill(g, CAVE.wood)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + S(8), y - S(80), S(40), S(84))
  g.globalAlpha = 0.35
  fill(g, CAVE.woodShade)
  g.globalAlpha = 1
  g.beginPath()
  g.rect(x - S(40), y - S(22), S(80), S(9))
  g.rect(x - S(40), y - S(62), S(80), S(9))
  fill(g, hoop)
  g.restore()
  body()
  ink(g, 4)
  g.beginPath()
  g.ellipse(x, y - S(76), S(26), S(7), 0, 0, TAU)
  fill(g, CAVE.woodShade)
  ink(g, 3)
}

/* -------------------------------------------------------- rails & carts */

/** Offset polylines either side of the smooth curve through `pts`. */
const railSides = (pts: readonly Pt[], w: number): [Pt[], Pt[], readonly Pt[]] => {
  const s = samplesOf(pts)
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i < s.length; i++) {
    const [x, y] = s[i]!
    const [nx, ny] = s[Math.min(s.length - 1, i + 1)]!
    const [px, py] = s[Math.max(0, i - 1)]!
    const dx = nx - px
    const dy = ny - py
    const d = Math.hypot(dx, dy) || 1
    const ww = (w / 2) * (0.6 + 0.4 * (y / SEC_H))
    L.push([x + (dy / d) * ww, y - (dx / d) * ww])
    R.push([x - (dy / d) * ww, y + (dx / d) * ww])
  }
  return [L, R, s]
}

/** A little mine railway along `pts`: wooden sleepers, two candy rails. */
export const rails = (g: G2D, pts: readonly Pt[], w: number): void => {
  const [L, R] = railSides(pts, w)
  for (let i = 2; i < L.length - 1; i += 3) {
    const [ax, ay] = L[i]!
    const [bx, by] = R[i]!
    const ex = (bx - ax) * 0.18
    const ey = (by - ay) * 0.18
    g.beginPath()
    g.moveTo(ax - ex, ay - ey)
    g.lineTo(bx + ex, by + ey)
    g.lineWidth = 17
    g.strokeStyle = INK
    g.lineCap = 'round'
    g.stroke()
    g.lineWidth = 9
    g.strokeStyle = CAVE.wood
    g.stroke()
  }
  for (const side of [L, R]) {
    g.beginPath()
    for (let i = 0; i < side.length; i++) g.lineTo(side[i]![0], side[i]![1])
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.lineWidth = 12
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = 5
    g.strokeStyle = SAPPHIRE[2]
    g.stroke()
  }
}

/** A point `u` (0..1) of the way along the rail curve through `pts`, and its heading. */
export const railAt = (pts: readonly Pt[], u: number): readonly [number, number, number] => {
  const s = samplesOf(pts)
  const f = clamp(u, 0, 1) * (s.length - 1)
  const i = Math.min(s.length - 2, Math.floor(f))
  const k = f - i
  const [ax, ay] = s[i]!
  const [bx, by] = s[i + 1]!
  return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.atan2(by - ay, bx - ax)]
}

/** A mine cart standing on its rails at (x, y), scale `s`, tipped `a`; with
 *  `load`, heaped with gems; `spin` turns its wheels. */
/** The scale the mine rolls its cart at, and the rim width it gives. */
const CART_S = 0.58
const CART_UNIT = 136 * CART_S

/**
 * The cart's BODY and its gem load as a painted still.
 *
 * One panel, not two: both call sites load it, so a second "empty" panel would
 * be a generation spent on a cart nobody sees. An unloaded one keeps the
 * drawing.
 *
 * The WHEELS are a sheet of their own (`CART_WHEEL_ART`) because they turn
 * about their own pins inside the cart, so no transform of the whole cart can
 * carry them — the same reason a pinwheel is painted one blade at a time.
 *
 * `mineCart` is also called from 2-3's `paint()`, for the still cart the
 * chapter's creature hides behind. That is fine: a sector whose painting
 * exists never runs `paint()` at all, and one whose painting is missing is
 * better off with a painted cart in it. It only matters if a sector reference
 * is ever exported with the art layer forced on, which the bench never does.
 */
export const MINECART_ART: ItemSpec = {
  ...PROP_ART.mineCart, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / CART_UNIT, s / CART_UNIT)
    g.scale(CART_S, CART_S)
    cartBody(g, true, [accent.base, accent.shade, accent.lite], 5 / CART_S)
    g.restore()
  }
}

/** One cart wheel as a painted still: the disc, its spokes and its hub. The
 *  spin is the drawing's rotation, as it always was. */
export const CART_WHEEL_ART: ItemSpec = {
  ...PROP_ART.cartWheel, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 28, s / 28)
    cartWheel(g, 0, 4 / CART_S)
    g.restore()
  }
}

export const mineCart = (g: G2D, x: number, y: number, s: number, t: Tones, load = true, a = 0, spin = 0): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.scale(s, s)
  const w = 5 / s
  const painted = load && drawItem(g, MINECART_ART, 136, 0, t[0])
  if (painted) {
    for (const wx of [-32, 32]) {
      g.save()
      g.translate(wx, -10)
      g.rotate(spin)
      if (!drawItem(g, CART_WHEEL_ART, 28)) cartWheel(g, spin, w * 0.8)
      g.restore()
    }
    g.restore()
    return
  }
  cartBody(g, load, t, w)
  for (const wx of [-32, 32]) {
    g.save()
    g.translate(wx, -10)
    cartWheel(g, spin, w * 0.8)
    g.restore()
  }
  g.restore()
}

/** The cart's box, its rim and its gem load, in the cart's own units. */
const cartBody = (g: G2D, load: boolean, t: Tones, w: number): void => {
  if (load) {
    const G: readonly (readonly [number, number, number, number])[] = [
      [-40, -74, 13, 0], [-16, -82, 14, 2], [10, -84, 15, 1], [36, -76, 13, 3], [-28, -94, 12, 4], [0, -100, 14, 0], [24, -96, 12, 2]
    ]
    for (const [gx, gy, r, i] of G) gem(g, gx, gy, r, GEM_TONES[i]!, i & 1)
  }
  // No clips: a cart can roll every frame.
  g.beginPath()
  g.moveTo(-60, -78)
  g.lineTo(60, -78)
  g.lineTo(50, -22)
  g.quadraticCurveTo(48, -16, 42, -16)
  g.lineTo(-42, -16)
  g.quadraticCurveTo(-48, -16, -50, -22)
  g.closePath()
  fill(g, t[0])
  ink(g, w)
  g.beginPath()
  g.moveTo(20, -76)
  g.lineTo(57, -76)
  g.lineTo(48.5, -24)
  g.quadraticCurveTo(46.5, -18.5, 41, -18.5)
  g.lineTo(20, -18.5)
  g.closePath()
  fill(g, t[1])
  g.beginPath()
  g.roundRect(-68, -88, 136, 16, 6)
  fill(g, t[2])
  ink(g, w * 0.8)
  g.beginPath()
  for (const [rx, ry] of [[-38, -58], [-36, -32], [38, -58], [36, -32], [0, -58], [0, -32]] as const) {
    g.moveTo(rx + 3.5, ry)
    g.arc(rx, ry, 3.5, 0, TAU)
  }
  fill(g, INK)
}

/** One wheel about its own pin, spokes turned `spin`. */
const cartWheel = (g: G2D, spin: number, w: number): void => {
  g.beginPath()
  g.arc(0, 0, 14, 0, TAU)
  fill(g, SAPPHIRE[1])
  ink(g, w)
  g.beginPath()
  g.moveTo(cos(spin) * 9, sin(spin) * 9)
  g.lineTo(-cos(spin) * 9, -sin(spin) * 9)
  g.moveTo(cos(spin + PI / 2) * 9, sin(spin + PI / 2) * 9)
  g.lineTo(-cos(spin + PI / 2) * 9, -sin(spin + PI / 2) * 9)
  g.lineWidth = w * 0.6
  g.strokeStyle = SAPPHIRE[2]
  g.stroke()
  g.beginPath()
  g.arc(0, 0, 4, 0, TAU)
  fill(g, SAPPHIRE[2])
}

/* ------------------------------------------------------------------ water */

/** The underground lake from `y` down: pale at its far edge, candy blue near. */
export const caveLake = (g: G2D, y: number, seed: number): void => {
  const gr = g.createLinearGradient(0, y, 0, SEC_H)
  gr.addColorStop(0, CAVE.waterFar)
  gr.addColorStop(0.3, CAVE.water)
  gr.addColorStop(1, CAVE.waterDeep)
  g.fillStyle = gr
  g.fillRect(0, y, SEC_W, SEC_H - y)
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.fillRect(0, y - 1, SEC_W, 3)
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 22; i++) {
    const k = r() ** 1.3
    const yy = y + 14 + k * (SEC_H - y - 14)
    const x = r() * SEC_W
    const w = 10 + k * 34
    g.moveTo(x - w, yy)
    g.lineTo(x + w, yy)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.stroke()
}

/** Draw `fn`'s painting mirrored about the waterline `axis`, faint, clipped
 *  to the water box — a still lake's reflection. */
export const reflect = (g: G2D, axis: number, box: readonly [number, number, number, number], a: number, fn: () => void): void => {
  g.save()
  g.beginPath()
  g.rect(box[0], box[1], box[2], box[3])
  g.clip()
  g.globalAlpha = a
  g.translate(0, axis * 2)
  g.scale(1, -1)
  fn()
  g.restore()
  g.globalAlpha = 1
}

/** A glowing water-lily: a pad and a closed-bud lotus at (x, y). */
export const glowLily = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  g.beginPath()
  g.moveTo(x, y)
  g.ellipse(x, y, 34 * s, 11 * s, 0, 0.3, TAU - 0.2)
  g.closePath()
  fill(g, CAVE.moss)
  ink(g, 3)
  const P: readonly (readonly [number, number])[] = [[-0.55, 0.9], [0.55, 0.9], [0, 1.2]]
  for (const [a, k] of P) {
    g.save()
    g.translate(x, y - 4 * s)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(-11 * s, -14 * s * k, 0, -26 * s * k)
    g.quadraticCurveTo(11 * s, -14 * s * k, 0, 0)
    fill(g, a === 0 ? t[0] : t[2])
    ink(g, 2.6)
    g.restore()
  }
}

/** A little canoe afloat at (x, y) with a lantern on a crook. */
/** The scale the lake floats its canoe at, and the hull length it gives. */
const CANOE_S = 0.8
const CANOE_UNIT = 164 * CANOE_S

/**
 * The canoe's HULL as a painted still, tinted whole.
 *
 * Whole rather than in one region because a hull is three tones of one stain,
 * so a painting in neutral greys keeps its own waterline stripe and gunwale
 * when the lake's colour is multiplied through it — the crystal charm's trick.
 *
 * Its pole is a painted still of its own (`CANOE_POLE_ART`, 2026-09-24), and
 * the lantern on the pole's tip is the caves' own painted lantern, blitted
 * here.
 */
export const CANOE_ART: ItemSpec = {
  ...PROP_ART.canoe, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / CANOE_UNIT, s / CANOE_UNIT)
    canoeHull(g, 0, 0, CANOE_S, [accent.base, accent.shade, accent.lite])
    g.restore()
  }
}

/** The lantern pole's crook, from its foot in the hull up and over to the
 *  hook the lantern hangs from — about the canoe's own origin (x, y). */
const canoePoleShape = (g: G2D, x: number, y: number, s: number): void => {
  const S = (v: number): number => v * s
  g.beginPath()
  g.moveTo(x + S(30), y - S(12))
  g.quadraticCurveTo(x + S(34), y - S(96), x + S(58), y - S(96))
  g.lineWidth = 10
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 4.5
  g.strokeStyle = CAVE.wood
  g.stroke()
}

/** The pole's height at the lake's own scale — `drawItem`'s scale. */
const POLE_UNIT = 96 * CANOE_S

/**
 * 4-2's canoe POLE as a painted still — the bent wooden crook the lantern
 * hangs from. The hull's comment used to call it "a hairline with no body";
 * it is a 10-unit stroke round a 4.5-unit wooden core, laid raw (it never
 * went through `INK_SCALE`, so it inked heavier than the kit round it). One
 * constant shape carried by the canoe's bob: a still.
 */
export const CANOE_POLE_ART: ItemSpec = {
  ...PROP_ART.canoePole, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / POLE_UNIT, s / POLE_UNIT)
    canoePoleShape(g, 0, 0, CANOE_S)
    g.restore()
  }
}

export const canoe = (g: G2D, x: number, y: number, s: number, hull: Tones): void => {
  const S = (v: number): number => v * s
  g.save()
  g.translate(x, y)
  const poled = drawItem(g, CANOE_POLE_ART, 96 * s)
  g.restore()
  if (!poled) canoePoleShape(g, x, y, s)
  g.save()
  g.translate(x + S(62), y - S(98))
  if (!drawItem(g, CAVE_LANTERN_ART, 34 * s * 0.85)) lantern(g, 0, 0, s * 0.85)
  g.restore()
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, CANOE_ART, 164 * s, 0, hull[0])
  g.restore()
  if (!painted) canoeHull(g, x, y, s, hull)
}

/** The canoe's hull at (x, y), scale `s`, in `hull`'s three tones. */
const canoeHull = (g: G2D, x: number, y: number, s: number, hull: Tones): void => {
  const S = (v: number): number => v * s
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - S(80), y - S(24))
    g.quadraticCurveTo(x, y - S(12), x + S(84), y - S(26))
    g.bezierCurveTo(x + S(70), y + S(6), x + S(40), y + S(10), x, y + S(10))
    g.bezierCurveTo(x - S(40), y + S(10), x - S(66), y + S(6), x - S(80), y - S(24))
    g.closePath()
  }
  body()
  fill(g, hull[0])
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x - S(90), y - S(6), S(180), S(4))
  g.rect(x - S(90), y + S(2), S(180), S(20))
  fill(g, hull[1])
  g.beginPath()
  g.moveTo(x - S(80), y - S(20))
  g.quadraticCurveTo(x, y - S(8), x + S(84), y - S(22))
  g.lineWidth = S(5)
  g.strokeStyle = hull[2]
  g.stroke()
  g.restore()
  body()
  ink(g, 4)
}

/* --------------------------------------------------------- landmarks */

/** A giant glow mushroom — Glowshroom Grotto's landmark caps, in `pot`. */
export const giantShroom = (g: G2D, x: number, y: number, s: number, pot: Pot, lean = 0): void =>
  shroom(g, x, y, s, [pot.base, pot.shade, pot.lite], lean, 6)

/** Where a mine mouth's tunnel lamp glows (see `mineMouth`). */
export const mineLampOf = (x: number, y: number, w: number): Pt => [x, y - w * 0.92 + 18 + 36]

/** The mine's entrance built into the rock at (x, y) (the rails' mouth),
 *  `w` wide: timber frame, a lantern-lit tunnel, and a little gable ROOF over
 *  it — the landmark, in `pot` — with a gem sign and a tunnel lamp. */
export const mineMouth = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.92
  const top = y - h
  // The tunnel: a warm lamp-lit violet, never a black hole.
  const hole = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 + 14, y)
    g.lineTo(x - w / 2 + 14, top + w * 0.36)
    g.quadraticCurveTo(x - w / 2 + 14, top + 14, x, top + 14)
    g.quadraticCurveTo(x + w / 2 - 14, top + 14, x + w / 2 - 14, top + w * 0.36)
    g.lineTo(x + w / 2 - 14, y)
    g.closePath()
  }
  hole()
  const gr = g.createRadialGradient(x, y - h * 0.45, 8, x, y - h * 0.45, w * 0.7)
  gr.addColorStop(0, '#ffe3a8')
  gr.addColorStop(0.35, '#d99cf0')
  gr.addColorStop(1, '#8f6fe0')
  g.fillStyle = gr
  g.fill()
  g.save()
  hole()
  g.clip()
  // Two far timber rings deeper in the tunnel.
  for (const k of [0.62, 0.42]) {
    g.beginPath()
    g.rect(x - w * k * 0.4, y - h * k * 0.9 - 10, w * k * 0.8, h * k * 0.9 + 10)
    g.lineWidth = 8 * k
    g.strokeStyle = CAVE.woodShade
    g.stroke()
  }
  g.restore()
  hole()
  ink(g)
  // Posts and a lintel.
  g.beginPath()
  g.roundRect(x - w / 2 - 6, top + 10, 26, h - 10, 5)
  g.roundRect(x + w / 2 - 20, top + 10, 26, h - 10, 5)
  fill(g, CAVE.wood)
  ink(g, 4)
  g.beginPath()
  g.rect(x - w / 2 + 12, top + 14, 8, h - 20)
  g.rect(x + w / 2 - 2, top + 14, 8, h - 20)
  fill(g, CAVE.woodShade)
  g.beginPath()
  g.roundRect(x - w / 2 - 22, top - 4, w + 44, 26, 6)
  fill(g, CAVE.wood)
  ink(g, 4)
  // The gable roof.
  const k = w / 200
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 - 44 * k, top + 6)
    g.quadraticCurveTo(x - 30 * k, top - 104 * k, x, top - 116 * k)
    g.quadraticCurveTo(x + 30 * k, top - 104 * k, x + w / 2 + 44 * k, top + 6)
    g.quadraticCurveTo(x, top - 12 * k, x - w / 2 - 44 * k, top + 6)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.moveTo(x + 8 * k, top - 130 * k)
  g.lineTo(x + w, top - 130 * k)
  g.lineTo(x + w, top + 20)
  g.lineTo(x + 40 * k, top + 20)
  g.closePath()
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (let row = 0; row < 4; row++) {
    const yy = top - 76 * k + row * 24 * k
    g.beginPath()
    for (let xx = x - w / 2 - 40 * k; xx < x + w / 2 + 40 * k; xx += 24 * k) g.arc(xx, yy, 12 * k, 0, PI)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(x - 40 * k, top - 62 * k, 26 * k, 8 * k, -0.55, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // The sign: a plank with a big gem.
  g.beginPath()
  g.roundRect(x - 46 * k, top - 58 * k, 92 * k, 46 * k, 8 * k)
  fill(g, CAVE.wood)
  ink(g, 4)
  gem(g, x, top - 36 * k, 17 * k, [pot.lite, pot.shade, '#ffffff'])
  // The tunnel lamp.
  lantern(g, x, top + 18, 0.9)
}

/** Where a bridge house's two eave lanterns hang (see `bridgeHouse`). */
export const bridgeEaves = (x0: number, x1: number, y: number): readonly Pt[] => {
  const cx = (x0 + x1) / 2
  const rw = (x1 - x0) * 0.3 + 40
  const wallTop = y + 18 - 112
  return [[cx - rw + 16, wallTop + 12], [cx + rw - 16, wallTop + 12]]
}

/** The lantern bridge house over a chasm: a plank deck from x0 to x1 at `y`,
 *  rope rails, and in the middle a little house whose ROOF is the landmark. */
export const bridgeHouse = (g: G2D, x0: number, x1: number, y: number, pot: Pot): void => {
  const cx = (x0 + x1) / 2
  const sag = 18
  const deckY = (x: number): number => y + sag * (1 - ((x - cx) / ((x1 - x0) / 2)) ** 2)
  // Rope rails behind.
  g.beginPath()
  g.moveTo(x0, y - 62)
  g.quadraticCurveTo(cx, y - 62 + sag * 2, x1, y - 62)
  ink(g, 3.5)
  // The deck: planks.
  g.beginPath()
  g.moveTo(x0, y)
  g.quadraticCurveTo(cx, y + sag * 2, x1, y)
  g.lineTo(x1, y + 20)
  g.quadraticCurveTo(cx, y + sag * 2 + 20, x0, y + 20)
  g.closePath()
  fill(g, CAVE.wood)
  ink(g)
  g.beginPath()
  for (let x = x0 + 22; x < x1 - 10; x += 22) {
    const dy = deckY(x)
    g.moveTo(x, dy + 2)
    g.lineTo(x, dy + 18)
  }
  g.lineWidth = 2.4
  g.strokeStyle = CAVE.woodShade
  g.stroke()
  // Rope posts along the deck.
  g.beginPath()
  for (let x = x0 + 8; x <= x1 - 8; x += (x1 - x0 - 16) / 8) {
    const dy = deckY(x)
    g.moveTo(x, dy)
    g.lineTo(x, y - 62 + sag * 2 * (1 - ((x - cx) / ((x1 - x0) / 2)) ** 2) * 0.5)
  }
  ink(g, 3)
  // The house.
  const hw = (x1 - x0) * 0.3
  const wallTop = deckY(cx) - 112
  const floorY = deckY(cx) + 4
  g.beginPath()
  g.roundRect(cx - hw, wallTop, hw * 2, floorY - wallTop, 8)
  fill(g, '#fff1dc')
  g.save()
  g.clip()
  g.beginPath()
  g.rect(cx + hw * 0.35, wallTop, hw, floorY - wallTop)
  fill(g, '#f5d6c6')
  // Timber beams.
  g.beginPath()
  g.rect(cx - hw, wallTop + 30, hw * 2, 8)
  g.rect(cx - hw * 0.08 - 4, wallTop, 8, floorY - wallTop)
  fill(g, CAVE.woodShade)
  g.restore()
  g.beginPath()
  g.roundRect(cx - hw, wallTop, hw * 2, floorY - wallTop, 8)
  ink(g)
  // Warm round windows either side of a door.
  const wins: Pt[] = [[cx - hw * 0.58, wallTop + 66], [cx + hw * 0.58, wallTop + 66]]
  g.beginPath()
  for (const [wx, wy] of wins) {
    g.moveTo(wx + 20, wy)
    g.arc(wx, wy, 20, 0, TAU)
  }
  fill(g, CAVE.glass)
  ink(g, 4)
  g.beginPath()
  for (const [wx, wy] of wins) {
    g.moveTo(wx, wy - 20)
    g.lineTo(wx, wy + 20)
    g.moveTo(wx - 20, wy)
    g.lineTo(wx + 20, wy)
  }
  ink(g, 2.6)
  g.beginPath()
  g.roundRect(cx - 20, floorY - 60, 40, 60, [20, 20, 2, 2])
  fill(g, pot.shade)
  ink(g, 4)
  g.beginPath()
  g.arc(cx + 10, floorY - 30, 3.5, 0, TAU)
  fill(g, INK)
  // The roof.
  const rw = hw + 40
  const roof = (): void => {
    g.beginPath()
    g.moveTo(cx - rw, wallTop + 16)
    g.quadraticCurveTo(cx - rw * 0.3, wallTop - 110, cx, wallTop - 124)
    g.quadraticCurveTo(cx + rw * 0.3, wallTop - 110, cx + rw, wallTop + 16)
    g.quadraticCurveTo(cx, wallTop - 6, cx - rw, wallTop + 16)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(cx + 10, wallTop - 140, rw + 20, 170)
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (let row = 0; row < 4; row++) {
    const yy = wallTop - 76 + row * 24
    g.beginPath()
    for (let xx = cx - rw; xx < cx + rw + 20; xx += 24) g.arc(xx, yy, 12, 0, PI)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(cx - rw * 0.42, wallTop - 50, 28, 9, -0.55, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // A crystal finial on the ridge.
  crystal(g, cx, wallTop - 118, 20, 44, 0, [pot.lite, pot.shade, '#ffffff'], 3.5)
  // Front rope rail.
  g.beginPath()
  g.moveTo(x0, y - 34)
  g.quadraticCurveTo(cx, y - 34 + sag * 2, x1, y - 34)
  g.lineWidth = 9
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 4
  g.strokeStyle = '#ffe3b0'
  g.stroke()
}

/** Terra's giant open geode centred (x, y), rx × ry: agate bands round the
 *  rim, crystals lining it pointing in, a glowing heart — all the landmark. */
export const geode = (g: G2D, x: number, y: number, rx: number, ry: number, pot: Pot, seed: number): void => {
  const T: Tones = [pot.base, pot.shade, pot.lite]
  // The rough outer shell.
  const shell = (): void => {
    g.beginPath()
    const n = 28
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU
      const k = 1 + 0.035 * sin(a * 7 + seed)
      const px = x + cos(a) * (rx + 44) * k
      const py = y + sin(a) * (ry + 40) * k
      if (i) g.lineTo(px, py)
      else g.moveTo(px, py)
    }
    g.closePath()
  }
  caveRock(g, shell, [x - rx - 40, y - ry - 40, rx * 2 + 80, ry * 2 + 80], seed, [30, 24], undefined, 0.5)
  // Agate bands: candy rings stepping in.
  const bands: readonly (readonly [number, string])[] = [[34, '#ffc6e2'], [24, '#fff1dc'], [14, pot.lite]]
  for (const [d, col] of bands) {
    g.beginPath()
    g.ellipse(x, y, rx + d, ry + d, 0, 0, TAU)
    fill(g, col)
    ink(g, 3)
  }
  // The hollow: a glow deep inside (a glow is allowed its gradient).
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  const gr = g.createRadialGradient(x, y + ry * 0.1, 10, x, y, Math.max(rx, ry))
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(0.45, pot.lite)
  gr.addColorStop(1, pot.base)
  g.fillStyle = gr
  g.fill()
  ink(g, 4)
  // A druzy lining: short crystals packed round the hollow, leaning in —
  // a sparkly crust, never a ring of long spikes.
  g.save()
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  g.clip()
  const r = seeded(seed)
  const L: Tones = [pot.lite, pot.base, '#ffffff']
  for (const [k, n, h0, hv] of [[1.03, 46, 46, 24], [0.93, 40, 38, 20], [0.85, 32, 30, 16]] as const) {
    for (let i = 0; i < n; i++) {
      const a = ((i + r() * 0.7) / n) * TAU
      if (sin(a) > 0.66) continue
      const bx = x + cos(a) * rx * k
      const by = y + sin(a) * ry * k
      const lean = Math.atan2(-cos(a), sin(a)) + (r() - 0.5) * 0.7
      const h = h0 + r() * hv
      crystal(g, bx, by, h * 0.56, h, lean, i % 4 === 0 ? L : T, 3.5)
    }
  }
  g.restore()
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  ink(g, 5)
}

/** Terra's crystal throne standing at (x, y): an amber seat, a crown of
 *  crystals along its back, a rose cushion and her earth-square emblem. */
export const throne = (g: G2D, x: number, y: number, s: number): void => {
  const S = (v: number): number => v * s
  // The back: a tall rounded slab crowned with crystals.
  for (const [dx, w, h, a] of [[-70, 30, 90, -0.35], [70, 30, 90, 0.35], [-38, 34, 128, -0.14], [38, 34, 128, 0.14], [0, 42, 162, 0]] as const) {
    crystal(g, x + S(dx), y - S(150), S(w), S(h), a, AMBER, 4.5)
  }
  const back = (): void => {
    g.beginPath()
    g.moveTo(x - S(92), y - S(46))
    g.lineTo(x - S(92), y - S(150))
    g.quadraticCurveTo(x - S(92), y - S(196), x, y - S(200))
    g.quadraticCurveTo(x + S(92), y - S(196), x + S(92), y - S(150))
    g.lineTo(x + S(92), y - S(46))
    g.closePath()
  }
  back()
  fill(g, AMBER[0])
  g.save()
  back()
  g.clip()
  g.beginPath()
  g.rect(x + S(30), y - S(210), S(80), S(170))
  fill(g, AMBER[1])
  g.beginPath()
  g.ellipse(x - S(44), y - S(160), S(22), S(8), -0.5, 0, TAU)
  fill(g, AMBER[2])
  g.restore()
  back()
  ink(g)
  // Terra's emblem: the earth rune's rounded square, a leaf inside.
  g.beginPath()
  g.roundRect(x - S(30), y - S(150), S(60), S(60), S(14))
  fill(g, '#eed0a6')
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - S(14), y - S(106))
  g.quadraticCurveTo(x - S(16), y - S(136), x + S(14), y - S(136))
  g.quadraticCurveTo(x + S(16), y - S(106), x - S(14), y - S(106))
  fill(g, '#6ee84a')
  ink(g, 3)
  // Seat and cushion.
  g.beginPath()
  g.roundRect(x - S(110), y - S(56), S(220), S(56), S(14))
  fill(g, AMBER[0])
  ink(g)
  g.beginPath()
  g.rect(x + S(40), y - S(52), S(66), S(50))
  g.globalAlpha = 0.5
  fill(g, AMBER[1])
  g.globalAlpha = 1
  g.beginPath()
  g.roundRect(x - S(82), y - S(76), S(164), S(30), S(15))
  fill(g, PINKC[0])
  ink(g, 4)
  g.beginPath()
  g.ellipse(x - S(40), y - S(68), S(22), S(6), 0, 0, TAU)
  fill(g, PINKC[2])
  // Armrests: round-topped with a gem each.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.roundRect(x + d * S(110) - S(22), y - S(96), S(44), S(96), S(18))
    fill(g, AMBER[0])
    ink(g)
    gem(g, x + d * S(110), y - S(74), S(13), d < 0 ? AQUA : PINKC, 1)
  }
}

/* ------------------------------------------------------------ live props */

/** Glow spores drifting up out of a box — a live prop (none at rest). */
export const spores = (g: G2D, x: number, y: number, w: number, h: number, t: number, alive: number, col = '#eafff8', n = 7): void => {
  if (alive <= 0) return
  for (let i = 0; i < n; i++) {
    const k = (t * 0.09 + i / n) % 1
    const px = x + ((i * 0.618) % 1) * w + sin(t * 0.8 + i * 2) * 14
    const py = y + h - k * h
    const a = alive * sin(k * PI)
    g.globalAlpha = a
    if (moteAt(g, px, py, 9, col)) continue
    g.globalAlpha = a * 0.35
    disc(g, px, py, 9, col)
    g.globalAlpha = a
    disc(g, px, py, 3.2, '#ffffff')
  }
  g.globalAlpha = 1
}

/** A drop falling from a stalactite tip at (x, y0) to the water at y1,
 *  and the ring it makes — a live prop. */
export const drip = (g: G2D, x: number, y0: number, y1: number, t: number, alive: number, period = 3.2, ph = 0): void => {
  if (alive <= 0) return
  const u = ((t + ph) % period) / period
  g.globalAlpha = alive
  if (u < 0.45) {
    const k = u / 0.45
    const y = y0 + (y1 - y0) * k * k
    g.beginPath()
    g.moveTo(x, y - 9)
    g.quadraticCurveTo(x + 6, y + 2, x, y + 5)
    g.quadraticCurveTo(x - 6, y + 2, x, y - 9)
    fill(g, CAVE.waterLite)
    ink(g, 2)
  } else if (u < 0.95) {
    const k = (u - 0.45) / 0.5
    g.globalAlpha = alive * (1 - k)
    g.beginPath()
    g.ellipse(x, y1, 8 + k * 46, 3 + k * 11, 0, 0, TAU)
    g.lineWidth = 3
    g.strokeStyle = '#ffffff'
    g.stroke()
  }
  g.globalAlpha = 1
}

/** Glints gliding along still water — a live prop. */
export const shimmer = (g: G2D, pts: readonly Pt[], t: number, alive: number): void => {
  if (alive <= 0) return
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const k = sin(t * 1.3 + i * 1.7)
    const w = 10 + 18 * Math.max(0, k)
    const dx = sin(t * 0.5 + i) * 10
    g.moveTo(x - w + dx, y)
    g.lineTo(x + w + dx, y)
  }
  g.globalAlpha = alive * 0.85
  g.lineWidth = 3.5
  g.lineCap = 'round'
  g.strokeStyle = '#ffffff'
  g.stroke()
  g.globalAlpha = 1
}

/** The scale the caves hang their lanterns at, and the width it gives — what
 *  the reference's line weight is judged against. */
const CAVE_LANTERN_S = 0.62
const CAVE_LANTERN_UNIT = 34 * CAVE_LANTERN_S

/**
 * The caves' brass lantern as a painted still.
 *
 * The seam is in `swingLantern`, the LIVE prop, and not in `lantern` itself —
 * the posts along the bridge and the mine are drawn by `paint()`, and a
 * painting blitted inside a sector's reference is a painting of a painting.
 * Its swing, its sag along the string and its warm halo all stay drawn.
 */
export const CAVE_LANTERN_ART: ItemSpec = {
  ...PROP_ART.caveLantern, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / CAVE_LANTERN_UNIT, s / CAVE_LANTERN_UNIT)
    lantern(g, 0, 0, CAVE_LANTERN_S)
    g.restore()
  }
}

/** A lantern swinging gently on its hook at (x, y) — a live prop; still at rest. */
export const swingLantern = (g: G2D, x: number, y: number, s: number, t: number, alive: number, ph = 0): void => {
  const a = alive > 0 ? sin(t * 1.6 + ph) * 0.12 * alive : 0
  if (alive > 0) lanternGlow(g, x - sin(a) * 36 * s, y + cos(a) * 36 * s, 46 * s, t, alive, ph)
  g.save()
  g.translate(x, y)
  g.rotate(a)
  if (!drawItem(g, CAVE_LANTERN_ART, 34 * s)) lantern(g, 0, 0, s)
  g.restore()
}

/** A string of lanterns hung from (x0, y0) to (x1, y1), sagging `sag` — a
 *  live prop: they sway and glow once restored. */
export const lanternString = (
  g: G2D, x0: number, y0: number, x1: number, y1: number, sag: number, n: number, t: number, alive: number
): void => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + sag
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx, my, x1, y1)
  ink(g, 2.6)
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1)
    const px = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * mx + u * u * x1
    const py = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * my + u * u * y1
    swingLantern(g, px, py, 0.62, t, alive, i * 1.3)
  }
}

/* ------------------------------------------------------------ the glowworm */

const WORM = { body: '#c8f77a', shade: '#93d65a', belly: '#f3ffcf', bulb: '#fff27a', iris: '#7a4fd1', blush: '#ff9eb5' }

/**
 * The chapter's glowworm (the tap creature): a chubby lime worm, neck at
 * (x, y) rising up, head as big as its body (chibi), two antennae ending in
 * glowing bulbs. `eye` 0 closed → 1 open; `lit` 0..1 brightens its bulbs.
 */
export const glowworm = (g: G2D, x: number, y: number, s: number, dir: number, eye: number, lit: number, t: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const painted = drawItem(g, WORM_ART, WORM_UNIT * s, eye > 0.5 ? 1 : 0)
  g.restore()
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  // The bulbs' HALO is a wash with no silhouette, so it is never painted —
  // it goes over the painting, at the still bulbs' own places (`art-roadmap`
  // §4b). The wiggle goes with the drawing; a painted worm is a still.
  if (painted) {
    if (lit > 0) for (const [bx, by] of WORM_BULBS) glow(g, bx, by, 26, lit, '#fff6a0')
  } else {
    wormShape(g, s, eye, lit, t)
  }
  g.restore()
}

/** Bulb tip (-142) to the foot of the body (+9) at scale 1. */
const WORM_UNIT = 151
/** Where the two bulbs sit when the worm is still — the halo's anchors. */
const WORM_BULBS: readonly Pt[] = [[-10, -134], [26, -130]]

/**
 * The glowworm's two moments (`CREATURE_ART.glowworm`): asleep in the dark,
 * then blinking awake. One look, so nothing is tinted; the bulbs' halo and
 * the crystal facet it lights stay drawn over the painting.
 */
export const WORM_ART: ItemSpec = {
  ...CREATURE_ART.glowworm, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / WORM_UNIT
    g.save()
    g.scale(k, k)
    wormShape(g, 1, f, 0, 0)
    g.restore()
  }
}

/** The worm itself, its foot at the origin, facing +x, in its own units. */
const wormShape = (g: G2D, s: number, eye: number, lit: number, t: number): void => {
  const w = 5 / s
  const wig = sin(t * 7) * 3 * lit
  // Body segments.
  lumpy(g, [[-6, -10, 19], [0 + wig * 0.5, -40, 21]], WORM.body, w)
  g.beginPath()
  g.ellipse(8, -10, 8, 13, 0, 0, TAU)
  g.moveTo(16 + wig * 0.5, -40)
  g.ellipse(8 + wig * 0.5, -40, 8, 14, 0, 0, TAU)
  fill(g, WORM.belly)
  g.beginPath()
  g.arc(-12, -8, 12, PI * 0.6, PI * 1.3)
  g.moveTo(-16 + wig * 0.5, -44)
  g.arc(-6 + wig * 0.5, -40, 13, PI * 0.7, PI * 1.25)
  g.lineWidth = 4
  g.strokeStyle = WORM.shade
  g.stroke()
  // Antennae and their bulbs.
  const hx = 6 + wig
  const hy = -84
  const bulbs: readonly Pt[] = [[hx - 16 + wig, hy - 50], [hx + 20 + wig, hy - 46]]
  g.beginPath()
  g.moveTo(hx - 8, hy - 24)
  g.quadraticCurveTo(hx - 16, hy - 36, bulbs[0]![0], bulbs[0]![1])
  g.moveTo(hx + 10, hy - 24)
  g.quadraticCurveTo(hx + 18, hy - 34, bulbs[1]![0], bulbs[1]![1])
  ink(g, 3 / s)
  if (lit > 0) for (const [bx, by] of bulbs) glow(g, bx, by, 26, lit, '#fff6a0')
  for (const [bx, by] of bulbs) {
    g.beginPath()
    g.arc(bx, by, 8, 0, TAU)
    fill(g, WORM.bulb)
    ink(g, 2.6 / s)
  }
  // The head.
  g.beginPath()
  g.arc(hx, hy, 30, 0, TAU)
  fill(g, WORM.body)
  ink(g, w)
  g.save()
  g.beginPath()
  g.arc(hx, hy, 30, 0, TAU)
  g.clip()
  g.beginPath()
  g.arc(hx + 12, hy + 16, 28, 0, TAU)
  fill(g, WORM.shade)
  g.beginPath()
  g.arc(hx + 6, hy + 8, 26, 0, TAU)
  fill(g, WORM.body)
  g.beginPath()
  g.ellipse(hx - 13, hy - 17, 9, 5, -0.5, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  // Face: two big eyes, a smile, blush.
  for (const ex of [hx - 5, hx + 17]) {
    if (eye > 0.15) {
      g.beginPath()
      g.ellipse(ex, hy - 2, 7, 9 * eye, 0, 0, TAU)
      fill(g, INK)
      g.beginPath()
      g.ellipse(ex + 0.5, hy, 4.6, 6 * eye, 0, 0, TAU)
      fill(g, WORM.iris)
      g.beginPath()
      g.arc(ex - 2, hy - 5 * eye, 2.6, 0, TAU)
      g.moveTo(ex + 3.4, hy + 3 * eye)
      g.arc(ex + 2.2, hy + 3 * eye, 1.2, 0, TAU)
      fill(g, '#ffffff')
    } else {
      g.beginPath()
      g.arc(ex, hy - 4, 6, PI * 0.15, PI * 0.85)
      ink(g, 2.4 / s)
    }
  }
  g.beginPath()
  g.arc(hx + 6, hy + 10, 6, PI * 0.15, PI * 0.85)
  ink(g, 2.4 / s)
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(hx - 14, hy + 10, 6, 3.6, 0, 0, TAU)
  g.moveTo(hx + 32, hy + 10)
  g.ellipse(hx + 26, hy + 10, 6, 3.6, 0, 0, TAU)
  fill(g, WORM.blush)
  g.globalAlpha = 1
}

/** A crystal facet lit up by the glowworm: bright, haloed, twinkling. */
export const facetLight = (g: G2D, c: CrystalGeom, a: number, t: number): void => {
  if (a <= 0) return
  const [x, y, , h, ang] = c
  const [cx, cy] = at(x, y, ang, 0, -h * 0.55)
  glow(g, cx, cy, h * 0.95, a, '#fff6c8')
  // The lit FACET is a vector copy of a crystal face — the painted sector
  // already has the crystal, so over a painting only its light is laid on it
  // (B14): the glow above and the twinkle below.
  if (!coverLayerLive()) {
    g.globalAlpha = a * 0.92
    facetPath(g, c)
    fill(g, '#fffbe6')
  }
  g.globalAlpha = a
  const [tx, ty] = at(x, y, ang, 0, -h)
  const r = 15 * (0.75 + 0.25 * sin(t * 9))
  g.beginPath()
  twinkleAt(g, tx, ty, r, '#ffffff')
  fill(g, '#ffffff')
  g.globalAlpha = 1
}

/** Where and how a glowworm peeks: its neck when out at (x, y), facing
 *  `dir`, scale `s`; `ground` clips it (nothing below shows); `rise` how
 *  far down it hides; `facet` the crystal it lights up. */
export interface WormSpot { x: number; y: number; dir: number; s: number; ground: number; rise: number; facet: CrystalGeom }

/**
 * The tap creature (§8.8 beat 2): the glowworm rises from behind its cover
 * (whose FRONT `cover` redraws on top, so k = 0 is the prop alone), blinks
 * awake, wiggles, and a facet of the nearby crystal lights up.
 */
export const wormTap = (p: WormSpot, cover: (g: G2D) => void, r = 70): TapCreature => ({
  x: p.x,
  y: p.y - 70 * p.s,
  r,
  draw: (g, k, t) => {
    const e = ease(clamp(k, 0, 1))
    if (e > 0.001) {
      g.save()
      g.beginPath()
      g.rect(p.x - 260, p.ground - 520, 520, 520)
      g.clip()
      glowworm(g, p.x + p.dir * 4 * e, p.y + (1 - e) * p.rise, p.s, p.dir, clamp(k * 2.4 - 0.5, 0, 1), e, t)
      g.restore()
    }
    tapCover(g, cover)
    facetLight(g, p.facet, clamp(k * 1.6 - 0.3, 0, 1), t)
  }
})

/* ------------------------------------------------- the Shard of Clear Light */

const RAINBOW = ['#ff9ecf', '#ffb36b', '#ffe08a', '#9ff0d0', '#9fd8ff', '#c7a6ff'] as const
const CLOUDY: Tones = ['#c9c2e4', '#a79fcc', '#e2def2']
const CLEAR: Tones = ['#dff6ff', '#9fd4ff', '#ffffff']

/** The shard's own height in SU at scale 1 — what the SIZE clause is judged by. */
const CLEAR_SHARD_UNIT = 128

/**
 * The Shard of Clear Light, asleep and awake (`CREATURE_ART.clearShard`). The
 * rainbow it throws across the floor and its halo are light and stay drawn;
 * the sleep-Z and the sparks are the shared `prop-sleep-z` and
 * `prop-twinkle`, and the ROCK it nests in is `prop-rock-nest` (the sector
 * never drew it — 2026-09-24). What is painted here is the crystal and the
 * little face on it.
 */
export const CLEAR_SHARD_ART: ItemSpec = {
  ...CREATURE_ART.clearShard, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / CLEAR_SHARD_UNIT
    g.save()
    g.scale(k, k)
    clearShardShape(g, 1, 54, 128, f, f)
    g.restore()
  }
}

/** The shard itself, upright, its foot at the origin, in its own units. */
const clearShardShape = (g: G2D, s: number, W: number, H: number, e: number, k: number): void => {
  const S = (v: number): number => v * s
  const tones: Tones = [mix(CLOUDY[0], CLEAR[0], e), mix(CLOUDY[1], CLEAR[1], e), mix(CLOUDY[2], CLEAR[2], e)]
  crystal(g, 0, 0, W, H, 0, tones, 5)
  if (e > 0.05) {
    // A rainbow sheen inside it.
    g.save()
    g.globalAlpha = 0.55 * e
    g.beginPath()
    g.moveTo(-W * 0.2, -H * 0.18)
    g.lineTo(W * 0.22, -H * 0.36)
    g.lineWidth = S(6)
    g.lineCap = 'round'
    g.strokeStyle = '#ffc6e2'
    g.stroke()
    g.beginPath()
    g.moveTo(-W * 0.2, -H * 0.08)
    g.lineTo(W * 0.22, -H * 0.26)
    g.strokeStyle = '#b8fbe9'
    g.stroke()
    g.globalAlpha = 1
    g.restore()
  }
  // Its face on the middle facet.
  const fy = -H * 0.5
  if (k < 0.5) {
    g.beginPath()
    g.arc(-S(10), fy, S(5.5), PI * 0.15, PI * 0.85)
    g.moveTo(S(15.5), fy + S(2.4))
    g.arc(S(10), fy, S(5.5), PI * 0.15, PI * 0.85)
    ink(g, 2.6)
    g.beginPath()
    g.arc(0, fy + S(14), S(3.4), 0.2, PI - 0.2)
    ink(g, 2.2)
  } else {
    for (const ex of [-S(10), S(10)]) {
      g.beginPath()
      g.ellipse(ex, fy, S(5.5), S(7.5), 0, 0, TAU)
      fill(g, INK)
      g.beginPath()
      g.arc(ex - S(1.8), fy - S(2.6), S(2.2), 0, TAU)
      fill(g, '#ffffff')
    }
    g.beginPath()
    g.arc(0, fy + S(10), S(6), 0.25, PI - 0.25)
    fill(g, '#ff8fb0')
    ink(g, 2.4)
  }
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(-S(17), fy + S(10), S(5), S(3), 0, 0, TAU)
  g.moveTo(S(22), fy + S(10))
  g.ellipse(S(17), fy + S(10), S(5), S(3), 0, 0, TAU)
  fill(g, '#ff9eb5')
  g.globalAlpha = 1
}

/* ── the Shard's rock nest (4-3) ────────────────────────────────────── */

/** The nest's back: the dark top of the hollow the shard sits in. */
const rockNestBack = (g: G2D, x: number, y: number, S: (v: number) => number): void => {
  g.beginPath()
  g.ellipse(x, y - S(12), S(74), S(28), 0, PI, TAU)
  fill(g, CAVE.rockShade)
  ink(g, 4)
}

/** The path of the nest's front lip, wrapped round the shard's foot. */
const rockNestLip = (g: G2D, x: number, y: number, S: (v: number) => number): void => {
  g.beginPath()
  g.moveTo(x - S(80), y)
  g.bezierCurveTo(x - S(84), y - S(36), x - S(40), y - S(44), x - S(20), y - S(30))
  g.quadraticCurveTo(x, y - S(22), x + S(20), y - S(30))
  g.bezierCurveTo(x + S(40), y - S(44), x + S(84), y - S(36), x + S(80), y)
  g.closePath()
}

/** The nest's front lip, filled, shaded and inked. */
const rockNestFront = (g: G2D, x: number, y: number, S: (v: number) => number): void => {
  rockNestLip(g, x, y, S)
  fill(g, CAVE.rock)
  g.save()
  rockNestLip(g, x, y, S)
  g.clip()
  g.beginPath()
  g.ellipse(x + S(40), y + S(4), S(56), S(22), 0, 0, TAU)
  fill(g, CAVE.rockShade)
  g.restore()
  rockNestLip(g, x, y, S)
  ink(g, 5)
}

/** The nest's width at scale 1, lip tip to lip tip. */
const NEST_UNIT = 160

/**
 * 4-3's ROCK NEST as a painted still — the hollow the Shard of Clear Light
 * sleeps curled in, and stands up out of. `CLEAR_SHARD_ART`'s note that the
 * rock "belongs to the sector" was wrong: the sector never drew it, the rescue
 * did, so it sat vector on the painted cave floor for the whole wipe and for
 * good after it. Its back and its lip are one painting: the whole nest goes
 * down behind the shard and the lip is blitted again in front of it, clipped
 * to the lip's drawn outline.
 */
export const ROCK_NEST_ART: ItemSpec = {
  ...PROP_ART.rockNest, frames: 1,
  draw: (g, sz) => {
    const k = sz / NEST_UNIT
    const S = (v: number): number => v
    g.save()
    g.scale(k, k)
    rockNestBack(g, 0, 0, S)
    rockNestFront(g, 0, 0, S)
    g.restore()
  }
}

/**
 * The Shard of Clear Light, the chapter's rescue (§8.8 beat 3): a prism
 * shard nesting in a rock at (x, y). k = 0: curled down into the rock, dim
 * and cloudy, asleep; k = 1: standing up out of it, clear and glowing,
 * throwing a little rainbow across the floor.
 */
export const clearShard = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const e = ease(clamp(k, 0, 1))
  const S = (v: number): number => v * s
  const lift = e * S(30) + (e > 0 ? sin(t * 2.2) * S(4) * e : 0)
  const tilt = (1 - e) * 0.62
  const bx = x - S(8) * (1 - e)
  const by = y - S(18) - lift
  const W = S(54)
  const H = S(128)
  const [cx, cy] = at(bx, by, tilt, 0, -H * 0.5)
  if (k > 0) {
    // The rainbow it throws, then its glow.
    g.globalAlpha = 0.55 * e
    for (let i = 0; i < RAINBOW.length; i++) {
      g.beginPath()
      g.moveTo(cx + S(10), cy - S(6))
      g.lineTo(x + S(96) + i * S(18), y + S(4))
      g.lineTo(x + S(96) + (i + 1) * S(18), y + S(4))
      g.closePath()
      fill(g, RAINBOW[i]!)
    }
    g.globalAlpha = 1
    glow(g, cx, cy, S(120), e, '#f4fdff')
  }
  // The rock nest (`prop-rock-nest`): painted whole behind the shard, its lip
  // blitted again in front of it below — or the drawing's back, here.
  const nest = (): boolean => {
    g.save()
    g.translate(x, y)
    const hit = drawItem(g, ROCK_NEST_ART, NEST_UNIT * s)
    g.restore()
    return hit
  }
  const nested = nest()
  if (!nested) rockNestBack(g, x, y, S)
  // The shard. Its LEAN is a rotation, so the painting carries it: the shape
  // is painted upright and the drawing tips it back into the rock.
  g.save()
  g.translate(bx, by)
  g.rotate(tilt)
  if (!drawItem(g, CLEAR_SHARD_ART, H, k < 0.5 ? 0 : 1)) clearShardShape(g, s, W, H, e, k)
  g.restore()
  // The rock nest's front lip, wrapped round its foot.
  if (nested) {
    g.save()
    rockNestLip(g, x, y, S)
    g.clip()
    nest()
    g.restore()
  } else rockNestFront(g, x, y, S)
  if (k < 0.34) zzz(g, x + S(46), y - S(92), t, 1 - k * 3)
  if (e > 0.2) {
    g.globalAlpha = e
    g.beginPath()
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + (i * TAU) / 4
      const r = S(9) * Math.max(0, sin(t * 3 + i * 1.7))
      if (r < 1) continue
      const px = cx + cos(a) * S(74)
      const py = cy + sin(a) * S(58)
      if (twinklePainted(g, px, py, r, '#ffffff')) continue
      g.moveTo(px, py - r)
      g.quadraticCurveTo(px, py, px + r, py)
      g.quadraticCurveTo(px, py, px, py + r)
      g.quadraticCurveTo(px, py, px - r, py)
      g.quadraticCurveTo(px, py, px, py - r)
    }
    fill(g, '#ffffff')
    g.globalAlpha = 1
  }
}
